import { ZCODE_USAGE_SCHEMA_VERSION } from './zcode-usage-provider'
import type { ZCodeUsagePersistedState } from './types'

export function getDefaultState(): ZCodeUsagePersistedState {
  return {
    schemaVersion: ZCODE_USAGE_SCHEMA_VERSION,
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
  // Why: a cache from another schema cannot be trusted; rescan but keep the opt-in.
  if (state.schemaVersion !== ZCODE_USAGE_SCHEMA_VERSION) {
    const defaults = getDefaultState()
    return {
      ...defaults,
      scanState: { ...defaults.scanState, enabled: state.scanState?.enabled ?? true }
    }
  }
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
