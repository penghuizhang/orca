export type ZCodeUsageScope = 'all' | 'recent'
export type ZCodeUsageRange = '7d' | '30d' | '90d' | 'all'
export type ZCodeUsageBreakdownKind = 'model' | 'provider'

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
  topProvider: string | null
  hasAnyZCodeData: boolean
}

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
  projectBreakdown: ZCodeUsageBreakdownRow[]
  providerBreakdown: ZCodeUsageBreakdownRow[]
  recentSessions: ZCodeUsageSessionRow[]
}
