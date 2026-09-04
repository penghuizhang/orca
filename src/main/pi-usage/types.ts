/** Raw assistant-message usage payload inside a pi session JSONL line. */
export type PiSessionUsagePayload = {
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

/** Parsed event from one pi assistant message. */
export type PiUsageEvent = {
  sessionId: string
  cwd: string | null
  projectLabel: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  timestamp: number
}

/** Aggregated session data. models/providers persist as arrays so JSON round-trips losslessly. */
export type PiUsageSession = {
  sessionId: string
  cwd: string | null
  projectLabel: string
  firstEventAt: number
  lastEventAt: number
  totalEvents: number
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  costUsd: number
  models: string[]
  providers: string[]
}

export type PiUsageDailyAggregate = {
  day: string
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  totalTokens: number
}

/** Session-file metadata for incremental caching. */
export type PiUsageProcessedFile = {
  path: string
  mtimeMs: number
  size: number
}

export type PiUsagePersistedState = {
  processedFiles: PiUsageProcessedFile[]
  sessions: PiUsageSession[]
  dailyAggregates: PiUsageDailyAggregate[]
  worktreeFingerprint: string | null
  scanState: {
    enabled: boolean
    lastScanStartedAt: number | null
    lastScanCompletedAt: number | null
    lastScanError: string | null
  }
}
