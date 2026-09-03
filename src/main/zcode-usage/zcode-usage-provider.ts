import type { UsageProvider } from '../usage/usage-provider-contract'
import { scanZCodeUsageDatabases } from './scanner'
import type {
  ZCodeUsageDailyAggregate,
  ZCodeUsagePersistedDatabase,
  ZCodeUsageSession
} from './types'

export const ZCODE_USAGE_SCHEMA_VERSION = 1

export const zcodeUsageProvider = {
  id: 'zcode',
  label: 'ZCode',
  schemaVersion: ZCODE_USAGE_SCHEMA_VERSION,
  scan: scanZCodeUsageDatabases
} satisfies UsageProvider<
  'processedDatabases',
  ZCodeUsagePersistedDatabase,
  ZCodeUsageSession,
  ZCodeUsageDailyAggregate
>
