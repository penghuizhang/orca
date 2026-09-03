/**
 * ZCode usage tracking types.
 * Mirrors the opencode-usage module structure but reads from zcode's own SQLite database.
 */

export type ZCodeUsageScanState = {
  enabled: boolean
  isScanning: boolean
  lastScanStartedAt: number | null
  lastScanCompletedAt: number | null
  lastScanError: string | null
  hasAnyZCodeData: boolean
}

export type ZCodeUsageSummary = {
  scope: ZCodeUsageScope
  range: ZCodeUsageRange
  sessions: number
  events: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
  estimatedCostUsd: number | null
  topModel: string | null
  topProject: string | null
  hasAnyZCodeData: boolean
}

export type ZCodeUsageScope = 'all' | 'recent'
export type ZCodeUsageRange = '7d' | '30d' | '90d' | 'all'

export type ZCodeUsageDailyPoint = {
  day: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
}

export type ZCodeUsageBreakdownRow = {
  key: string
  label: string
  sessions: number
  events: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
  estimatedCostUsd: number | null
}

export type ZCodeUsageSessionRow = {
  sessionId: string
  lastActiveAt: string
  durationMinutes: number
  projectLabel: string
  model: string | null
  provider: string | null
  events: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
}

export type ZCodeUsageSnapshot = {
  scanState: ZCodeUsageScanState
  summary: ZCodeUsageSummary
  daily: ZCodeUsageDailyPoint[]
  modelBreakdown: ZCodeUsageBreakdownRow[]
  providerBreakdown: ZCodeUsageBreakdownRow[]
  recentSessions: ZCodeUsageSessionRow[]
}

/** Raw row from zcode's model_usage table */
export type ZCodeModelUsageRow = {
  id: string
  session_id: string
  turn_id: string | null
  provider_id: string
  model_id: string
  input_tokens: number
  output_tokens: number
  reasoning_tokens: number
  cache_creation_input_tokens: number
  cache_read_input_tokens: number
  started_at: number
  completed_at: number | null
  duration_ms: number | null
  status: string
}

/** Processed event after parsing */
export type ZCodeUsageEvent = {
  sessionId: string
  turnId: string | null
  providerId: string
  modelId: string
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  startedAt: number
  completedAt: number | null
  durationMs: number | null
}

/** Aggregated session data */
export type ZCodeUsageSession = {
  sessionId: string
  firstEventAt: number
  lastEventAt: number
  totalEvents: number
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  models: Set<string>
  providers: Set<string>
}

/** Daily aggregate */
export type ZCodeUsageDailyAggregate = {
  day: string
  inputTokens: number
  outputTokens: number
  reasoningTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
  totalTokens: number
}

/** Database metadata for caching */
export type ZCodeUsageProcessedDatabase = {
  path: string
  mtimeMs: number
  size: number
}

/** Alias for compatibility with UsageProvider interface */
export type ZCodeUsagePersistedDatabase = ZCodeUsageProcessedDatabase

/** Persisted state for zcode usage cache */
export type ZCodeUsagePersistedState = {
  processedDatabases: ZCodeUsageProcessedDatabase[]
  sessions: ZCodeUsageSession[]
  dailyAggregates: ZCodeUsageDailyAggregate[]
  worktreeFingerprint: string | null
  scanState: {
    enabled: boolean
    lastScanStartedAt: number | null
    lastScanCompletedAt: number | null
    lastScanError: string | null
  }
}
