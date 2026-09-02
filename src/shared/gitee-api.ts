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
  body?: string | null
  draft?: boolean
  merged_at?: string | null
  closed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  mergeable?: boolean | null
  user?: RawGiteeUser | null
  assignees?: RawGiteeUser[] | null
  labels?: GiteeLabel[] | null
  milestone?: { title?: string | null } | null
  head?: RawGiteeRef | null
  base?: RawGiteeRef | null
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
  assignee?: RawGiteeUser | null
  labels?: GiteeLabel[] | null
  milestone?: { title?: string | null } | null
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
export type GiteeLabel = {
  name: string
  color: string | null
}

export type GiteeAccountItem = {
  kind: 'pull' | 'issue'
  number: string
  title: string
  state: string
  url: string
  repoFullName: string
  repoHtmlUrl: string
  authorLogin: string | null
  authorAvatarUrl: string | null
  assigneeLogin: string | null
  assigneeAvatarUrl: string | null
  labels: GiteeLabel[]
  updatedAt: string | null
}

export type GiteeItemDetail = {
  kind: 'pull' | 'issue'
  number: string
  title: string
  state: string
  url: string
  repoFullName: string
  body: string | null
  labels: GiteeLabel[]
  milestone: string | null
  authorLogin: string | null
  authorAvatarUrl: string | null
  assigneeLogin: string | null
  assigneeAvatarUrl: string | null
  createdAt: string | null
  updatedAt: string | null
  mergedAt: string | null
}

export type GiteeComment = {
  id: number
  body: string
  authorLogin: string | null
  authorAvatarUrl: string | null
  createdAt: string | null
}

export type GiteePullFile = {
  filename: string
  additions: number
  deletions: number
  status: string | null
  patch: string | null
}

export type GiteePullCommit = {
  sha: string
  message: string
  authorLogin: string | null
  createdAt: string | null
}

export type RawGiteeComment = {
  id: number
  body?: string | null
  user?: RawGiteeUser | null
  created_at?: string | null
}

export type RawGiteePullFile = {
  filename?: string | null
  additions?: number
  deletions?: number
  status?: string | null
  patch?: string | null
}

export type RawGiteePullCommit = {
  sha?: string | null
  commit?: {
    message?: string | null
    author?: { name?: string | null; date?: string | null } | null
  } | null
  author?: RawGiteeUser | null
}
