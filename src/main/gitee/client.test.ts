import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { gitExecFileAsyncMock } = vi.hoisted(() => ({
  gitExecFileAsyncMock: vi.fn()
}))

vi.mock('../git/runner', () => ({
  gitExecFileAsync: gitExecFileAsyncMock
}))

import { _resetGiteeRepoRefCache } from './repository-ref'
import {
  getGiteePullRequest,
  getGiteePullRequestForBranch,
  listGiteeIssues,
  listGiteePulls,
  listGiteeRepos
} from './client'
import { mapGiteePull } from './pull-request-mappers'

const OLD_ENV = process.env
const OLD_FETCH = globalThis.fetch

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

beforeEach(() => {
  process.env = { ...OLD_ENV }
  process.env.ORCA_GITEE_ACCESS_TOKEN = 'pat-test'
  gitExecFileAsyncMock.mockReset()
  _resetGiteeRepoRefCache()
})

afterEach(() => {
  process.env = OLD_ENV
  globalThis.fetch = OLD_FETCH
})

const RAW_PULL = {
  id: 1,
  number: 42,
  title: 'feat: gitee support',
  state: 'open',
  html_url: 'https://gitee.com/team/orca/pulls/42',
  draft: false,
  merged_at: null,
  mergeable: true,
  user: { login: 'ada' },
  head: { ref: 'feat/gitee', sha: 'abc123', repo: { full_name: 'team/orca' } },
  base: { ref: 'master', sha: 'def456', repo: { full_name: 'team/orca' } },
  updated_at: '2026-08-16T10:00:00+08:00'
}

describe('Gitee pull request mapping', () => {
  it('normalizes merged PRs that Gitee reports as closed', () => {
    const merged = mapGiteePull({
      ...RAW_PULL,
      state: 'closed',
      merged_at: '2026-08-15T10:00:00+08:00'
    })
    expect(merged.state).toBe('merged')
    expect(merged.mergeable).toBe(true)
    expect(merged.authorLogin).toBe('ada')
  })

  it('normalizes drafts', () => {
    const draft = mapGiteePull({ ...RAW_PULL, draft: true })
    expect(draft.state).toBe('draft')
  })
})

describe('Gitee pull request lookup', () => {
  beforeEach(() => {
    gitExecFileAsyncMock.mockResolvedValue({
      stdout: 'https://gitee.com/team/orca.git',
      stderr: ''
    })
  })

  it('resolves a linked PR number directly', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(RAW_PULL))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const pr = await getGiteePullRequestForBranch('/repo', '', 42)
    expect(pr?.number).toBe(42)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('finds the PR whose head ref matches the branch across pages', async () => {
    const unrelated = Array.from({ length: 100 }, (_, index) => ({
      ...RAW_PULL,
      number: index + 1,
      head: { ref: `other-${index}` }
    }))
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(unrelated))
      .mockResolvedValueOnce(jsonResponse([RAW_PULL]))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const pr = await getGiteePullRequestForBranch('/repo', 'feat/gitee')
    expect(pr?.number).toBe(42)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when no page matches the branch', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse([{ ...RAW_PULL, head: { ref: 'unrelated' } }])
    ) as unknown as typeof fetch

    const pr = await getGiteePullRequestForBranch('/repo', 'feat/gitee')
    expect(pr).toBeNull()
  })

  it('fetches a pull by number', async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse(RAW_PULL)) as unknown as typeof fetch
    const pr = await getGiteePullRequest('/repo', 42)
    expect(pr?.number).toBe(42)
    expect(pr?.url).toBe('https://gitee.com/team/orca/pulls/42')
  })

  it('surfaces a rejected token', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ message: '401' }, 401)
    ) as unknown as typeof fetch
    const pr = await getGiteePullRequest('/repo', 42)
    expect(pr).toBeNull()
  })
})

describe('Gitee list endpoints', () => {
  it('lists the authenticated repos and strips the .git suffix', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse([
        {
          full_name: 'team/orca',
          path: 'orca',
          name: 'orca',
          html_url: 'https://gitee.com/team/orca.git',
          private: true,
          description: 'IDE',
          default_branch: 'main',
          updated_at: '2026-08-16T10:00:00+08:00'
        }
      ])
    ) as unknown as typeof fetch

    const result = await listGiteeRepos()
    expect(result).toMatchObject({
      ok: true,
      items: [{ fullName: 'team/orca', htmlUrl: 'https://gitee.com/team/orca', private: true }]
    })
  })

  it('lists pulls with state filtering', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request) => jsonResponse([RAW_PULL]))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await listGiteePulls('team', 'orca', 'open')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.items[0]?.number).toBe(42)
    }
    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain('/repos/team/orca/pulls')
    expect(url).toContain('state=open')
  })

  it('lists issues and keeps the alphanumeric issue number', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse([
        {
          id: 1,
          number: 'IJZ86Z',
          title: '全局变量解析不到',
          state: 'open',
          html_url: 'https://gitee.com/openspug/spug/issues/IJZ86Z',
          user: { login: 'ada' },
          updated_at: '2026-08-16T10:00:00+08:00'
        }
      ])
    ) as unknown as typeof fetch

    const result = await listGiteeIssues('openspug', 'spug', 'open')
    expect(result).toMatchObject({
      ok: true,
      items: [{ number: 'IJZ86Z', state: 'open' }]
    })
  })

  it('reports rejection on 401', async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ message: '401' }, 401)
    ) as unknown as typeof fetch
    const result = await listGiteeRepos()
    expect(result).toEqual({ ok: false, reason: 'rejected' })
  })
})
