// Gitee OpenAPI v5 DTOs — field shapes verified against live API responses
// (2026-08-16). Notable divergences from GitHub v3: issue numbers are
// alphanumeric strings (e.g. "IJZ86Z"), and repo html_url carries a .git suffix.

export type GiteePullState = 'open' | 'closed' | 'merged' | 'draft'

export type RawGiteeUser = {
  login?: string | null
  name?: string | null
  avatar_url?: string | null
}

export type RawGiteeRef = {
  ref?: string | null
  sha?: string | null
  repo?: {
    full_name?: string | null
    html_url?: string | null
    ssh_url?: string | null
  } | null
}

export type RawGiteePull = {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  draft?: boolean
  merged_at?: string | null
  mergeable?: boolean | null
  user?: RawGiteeUser | null
  head?: RawGiteeRef | null
  base?: RawGiteeRef | null
  created_at?: string | null
  updated_at?: string | null
}

export type GiteePull = {
  number: number
  title: string
  state: GiteePullState
  url: string
  draft: boolean
  mergeable: boolean | null
  authorLogin: string | null
  headRef: string | null
  baseRef: string | null
  updatedAt: string | null
}

export type RawGiteeRepo = {
  full_name: string
  path: string
  name: string
  html_url: string
  private: boolean
  description?: string | null
  default_branch?: string | null
  fork?: boolean
  stargazers_count?: number
  updated_at?: string | null
}

export type GiteeRepo = {
  fullName: string
  path: string
  name: string
  htmlUrl: string
  private: boolean
  description: string | null
  defaultBranch: string | null
  updatedAt: string | null
}

export type RawGiteeIssue = {
  id: number
  // Why: Gitee issue numbers are alphanumeric strings, not integers.
  number: string
  title: string
  state: string
  html_url: string
  body?: string | null
  user?: RawGiteeUser | null
  created_at?: string | null
  updated_at?: string | null
}

export type GiteeIssue = {
  number: string
  title: string
  state: 'open' | 'closed' | 'rejected' | 'processing'
  url: string
  authorLogin: string | null
  updatedAt: string | null
}

// Account-level aggregation item for the Tasks surface: a pull or issue
// tagged with its owning repository.
export type GiteeAccountItem = {
  kind: 'pull' | 'issue'
  number: string
  title: string
  state: string
  url: string
  repoFullName: string
  repoHtmlUrl: string
  updatedAt: string | null
}
