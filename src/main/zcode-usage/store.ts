import { app } from 'electron'
import { join } from 'node:path'
import type { Store } from '../persistence'
import { zcodeUsageProvider } from './zcode-usage-provider'
import { getDefaultState, normalizePersistedState } from './persisted-state-normalization'
import { UsageProviderStoreLifecycle } from '../usage/usage-provider-store-lifecycle'
import type {
  ZCodeUsageBreakdownRow,
  ZCodeUsageDailyAggregate,
  ZCodeUsageDailyPoint,
  ZCodeUsagePersistedState,
  ZCodeUsageScope,
  ZCodeUsageSession,
  ZCodeUsageSessionRow,
  ZCodeUsageSnapshot,
  ZCodeUsageSummary
} from './types'
import type { ZCodeUsageBreakdownKind } from '../../shared/zcode-usage-types'
import type { ZCodeUsageRange } from '../../shared/zcode-usage-types'

let _zcodeUsageFile: string | null = null

export function initZCodeUsagePath(): void {
  _zcodeUsageFile = join(app.getPath('userData'), 'orca-zcode-usage.json')
}

function getZCodeUsageFile(): string {
  if (!_zcodeUsageFile) {
    _zcodeUsageFile = join(app.getPath('userData'), 'orca-zcode-usage.json')
  }
  return _zcodeUsageFile
}

function filterSessionsByRange(
  sessions: ZCodeUsageSession[],
  range: ZCodeUsageRange
): ZCodeUsageSession[] {
  if (range === 'all') {
    return sessions
  }
  const now = Date.now()
  const rangeMs =
    range === '7d'
      ? 7 * 24 * 60 * 60 * 1000
      : range === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : 90 * 24 * 60 * 60 * 1000
  const cutoff = now - rangeMs
  return sessions.filter((s) => s.lastEventAt >= cutoff)
}

function filterDailyByRange(
  daily: ZCodeUsageDailyAggregate[],
  range: ZCodeUsageRange
): ZCodeUsageDailyAggregate[] {
  if (range === 'all') {
    return daily
  }
  const now = new Date()
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - rangeDays)
  const cutoffStr = cutoff.toISOString().split('T')[0]
  return daily.filter((d) => d.day >= cutoffStr)
}

function buildSummary(
  sessions: ZCodeUsageSession[],
  _daily: ZCodeUsageDailyAggregate[]
): ZCodeUsageSummary {
  const events = sessions.reduce((sum, s) => sum + s.totalEvents, 0)
  return {
    scope: 'all',
    range: '30d',
    sessions: sessions.length,
    events,
    inputTokens: sessions.reduce((sum, s) => sum + s.inputTokens, 0),
    cachedInputTokens: sessions.reduce((sum, s) => sum + s.cacheReadInputTokens, 0),
    outputTokens: sessions.reduce((sum, s) => sum + s.outputTokens, 0),
    reasoningOutputTokens: sessions.reduce((sum, s) => sum + s.reasoningTokens, 0),
    totalTokens: sessions.reduce(
      (sum, s) => sum + s.inputTokens + s.outputTokens + s.reasoningTokens,
      0
    ),
    estimatedCostUsd: null,
    topModel: null,
    topProject: null,
    hasAnyZCodeData: sessions.length > 0
  }
}

function buildDailyPoints(daily: ZCodeUsageDailyAggregate[]): ZCodeUsageDailyPoint[] {
  return daily.map((d) => ({
    day: d.day,
    inputTokens: d.inputTokens,
    cachedInputTokens: d.cacheReadInputTokens,
    outputTokens: d.outputTokens,
    reasoningOutputTokens: d.reasoningTokens,
    totalTokens: d.totalTokens
  }))
}

function buildBreakdown(
  sessions: ZCodeUsageSession[],
  kind: ZCodeUsageBreakdownKind
): ZCodeUsageBreakdownRow[] {
  const byKey = new Map<string, ZCodeUsageBreakdownRow>()

  for (const session of sessions) {
    // Handle both Set and plain object (JSON deserialization)
    const source = kind === 'model' ? session.models : session.providers
    const keys =
      source instanceof Set ? [...source] : Object.values(source as Record<string, string>)
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
      row.cachedInputTokens += session.cacheReadInputTokens
      row.outputTokens += session.outputTokens
      row.reasoningOutputTokens += session.reasoningTokens
      row.totalTokens += session.inputTokens + session.outputTokens + session.reasoningTokens
    }
  }

  return [...byKey.values()].sort((a, b) => b.totalTokens - a.totalTokens)
}

