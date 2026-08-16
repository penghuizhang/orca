import { ipcMain } from 'electron'
import {
  connectGitee,
  disconnectGitee,
  getGiteeConnectionStatus,
  type GiteeConnectArgs,
  type GiteeConnectResult,
  type GiteeConnectionStatus
} from '../gitee/credential-connection'

function normalizeConnectInput(value: unknown): GiteeConnectArgs | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const accessToken = (value as Record<string, unknown>).accessToken
  return typeof accessToken === 'string' ? { accessToken } : null
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
}
