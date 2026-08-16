import type { ForgeProvider } from '../source-control/forge-provider'
import { getGiteeRepoRef } from './repository-ref'

// Why: L0 只做 provider 识别；PR 查询在 L1 接入 API 客户端（PAT 认证）后实现。
export const giteeForgeProvider = {
  id: 'gitee',
  supportsReviewCreation: false,
  resolveRepository: (context) => getGiteeRepoRef(context.repoPath, context.connectionId),
  async getReviewForBranch() {
    return null
  },
  async getReviewByNumber() {
    return null
  }
} satisfies ForgeProvider
