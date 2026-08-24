import { useEffect, useMemo, useState } from 'react'
import { FolderGit2, RefreshCw, Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { GiteeAccountItem } from '../../../shared/gitee-api'
import GiteeItemDialog from '@/components/GiteeItemDialog'
import { GiteeItemRow } from '@/components/GiteeItemRow'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type GiteeTasksBoardProps = {
  formatRelativeTime: (input: string) => string
}

// Why: Gitee board is account-level aggregated (all repos, open PRs/issues) and
// only mounts when taskSource === 'gitee', so its state/effects stay isolated here.
export function GiteeTasksBoard({ formatRelativeTime }: GiteeTasksBoardProps) {
  const [giteeView, setGiteeView] = useState<'pulls' | 'issues'>('pulls')
  const [giteeStatusFilter, setGiteeStatusFilter] = useState<'all' | 'open' | 'merged' | 'closed'>(
    'all'
  )
  const [giteeSearchInput, setGiteeSearchInput] = useState('')
  const [giteeRepoFilter, setGiteeRepoFilter] = useState<ReadonlySet<string>>(new Set())
  const [giteeAccountRepos, setGiteeAccountRepos] = useState<string[]>([])
  const [giteeDialogItem, setGiteeDialogItem] = useState<GiteeAccountItem | null>(null)
  const [giteeItems, setGiteeItems] = useState<GiteeAccountItem[]>([])
  const [giteeLoading, setGiteeLoading] = useState(false)
  const [giteeError, setGiteeError] = useState<string | null>(null)
  const [giteeRefreshNonce, setGiteeRefreshNonce] = useState(0)

  // Why: Gitee aggregates at the account level (all authenticated repos), so its
  // effect is user-scoped and needs no repo selection.
  useEffect(() => {
    let stale = false
    setGiteeLoading(true)
    setGiteeError(null)
    const request =
      giteeView === 'pulls'
        ? window.api.gitee.listAccountPulls()
        : window.api.gitee.listAccountIssues()
    // Why: the project picker lists every account repo, not just repos that
    // happen to have PR/issue rows — an empty aggregation must not hide repos.
    const reposRequest = window.api.gitee.listRepos()
    void Promise.all([request, reposRequest])
      .then(([result, repos]) => {
        if (stale) {
          return
        }
        const typed = result as { ok: boolean; items?: GiteeAccountItem[]; reason?: string }
        const typedRepos = repos as { ok: boolean; items?: { fullName?: string }[] }
        if (typedRepos.ok && typedRepos.items) {
          setGiteeAccountRepos(
            [...new Set(typedRepos.items.map((repo) => repo.fullName ?? ''))]
              .filter((name) => name.length > 0)
              .sort()
          )
        }
        if (typed.ok && typed.items) {
          setGiteeItems(typed.items)
        } else {
          setGiteeItems([])
          setGiteeError(
            typed.reason === 'rejected'
              ? translate(
                  'auto.components.TaskPage.gitee.rejected',
                  'Gitee rejected the token. Reconnect in Settings → Review providers → Gitee.'
                )
              : translate(
                  'auto.components.TaskPage.gitee.unreachable',
                  'Could not reach Gitee. Check your connection, then retry.'
                )
          )
        }
      })
      .catch(() => {
        if (!stale) {
          setGiteeItems([])
          setGiteeError(
            translate(
              'auto.components.TaskPage.gitee.unreachable',
              'Could not reach Gitee. Check your connection, then retry.'
            )
          )
        }
      })
      .finally(() => {
        if (!stale) {
          setGiteeLoading(false)
        }
      })
    return () => {
      stale = true
    }
  }, [giteeView, giteeRefreshNonce])

  // Why: the account-level list is already fully fetched; filter locally so
  // status chips and search stay instant without extra Gitee API round-trips.
  const giteeRepoOptions = useMemo(() => [...giteeAccountRepos].sort(), [giteeAccountRepos])
  const filteredGiteeItems = useMemo(() => {
    const query = giteeSearchInput.trim().toLowerCase()
    return giteeItems.filter((item) => {
      if (giteeRepoFilter.size > 0 && !giteeRepoFilter.has(item.repoFullName)) {
        return false
      }
      if (giteeStatusFilter !== 'all' && item.state !== giteeStatusFilter) {
        return false
      }
      if (!query) {
        return true
      }
      return (
        item.title.toLowerCase().includes(query) ||
        item.number.toLowerCase().includes(query) ||
        item.repoFullName.toLowerCase().includes(query)
      )
    })
  }, [giteeItems, giteeRepoFilter, giteeSearchInput, giteeStatusFilter])

  return (
    <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-muted/50 shadow-sm">
      <div className="flex flex-none items-center gap-1.5 border-b border-border/50 px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setGiteeView('pulls')
            setGiteeStatusFilter('all')
          }}
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs font-medium transition',
            giteeView === 'pulls'
              ? 'border-border/50 bg-foreground/90 text-background shadow-xs'
              : 'border-border/60 bg-background text-foreground shadow-xs hover:bg-muted/60'
          )}
        >
          {translate('auto.components.TaskPage.137e2a8a01', 'PRs')}
        </button>
        <button
          type="button"
          onClick={() => {
            setGiteeView('issues')
            setGiteeStatusFilter('all')
          }}
          className={cn(
            'rounded-md border px-2.5 py-1 text-xs font-medium transition',
            giteeView === 'issues'
              ? 'border-border/50 bg-foreground/90 text-background shadow-xs'
              : 'border-border/60 bg-background text-foreground shadow-xs hover:bg-muted/60'
          )}
        >
          {translate('auto.components.TaskPage.dfc0c79bd8', 'Issues')}
        </button>
        <button
          type="button"
          onClick={() => setGiteeRefreshNonce((n) => n + 1)}
          aria-label={translate('auto.components.TaskPage.gitee.refresh', 'Refresh Gitee items')}
          className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className={cn('size-3.5', giteeLoading && 'animate-spin')} />
        </button>
      </div>
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-md border-border/50 bg-muted/50 px-2 text-xs font-medium shadow-sm transition hover:bg-muted/50"
            >
              <FolderGit2 className="size-3.5" />
              <span className="max-w-[180px] truncate">
                {giteeRepoFilter.size === 0
                  ? translate(
                      'auto.components.task.project.source.combobox.allProjects',
                      'All projects'
                    )
                  : `${giteeRepoFilter.size} projects`}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setGiteeRepoFilter(new Set())}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/50"
              >
                <Checkbox checked={giteeRepoFilter.size === 0} />
                <span className="truncate font-medium">
                  {translate(
                    'auto.components.task.project.source.combobox.allProjects',
                    'All projects'
                  )}
                </span>
              </button>
              <div className="my-1 h-px bg-border/60" />
              <div className="max-h-64 overflow-y-auto scrollbar-sleek">
                {giteeRepoOptions.map((repo) => (
                  <button
                    key={repo}
                    type="button"
                    onClick={() => {
                      const next = new Set(giteeRepoFilter)
                      if (next.has(repo)) {
                        next.delete(repo)
                      } else {
                        next.add(repo)
                      }
                      setGiteeRepoFilter(next)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/50"
                  >
                    <Checkbox checked={giteeRepoFilter.has(repo)} />
                    <span className="truncate">{repo}</span>
                  </button>
                ))}
                {giteeRepoOptions.length === 0 ? (
                  <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                    {translate(
                      'auto.components.task.project.source.combobox.noProjects',
                      'No projects'
                    )}
                  </p>
                ) : null}
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {[
          {
            id: 'open' as const,
            label: translate('auto.components.TaskPage.606a85c774', 'Open')
          },
          ...(giteeView === 'pulls'
            ? [
                {
                  id: 'merged' as const,
                  label: translate('auto.components.TaskPage.37a82eaaf8', 'Merged')
                }
              ]
            : []),
          {
            id: 'closed' as const,
            label: translate('auto.components.TaskPage.d09bf34db7', 'Closed')
          },
          {
            id: 'all' as const,
            label: translate('auto.components.TaskPage.c2268a9982', 'All')
          }
        ].map((option) => {
          const active = giteeStatusFilter === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setGiteeStatusFilter(option.id)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                active
                  ? 'border-border/50 bg-foreground/90 text-background shadow-xs'
                  : 'border-border/60 bg-background text-foreground shadow-xs hover:bg-muted/60'
              )}
            >
              {option.label}
            </button>
          )
        })}
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={giteeSearchInput}
            onChange={(e) => setGiteeSearchInput(e.target.value)}
            placeholder={translate(
              'auto.components.TaskPage.gitee.searchPlaceholder',
              'Search Gitee items...'
            )}
            className="h-8 rounded-md border-border/60 bg-background pl-8 pr-8 text-xs text-foreground shadow-xs"
          />
          {giteeSearchInput ? (
            <button
              type="button"
              aria-label={translate('auto.components.TaskPage.b797bdd7c3', 'Clear search')}
              onClick={() => setGiteeSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-none grid grid-cols-[70px_minmax(0,3fr)_minmax(90px,1fr)_90px_110px_40px] gap-3 border-b border-border/50 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        <span>{translate('auto.components.TaskPage.eb10c32872', 'ID')}</span>
        <span>{translate('auto.components.TaskPage.5eccb3c841', 'Title / Context')}</span>
        <span>{translate('auto.components.TaskPage.d2a876ca53', 'Assignee')}</span>
        <span>{translate('auto.components.TaskPage.gitee.state', 'State')}</span>
        <span>{translate('auto.components.TaskPage.f362667d55', 'Updated')}</span>
        <span />
      </div>
      <div
        className="min-h-0 flex-initial overflow-y-auto scrollbar-sleek"
        style={{ scrollbarGutter: 'stable' }}
      >
        {giteeError ? (
          <div className="border-b border-border px-4 py-4 text-sm text-destructive">
            {giteeError}
          </div>
        ) : null}
        {giteeLoading && giteeItems.length === 0 ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="grid w-full gap-3 px-3 py-2 grid-cols-[70px_minmax(0,3fr)_minmax(90px,1fr)_90px_110px_40px]"
              >
                <div className="h-4 w-12 animate-pulse rounded bg-muted/70" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted/70" />
                <div className="h-3 w-14 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-14 animate-pulse rounded bg-muted/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted/60" />
                <div />
              </div>
            ))}
          </div>
        ) : null}
        {!giteeLoading && giteeItems.length === 0 && !giteeError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-base font-medium text-foreground">
              {translate('auto.components.TaskPage.gitee.emptyTitle', 'No open items')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {translate(
                'auto.components.TaskPage.gitee.emptyDescription',
                'No pull requests or issues across your Gitee repositories. Connect Gitee in Settings → Review providers to list them here.'
              )}
            </p>
          </div>
        ) : null}
        {!giteeLoading && giteeItems.length > 0 && filteredGiteeItems.length === 0 ? (
          <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
            {translate(
              'auto.components.TaskPage.gitee.noMatching',
              'No items match the current filter.'
            )}
          </div>
        ) : null}
        <div className="divide-y divide-border/50">
          {filteredGiteeItems.map((item) => (
            <GiteeItemRow
              key={`${item.repoFullName}:${item.kind}:${item.number}`}
              item={item}
              onOpen={() => setGiteeDialogItem(item)}
              formatRelativeTime={formatRelativeTime}
            />
          ))}
        </div>
      </div>
      {giteeDialogItem ? (
        <GiteeItemDialog
          key={`${giteeDialogItem.repoFullName}:${giteeDialogItem.number}`}
          item={giteeDialogItem}
          onClose={() => setGiteeDialogItem(null)}
        />
      ) : null}
    </div>
  )
}
