import { useEffect, useState } from 'react'
import {
  CircleDot,
  ExternalLink,
  FileText,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquare
} from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import type {
  GiteeAccountItem,
  GiteeComment,
  GiteeItemDetail,
  GiteePullCommit,
  GiteePullFile
} from '../../../../../shared/gitee-api'

function Avatar({ url, login }: { url: string | null; login: string | null }): React.JSX.Element {
  return url ? (
    <img src={url} alt="" className="size-5 shrink-0 rounded-full" />
  ) : (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
      {(login ?? '?').slice(0, 1).toUpperCase()}
    </span>
  )
}

function StateBadge({ state }: { state: string }): React.JSX.Element {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-xs font-medium',
        state === 'open' && 'bg-status-success-background text-status-success',
        state === 'merged' && 'bg-status-merged-background text-status-merged',
        (state === 'closed' ||
          state === 'draft' ||
          state === 'rejected' ||
          state === 'processing') &&
          'bg-muted text-muted-foreground'
      )}
    >
      {state}
    </span>
  )
}

function CommentRow({ comment }: { comment: GiteeComment }): React.JSX.Element {
  return (
    <div className="flex gap-2.5 border-b border-border/50 py-3 last:border-b-0">
      <Avatar url={comment.authorAvatarUrl} login={comment.authorLogin} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-medium text-foreground">{comment.authorLogin ?? '—'}</span>
          {comment.createdAt ? (
            <span className="text-muted-foreground">{comment.createdAt}</span>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
          {comment.body}
        </p>
      </div>
    </div>
  )
}

export default function GiteeItemDialog({
  item,
  onClose
}: {
  item: GiteeAccountItem
  onClose: () => void
}): React.JSX.Element {
  const [owner, repo] = item.repoFullName.split('/')
  const [detail, setDetail] = useState<GiteeItemDetail | null>(null)
  const [comments, setComments] = useState<GiteeComment[]>([])
  const [files, setFiles] = useState<GiteePullFile[]>([])
  const [commits, setCommits] = useState<GiteePullCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let stale = false
    setLoading(true)
    setError(false)
    void Promise.all([
      window.api.gitee.itemDetail({ kind: item.kind, owner, repo, number: item.number }),
      window.api.gitee.itemComments({ kind: item.kind, owner, repo, number: item.number }),
      item.kind === 'pull'
        ? window.api.gitee.pullFiles({ owner, repo, number: item.number })
        : Promise.resolve({ ok: true, items: [] }),
      item.kind === 'pull'
        ? window.api.gitee.pullCommits({ owner, repo, number: item.number })
        : Promise.resolve({ ok: true, items: [] })
    ])
      .then(([detailResult, commentResult, fileResult, commitResult]) => {
        if (stale) {
          return
        }
        if (detailResult.ok && commentResult.ok && fileResult.ok && commitResult.ok) {
          setDetail(detailResult.data)
          setComments(commentResult.items)
          setFiles(fileResult.items)
          setCommits(commitResult.items)
        } else {
          setError(true)
        }
      })
      .catch(() => {
        if (!stale) {
          setError(true)
        }
      })
      .finally(() => {
        if (!stale) {
          setLoading(false)
        }
      })
    return () => {
      stale = true
    }
  }, [item.kind, item.number, owner, repo])

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[82vh] w-[min(860px,92vw)] flex-col gap-0 p-0">
        <DialogTitle className="sr-only">
          {item.kind === 'pull' ? 'Pull request' : 'Issue'} #{item.number}
        </DialogTitle>
        <DialogDescription className="sr-only">{item.title}</DialogDescription>

        <div className="flex flex-none items-start gap-3 border-b border-border/60 px-4 py-3">
          <span className="mt-0.5">
            {item.kind === 'pull' ? (
              <GitPullRequest className="size-5 text-muted-foreground" />
            ) : (
              <CircleDot className="size-5 text-muted-foreground" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                {item.kind === 'pull' ? '!' : '#'}
                {item.number}
              </span>
              <StateBadge state={detail?.state ?? item.state} />
              <span className="truncate text-xs text-muted-foreground">{item.repoFullName}</span>
            </div>
            <h2 className="mt-0.5 truncate text-base font-semibold text-foreground">
              {detail?.title ?? item.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Avatar url={detail?.authorAvatarUrl ?? null} login={detail?.authorLogin ?? null} />
                {detail?.authorLogin ?? '—'}
              </span>
              {detail?.assigneeLogin ? (
                <span className="flex items-center gap-1.5">
                  <Avatar url={detail.assigneeAvatarUrl} login={detail.assigneeLogin} />
                  {detail.assigneeLogin}
                </span>
              ) : null}
              {detail?.createdAt ? (
                <span>
                  {translate('auto.components.GiteeItemDialog.createdAt', 'Created')}{' '}
                  {detail.createdAt}
                </span>
              ) : null}
              {detail?.updatedAt ? (
                <span>
                  {translate('auto.components.GiteeItemDialog.updatedAt', 'Updated')}{' '}
                  {detail.updatedAt}
                </span>
              ) : null}
              {detail?.milestone ? (
                <span>
                  {translate('auto.components.GiteeItemDialog.milestone', 'Milestone')}{' '}
                  {detail.milestone}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            aria-label={translate('auto.components.GiteeItemDialog.openOnGitee', 'Open on Gitee')}
            onClick={() => void window.api.shell.openUrl(detail?.url ?? item.url)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
          >
            <ExternalLink className="size-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-sm text-destructive">
            <p>
              {translate(
                'auto.components.GiteeItemDialog.loadError',
                'Could not load Gitee item details.'
              )}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-muted-foreground underline"
            >
              {translate('auto.components.GiteeItemDialog.close', 'Close')}
            </button>
          </div>
        ) : (
          <Tabs defaultValue="conversation" className="flex min-h-0 flex-1 flex-col gap-0">
            <TabsList
              variant="line"
              className="mx-4 mt-2 justify-start gap-3 border-b border-border/60 bg-transparent"
            >
              <TabsTrigger value="conversation" className="px-2">
                <MessageSquare className="size-3.5" />
                {translate('auto.components.GitHubItemDialog.e30a5470c9', 'Conversation')}
              </TabsTrigger>
              {item.kind === 'pull' ? (
                <>
                  <TabsTrigger value="files" className="px-2">
                    <FileText className="size-3.5" />
                    {translate('auto.components.GitHubItemDialog.999b5ad7d9', 'Files')}
                    {files.length > 0 ? (
                      <span className="ml-1 text-xs text-muted-foreground">{files.length}</span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger value="commits" className="px-2">
                    <GitCommitHorizontal className="size-3.5" />
                    {translate('auto.components.GiteeItemDialog.commits', 'Commits')}
                    {commits.length > 0 ? (
                      <span className="ml-1 text-xs text-muted-foreground">{commits.length}</span>
                    ) : null}
                  </TabsTrigger>
                </>
              ) : null}
            </TabsList>

            <ScrollArea className="min-h-0 flex-1">
              <TabsContent value="conversation" className="mt-0 px-4">
                {detail?.body ? (
                  <div className="border-b border-border/50 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {detail.body}
                    </p>
                  </div>
                ) : null}
                {comments.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {translate('auto.components.GiteeItemDialog.noComments', 'No comments yet.')}
                  </p>
                ) : (
                  comments.map((comment) => <CommentRow key={comment.id} comment={comment} />)
                )}
              </TabsContent>

              {item.kind === 'pull' ? (
                <TabsContent value="files" className="mt-0 px-4">
                  {files.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {translate('auto.components.GiteeItemDialog.noFiles', 'No files changed.')}
                    </p>
                  ) : (
                    files.map((file) => (
                      <div key={file.filename} className="border-b border-border/50 py-2.5">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="min-w-0 flex-1 truncate font-mono text-foreground">
                            {file.filename}
                          </span>
                          <span className="shrink-0 text-status-success">+{file.additions}</span>
                          <span className="shrink-0 text-destructive">-{file.deletions}</span>
                          {file.status ? (
                            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                              {file.status}
                            </span>
                          ) : null}
                        </div>
                        {file.patch ? (
                          <pre className="mt-1.5 max-h-40 overflow-hidden rounded-md bg-muted/50 p-2 text-xs leading-relaxed text-muted-foreground">
                            {file.patch.slice(0, 1200)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}
                </TabsContent>
              ) : null}

              {item.kind === 'pull' ? (
                <TabsContent value="commits" className="mt-0 px-4">
                  {commits.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                      {translate('auto.components.GiteeItemDialog.noCommits', 'No commits.')}
                    </p>
                  ) : (
                    commits.map((commit) => (
                      <div
                        key={commit.sha}
                        className="flex items-center gap-2.5 border-b border-border/50 py-2.5"
                      >
                        <GitCommitHorizontal className="size-4 shrink-0 text-muted-foreground" />
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                          {commit.sha.slice(0, 7)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                          {commit.message}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {commit.authorLogin ?? '—'}
                        </span>
                      </div>
                    ))
                  )}
                </TabsContent>
              ) : null}
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
