import type { ReadStream } from 'node:fs'
import { createReadStream } from 'node:fs'
import { basename } from 'node:path'
import { listPiSessionFiles } from './pi-session-discovery'
import type {
  PiUsageDailyAggregate,
  PiUsageEvent,
  PiUsageProcessedFile,
  PiUsageSession
} from './types'
import type { UsageScanWorktreeRef } from '../usage/usage-provider-contract'

type PiUsagePayload = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  reasoning: number
  totalTokens: number
  cost?: {
    input?: number
    output?: number
    cacheRead?: number
    cacheWrite?: number
    total?: number
  }
}

type PiSessionLine =
  | { type: 'session'; id?: string; cwd?: string }
  | {
      type: 'message'
      message?: {
        role?: string
        provider?: string
        model?: string
        usage?: PiUsagePayload
        timestamp?: number
      }
    }

/** Longest worktree path that prefixes the session cwd wins; bare cwd basename otherwise. */
function attributeProject(cwd: string | null, worktrees: UsageScanWorktreeRef[]): string {
  if (!cwd) {
    return ''
  }
  let best: UsageScanWorktreeRef | null = null
  for (const worktree of worktrees) {
    if (cwd.startsWith(worktree.path) && (!best || worktree.path.length > best.path.length)) {
      best = worktree
    }
  }
  return best ? best.displayName : basename(cwd)
}

function parseUsagePayload(
  usage: PiUsagePayload | undefined,
  model: string
): {
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
} | null {
  if (!usage || typeof usage.input !== 'number' || typeof usage.output !== 'number') {
    return null
  }
  return {
    inputTokens: usage.input,
    outputTokens: usage.output,
    reasoningTokens: usage.reasoning ?? 0,
    cacheReadTokens: usage.cacheRead ?? 0,
    cacheWriteTokens: usage.cacheWrite ?? 0,
    // Cost is model-priced; without a model we cannot trust the recorded per-token cost.
    costUsd: model && usage.cost ? (usage.cost.total ?? 0) : 0
  }
}

async function* createLineReader(stream: ReadStream): AsyncGenerator<string, void, void> {
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk as Buffer, { stream: true })
    let newlineIndex = buffer.indexOf('\n')
    while (newlineIndex !== -1) {
      yield buffer.slice(0, newlineIndex)
      buffer = buffer.slice(newlineIndex + 1)
      newlineIndex = buffer.indexOf('\n')
    }
  }
  buffer += decoder.decode()
  if (buffer) {
    yield buffer
  }
}

type ParseState = {
  sessionId: string
  cwd: string | null
}

function collectMessageEvent(
  state: ParseState,
  message: NonNullable<Extract<PiSessionLine, { type: 'message' }>['message']>,
  worktrees: UsageScanWorktreeRef[]
): PiUsageEvent | null {
  if (message.role !== 'assistant') {
    return null
  }
  const parsedUsage = parseUsagePayload(message.usage, message.model ?? '')
  if (!parsedUsage) {
    return null
  }
  return {
    sessionId: state.sessionId,
    cwd: state.cwd,
    projectLabel: attributeProject(state.cwd, worktrees),
    provider: message.provider ?? '',
    model: message.model ?? '',
    ...parsedUsage,
    timestamp: message.timestamp ?? 0
  }
}

async function parseSessionFile(
  filePath: string,
  worktrees: UsageScanWorktreeRef[]
): Promise<PiUsageEvent[]> {
  const events: PiUsageEvent[] = []
  // No encoding: chunks stay Buffers for TextDecoder in createLineReader.
  const stream = createReadStream(filePath)
  const state: ParseState = { sessionId: basename(filePath, '.jsonl'), cwd: null }

  try {
    for await (const line of createLineReader(stream)) {
      if (!line.trim()) {
        continue
      }
      let parsed: PiSessionLine
      try {
        parsed = JSON.parse(line) as PiSessionLine
      } catch {
        continue
      }
      if (parsed.type === 'session') {
        if (parsed.id) {
          state.sessionId = parsed.id
        }
        if (parsed.cwd) {
          state.cwd = parsed.cwd
        }
        continue
      }
      if (parsed.type !== 'message' || !parsed.message) {
        continue
      }
      const event = collectMessageEvent(state, parsed.message, worktrees)
      if (event) {
        events.push(event)
      }
    }
  } finally {
    stream.destroy()
  }
  return events
}

