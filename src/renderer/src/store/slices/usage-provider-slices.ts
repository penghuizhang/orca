import type {
  ClaudeUsageRange,
  ClaudeUsageScope,
  ClaudeUsageSnapshot
} from '../../../../shared/claude-usage-types'
import type {
  CodexUsageRange,
  CodexUsageScope,
  CodexUsageSnapshot
} from '../../../../shared/codex-usage-types'
import type {
  OpenCodeUsageRange,
  OpenCodeUsageScope,
  OpenCodeUsageSnapshot
} from '../../../../shared/opencode-usage-types'
import type {
  MuseUsageRange,
  MuseUsageScope,
  MuseUsageSnapshot
} from '../../../../shared/muse-usage-types'
import type { PiUsageRange, PiUsageScope, PiUsageSnapshot } from '../../../../shared/pi-usage-types'
import type {
  ZCodeUsageRange,
  ZCodeUsageScope,
  ZCodeUsageSnapshot
} from '../../../../shared/zcode-usage-types'
import {
  createUsageProviderSlice,
  type ProviderUsageSlice,
  type UsageContract
} from './usage-slice-factory'

type ClaudeUsageContract = UsageContract<ClaudeUsageScope, ClaudeUsageRange, ClaudeUsageSnapshot>
type CodexUsageContract = UsageContract<CodexUsageScope, CodexUsageRange, CodexUsageSnapshot>
type OpenCodeUsageContract = UsageContract<OpenCodeUsageScope, OpenCodeUsageRange, OpenCodeUsageSnapshot>
type ZCodeUsageContract = UsageContract<ZCodeUsageScope, ZCodeUsageRange, ZCodeUsageSnapshot>
type PiUsageContract = UsageContract<PiUsageScope, PiUsageRange, PiUsageSnapshot>
type MuseUsageContract = UsageContract<MuseUsageScope, MuseUsageRange, MuseUsageSnapshot>

export type ClaudeUsageSlice = ProviderUsageSlice<'claude', 'Claude', ClaudeUsageContract>
export type CodexUsageSlice = ProviderUsageSlice<'codex', 'Codex', CodexUsageContract>
export type OpenCodeUsageSlice = ProviderUsageSlice<'openCode', 'OpenCode', OpenCodeUsageContract>
export type ZCodeUsageSlice = ProviderUsageSlice<'zcode', 'ZCode', ZCodeUsageContract>
export type PiUsageSlice = ProviderUsageSlice<'pi', 'Pi', PiUsageContract>
export type MuseUsageSlice = ProviderUsageSlice<'muse', 'Muse', MuseUsageContract>

export const createClaudeUsageSlice = createUsageProviderSlice<
  'claude',
  'Claude',
  ClaudeUsageContract
>({
  prefix: 'claude',
  name: 'Claude',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.claudeUsage,
  hasCachedData: (state) => state.hasAnyClaudeData
})

export const createCodexUsageSlice = createUsageProviderSlice<'codex', 'Codex', CodexUsageContract>({
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
  OpenCodeUsageContract
>({
  prefix: 'openCode',
  name: 'OpenCode',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.openCodeUsage,
  hasCachedData: (state) => state.hasAnyOpenCodeData
})

export const createZCodeUsageSlice = createUsageProviderSlice<'zcode', 'ZCode', ZCodeUsageContract>({
  prefix: 'zcode',
  name: 'ZCode',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.zcodeUsage,
  hasCachedData: (state) => state.hasAnyZCodeData
})

export const createPiUsageSlice = createUsageProviderSlice<'pi', 'Pi', PiUsageContract>({
  prefix: 'pi',
  name: 'Pi',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.piUsage,
  hasCachedData: (state) => state.hasAnyPiData
})

export const createMuseUsageSlice = createUsageProviderSlice<'muse', 'Muse', MuseUsageContract>({
  prefix: 'muse',
  name: 'Muse',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.museUsage,
  hasCachedData: (state) => state.hasAnyMuseData
})
