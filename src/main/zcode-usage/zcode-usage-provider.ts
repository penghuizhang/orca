import type { UsageProvider } from '../usage/usage-provider-contract'
import { scanZCodeUsageDatabases } from './scanner'
import type { ZCodeUsageDailyAggregate, ZCodeUsageSession } from './types'

// v2: per-source records carry their own aggregates (reuse no longer drops totals).
export const ZCODE_USAGE_SCHEMA_VERSION = 2

export const zcodeUsageProvider = {
  id: 'zcode',
  label: 'ZCode',
  schemaVersion: ZCODE_USAGE_SCHEMA_VERSION,
  scan: scanZCodeUsageDatabases
} satisfies UsageProvider<ZCodeUsageSession, ZCodeUsageDailyAggregate>
