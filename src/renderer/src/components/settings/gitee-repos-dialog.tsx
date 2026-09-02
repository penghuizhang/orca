import { useCallback, useEffect, useState } from 'react'
import { CircleDot, GitPullRequest, LoaderCircle, Lock, RefreshCw } from 'lucide-react'
import type { GiteeIssue, GiteePull, GiteeRepo } from '../../../../shared/gitee-api'
import { useMountedRef } from '@/hooks/useMountedRef'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

type GiteeReposDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  overlayClassName?: string
  contentClassName?: string
}

type LoadState = { phase: 'loading' } | { phase: 'ready' } | { phase: 'error'; message: string }

type RepoView = { type: 'pulls'; state: 'open' | 'all' } | { type: 'issues'; state: 'open' | 'all' }

function listFailureMessage(reason: 'rejected' | 'unreachable'): string {
  return reason === 'rejected'
    ? translate(
        'auto.components.settings.gitee.repos.rejected',
        'Gitee rejected the token. Reconnect with a valid private token.'
      )
    : translate(
        'auto.components.settings.gitee.repos.unreachable',
        'Could not reach Gitee. Check your connection, then retry.'
      )
}

function PullList(props: {
  owner: string
  repo: string
  state: 'open' | 'all'
}): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [items, setItems] = useState<GiteePull[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    void window.api.gitee
      .listPulls({ owner: props.owner, repo: props.repo, state: props.state })
      .then((result) => {
        if (cancelled) {
          return
        }
        const typed = result as {
          ok: boolean
          items?: GiteePull[]
          reason?: 'rejected' | 'unreachable'
        }
        if (typed.ok && typed.items) {
          setItems(typed.items)
        } else {
          setError(listFailureMessage(typed.reason ?? 'unreachable'))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(listFailureMessage('unreachable'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [props.owner, props.repo, props.state, mountedRef])

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }
  if (items === null) {
    return <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
  }
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {translate('auto.components.settings.gitee.repos.noPulls', 'No pull requests.')}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((pull) => (
        <li key={pull.number}>
          <button
            type="button"
            onClick={() => void window.api.shell.openUrl(pull.url)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                pull.state === 'open' && 'bg-emerald-500/15 text-emerald-600',
                pull.state === 'merged' && 'bg-purple-500/15 text-purple-600',
                (pull.state === 'closed' || pull.state === 'draft') &&
                  'bg-muted text-muted-foreground'
              )}
            >
              {pull.state}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="text-muted-foreground">#{pull.number}</span> {pull.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function IssueList(props: {
  owner: string
  repo: string
  state: 'open' | 'all'
}): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [items, setItems] = useState<GiteeIssue[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError(null)
    void window.api.gitee
      .listIssues({ owner: props.owner, repo: props.repo, state: props.state })
      .then((result) => {
        if (cancelled) {
          return
        }
        const typed = result as {
          ok: boolean
          items?: GiteeIssue[]
          reason?: 'rejected' | 'unreachable'
        }
        if (typed.ok && typed.items) {
          setItems(typed.items)
        } else {
          setError(listFailureMessage(typed.reason ?? 'unreachable'))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(listFailureMessage('unreachable'))
        }
      })
    return () => {
      cancelled = true
    }
  }, [props.owner, props.repo, props.state, mountedRef])

  if (error) {
    return <p className="text-xs text-destructive">{error}</p>
  }
  if (items === null) {
    return <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
  }
  if (items.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        {translate('auto.components.settings.gitee.repos.noIssues', 'No issues.')}
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((issue) => (
        <li key={issue.number}>
          <button
            type="button"
            onClick={() => void window.api.shell.openUrl(issue.url)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                issue.state === 'open' && 'bg-emerald-500/15 text-emerald-600',
                issue.state !== 'open' && 'bg-muted text-muted-foreground'
              )}
            >
              {issue.state}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">
              <span className="text-muted-foreground">#{issue.number}</span> {issue.title}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function GiteeReposDialog({
  open,
  onOpenChange,
  overlayClassName,
  contentClassName
}: GiteeReposDialogProps): React.JSX.Element {
  const mountedRef = useMountedRef()
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading' })
  const [repos, setRepos] = useState<GiteeRepo[]>([])
  const [selected, setSelected] = useState<GiteeRepo | null>(null)
  const [view, setView] = useState<RepoView>({ type: 'pulls', state: 'open' })

  const load = useCallback(async (): Promise<void> => {
    setLoadState({ phase: 'loading' })
    try {
      const result = (await window.api.gitee.listRepos({ page: 1 })) as {
        ok: boolean
        items?: GiteeRepo[]
        reason?: 'rejected' | 'unreachable'
      }
      if (!mountedRef.current) {
        return
      }
      if (result.ok && result.items) {
        setRepos(result.items)
        setLoadState({ phase: 'ready' })
      } else {
        setLoadState({
          phase: 'error',
          message: listFailureMessage(result.reason ?? 'unreachable')
        })
      }
    } catch {
      if (mountedRef.current) {
        setLoadState({ phase: 'error', message: listFailureMessage('unreachable') })
      }
    }
  }, [mountedRef])

  useEffect(() => {
    if (open) {
      setSelected(null)
      void load()
    }
  }, [open, load])

  const selectedOwnerRepo = selected
    ? { owner: selected.fullName.split('/')[0] ?? '', repo: selected.path }
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn('sm:max-w-[720px]', contentClassName)}
      >
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.settings.gitee.repos.title', 'Gitee repositories')}
          </DialogTitle>
          <DialogDescription>
            {translate(
              'auto.components.settings.gitee.repos.description',
              'Your public and private repositories on gitee.com.'
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex h-[420px] gap-4">
          <div className="scrollbar-sleek flex w-64 shrink-0 flex-col gap-1 overflow-y-auto pr-1">
            {loadState.phase === 'loading' ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="size-4 animate-spin text-muted-foreground" />
              </div>
            ) : null}
            {loadState.phase === 'error' ? (
              <div className="flex flex-col gap-2 py-4">
                <p className="text-xs text-destructive">{loadState.message}</p>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  <RefreshCw className="mr-1.5 size-3.5" />
                  {translate('auto.components.settings.gitee.repos.retry', 'Retry')}
                </Button>
              </div>
            ) : null}
            {loadState.phase === 'ready' &&
              repos.map((repo) => (
                <button
                  key={repo.fullName}
                  type="button"
                  onClick={() => setSelected(repo)}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition-colors',
                    selected?.fullName === repo.fullName ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    <span className="truncate">{repo.fullName}</span>
                    {repo.private ? (
                      <Lock className="size-3 shrink-0 text-muted-foreground" />
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {repo.description || repo.defaultBranch || ''}
                  </span>
                </button>
              ))}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {selected && selectedOwnerRepo ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant={view.type === 'pulls' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setView({ type: 'pulls', state: 'open' })}
                  >
                    <GitPullRequest className="mr-1.5 size-3.5" />
                    {translate('auto.components.settings.gitee.repos.pulls', 'Pull requests')}
                  </Button>
                  <Button
                    variant={view.type === 'issues' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setView({ type: 'issues', state: 'open' })}
                  >
                    <CircleDot className="mr-1.5 size-3.5" />
                    {translate('auto.components.settings.gitee.repos.issues', 'Issues')}
                  </Button>
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void window.api.shell.openUrl(selected.htmlUrl)}
                    >
                      {translate(
                        'auto.components.settings.gitee.repos.openInBrowser',
                        'Open in browser'
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void navigator.clipboard.writeText(
                          `https://gitee.com/${selected.fullName}.git`
                        )
                      }
                    >
                      {translate(
                        'auto.components.settings.gitee.repos.copyCloneUrl',
                        'Copy clone URL'
                      )}
                    </Button>
                  </div>
                </div>
                <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto rounded-md border p-2">
                  {view.type === 'pulls' ? (
                    <PullList
                      owner={selectedOwnerRepo.owner}
                      repo={selectedOwnerRepo.repo}
                      state={view.state}
                    />
                  ) : (
                    <IssueList
                      owner={selectedOwnerRepo.owner}
                      repo={selectedOwnerRepo.repo}
                      state={view.state}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {translate(
                  'auto.components.settings.gitee.repos.selectRepo',
                  'Select a repository to browse its pull requests and issues.'
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
