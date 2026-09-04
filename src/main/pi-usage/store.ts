import { app } from 'electron'
import { join } from 'node:path'
import type { Store } from '../persistence'
import { piUsageProvider } from './pi-usage-provider'
import { getDefaultState, normalizePersistedState } from './persisted-state-normalization'
import { UsageProviderStoreLifecycle } from '../usage/usage-provider-store-lifecycle'
import type { PiUsageProcessedFile, PiUsageSession, PiUsageDailyAggregate } from './types'
import type {
  PiUsageBreakdownRow,
  PiUsageDailyPoint,
  PiUsageSessionRow,
  PiUsageSnapshot,
  PiUsageSummary
} from '../../shared/pi-usage-types'
import type { PiUsageBreakdownKind, PiUsageRange, PiUsageScope } from '../../shared/pi-usage-types'

let _piUsageFile: string | null = null

export function initPiUsagePath(): void {
  _piUsageFile = join(app.getPath('userData'), 'orca-pi-usage.json')
}

function getPiUsageFile(): string {
  if (!_piUsageFile) {
    _piUsageFile = join(app.getPath('userData'), 'orca-pi-usage.json')
  }
  return _piUsageFile
}

function filterSessionsByRange(sessions: PiUsageSession[], range: PiUsageRange): PiUsageSession[] {
  if (range === 'all') {
    return sessions
  }
  const rangeMs =
    range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : range === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : 90 * 24 * 60 * 60 * 1000
  const cutoff = Date.now() - rangeMs
  return sessions.filter((s) => s.lastEventAt >= cutoff)
}

function filterDailyByRange(
  daily: PiUsageDailyAggregate[],
  range: PiUsageRange
): PiUsageDailyAggregate[] {
  if (range === 'all') {
    return daily
  }
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - rangeDays)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return daily.filter((d) => d.day >= cutoffStr)
}

function buildSummary(sessions: PiUsageSession[]): PiUsageSummary {
  const events = sessions.reduce((sum, s) => sum + s.totalEvents, 0)
  return {
    scope: 'all',
    range: '30d',
    sessions: sessions.length,
    events,
    inputTokens: sessions.reduce((sum, s) => sum + s.inputTokens, 0),
    cachedInputTokens: sessions.reduce((sum, s) => sum + s.cacheReadTokens, 0),
    outputTokens: sessions.reduce((sum, s) => sum + s.outputTokens, 0),
    reasoningOutputTokens: sessions.reduce((sum, s) => sum + s.reasoningTokens, 0),
    totalTokens: sessions.reduce(
      (sum, s) => sum + s.inputTokens + s.outputTokens + s.reasoningTokens,
      0
    ),
    estimatedCostUsd: sessions.reduce((sum, s) => sum + s.costUsd, 0),
    topModel: null,
    topProvider: null,
    hasAnyPiData: sessions.length > 0
  }
}

function buildDailyPoints(daily: PiUsageDailyAggregate[]): PiUsageDailyPoint[] {
  return daily.map((d) => ({
    day: d.day,
    inputTokens: d.inputTokens,
    cachedInputTokens: d.cacheReadTokens,
    outputTokens: d.outputTokens,
    reasoningOutputTokens: d.reasoningTokens,
    totalTokens: d.totalTokens
  }))
}

