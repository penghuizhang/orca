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
import type { PiUsageRange, PiUsageScope, PiUsageSnapshot } from '../../../../shared/pi-usage-types'
import type {
  ZCodeUsageRange,
  ZCodeUsageScope,
  ZCodeUsageSnapshot
} from '../../../../shared/zcode-usage-types'
import {
  createUsageProviderSlice,
  type ProviderUsageSlice,
  type UsageShape
} from './usage-slice-factory'

type ClaudeUsageShape = UsageShape<ClaudeUsageScope, ClaudeUsageRange, ClaudeUsageSnapshot>
type CodexUsageShape = UsageShape<CodexUsageScope, CodexUsageRange, CodexUsageSnapshot>
type OpenCodeUsageShape = UsageShape<OpenCodeUsageScope, OpenCodeUsageRange, OpenCodeUsageSnapshot>
type ZCodeUsageShape = UsageShape<ZCodeUsageScope, ZCodeUsageRange, ZCodeUsageSnapshot>
type PiUsageShape = UsageShape<PiUsageScope, PiUsageRange, PiUsageSnapshot>

export type ClaudeUsageSlice = ProviderUsageSlice<'claude', 'Claude', ClaudeUsageShape>
export type CodexUsageSlice = ProviderUsageSlice<'codex', 'Codex', CodexUsageShape>
export type OpenCodeUsageSlice = ProviderUsageSlice<'openCode', 'OpenCode', OpenCodeUsageShape>
export type ZCodeUsageSlice = ProviderUsageSlice<'zcode', 'ZCode', ZCodeUsageShape>
export type PiUsageSlice = ProviderUsageSlice<'pi', 'Pi', PiUsageShape>

export const createClaudeUsageSlice = createUsageProviderSlice<
  'claude',
  'Claude',
  ClaudeUsageShape
>({
  prefix: 'claude',
  name: 'Claude',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.claudeUsage,
  hasCachedData: (state) => state.hasAnyClaudeData
})

export const createCodexUsageSlice = createUsageProviderSlice<'codex', 'Codex', CodexUsageShape>({
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
  OpenCodeUsageShape
>({
  prefix: 'openCode',
  name: 'OpenCode',
  initialScope: 'orca',
  initialRange: '30d',
  getApi: () => window.api.openCodeUsage,
  hasCachedData: (state) => state.hasAnyOpenCodeData
})

export const createZCodeUsageSlice = createUsageProviderSlice<'zcode', 'ZCode', ZCodeUsageShape>({
  prefix: 'zcode',
  name: 'ZCode',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.zcodeUsage,
  hasCachedData: (state) => state.hasAnyZCodeData
})

export const createPiUsageSlice = createUsageProviderSlice<'pi', 'Pi', PiUsageShape>({
  prefix: 'pi',
  name: 'Pi',
  initialScope: 'all',
  initialRange: '30d',
  getApi: () => window.api.piUsage,
  hasCachedData: (state) => state.hasAnyPiData
})