function pushEvent(target: PiUsageSession, event: PiUsageEvent): void {
  target.totalEvents++
  target.inputTokens += event.inputTokens
  target.outputTokens += event.outputTokens
  target.reasoningTokens += event.reasoningTokens
  target.cacheReadTokens += event.cacheReadTokens
  target.cacheWriteTokens += event.cacheWriteTokens
  target.costUsd += event.costUsd
  if (event.model && !target.models.includes(event.model)) {
    target.models.push(event.model)
  }
  if (event.provider && !target.providers.includes(event.provider)) {
    target.providers.push(event.provider)
  }
  if (event.timestamp && event.timestamp < target.firstEventAt) {
    target.firstEventAt = event.timestamp
  }
  if (event.timestamp > target.lastEventAt) {
    target.lastEventAt = event.timestamp
  }
}

function aggregateDaily(dailyByKey: Map<string, PiUsageDailyAggregate>, event: PiUsageEvent): void {
  const dayKey = new Date(event.timestamp).toISOString().split('T')[0]
  let daily = dailyByKey.get(dayKey)
  if (!daily) {
    daily = {
      day: dayKey,
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      totalTokens: 0
    }
    dailyByKey.set(dayKey, daily)
  }
  daily.inputTokens += event.inputTokens
  daily.outputTokens += event.outputTokens
  daily.reasoningTokens += event.reasoningTokens
  daily.cacheReadTokens += event.cacheReadTokens
  daily.cacheWriteTokens += event.cacheWriteTokens
  daily.totalTokens += event.inputTokens + event.outputTokens + event.reasoningTokens
}

function aggregateEvents(events: PiUsageEvent[]): {
  sessions: PiUsageSession[]
  dailyAggregates: PiUsageDailyAggregate[]
} {
  const sessionsById = new Map<string, PiUsageSession>()
  const dailyByKey = new Map<string, PiUsageDailyAggregate>()

  for (const event of events) {
    let session = sessionsById.get(event.sessionId)
    if (!session) {
      session = {
        sessionId: event.sessionId,
        cwd: event.cwd,
        projectLabel: event.projectLabel,
        firstEventAt: event.timestamp,
        lastEventAt: event.timestamp,
        totalEvents: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        costUsd: 0,
        models: [],
        providers: []
      }
      sessionsById.set(event.sessionId, session)
    }
    pushEvent(session, event)
    aggregateDaily(dailyByKey, event)
  }

  return { sessions: [...sessionsById.values()], dailyAggregates: [...dailyByKey.values()] }
}

/**
 * Pi usage grows slowly (small JSONL files) so every scan reparses all sessions;
 * the processed-file list is kept only as bookkeeping for the persisted cache.
 */
export async function scanPiUsageSessions(
  worktrees: UsageScanWorktreeRef[],
  _previousProcessedFiles: PiUsageProcessedFile[]
): Promise<{
  processedFiles: PiUsageProcessedFile[]
  sessions: PiUsageSession[]
  dailyAggregates: PiUsageDailyAggregate[]
}> {
  const sessionFiles = listPiSessionFiles()
  const events: PiUsageEvent[] = []
  for (const file of sessionFiles) {
    try {
      events.push(...(await parseSessionFile(file.path, worktrees)))
    } catch (error) {
      console.warn(`[pi-usage] failed to parse ${file.path}:`, error)
    }
  }

  const { sessions, dailyAggregates } = aggregateEvents(events)
  return {
    processedFiles: sessionFiles,
    sessions,
    dailyAggregates: dailyAggregates.sort((a, b) => a.day.localeCompare(b.day))
  }
}
