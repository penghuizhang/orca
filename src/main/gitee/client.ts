import type { HostedReviewExecutionOptions } from '../source-control/hosted-review-git-options'
import { getHostedReviewLocalGitOptions } from '../source-control/hosted-review-git-options'
import type {
  GiteeAccountItem,
  GiteePull,
  GiteeRepo,
  GiteeIssue,
  RawGiteePull,
  RawGiteeRepo,
  RawGiteeIssue
} from '../../shared/gitee-api'
import { requestGiteeJson } from './api'
import { resolveGiteeAuthConfig } from './resolve-auth'
import type { GiteeAuthConfig } from './gitee-auth-config'
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

// Why: Gitee has no account-level pull endpoint, so the Tasks surface
// aggregates open PRs across the authenticated user's repos. Bounded to keep
// the request fan-out sane on large accounts.
const ACCOUNT_AGGREGATE_REPO_LIMIT = 50
const ACCOUNT_AGGREGATE_PER_REPO_LIMIT = 5
const ACCOUNT_AGGREGATE_CONCURRENCY = 8

async function listAccountRepos(config: GiteeAuthConfig): Promise<RawGiteeRepo[] | null> {
  const result = await requestGiteeJson<RawGiteeRepo[]>(config, '/user/repos', {
    type: 'all',
    page: 1,
    per_page: 100
  })
  return result.ok ? result.data : null
}

async function mapReposWithConcurrency<T>(
  repos: RawGiteeRepo[],
  mapper: (repo: RawGiteeRepo) => Promise<T[]>
): Promise<T[]> {
  const results: T[][] = []
  let index = 0
  async function worker(): Promise<void> {
    while (index < repos.length) {
      const current = repos[index]
      index += 1
      results.push(await mapper(current))
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(ACCOUNT_AGGREGATE_CONCURRENCY, repos.length) }, () => worker())
  )
  return results.flat()
}

function accountRepoOwner(repo: RawGiteeRepo): string {
  return repo.full_name.split('/')[0] ?? ''
}

export async function listAccountPulls(): Promise<GiteeListResult<GiteeAccountItem>> {
  const config = resolveGiteeAuthConfig()
  const repos = await listAccountRepos(config)
  if (!repos) {
    return { ok: false, reason: 'unreachable' }
  }
  const items = await mapReposWithConcurrency(
    repos.slice(0, ACCOUNT_AGGREGATE_REPO_LIMIT),
    async (repo) => {
      const result = await requestGiteeJson<RawGiteePull[]>(
        config,
        `/repos/${encodeURIComponent(accountRepoOwner(repo))}/${encodeURIComponent(repo.path)}/pulls`,
        { state: 'open', page: 1, per_page: ACCOUNT_AGGREGATE_PER_REPO_LIMIT }
      )
      if (!result.ok) {
        return []
      }
      return result.data.map(mapGiteePull).map((pull) => ({
        kind: 'pull' as const,
        number: String(pull.number),
        title: pull.title,
        state: pull.state,
        url: pull.url,
        repoFullName: repo.full_name ?? '',
        repoHtmlUrl: (repo.html_url ?? '').replace(/\.git$/, ''),
        updatedAt: pull.updatedAt
      }))
    }
  )
  return { ok: true, items }
}

export async function listAccountIssues(): Promise<GiteeListResult<GiteeAccountItem>> {
  const config = resolveGiteeAuthConfig()
  const repos = await listAccountRepos(config)
  if (!repos) {
    return { ok: false, reason: 'unreachable' }
  }
  const items = await mapReposWithConcurrency(
    repos.slice(0, ACCOUNT_AGGREGATE_REPO_LIMIT),
    async (repo) => {
      const result = await requestGiteeJson<RawGiteeIssue[]>(
        config,
        `/repos/${encodeURIComponent(accountRepoOwner(repo))}/${encodeURIComponent(repo.path)}/issues`,
        { state: 'open', page: 1, per_page: ACCOUNT_AGGREGATE_PER_REPO_LIMIT }
      )
      if (!result.ok) {
        return []
      }
      return result.data.map((issue) => ({
        kind: 'issue' as const,
        number: issue.number ?? '',
        title: issue.title ?? '',
        state: normalizeIssueState(issue.state ?? 'open'),
        url: issue.html_url ?? '',
        repoFullName: repo.full_name ?? '',
        repoHtmlUrl: (repo.html_url ?? '').replace(/\.git$/, ''),
        updatedAt: issue.updated_at ?? null
      }))
    }
  )
  return { ok: true, items }
}
