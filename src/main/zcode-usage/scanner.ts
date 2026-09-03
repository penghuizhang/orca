import Database from '../sqlite/sync-database'
import { getProcessedDatabaseInfo, listZCodeDatabases } from './zcode-database-discovery'
import type {
  ZCodeModelUsageRow,
  ZCodeUsageDailyAggregate,
  ZCodeUsageEvent,
  ZCodeUsageProcessedDatabase,
  ZCodeUsageSession
} from './types'
import type { UsageScanWorktreeRef } from '../usage/usage-provider-contract'

function parseModelUsageRow(row: ZCodeModelUsageRow): ZCodeUsageEvent | null {
  if (row.status !== 'completed' && row.status !== 'error') {
    return null
  }

  return {
    sessionId: row.session_id,
    turnId: row.turn_id,
    providerId: row.provider_id,
    modelId: row.model_id,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    reasoningTokens: row.reasoning_tokens,
    cacheCreationInputTokens: row.cache_creation_input_tokens,
    cacheReadInputTokens: row.cache_read_input_tokens,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    durationMs: row.duration_ms
  }
}

function aggregateEvents(events: ZCodeUsageEvent[]): {
  sessions: Map<string, ZCodeUsageSession>
  dailyAggregates: Map<string, ZCodeUsageDailyAggregate>
} {
  const sessionsById = new Map<string, ZCodeUsageSession>()
  const dailyByKey = new Map<string, ZCodeUsageDailyAggregate>()

  for (const event of events) {
    // Aggregate sessions
    let session = sessionsById.get(event.sessionId)
    if (!session) {
      session = {
        sessionId: event.sessionId,
        firstEventAt: event.startedAt,
        lastEventAt: event.startedAt,
        totalEvents: 0,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        models: new Set(),
        providers: new Set()
      }
      sessionsById.set(event.sessionId, session)
    }

    session.totalEvents++
    session.inputTokens += event.inputTokens
    session.outputTokens += event.outputTokens
    session.reasoningTokens += event.reasoningTokens
    session.cacheCreationInputTokens += event.cacheCreationInputTokens
    session.cacheReadInputTokens += event.cacheReadInputTokens
    session.models.add(event.modelId)
    session.providers.add(event.providerId)

    if (event.startedAt < session.firstEventAt) {
      session.firstEventAt = event.startedAt
    }
    if (event.startedAt > session.lastEventAt) {
      session.lastEventAt = event.startedAt
    }

    // Aggregate daily
    const date = new Date(event.startedAt)
    const dayKey = date.toISOString().split('T')[0]
    let daily = dailyByKey.get(dayKey)
    if (!daily) {
      daily = {
        day: dayKey,
        inputTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        totalTokens: 0
      }
      dailyByKey.set(dayKey, daily)
    }

    daily.inputTokens += event.inputTokens
    daily.outputTokens += event.outputTokens
    daily.reasoningTokens += event.reasoningTokens
    daily.cacheCreationInputTokens += event.cacheCreationInputTokens
    daily.cacheReadInputTokens += event.cacheReadInputTokens
    daily.totalTokens += event.inputTokens + event.outputTokens + event.reasoningTokens
  }

  return { sessions: sessionsById, dailyAggregates: dailyByKey }
}

export async function parseZCodeUsageDatabase(dbPath: string): Promise<{
  processedDatabase: ZCodeUsageProcessedDatabase
  sessions: ZCodeUsageSession[]
  dailyAggregates: ZCodeUsageDailyAggregate[]
  events: ZCodeUsageEvent[]
}> {
  const processedDatabase = await getProcessedDatabaseInfo(dbPath)
  const db = new Database(dbPath, { readonly: true, fileMustExist: true })

  try {
    db.pragma('query_only = ON')

    const events: ZCodeUsageEvent[] = []
    const stmt = db.prepare(`
      SELECT
        id, session_id, turn_id, provider_id, model_id,
        input_tokens, output_tokens, reasoning_tokens,
        cache_creation_input_tokens, cache_read_input_tokens,
        started_at, completed_at, duration_ms, status
      FROM model_usage
      WHERE status IN ('completed', 'error')
      ORDER BY started_at ASC
    `)

    for (const row of stmt.iterate() as IterableIterator<ZCodeModelUsageRow>) {
      const parsed = parseModelUsageRow(row)
      if (parsed) {
        events.push(parsed)
      }
    }

    const { sessions, dailyAggregates } = aggregateEvents(events)

    return {
      processedDatabase,
      sessions: [...sessions.values()],
      dailyAggregates: [...dailyAggregates.values()].sort((a, b) => a.day.localeCompare(b.day)),
      events
    }
  } finally {
    db.close()
  }
}

