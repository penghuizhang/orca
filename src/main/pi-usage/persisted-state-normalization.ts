import { PI_USAGE_SCHEMA_VERSION } from './pi-usage-provider'
import type { PiUsagePersistedState } from './types'

export function getDefaultState(): PiUsagePersistedState {
  return {
    schemaVersion: PI_USAGE_SCHEMA_VERSION,
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
  // Why: a cache from another schema cannot be trusted; rescan but keep the opt-in.
  if (state.schemaVersion !== PI_USAGE_SCHEMA_VERSION) {
    const defaults = getDefaultState()
    return {
      ...defaults,
      scanState: { ...defaults.scanState, enabled: state.scanState?.enabled ?? true }
    }
  }
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
