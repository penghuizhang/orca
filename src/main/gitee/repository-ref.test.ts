import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { gitExecFileAsyncMock } = vi.hoisted(() => ({
  gitExecFileAsyncMock: vi.fn()
}))

vi.mock('../git/runner', () => ({
  gitExecFileAsync: gitExecFileAsyncMock
}))

import { _resetGiteeRepoRefCache, getGiteeRepoRef, parseGiteeRepoRef } from './repository-ref'

describe('Gitee repository ref parsing', () => {
  beforeEach(() => {
    gitExecFileAsyncMock.mockReset()
    _resetGiteeRepoRefCache()
  })

  afterEach(() => {
    _resetGiteeRepoRefCache()
  })

  it('parses HTTPS remotes and derives the API base URL', () => {
    expect(parseGiteeRepoRef('https://gitee.com/team/project.git')).toEqual({
      host: 'gitee.com',
      owner: 'team',
      repo: 'project',
      apiBaseUrl: 'https://gitee.com/api/v5',
      webBaseUrl: 'https://gitee.com'
    })
  })

  it('parses SCP-style SSH remotes', () => {
    expect(parseGiteeRepoRef('git@gitee.com:team/project.git')).toMatchObject({
      host: 'gitee.com',
      owner: 'team',
      repo: 'project'
    })
  })

  it('parses ssh:// remotes', () => {
    expect(parseGiteeRepoRef('ssh://git@gitee.com/team/project.git')).toMatchObject({
      host: 'gitee.com',
      owner: 'team',
      repo: 'project'
    })
  })

  it('normalizes www.gitee.com', () => {
    expect(parseGiteeRepoRef('https://www.gitee.com/team/project.git')).toMatchObject({
      host: 'www.gitee.com',
      owner: 'team',
      repo: 'project'
    })
  })

  it('rejects non-Gitee hosts', () => {
    expect(parseGiteeRepoRef('https://github.com/team/project.git')).toBeNull()
    expect(parseGiteeRepoRef('https://gitlab.com/team/project.git')).toBeNull()
    expect(parseGiteeRepoRef('https://git.example.com/team/project.git')).toBeNull()
  })

  it('rejects malformed and nested paths', () => {
    expect(parseGiteeRepoRef('https://gitee.com/single-part.git')).toBeNull()
    expect(parseGiteeRepoRef('https://gitee.com/a/b/c.git')).toBeNull()
  })

  it('resolves the origin remote via git remote get-url', async () => {
    gitExecFileAsyncMock.mockResolvedValue({
      stdout: 'https://gitee.com/team/project.git',
      stderr: ''
    })
    await expect(getGiteeRepoRef('/repo')).resolves.toMatchObject({
      host: 'gitee.com',
      owner: 'team',
      repo: 'project'
    })
  })

  it('returns null when the origin remote is not Gitee', async () => {
    gitExecFileAsyncMock.mockResolvedValue({
      stdout: 'https://github.com/team/project.git',
      stderr: ''
    })
    await expect(getGiteeRepoRef('/repo')).resolves.toBeNull()
  })

  it('returns null when git has no remote', async () => {
    gitExecFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })
    await expect(getGiteeRepoRef('/repo')).resolves.toBeNull()
  })
})
