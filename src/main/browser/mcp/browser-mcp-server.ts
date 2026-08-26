import { createServer } from 'node:http'
import { app, ipcMain } from 'electron'
import type { Store } from '../../persistence/loading-store/store'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import { startMcpHttpServer, type RunningMcpServer } from './browser-mcp-http-transport'
import { loadOrCreateBrowserMcpToken } from './browser-mcp-settings'

const SETTINGS_KEY = 'browserAutomationMcp'

let running: RunningMcpServer | null = null
let activeToken: string | null = null
let lifecycleRegistered = false

export type BrowserMcpStatus = {
  enabled: boolean
  url: string | null
  token: string | null
}

export function getBrowserMcpStatus(): BrowserMcpStatus {
  return {
    enabled: running !== null,
    url: running ? `http://127.0.0.1:${running.port}/mcp` : null,
    token: activeToken
  }
}

async function pickPort(preferred: number): Promise<number> {
  const candidates =
    preferred > 0 ? [preferred, ...Array.from({ length: 10 }, (_, i) => preferred + 1 + i)] : [0]
  for (const candidate of candidates) {
    const probe = createServer()
    const ok = await new Promise<boolean>((resolve) => {
      probe.once('error', () => resolve(false))
      probe.listen(candidate, '127.0.0.1', () => resolve(true))
    })
    if (ok) {
      await new Promise<void>((resolve) => probe.close(() => resolve()))
      return candidate
    }
  }
  throw new Error('browserAutomationMcp: could not find a free port')
}

export async function startBrowserAutomationMcpServer(
  runtime: OrcaRuntimeService,
  store: Store
): Promise<void> {
  if (!lifecycleRegistered) {
    lifecycleRegistered = true
    registerStatusIpc()
    store.onSettingsChanged((updates) => {
      if (SETTINGS_KEY in updates) {
        const nextEnabled = store.getSettings().browserAutomationMcp?.enabled === true
        void applyEnabledState(nextEnabled, runtime, store)
      }
    })
  }

  const settings = store.getSettings()
  const enabled = settings.browserAutomationMcp?.enabled === true
  await applyEnabledState(enabled, runtime, store)
}

async function applyEnabledState(
  enabled: boolean,
  runtime: OrcaRuntimeService,
  store: Store
): Promise<void> {
  if (enabled && !running) {
    activeToken = await loadOrCreateBrowserMcpToken(app.getPath('userData'))
    const preferredPort = store.getSettings().browserAutomationMcp?.port ?? 0
    const port = await pickPort(preferredPort)
    running = await startMcpHttpServer({ port, token: activeToken, runtime })
  } else if (!enabled && running) {
    await stopBrowserAutomationMcpServer()
  }
}

export async function stopBrowserAutomationMcpServer(): Promise<void> {
  if (running) {
    await running.close()
    running = null
  }
}

function registerStatusIpc(): void {
  ipcMain.handle('browserAutomationMcp:getStatus', () => getBrowserMcpStatus())
}
