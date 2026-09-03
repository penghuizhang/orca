import { app } from 'electron'
import { join } from 'node:path'
import type { Store } from '../persistence'
import { zcodeUsageProvider } from './zcode-usage-provider'
import { getDefaultState, normalizePersistedState } from './persisted-state-normalization'
import { UsageProviderStoreLifecycle } from '../usage/usage-provider-store-lifecycle'
import type { ZCodeUsageDailyAggregate, ZCodeUsagePersistedState, ZCodeUsageSession } from './types'

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

  getSnapshot() {
    return {
      scanState: this.getScanState(),
      sessions: this.state.sessions as ZCodeUsageSession[],
      dailyAggregates: this.state.dailyAggregates as ZCodeUsageDailyAggregate[]
    }
  }

  async getSummary(): Promise<{
    sessions: number
    inputTokens: number
    outputTokens: number
    reasoningTokens: number
    cachedInputTokens: number
  }> {
    await this.refresh(false)
    const sessions = this.state.sessions as ZCodeUsageSession[]
    return {
      sessions: sessions.length,
      inputTokens: sessions.reduce((sum, s) => sum + s.inputTokens, 0),
      outputTokens: sessions.reduce((sum, s) => sum + s.outputTokens, 0),
      reasoningTokens: sessions.reduce((sum, s) => sum + s.reasoningTokens, 0),
      cachedInputTokens: sessions.reduce((sum, s) => sum + s.cacheReadInputTokens, 0)
    }
  }

  async getDaily(): Promise<ZCodeUsageDailyAggregate[]> {
    await this.refresh(false)
    return this.state.dailyAggregates as ZCodeUsageDailyAggregate[]
  }

  async getBreakdown(): Promise<ZCodeUsageSession[]> {
    await this.refresh(false)
    return this.state.sessions as ZCodeUsageSession[]
  }

  async getRecentSessions(limit = 10): Promise<ZCodeUsageSession[]> {
    await this.refresh(false)
    const sessions = this.state.sessions as ZCodeUsageSession[]
    return sessions.sort((a, b) => b.lastEventAt - a.lastEventAt).slice(0, limit)
  }
}
