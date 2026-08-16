import type {
  BitbucketConnectArgs,
  BitbucketConnectionStatus
} from '../../shared/bitbucket-credentials'
import type { GiteeConnectArgs, GiteeConnectionStatus } from '../../shared/gitee-credentials'
import type { GiteeAccountItem, GiteeIssue, GiteePull, GiteeRepo } from '../../shared/gitee-api'
import type {
  CreateHostedReviewArgs,
  CreateHostedReviewResult,
  CreateStackedHostedReviewArgs,
  CreateStackedHostedReviewResult,
  HostedReviewCreationEligibility,
  HostedReviewCreationEligibilityArgs,
  HostedReviewForBranchArgs,
  HostedReviewInfo
} from '../../shared/hosted-review'

export type HostedReviewApi = {
  forBranch: (args: HostedReviewForBranchArgs) => Promise<HostedReviewInfo | null>
  getCreationEligibility: (
    args: HostedReviewCreationEligibilityArgs
  ) => Promise<HostedReviewCreationEligibility>
  create: (args: CreateHostedReviewArgs) => Promise<CreateHostedReviewResult>
  createStacked: (args: CreateStackedHostedReviewArgs) => Promise<CreateStackedHostedReviewResult>
}

export type BitbucketApi = {
  connect: (
    args: BitbucketConnectArgs
  ) => Promise<{ ok: true; account: string | null } | { ok: false; error: string }>
  disconnect: () => Promise<void>
  status: () => Promise<BitbucketConnectionStatus>
}

type GiteeListApiResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; reason: 'rejected' | 'unreachable' }

export type GiteeApi = {
  connect: (
    args: GiteeConnectArgs
  ) => Promise<{ ok: true; account: string | null } | { ok: false; error: string }>
  disconnect: () => Promise<void>
  status: () => Promise<GiteeConnectionStatus>
  listRepos: (args?: { page?: number }) => Promise<GiteeListApiResult<GiteeRepo>>
  listPulls: (args: {
    owner: string
    repo: string
    state?: 'open' | 'closed' | 'all'
    page?: number
  }) => Promise<GiteeListApiResult<GiteePull>>
  listIssues: (args: {
    owner: string
    repo: string
    state?: 'open' | 'closed' | 'all'
    page?: number
  }) => Promise<GiteeListApiResult<GiteeIssue>>
  listAccountPulls: () => Promise<GiteeListApiResult<GiteeAccountItem>>
  listAccountIssues: () => Promise<GiteeListApiResult<GiteeAccountItem>>
}