function buildBreakdown(
  sessions: PiUsageSession[],
  kind: PiUsageBreakdownKind
): PiUsageBreakdownRow[] {
  const byKey = new Map<string, PiUsageBreakdownRow>()

  for (const session of sessions) {
    const keys = kind === 'model' ? session.models : session.providers
    for (const key of keys) {
      if (!key) {
        continue
      }
      let row = byKey.get(key)
      if (!row) {
        row = {
          key,
          label: key,
          sessions: 0,
          events: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          reasoningOutputTokens: 0,
          totalTokens: 0,
          estimatedCostUsd: null
        }
        byKey.set(key, row)
      }
      row.sessions++
      row.events += session.totalEvents
      row.inputTokens += session.inputTokens
      row.cachedInputTokens += session.cacheReadTokens
      row.outputTokens += session.outputTokens
      row.reasoningOutputTokens += session.reasoningTokens
      row.totalTokens += session.inputTokens + session.outputTokens + session.reasoningTokens
      row.estimatedCostUsd = (row.estimatedCostUsd ?? 0) + session.costUsd
    }
  }

  return [...byKey.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}

function buildProjectBreakdown(sessions: PiUsageSession[]): PiUsageBreakdownRow[] {
  const byKey = new Map<string, PiUsageBreakdownRow>()
  for (const session of sessions) {
    const key = session.projectLabel || '(unknown)'
    let row = byKey.get(key)
    if (!row) {
      row = {
        key,
        label: key,
        sessions: 0,
        events: 0,
        inputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        reasoningOutputTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: null
      }
      byKey.set(key, row)
    }
    row.sessions++
    row.events += session.totalEvents
    row.inputTokens += session.inputTokens
    row.cachedInputTokens += session.cacheReadTokens
    row.outputTokens += session.outputTokens
    row.reasoningOutputTokens += session.reasoningTokens
    row.totalTokens += session.inputTokens + session.outputTokens + session.reasoningTokens
    row.estimatedCostUsd = (row.estimatedCostUsd ?? 0) + session.costUsd
  }
  return [...byKey.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}

function buildRecentSessions(sessions: PiUsageSession[], limit: number): PiUsageSessionRow[] {
  return [...sessions]
    .sort((a, b) => b.lastEventAt - a.lastEventAt)
    .slice(0, limit)
    .map((s) => ({
      sessionId: s.sessionId,
      lastActiveAt: new Date(s.lastEventAt).toISOString(),
      durationMinutes: Math.round((s.lastEventAt - s.firstEventAt) / 60000),
      projectLabel: s.projectLabel || '(unknown)',
      model: s.models[0] ?? null,
      provider: s.providers[0] ?? null,
      events: s.totalEvents,
      inputTokens: s.inputTokens,
      cachedInputTokens: s.cacheReadTokens,
      outputTokens: s.outputTokens,
      reasoningOutputTokens: s.reasoningTokens,
      totalTokens: s.inputTokens + s.outputTokens + s.reasoningTokens
    }))
}

export type PiUsagePersistedStoreState = {
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

export class PiUsageStore extends UsageProviderStoreLifecycle<
  'processedFiles',
  PiUsagePersistedStoreState,
  'hasAnyPiData'
> {
  constructor(store: Pick<Store, 'getRepos' | 'getAllWorktreeMeta'>) {
    super(store, {
      logTag: '[pi-usage]',
      resolveCacheFile: getPiUsageFile,
      createDefaultState: getDefaultState,
      normalizeState: normalizePersistedState,
      sourceKey: 'processedFiles',
      dataPresenceKey: 'hasAnyPiData',
      jsonIndent: 2,
      scan: piUsageProvider.scan
    })
  }

  getSnapshot(_scope: PiUsageScope, range: PiUsageRange, recentSessionLimit = 10): PiUsageSnapshot {
    const sessions = this.state.sessions as PiUsageSession[]
    const filteredSessions = filterSessionsByRange(sessions, range)
    const filteredDaily = filterDailyByRange(
      this.state.dailyAggregates as PiUsageDailyAggregate[],
      range
    )
    const summary = buildSummary(filteredSessions)
    const modelBreakdown = buildBreakdown(filteredSessions, 'model')
    const providerBreakdown = buildBreakdown(filteredSessions, 'provider')
    return {
      scanState: this.getScanState(),
      summary: {
        ...summary,
        topModel: modelBreakdown[0]?.key ?? null,
        topProvider: providerBreakdown[0]?.key ?? null
      },
      daily: buildDailyPoints(filteredDaily),
      modelBreakdown,
      projectBreakdown: buildProjectBreakdown(filteredSessions),
      recentSessions: buildRecentSessions(filteredSessions, recentSessionLimit)
    }
  }

  async getSummary(_scope: PiUsageScope, range: PiUsageRange): Promise<PiUsageSummary> {
    await this.refresh(false)
    return buildSummary(filterSessionsByRange(this.state.sessions as PiUsageSession[], range))
  }

  async getDaily(_scope: PiUsageScope, range: PiUsageRange): Promise<PiUsageDailyPoint[]> {
    await this.refresh(false)
    const daily = this.state.dailyAggregates as PiUsageDailyAggregate[]
    return buildDailyPoints(filterDailyByRange(daily, range))
  }

  async getBreakdown(
    _scope: PiUsageScope,
    range: PiUsageRange,
    kind: PiUsageBreakdownKind
  ): Promise<PiUsageBreakdownRow[]> {
    await this.refresh(false)
    const sessions = filterSessionsByRange(this.state.sessions as PiUsageSession[], range)
    return kind === 'model' ? buildBreakdown(sessions, 'model') : buildProjectBreakdown(sessions)
  }

  async getRecentSessions(
    _scope: PiUsageScope,
    range: PiUsageRange,
    limit = 10
  ): Promise<PiUsageSessionRow[]> {
    await this.refresh(false)
    const sessions = filterSessionsByRange(this.state.sessions as PiUsageSession[], range)
    return buildRecentSessions(sessions, limit)
  }
}
