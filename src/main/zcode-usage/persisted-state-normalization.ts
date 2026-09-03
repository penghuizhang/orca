import type { ZCodeUsagePersistedState } from './types'

export function getDefaultState(): ZCodeUsagePersistedState {
  return {
    processedDatabases: [],
    sessions: [],
    dailyAggregates: [],
    worktreeFingerprint: null,
    scanState: {
      enabled: true,
      lastScanStartedAt: null,
      lastScanCompletedAt: null,
      lastScanError: null
    }
  }
}

export function normalizePersistedState(state: ZCodeUsagePersistedState): ZCodeUsagePersistedState {
  return {
    ...state,
    processedDatabases: Array.isArray(state.processedDatabases) ? state.processedDatabases : [],
    sessions: Array.isArray(state.sessions) ? state.sessions : [],
    dailyAggregates: Array.isArray(state.dailyAggregates) ? state.dailyAggregates : [],
    scanState: {
      enabled: typeof state.scanState?.enabled === 'boolean' ? state.scanState.enabled : true,
      lastScanStartedAt: state.scanState?.lastScanStartedAt ?? null,
      lastScanCompletedAt: state.scanState?.lastScanCompletedAt ?? null,
      lastScanError: state.scanState?.lastScanError ?? null
    }
  }
}
