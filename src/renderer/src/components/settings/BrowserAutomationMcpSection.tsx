import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SettingsSwitchRow } from './SettingsFormControls'
import { translate } from '@/i18n/i18n'
import type { GlobalSettings } from '../../../../shared/global-settings-types'

type BrowserAutomationMcpSectionProps = {
  settings: GlobalSettings
  updateSettings: (updates: Partial<GlobalSettings>) => void
}

type BrowserMcpStatus = {
  enabled: boolean
  url: string | null
  token: string | null
}

export function BrowserAutomationMcpSection({
  settings,
  updateSettings
}: BrowserAutomationMcpSectionProps): React.JSX.Element {
  const enabled = settings.browserAutomationMcp?.enabled === true
  const [status, setStatus] = useState<BrowserMcpStatus | null>(null)

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await window.api.browserAutomationMcp.getStatus()
      setStatus(next)
    } catch {
      // status is best-effort; ignore failures
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setStatus(null)
      return
    }
    void refresh()
    // Why: the token/url only exist after the main process boots the server; poll briefly so the UI reflects it.
    const interval = setInterval(() => void refresh(), 1000)
    const stop = setTimeout(() => clearInterval(interval), 5000)
    return () => {
      clearInterval(interval)
      clearTimeout(stop)
    }
  }, [enabled, refresh])

  const toggle = (): void => {
    const next = !enabled
    updateSettings({
      browserAutomationMcp: { enabled: next, port: settings.browserAutomationMcp?.port ?? 0 }
    })
  }

  const copyConfig = async (): Promise<void> => {
    if (!status?.url || !status?.token) {
      return
    }
    const config = {
      mcpServers: {
        'orca-browser': {
          url: status.url,
          headers: { Authorization: `Bearer ${status.token}` }
        }
      }
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2))
      toast.success(
        translate(
          'auto.components.settings.BrowserAutomationMcpSection.c9d0e1f2a3',
          'Copied MCP config to clipboard.'
        )
      )
    } catch {
      toast.error(
        translate(
          'auto.components.settings.BrowserAutomationMcpSection.c3d4e5f6a7',
          'Failed to copy MCP config.'
        )
      )
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/60 bg-card/30 p-4">
      <SettingsSwitchRow
        label={translate(
          'auto.components.settings.BrowserAutomationMcpSection.a1b2c3d4e5',
          'Browser Automation MCP Server'
        )}
        description={translate(
          'auto.components.settings.BrowserAutomationMcpSection.b2c3d4e5f6',
          'Expose Orca browser tabs to an external agent CLI (zcode/codex) over a localhost MCP server.'
        )}
        checked={enabled}
        onChange={toggle}
      />
      {enabled ? (
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            {translate(
              'auto.components.settings.BrowserAutomationMcpSection.d4e5f6a7b8',
              'Add the config below to your agent CLI’s MCP settings, then ask it to read or drive the open browser tab.'
            )}
          </p>
          {status?.url ? (
            <>
              <div className="break-all rounded-lg border border-border/60 bg-background/50 p-2 font-mono">
                {status.url}
              </div>
              <Button size="sm" variant="secondary" onClick={() => void copyConfig()}>
                {translate(
                  'auto.components.settings.BrowserAutomationMcpSection.e5f6a7b8c9',
                  'Copy MCP config'
                )}
              </Button>
            </>
          ) : (
            <p>
              {translate(
                'auto.components.settings.BrowserAutomationMcpSection.f6a7b8c9d0',
                'Starting server…'
              )}
            </p>
          )}
          <p>
            {translate(
              'auto.components.settings.BrowserAutomationMcpSection.a7b8c9d0e1',
              'Bound to 127.0.0.1 only. The token is stored locally and required by the client.'
            )}
          </p>
        </div>
      ) : null}
    </div>
  )
}
