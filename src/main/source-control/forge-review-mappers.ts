import type { HostedReviewInfo } from '../../shared/hosted-review'
import { hostedReviewInfoFromGitHubPRInfo } from '../../shared/hosted-review-github'
import type { PRInfo } from '../../shared/github/pull-request-types'
import type { GiteePull } from '../../shared/gitee-api'
import type { MRInfo } from '../../shared/gitlab-types'
import type { AzureDevOpsPullRequestInfo } from '../azure-devops/pull-request-mappers'
import type { BitbucketPullRequestInfo } from '../bitbucket/pull-request-mappers'
import type { GiteaPullRequestInfo } from '../gitea/pull-request-mappers'

export function mapGitHubReview(pr: PRInfo): HostedReviewInfo {
  return hostedReviewInfoFromGitHubPRInfo(pr)
}

function mapGitLabReviewState(state: MRInfo['state']): HostedReviewInfo['state'] {
  if (state === 'opened' || state === 'locked') {
    return 'open'
  }
  return state
}

export function mapGitLabReview(mr: MRInfo): HostedReviewInfo {
  return {
    provider: 'gitlab',
    number: mr.number,
    title: mr.title,
    state: mapGitLabReviewState(mr.state),
    url: mr.url,
    status: mr.pipelineStatus,
    updatedAt: mr.updatedAt,
    mergeable: mr.mergeable,
    ...(mr.mergeStateStatus !== undefined ? { mergeStateStatus: mr.mergeStateStatus } : {}),
    ...(mr.headSha ? { headSha: mr.headSha } : {}),
    ...(mr.conflictSummary ? { conflictSummary: mr.conflictSummary } : {})
  }
}

export function mapBitbucketReview(pr: BitbucketPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'bitbucket',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

export function mapAzureDevOpsReview(pr: AzureDevOpsPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'azure-devops',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

export function mapGiteaReview(pr: GiteaPullRequestInfo): HostedReviewInfo {
  return {
    provider: 'gitea',
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    status: pr.status,
    updatedAt: pr.updatedAt,
    mergeable: pr.mergeable,
    ...(pr.headSha ? { headSha: pr.headSha } : {})
  }
}

export function mapGiteeReview(pull: GiteePull): HostedReviewInfo {
  return {
    provider: 'gitee',
    number: pull.number,
    title: pull.title,
    state: pull.state,
    url: pull.url,
    // Why: Gitee CI status is not queried in L1; a neutral status keeps the
    // checks UI from fabricating success or failure.
    status: 'neutral',
    updatedAt: pull.updatedAt ?? '',
    mergeable: pull.mergeable === null ? 'UNKNOWN' : pull.mergeable ? 'MERGEABLE' : 'CONFLICTING'
  }
}
