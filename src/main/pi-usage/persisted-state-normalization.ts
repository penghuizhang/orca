import type { PiUsagePersistedState } from './types'

export function getDefaultState(): PiUsagePersistedState {
  return {
    processedFiles: [],
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

export function normalizePersistedState(state: PiUsagePersistedState): PiUsagePersistedState {
  return {
    ...state,
    processedFiles: Array.isArray(state.processedFiles) ? state.processedFiles : [],
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
