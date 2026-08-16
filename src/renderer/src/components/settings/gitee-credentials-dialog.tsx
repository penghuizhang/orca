import { useId, useLayoutEffect, useState } from 'react'
import { ExternalLink, LoaderCircle, Lock } from 'lucide-react'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

const TOKEN_DOCS_URL = 'https://gitee.com/profile/personal_access_tokens'

type ConnectState = 'idle' | 'connecting' | 'error'

type GiteeCredentialsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Env vars win over stored credentials, so saving here would have no effect. */
  environmentManaged?: boolean
  onConnected?: () => void
  overlayClassName?: string
  contentClassName?: string
}

export function GiteeCredentialsDialog({
  open,
  onOpenChange,
  environmentManaged = false,
  onConnected,
  overlayClassName,
  contentClassName
}: GiteeCredentialsDialogProps): React.JSX.Element {
  const mountedRef = useMountedRef()
  const tokenId = useId()
  const errorId = useId()

  const [accessToken, setAccessToken] = useState('')
  const [connectState, setConnectState] = useState<ConnectState>('idle')
  const [connectError, setConnectError] = useState<string | null>(null)

  // Secrets always start empty: the main process never hands them back.
  useLayoutEffect(() => {
    if (!open) {
      return
    }
    setAccessToken('')
    setConnectState('idle')
    setConnectError(null)
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed on `open` alone: a status refresh mid-edit must not overwrite what the user is typing.
  }, [open])

  const locked = environmentManaged
  const connecting = connectState === 'connecting'
  const canSubmit = !locked && !connecting && Boolean(accessToken.trim())

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!connecting) {
      onOpenChange(nextOpen)
    }
  }

  const handleConnect = async (): Promise<void> => {
    if (!canSubmit) {
      return
    }
    setConnectState('connecting')
    setConnectError(null)
    try {
      const result = await window.api.gitee.connect({ accessToken: accessToken.trim() })
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        onConnected?.()
        onOpenChange(false)
      } else {
        setConnectState('error')
        setConnectError(result.error)
      }
    } catch {
      if (mountedRef.current) {
        setConnectState('error')
        setConnectError(
          translate(
            'auto.components.settings.gitee.dialog.connectFailed',
            'Could not connect to Gitee. Try again.'
          )
        )
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn('sm:max-w-[430px]', contentClassName)}
      >
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.settings.gitee.dialog.title', 'Connect Gitee')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.settings.gitee.dialog.description',
              'Enter a Gitee private token. Create one at Gitee → Settings → Private Tokens with repo and issues scopes.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void handleConnect()
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor={tokenId}>
              {translate('auto.components.settings.gitee.dialog.tokenLabel', 'Private token')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id={tokenId}
                type="password"
                value={accessToken}
                onChange={(event) => {
                  setAccessToken(event.target.value)
                  if (connectState === 'error') {
                    setConnectState('idle')
                    setConnectError(null)
                  }
                }}
                placeholder="••••••••••••••••"
                autoFocus
                disabled={locked || connecting}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                aria-label={translate(
                  'auto.components.settings.gitee.dialog.tokenDocs',
                  'Open the Gitee private token page'
                )}
                onClick={() => void window.api.shell.openUrl(TOKEN_DOCS_URL)}
              >
                <ExternalLink className="size-4" />
              </Button>
            </div>
          </div>
          {locked ? (
            <p className="text-xs text-muted-foreground">
              <Lock className="mr-1 inline size-3" />
              {translate(
                'auto.components.settings.gitee.dialog.envManaged',
                'Configured via the ORCA_GITEE_ACCESS_TOKEN environment variable. Unset it to manage the credential in Orca.'
              )}
            </p>
          ) : null}
          {connectError ? (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              {connectError}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={connecting}
            >
              {translate('auto.components.settings.gitee.dialog.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {connecting ? <LoaderCircle className="mr-1.5 size-4 animate-spin" /> : null}
              {translate('auto.components.settings.gitee.dialog.connect', 'Connect')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