function buildRecentSessions(sessions: ZCodeUsageSession[], limit: number): ZCodeUsageSessionRow[] {
  return sessions
    .sort((a, b) => b.lastEventAt - a.lastEventAt)
    .slice(0, limit)
    .map((s) => {
      // Handle both Set and plain object (JSON deserialization)
      const modelArr =
        s.models instanceof Set ? [...s.models] : Object.values(s.models as Record<string, string>)
      const providerArr =
        s.providers instanceof Set
          ? [...s.providers]
          : Object.values(s.providers as Record<string, string>)
      return {
        sessionId: s.sessionId,
        lastActiveAt: new Date(s.lastEventAt).toISOString(),
        durationMinutes: Math.round((s.lastEventAt - s.firstEventAt) / 60000),
        projectLabel: '',
        model: modelArr[0] ?? null,
        provider: providerArr[0] ?? null,
        events: s.totalEvents,
        inputTokens: s.inputTokens,
        cachedInputTokens: s.cacheReadInputTokens,
        outputTokens: s.outputTokens,
        reasoningOutputTokens: s.reasoningTokens,
        totalTokens: s.inputTokens + s.outputTokens + s.reasoningTokens
      }
    })
}

export class ZCodeUsageStore extends UsageProviderStoreLifecycle<
  'processedDatabases',
  ZCodeUsagePersistedState,
  'hasAnyZCodeData'
> {
  constructor(store: Pick<Store, 'getRepos' | 'getAllWorktreeMeta'>) {
    super(store, {
      logTag: '[zcode-usage]',
      resolveCacheFile: getZCodeUsageFile,
      createDefaultState: getDefaultState,
      normalizeState: normalizePersistedState,
      sourceKey: 'processedDatabases',
      dataPresenceKey: 'hasAnyZCodeData',
      jsonIndent: 2,
      scan: zcodeUsageProvider.scan
    })
  }

  getSnapshot(
    _scope: ZCodeUsageScope,
    range: ZCodeUsageRange,
    recentSessionLimit = 10
  ): ZCodeUsageSnapshot {
    const sessions = this.state.sessions as ZCodeUsageSession[]
    const daily = this.state.dailyAggregates as ZCodeUsageDailyAggregate[]
    const filteredSessions = filterSessionsByRange(sessions, range)
    const filteredDaily = filterDailyByRange(daily, range)
    return {
      scanState: this.getScanState(),
      summary: buildSummary(filteredSessions, filteredDaily),
      daily: buildDailyPoints(filteredDaily),
      modelBreakdown: buildBreakdown(filteredSessions, 'model'),
      providerBreakdown: buildBreakdown(filteredSessions, 'provider'),
      recentSessions: buildRecentSessions(filteredSessions, recentSessionLimit)
    }
  }

  async getSummary(_scope: ZCodeUsageScope, range: ZCodeUsageRange): Promise<ZCodeUsageSummary> {
    await this.refresh(false)
    const sessions = this.state.sessions as ZCodeUsageSession[]
    const daily = this.state.dailyAggregates as ZCodeUsageDailyAggregate[]
    const filteredSessions = filterSessionsByRange(sessions, range)
    const filteredDaily = filterDailyByRange(daily, range)
    return buildSummary(filteredSessions, filteredDaily)
  }

  async getDaily(_scope: ZCodeUsageScope, range: ZCodeUsageRange): Promise<ZCodeUsageDailyPoint[]> {
    await this.refresh(false)
    const daily = this.state.dailyAggregates as ZCodeUsageDailyAggregate[]
    return buildDailyPoints(filterDailyByRange(daily, range))
  }

  async getBreakdown(
    _scope: ZCodeUsageScope,
    range: ZCodeUsageRange,
    kind: ZCodeUsageBreakdownKind
  ): Promise<ZCodeUsageBreakdownRow[]> {
    await this.refresh(false)
    const sessions = this.state.sessions as ZCodeUsageSession[]
    return buildBreakdown(filterSessionsByRange(sessions, range), kind)
  }

  async getRecentSessions(
    _scope: ZCodeUsageScope,
    range: ZCodeUsageRange,
    limit = 10
  ): Promise<ZCodeUsageSessionRow[]> {
    await this.refresh(false)
    const sessions = this.state.sessions as ZCodeUsageSession[]
    return buildRecentSessions(filterSessionsByRange(sessions, range), limit)
  }
}
