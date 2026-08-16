import type { HostedReviewExecutionOptions } from '../source-control/hosted-review-git-options'
import { getHostedReviewLocalGitOptions } from '../source-control/hosted-review-git-options'
import type {
  GiteePull,
  GiteeRepo,
  GiteeIssue,
  RawGiteePull,
  RawGiteeRepo,
  RawGiteeIssue
} from '../../shared/gitee-api'
import { requestGiteeJson } from './api'
import { resolveGiteeAuthConfig } from './resolve-auth'
import { getGiteeRepoRef, type GiteeRepoRef } from './repository-ref'
import { mapGiteePull } from './pull-request-mappers'

// Why: Gitee caps per_page at 100; scanning five pages bounds a head-ref match
// while still covering long-lived PR lists.
const PULL_SCAN_MAX_PAGES = 5
const LIST_PER_PAGE = 100

export async function getGiteeRepoSlug(
  repoPath: string,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<GiteeRepoRef | null> {
  return getGiteeRepoRef(repoPath, connectionId, getHostedReviewLocalGitOptions(options))
}

function encodedRepoPath(repo: GiteeRepoRef): string {
  return `${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`
}

export async function getGiteePullRequest(
  repoPath: string,
  prNumber: number,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<GiteePull | null> {
  const repo = await getGiteeRepoRef(
    repoPath,
    connectionId,
    getHostedReviewLocalGitOptions(options)
  )
  if (!repo) {
    return null
  }
  const result = await requestGiteeJson<RawGiteePull>(
    resolveGiteeAuthConfig(),
    `/repos/${encodedRepoPath(repo)}/pulls/${encodeURIComponent(String(prNumber))}`
  )
  return result.ok ? mapGiteePull(result.data) : null
}

export async function getGiteePullRequestForBranch(
  repoPath: string,
  branch: string,
  linkedPRNumber?: number | null,
  connectionId?: string | null,
  options: HostedReviewExecutionOptions = {}
): Promise<GiteePull | null> {
  const branchName = branch.replace(/^refs\/heads\//, '')
  if (!branchName && linkedPRNumber == null) {
    return null
  }
  if (linkedPRNumber != null) {
    return getGiteePullRequest(repoPath, linkedPRNumber, connectionId, options)
  }
  const repo = await getGiteeRepoRef(
    repoPath,
    connectionId,
    getHostedReviewLocalGitOptions(options)
  )
  if (!repo) {
    return null
  }
  const config = resolveGiteeAuthConfig()
  for (let page = 1; page <= PULL_SCAN_MAX_PAGES; page += 1) {
    const result = await requestGiteeJson<RawGiteePull[]>(
      config,
      `/repos/${encodedRepoPath(repo)}/pulls`,
      { state: 'all', page, per_page: LIST_PER_PAGE }
    )
    if (!result.ok) {
      return null
    }
    const match = result.data.find((raw) => raw.head?.ref === branchName)
    if (match) {
      return mapGiteePull(match)
    }
    if (result.data.length < LIST_PER_PAGE) {
      break
    }
  }
  return null
}

export type GiteeListResult<T> =
  | { ok: true; items: T[] }
  | { ok: false; reason: 'rejected' | 'unreachable' }

// Why: /user/repos with type=all lists the authenticated user's own public and
// private repositories — the L1 scope the user confirmed.
export async function listGiteeRepos(
  page = 1,
  perPage = LIST_PER_PAGE
): Promise<GiteeListResult<GiteeRepo>> {
  const config = resolveGiteeAuthConfig()
  const result = await requestGiteeJson<RawGiteeRepo[]>(config, '/user/repos', {
    type: 'all',
    page,
    per_page: perPage
  })
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  return {
    ok: true,
    items: result.data.map((raw) => ({
      fullName: raw.full_name ?? '',
      path: raw.path ?? '',
      name: raw.name ?? '',
      // Why: Gitee repo html_url carries a .git suffix — strip it for display.
      htmlUrl: (raw.html_url ?? '').replace(/\.git$/, ''),
      private: Boolean(raw.private),
      description: raw.description ?? null,
      defaultBranch: raw.default_branch ?? null,
      updatedAt: raw.updated_at ?? null
    }))
  }
}

export async function listGiteePulls(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  page = 1,
  perPage = LIST_PER_PAGE
): Promise<GiteeListResult<GiteePull>> {
  const config = resolveGiteeAuthConfig()
  const result = await requestGiteeJson<RawGiteePull[]>(
    config,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
    {
      state,
      page,
      per_page: perPage
    }
  )
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  return { ok: true, items: result.data.map(mapGiteePull) }
}

export async function listGiteeIssues(
  owner: string,
  repo: string,
  state: 'open' | 'closed' | 'all' = 'open',
  page = 1,
  perPage = LIST_PER_PAGE
): Promise<GiteeListResult<GiteeIssue>> {
  const config = resolveGiteeAuthConfig()
  const result = await requestGiteeJson<RawGiteeIssue[]>(
    config,
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`,
    {
      state,
      page,
      per_page: perPage
    }
  )
  if (!result.ok) {
    return { ok: false, reason: result.reason }
  }
  return {
    ok: true,
    items: result.data.map((raw) => ({
      number: raw.number ?? '',
      title: raw.title ?? '',
      state: normalizeIssueState(raw.state),
      url: raw.html_url ?? '',
      authorLogin: raw.user?.login ?? null,
      updatedAt: raw.updated_at ?? null
    }))
  }
}

function normalizeIssueState(state: string): GiteeIssue['state'] {
  switch (state) {
    case 'open':
    case 'closed':
    case 'rejected':
    case 'processing':
      return state
    default:
      return 'open'
  }
}
