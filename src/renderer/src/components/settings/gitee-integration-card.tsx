import { useCallback, useEffect, useState } from 'react'
import { FolderGit2, LoaderCircle, Unlink } from 'lucide-react'
import type { GiteeConnectionStatus } from '../../../../shared/gitee-credentials'
import { Button } from '@/components/ui/button'
import { useMountedRef } from '@/hooks/useMountedRef'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { useIntegrationSubordinateRowClass } from './integration-card-presentation'
import { usePreflightCardStatuses } from './source-control-preflight-card-status'
import { tokenProviderStatusLabel } from './token-source-control-status'
import { GiteeCredentialsDialog } from './gitee-credentials-dialog'
import { GiteeReposDialog } from './gitee-repos-dialog'
import { translate } from '@/i18n/i18n'

export function GiteeIntegrationCard(): React.JSX.Element {
  const { statuses, unavailable, refresh } = usePreflightCardStatuses('gitee')
  const status = unavailable ? 'unavailable' : statuses.giteeStatus
  const configured = status === 'configured'
  const mountedRef = useMountedRef()
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const [connection, setConnection] = useState<GiteeConnectionStatus | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [reposDialogOpen, setReposDialogOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)

  // Reads plaintext metadata only — never the encrypted secret — so mounting the
  // pane cannot trigger a keychain prompt.
  const loadConnection = useCallback(async () => {
    try {
      const next = await window.api.gitee.status()
      if (mountedRef.current) {
        setConnection(next)
      }
    } catch {
      // Best-effort: the preflight-driven parts of the card still render.
    }
  }, [mountedRef])

  useEffect(() => {
    void loadConnection()
  }, [loadConnection])

  const envManaged = connection?.source === 'environment'
  const storedCredential = connection?.source === 'stored'
  const account = connection?.account ?? statuses.giteeAccount

  const handleConnected = (): void => {
    void loadConnection()
    refresh()
  }

  const handleDisconnect = async (): Promise<void> => {
    setDisconnecting(true)
    setDisconnectError(null)
    try {
      await window.api.gitee.disconnect()
    } catch (error) {
      if (mountedRef.current) {
        setDisconnectError(
          error instanceof Error
            ? error.message
            : translate(
                'auto.components.settings.gitee.card.disconnectFailed',
                'Could not remove the saved Gitee credential.'
              )
        )
      }
    } finally {
      if (mountedRef.current) {
        setDisconnecting(false)
      }
      void loadConnection()
      refresh()
    }
  }

  return (
    <IntegrationCardShell
      icon={<FolderGit2 className="size-5" />}
      name="Gitee"
      description={
        configured
          ? account
            ? translate(
                'auto.components.settings.gitee.card.connectedAccount',
                '{{value0}} · Pull requests and issues',
                { value0: account }
              )
            : translate(
                'auto.components.settings.gitee.card.connected',
                'Pull requests and issues for your repositories'
              )
          : translate(
              'auto.components.settings.gitee.card.description',
              'Pull requests and issues for your Gitee repositories.'
            )
      }
      checking={status === 'checking'}
      statusTone={configured ? 'connected' : 'attention'}
      statusLabel={tokenProviderStatusLabel({ configured, status })}
      actions={
        status !== 'checking' && !envManaged ? (
          <Button
            variant={storedCredential ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {storedCredential
              ? translate('auto.components.settings.gitee.card.edit', 'Edit credentials')
              : translate('auto.components.settings.gitee.card.connect', 'Connect')}
          </Button>
        ) : null
      }
    >
      {status !== 'checking' ? (
        <IntegrationCardDetails>
          {configured ? (
            <div className={subordinateRowClass}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {account ??
                    translate(
                      'auto.components.settings.gitee.card.accountUnknown',
                      'Gitee account'
                    )}
                </p>
              </div>
              {storedCredential ? (
                <button
                  onClick={() => void handleDisconnect()}
                  disabled={disconnecting}
                  aria-label={translate(
                    'auto.components.settings.gitee.card.disconnect',
                    'Disconnect Gitee'
                  )}
                  className="rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive"
                >
                  {disconnecting ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Unlink className="size-3.5" />
                  )}
                </button>
              ) : null}
            </div>
          ) : null}
          {disconnectError ? <p className="text-xs text-destructive">{disconnectError}</p> : null}
          <GiteeCardNote
            envManaged={envManaged}
            status={status}
            storedCredential={storedCredential}
          />
          <div className="flex items-center gap-2">
            {configured ? (
              <Button variant="outline" size="sm" onClick={() => setReposDialogOpen(true)}>
                <FolderGit2 className="mr-1.5 size-3.5" />
                {translate(
                  'auto.components.settings.gitee.card.browseRepos',
                  'Browse repositories'
                )}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={refresh}>
              {translate(
                'auto.components.settings.token.source.control.integration.cards.793a06e899',
                'Re-check'
              )}
            </Button>
          </div>
        </IntegrationCardDetails>
      ) : null}

      <GiteeCredentialsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        environmentManaged={envManaged}
        onConnected={handleConnected}
      />
      <GiteeReposDialog open={reposDialogOpen} onOpenChange={setReposDialogOpen} />
    </IntegrationCardShell>
  )
}

function GiteeCardNote(props: {
  envManaged: boolean
  status: 'configured' | 'not-configured' | 'not-authenticated' | 'unavailable'
  storedCredential: boolean
}): React.JSX.Element {
  if (props.status === 'unavailable') {
    return (
      <p className="text-xs text-muted-foreground">
        {translate(
          'auto.components.settings.gitee.card.unavailable',
          'Gitee status is not available in this runtime yet.'
        )}
      </p>
    )
  }
  if (props.envManaged) {
    return (
      <p className="text-xs text-muted-foreground">
        {translate(
          'auto.components.settings.gitee.card.envManaged',
          'Configured via the ORCA_GITEE_ACCESS_TOKEN environment variable. Unset it to manage this credential in Orca.'
        )}
      </p>
    )
  }
  if (props.status === 'not-authenticated') {
    return (
      <p className="text-xs text-muted-foreground">
        {props.storedCredential
          ? translate(
              'auto.components.settings.gitee.card.storedAuthFailed',
              'The saved Gitee credential could not authenticate. Edit it, or check that the token still has repo and issues access.'
            )
          : translate(
              'auto.components.settings.gitee.card.authFailed',
              'Gitee credentials are configured but could not authenticate. Check the token and repository permissions, then restart Orca if environment variables changed.'
            )}
      </p>
    )
  }
  if (props.storedCredential) {
    return (
      <p className="text-xs text-muted-foreground">
        {translate(
          'auto.components.settings.gitee.card.storedCredential',
          'Saved in Orca on this machine. The ORCA_GITEE_ACCESS_TOKEN environment variable takes precedence when set.'
        )}
      </p>
    )
  }
  return (
    <p className="text-xs text-muted-foreground">
      {translate(
        'auto.components.settings.gitee.card.notConfigured',
        'Connect a Gitee account with a private token. The ORCA_GITEE_ACCESS_TOKEN environment variable works too and takes precedence.'
      )}
    </p>
  )
}
