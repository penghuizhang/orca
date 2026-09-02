import { CircleDot, ExternalLink, GitPullRequest } from 'lucide-react'

import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type { GiteeAccountItem } from '../../../../../shared/gitee-api'

type GiteeItemRowProps = {
  item: GiteeAccountItem
  onOpen: () => void
  formatRelativeTime: (input: string) => string
}

// Why: presentational Gitee board row — mirrors GitHub's task-row markup/spacing
// so the two boards stay visually aligned without sharing GitHub's data binding.
export function GiteeItemRow({ item, onOpen, formatRelativeTime }: GiteeItemRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      key={`${item.repoFullName}:${item.kind}:${item.number}`}
      onClick={() => onOpen()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className="grid w-full cursor-pointer gap-3 px-3 py-2 text-left grid-cols-[70px_minmax(0,3fr)_minmax(90px,1fr)_90px_110px_40px] hover:bg-muted/50"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {item.kind === 'pull' ? (
          <GitPullRequest
            className={cn(
              'size-3.5 shrink-0',
              item.state === 'open'
                ? 'text-status-success'
                : item.state === 'merged'
                  ? 'text-status-merged'
                  : 'text-muted-foreground'
            )}
          />
        ) : (
          <CircleDot className="size-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="truncate font-mono text-xs text-muted-foreground">#{item.number}</span>
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
          <span className="truncate text-xs text-muted-foreground">{item.repoFullName}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-muted-foreground">
          <span>
            {item.authorLogin ?? translate('auto.components.TaskPage.6430594b18', 'unknown author')}
          </span>
          {item.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="inline-flex items-center gap-1 rounded-full border border-border/40 px-1.5 py-0 text-xs text-muted-foreground"
              style={
                label.color
                  ? {
                      backgroundColor: `#${label.color}14`,
                      borderColor: `#${label.color}55`,
                      color: `#${label.color}`
                    }
                  : undefined
              }
            >
              <span
                className="size-1.5 rounded-full"
                style={label.color ? { backgroundColor: `#${label.color}` } : undefined}
              />
              {label.name}
            </span>
          ))}
        </span>
      </span>
      <span className="flex min-w-0 items-center gap-1.5">
        {item.assigneeAvatarUrl ? (
          <img src={item.assigneeAvatarUrl} alt="" className="size-4 shrink-0 rounded-full" />
        ) : null}
        <span className="truncate text-xs text-muted-foreground">{item.assigneeLogin ?? '—'}</span>
      </span>
      <span>
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium',
            item.state === 'open' && 'bg-status-success-background text-status-success',
            item.state === 'merged' && 'bg-status-merged-background text-status-merged',
            (item.state === 'closed' ||
              item.state === 'draft' ||
              item.state === 'rejected' ||
              item.state === 'processing') &&
              'bg-muted text-muted-foreground'
          )}
        >
          {item.state}
        </span>
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {item.updatedAt ? formatRelativeTime(item.updatedAt) : ''}
      </span>
      <span className="flex justify-end">
        <button
          type="button"
          aria-label={translate('auto.components.TaskPage.gitee.openOnGitee', 'Open on Gitee')}
          onClick={(e) => {
            e.stopPropagation()
            void window.api.shell.openUrl(item.url)
          }}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
        </button>
      </span>
    </div>
  )
}
