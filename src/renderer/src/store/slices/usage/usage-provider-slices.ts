import { createUsageProviderSlice } from './usage-provider-slice'
import type {
  ClaudeUsageTypes,
  CodexUsageTypes,
  OpenCodeUsageTypes,
  MuseUsageTypes,
  PiUsageTypes,
  ZCodeUsageTypes
} from './usage-provider-slice-contract'

export type {
  ClaudeUsageSlice,
  CodexUsageSlice,
  OpenCodeUsageSlice,
  MuseUsageSlice,
  PiUsageSlice,
  ZCodeUsageSlice
} from './usage-provider-slice-contract'

export const createClaudeUsageSlice = createUsageProviderSlice<
  'claude',
  'Claude',
  ClaudeUsageTypes
>({
  prefix: 'claude',
  name: 'Claude',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.claudeUsage,
  hasCachedData: (state) => state.hasAnyClaudeData
})

export const createCodexUsageSlice = createUsageProviderSlice<'codex', 'Codex', CodexUsageTypes>({
  prefix: 'codex',
  name: 'Codex',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.codexUsage,
  hasCachedData: (state) => state.hasAnyCodexData
})

export const createOpenCodeUsageSlice = createUsageProviderSlice<
  'openCode',
  'OpenCode',
  OpenCodeUsageTypes
>({
  prefix: 'openCode',
  name: 'OpenCode',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.openCodeUsage,
  hasCachedData: (state) => state.hasAnyOpenCodeData
})

export const createZCodeUsageSlice = createUsageProviderSlice<
  'zcode',
  'ZCode',
  ZCodeUsageTypes
>({
  prefix: 'zcode',
  name: 'ZCode',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.zcodeUsage,
  hasCachedData: (state) => state.hasAnyZCodeData
})

export const createPiUsageSlice = createUsageProviderSlice<'pi', 'Pi', PiUsageTypes>({
  prefix: 'pi',
  name: 'Pi',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.piUsage,
  hasCachedData: (state) => state.hasAnyPiData
})

export const createMuseUsageSlice = createUsageProviderSlice<'muse', 'Muse', MuseUsageTypes>({
  prefix: 'muse',
  name: 'Muse',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.museUsage,
  hasCachedData: (state) => state.hasAnyMuseData
})
