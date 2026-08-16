import type { ForgeProvider } from '../source-control/forge-provider'
import { hostedReviewExecutionArgs } from '../source-control/forge-provider'
import { mapGiteeReview } from '../source-control/forge-review-mappers'
import { getGiteePullRequest, getGiteePullRequestForBranch, getGiteeRepoSlug } from './client'

export const giteeForgeProvider = {
  id: 'gitee',
  supportsReviewCreation: false,
  resolveRepository: (context) =>
    getGiteeRepoSlug(context.repoPath, context.connectionId, ...hostedReviewExecutionArgs(context)),
  async getReviewForBranch(input) {
    const pr = await getGiteePullRequestForBranch(
      input.repoPath,
      input.branch,
      input.linkedReviewNumber ?? null,
      input.connectionId,
      ...hostedReviewExecutionArgs(input)
    )
    return pr ? mapGiteeReview(pr) : null
  },
  async getReviewByNumber(input) {
    const pr = await getGiteePullRequest(
      input.repoPath,
      input.number,
      input.connectionId,
      ...hostedReviewExecutionArgs(input)
    )
    return pr ? mapGiteeReview(pr) : null
  }
} satisfies ForgeProvider
