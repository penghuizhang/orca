export type PiUsageScope = 'all' | 'recent'
export type PiUsageRange = '7d' | '30d' | '90d' | 'all'
export type PiUsageBreakdownKind = 'model' | 'provider'

export type PiUsageScanState = {
  enabled: boolean
  isScanning: boolean
  lastScanStartedAt: number | null
  lastScanCompletedAt: number | null
  lastScanError: string | null
  hasAnyPiData: boolean
}

export type PiUsageSummary = {
  scope: PiUsageScope
  range: PiUsageRange
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
  hasAnyPiData: boolean
}

export type PiUsageDailyPoint = {
  day: string
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
}

export type PiUsageBreakdownRow = {
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

export type PiUsageSessionRow = {
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

export type PiUsageSnapshot = {
  scanState: PiUsageScanState
  summary: PiUsageSummary
  daily: PiUsageDailyPoint[]
  modelBreakdown: PiUsageBreakdownRow[]
  projectBreakdown: PiUsageBreakdownRow[]
  recentSessions: PiUsageSessionRow[]
}