export async function scanZCodeUsageDatabases(
  _worktrees: UsageScanWorktreeRef[],
  previousProcessedDatabases: ZCodeUsageProcessedDatabase[]
): Promise<{
  processedDatabases: ZCodeUsageProcessedDatabase[]
  sessions: ZCodeUsageSession[]
  dailyAggregates: ZCodeUsageDailyAggregate[]
}> {
  const dbPaths = await listZCodeDatabases()
  const previousByPath = new Map(
    previousProcessedDatabases.map((database) => [database.path, database])
  )

  const processedDatabases: ZCodeUsageProcessedDatabase[] = []
  const allSessions: ZCodeUsageSession[] = []
  const allDailyAggregates: ZCodeUsageDailyAggregate[] = []

  for (const dbPath of dbPaths) {
    const databaseInfo = await getProcessedDatabaseInfo(dbPath)
    const previous = previousByPath.get(dbPath)

    // Skip if unchanged
    if (
      previous &&
      previous.mtimeMs === databaseInfo.mtimeMs &&
      previous.size === databaseInfo.size
    ) {
      processedDatabases.push(previous)
      continue
    }

    const { processedDatabase, sessions, dailyAggregates } = await parseZCodeUsageDatabase(dbPath)

    processedDatabases.push(processedDatabase)
    allSessions.push(...sessions)
    allDailyAggregates.push(...dailyAggregates)
  }

  // Merge sessions and daily aggregates
  const mergedSessions = mergeSessions(allSessions)
  const mergedDaily = mergeDailyAggregates(allDailyAggregates)

  return {
    processedDatabases,
    sessions: mergedSessions,
    dailyAggregates: mergedDaily
  }
}

function mergeSessions(sessions: ZCodeUsageSession[]): ZCodeUsageSession[] {
  const byId = new Map<string, ZCodeUsageSession>()

  for (const session of sessions) {
    const existing = byId.get(session.sessionId)
    if (!existing) {
      byId.set(session.sessionId, session)
      continue
    }

    existing.totalEvents += session.totalEvents
    existing.inputTokens += session.inputTokens
    existing.outputTokens += session.outputTokens
    existing.reasoningTokens += session.reasoningTokens
    existing.cacheCreationInputTokens += session.cacheCreationInputTokens
    existing.cacheReadInputTokens += session.cacheReadInputTokens

    for (const model of session.models) {
      existing.models.add(model)
    }
    for (const provider of session.providers) {
      existing.providers.add(provider)
    }

    if (session.firstEventAt < existing.firstEventAt) {
      existing.firstEventAt = session.firstEventAt
    }
    if (session.lastEventAt > existing.lastEventAt) {
      existing.lastEventAt = session.lastEventAt
    }
  }

  return [...byId.values()]
}

function mergeDailyAggregates(daily: ZCodeUsageDailyAggregate[]): ZCodeUsageDailyAggregate[] {
  const byDay = new Map<string, ZCodeUsageDailyAggregate>()

  for (const agg of daily) {
    const existing = byDay.get(agg.day)
    if (!existing) {
      byDay.set(agg.day, agg)
      continue
    }

    existing.inputTokens += agg.inputTokens
    existing.outputTokens += agg.outputTokens
    existing.reasoningTokens += agg.reasoningTokens
    existing.cacheCreationInputTokens += agg.cacheCreationInputTokens
    existing.cacheReadInputTokens += agg.cacheReadInputTokens
    existing.totalTokens += agg.totalTokens
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day))
}
