import type { UsageProvider } from '../usage/usage-provider-contract'
import { scanPiUsageSessions } from './scanner'
import type { PiUsageDailyAggregate, PiUsageProcessedFile, PiUsageSession } from './types'

export const PI_USAGE_SCHEMA_VERSION = 1

export const piUsageProvider = {
  id: 'pi',
  label: 'Pi',
  schemaVersion: PI_USAGE_SCHEMA_VERSION,
  scan: scanPiUsageSessions
} satisfies UsageProvider<
  'processedFiles',
  PiUsageProcessedFile,
  PiUsageSession,
  PiUsageDailyAggregate
>
