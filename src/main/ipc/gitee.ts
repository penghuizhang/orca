import { ipcMain } from 'electron'
import {
  connectGitee,
  disconnectGitee,
  getGiteeConnectionStatus,
  type GiteeConnectArgs,
  type GiteeConnectResult,
  type GiteeConnectionStatus
} from '../gitee/credential-connection'
import {
  listGiteeIssues,
  listGiteePulls,
  listGiteeRepos,
  type GiteeListResult
} from '../gitee/client'
import type { GiteeIssue, GiteePull, GiteeRepo } from '../../shared/gitee-api'

function normalizeConnectInput(value: unknown): GiteeConnectArgs | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const accessToken = (value as Record<string, unknown>).accessToken
  return typeof accessToken === 'string' ? { accessToken } : null
}

function normalizeListPage(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : 1
}

function normalizeRepoState(value: unknown): 'open' | 'closed' | 'all' {
  return value === 'open' || value === 'closed' || value === 'all' ? value : 'open'
}

export function registerGiteeHandlers(): void {
  ipcMain.handle('gitee:connect', async (_event, args: unknown): Promise<GiteeConnectResult> => {
    const input = normalizeConnectInput(args)
    if (!input) {
      return { ok: false, error: 'Invalid Gitee credentials' }
    }
    return connectGitee(input)
  })

  ipcMain.handle('gitee:disconnect', async (): Promise<void> => {
    disconnectGitee()
  })

  ipcMain.handle('gitee:status', async (): Promise<GiteeConnectionStatus> => {
    return getGiteeConnectionStatus()
  })

  ipcMain.handle(
    'gitee:listRepos',
    async (_event, args: unknown): Promise<GiteeListResult<GiteeRepo>> => {
      const page = normalizeListPage((args as Record<string, unknown> | null)?.page)
      return listGiteeRepos(page)
    }
  )

  ipcMain.handle(
    'gitee:listPulls',
    async (_event, args: unknown): Promise<GiteeListResult<GiteePull>> => {
      const raw = (args ?? {}) as Record<string, unknown>
      if (typeof raw.owner !== 'string' || typeof raw.repo !== 'string') {
        return { ok: false, reason: 'unreachable' }
      }
      return listGiteePulls(
        raw.owner,
        raw.repo,
        normalizeRepoState(raw.state),
        normalizeListPage(raw.page)
      )
    }
  )

  ipcMain.handle(
    'gitee:listIssues',
    async (_event, args: unknown): Promise<GiteeListResult<GiteeIssue>> => {
      const raw = (args ?? {}) as Record<string, unknown>
      if (typeof raw.owner !== 'string' || typeof raw.repo !== 'string') {
        return { ok: false, reason: 'unreachable' }
      }
      return listGiteeIssues(
        raw.owner,
        raw.repo,
        normalizeRepoState(raw.state),
        normalizeListPage(raw.page)
      )
    }
  )
}
