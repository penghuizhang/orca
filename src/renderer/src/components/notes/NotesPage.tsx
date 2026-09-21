import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react'
import { FolderOpen, FolderPlus, FilePlus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { NOTES_WORKTREE_ID } from '../../../../shared/constants'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { translate } from '@/i18n/i18n'
import { detectLanguage } from '@/lib/language-detect'
import { useAppStore } from '@/store'
import NoteTree, { type NotesTreeAction } from './NoteTree'
import { NotesNameDialog, type NotesNameDialogState } from './NotesNameDialog'
import { NotesDeleteConfirmDialog } from './NotesDeleteConfirmDialog'
import {
  ensureMarkdownExtension,
  filterNotesTree,
  joinNotesPath,
  notesParentPath,
  readNotesTree,
  sanitizeNotesEntryName,
  type NotesTreeNode
} from './notes-tree-model'

const EditorPanel = lazy(() => import('@/components/editor/EditorPanel'))

type NameDialogState = {
  dialog: NotesNameDialogState
  /** Parent directory for creation modes; ignored for rename. */
  targetPath: string
  /** Node being renamed or deleted; kept for the submit handlers. */
  node: NotesTreeNode | null
}

export default function NotesPage(): React.JSX.Element {
  const openFile = useAppStore((s) => s.openFile)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [rootPath, setRootPath] = useState<string | null>(null)
  const [tree, setTree] = useState<NotesTreeNode[]>([])
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(() => new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [nameDialog, setNameDialog] = useState<NameDialogState | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotesTreeNode | null>(null)
  const [busy, setBusy] = useState(false)

  const refreshTree = useCallback(async (nextRootPath: string): Promise<void> => {
    try {
      setTree(await readNotesTree(nextRootPath, (dirPath) => window.api.fs.readDir({ dirPath })))
    } catch {
      toast.error(translate('auto.components.notes.loadFailed', 'Failed to load notes.'))
    }
  }, [])

  // Why: the root resolver also mkdirs on first use and grants the session-scoped
  // authorization, so every later fs call under the root passes containment checks.
  useEffect(() => {
    let cancelled = false
    void window.api.app
      .getNotesRootDirectory()
      .then(async (resolvedRoot) => {
        if (cancelled) {
          return
        }
        setRootPath(resolvedRoot)
        await refreshTree(resolvedRoot)
      })
      .catch(() => {
        if (!cancelled) {
          toast.error(
            translate('auto.components.notes.rootFailed', 'Failed to open the notes directory.')
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [refreshTree])

  // Why: the page unmounts when switching views, so restore the editor tab that
  // outlived the page in the store instead of dropping the user's open note.
  useEffect(() => {
    const restored = useAppStore
      .getState()
      .openFiles.find((file) => file.worktreeId === NOTES_WORKTREE_ID && file.mode === 'edit')
    if (restored) {
      setActiveFileId(restored.id)
      setSelectedPath(restored.filePath)
    }
  }, [])

  const openNote = useCallback(
    (node: Extract<NotesTreeNode, { kind: 'note' }>): void => {
      if (!rootPath) {
        return
      }
      const relativePath = node.path.slice(rootPath.length + 1)
      const fileId = openFile(
        {
          filePath: node.path,
          relativePath,
          worktreeId: NOTES_WORKTREE_ID,
          language: detectLanguage(node.name),
          mode: 'edit',
          runtimeEnvironmentId: null
        },
        { preview: false, suppressActiveRuntimeFallback: true }
      )
      setActiveFileId(fileId)
      setSelectedPath(node.path)
    },
    [openFile, rootPath]
  )

  const toggleFolder = useCallback((path: string): void => {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleTreeAction = useCallback((action: NotesTreeAction): void => {
    if (action.type === 'delete') {
      setDeleteTarget(action.node)
      return
    }
    if (action.type === 'rename') {
      setNameDialog({
        dialog: { mode: 'rename', currentName: action.node.name },
        targetPath: '',
        node: action.node
      })
      return
    }
    setNameDialog({ dialog: { mode: action.type }, targetPath: action.targetPath, node: null })
  }, [])

  const submitName = useCallback(
    async (rawName: string): Promise<void> => {
      if (!nameDialog || !rootPath) {
        return
      }
      const name = sanitizeNotesEntryName(rawName)
      if (!name) {
        return
      }
      setBusy(true)
      try {
        if (nameDialog.dialog.mode === 'new-note') {
          const notePath = joinNotesPath(nameDialog.targetPath, ensureMarkdownExtension(name))
          await window.api.fs.createFile({ filePath: notePath })
          await refreshTree(rootPath)
          setExpandedPaths((current) => new Set(current).add(nameDialog.targetPath))
          setSelectedPath(notePath)
          openNote({ kind: 'note', name: ensureMarkdownExtension(name), path: notePath })
        } else if (nameDialog.dialog.mode === 'new-folder') {
          const folderPath = joinNotesPath(nameDialog.targetPath, name)
          await window.api.fs.createDir({ dirPath: folderPath })
          await refreshTree(rootPath)
          setExpandedPaths((current) => new Set(current).add(nameDialog.targetPath))
        } else if (nameDialog.node) {
          const node = nameDialog.node
          const newName =
            node.kind === 'note' ? ensureMarkdownExtension(name) : sanitizeNotesEntryName(name)
          const parentDir = notesParentPath(node.path) || rootPath
          const newPath = joinNotesPath(parentDir, newName)
          if (newPath !== node.path) {
            await window.api.fs.rename({ oldPath: node.path, newPath })
            await refreshTree(rootPath)
            if (selectedPath === node.path) {
              setSelectedPath(newPath)
              if (node.kind === 'note') {
                openNote({ kind: 'note', name: newName, path: newPath })
              }
            }
          }
        }
        setNameDialog(null)
      } catch (error) {
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : translate('auto.components.notes.operationFailed', 'The operation failed.')
        )
      } finally {
        setBusy(false)
      }
    },
    [nameDialog, openNote, refreshTree, rootPath, selectedPath]
  )

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget || !rootPath) {
      return
    }
    setBusy(true)
    try {
      await window.api.fs.deletePath({
        targetPath: deleteTarget.path,
        recursive: deleteTarget.kind === 'folder'
      })
      const wasSelected =
        selectedPath === deleteTarget.path ||
        (deleteTarget.kind === 'folder' && (selectedPath ?? '').startsWith(`${deleteTarget.path}/`))
      await refreshTree(rootPath)
      if (wasSelected) {
        setSelectedPath(null)
        setActiveFileId(null)
      }
      setDeleteTarget(null)
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : translate('auto.components.notes.operationFailed', 'The operation failed.')
      )
    } finally {
      setBusy(false)
    }
  }, [deleteTarget, refreshTree, rootPath, selectedPath])

  const chooseRootDirectory = useCallback(async (): Promise<void> => {
    const picked = await window.api.repos.pickDirectory()
    if (!picked) {
      return
    }
    await updateSettings({ notesRootDirectory: picked })
    setSelectedPath(null)
    setActiveFileId(null)
    const resolvedRoot = await window.api.app.getNotesRootDirectory()
    setRootPath(resolvedRoot)
    await refreshTree(resolvedRoot)
  }, [refreshTree, updateSettings])

  const visibleNodes = useMemo(() => filterNotesTree(tree, query), [tree, query])

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-background pt-5 text-foreground md:pt-6">
      <header
        className="flex shrink-0 items-center gap-2 px-3 pb-3 md:px-5"
        // Why: no stacked center titlebar on this page; keep actions clear of window controls.
        style={
          { paddingRight: 'max(1.25rem, var(--window-controls-width, 0px))' } as React.CSSProperties
        }
      >
        <h1 className="truncate text-base font-semibold leading-8">
          {translate('auto.components.notes.pageTitle', 'Notes')}
        </h1>
        <div className="ml-2 flex min-w-0 items-center gap-1.5 rounded-md border border-border/70 bg-muted/50 px-2 py-1">
          <Search className="size-3.5 shrink-0 text-muted-foreground/70" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={translate('auto.components.notes.searchPlaceholder', 'Search notes…')}
            className="w-44 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          className="max-w-[280px] shrink-0"
          onClick={() => void chooseRootDirectory()}
          title={rootPath ?? undefined}
        >
          <FolderOpen className="size-3.5" />
          <span className="min-w-0 truncate">
            {rootPath ?? translate('auto.components.notes.rootDirectory', 'Notes directory')}
          </span>
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={translate('auto.components.notes.refresh', 'Refresh')}
          disabled={!rootPath}
          onClick={() => rootPath && void refreshTree(rootPath)}
        >
          <RefreshCw className="size-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 gap-3 px-3 pb-4 md:px-5">
        <aside className="flex w-60 shrink-0 flex-col rounded-lg border border-border/60 bg-muted/20">
          <ScrollArea className="min-h-0 flex-1 px-1.5 py-2">
            <NoteTree
              nodes={visibleNodes}
              rootPath={rootPath ?? ''}
              expandedPaths={expandedPaths}
              selectedPath={selectedPath}
              onToggleFolder={toggleFolder}
              onSelectNote={openNote}
              onAction={handleTreeAction}
            />
          </ScrollArea>
          <div className="flex shrink-0 items-center gap-1 border-t border-border/60 p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-xs"
              disabled={!rootPath}
              onClick={() =>
                rootPath && handleTreeAction({ type: 'new-note', targetPath: rootPath })
              }
            >
              <FilePlus className="size-3.5" />
              {translate('auto.components.notes.newNote', 'New note')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-xs"
              disabled={!rootPath}
              onClick={() =>
                rootPath && handleTreeAction({ type: 'new-folder', targetPath: rootPath })
              }
            >
              <FolderPlus className="size-3.5" />
              {translate('auto.components.notes.newFolder', 'New folder')}
            </Button>
          </div>
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60">
          {activeFileId ? (
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  {translate('auto.components.notes.loadingEditor', 'Loading editor…')}
                </div>
              }
            >
              {/* Why: notes are personal local files, not repo review surfaces; agent notes stay off. */}
              <EditorPanel
                activeFileId={activeFileId}
                isVisible
                markdownAnnotationsEnabled={false}
              />
            </Suspense>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground/70">
              {translate(
                'auto.components.notes.emptyEditorHint',
                'Select a note to start writing.'
              )}
            </div>
          )}
        </div>
      </div>
      <NotesNameDialog
        state={nameDialog?.dialog ?? null}
        busy={busy}
        onCancel={() => setNameDialog(null)}
        onSubmit={(name) => void submitName(name)}
      />
      <NotesDeleteConfirmDialog
        node={deleteTarget}
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
