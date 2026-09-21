import React from 'react'
import { ChevronRight, FileText, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import type { NotesTreeNode } from './notes-tree-model'

export type NotesTreeNodeWithChildren = Extract<NotesTreeNode, { kind: 'note' }>

export type NotesTreeAction =
  | { type: 'new-note'; targetPath: string }
  | { type: 'new-folder'; targetPath: string }
  | { type: 'rename'; node: NotesTreeNode }
  | { type: 'delete'; node: NotesTreeNode }

type NoteTreeLevelProps = {
  nodes: NotesTreeNode[]
  expandedPaths: ReadonlySet<string>
  selectedPath: string | null
  onToggleFolder: (path: string) => void
  onSelectNote: (node: NotesTreeNodeWithChildren) => void
  onAction: (action: NotesTreeAction) => void
}

type NoteTreeProps = NoteTreeLevelProps & {
  rootPath: string
}

const rowClassName = (active: boolean): string =>
  cn(
    'flex w-full min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left text-[13px] font-medium tracking-tight transition-colors',
    active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted'
  )

function NodeContextMenu({
  node,
  onAction,
  children
}: {
  node: NotesTreeNode
  onAction: (action: NotesTreeAction) => void
  children: React.JSX.Element
}): React.JSX.Element {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        {node.kind === 'folder' ? (
          <>
            <ContextMenuItem onSelect={() => onAction({ type: 'new-note', targetPath: node.path })}>
              {translate('auto.components.notes.newNote', 'New note')}
            </ContextMenuItem>
            <ContextMenuItem
              onSelect={() => onAction({ type: 'new-folder', targetPath: node.path })}
            >
              {translate('auto.components.notes.newFolder', 'New folder')}
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        ) : null}
        <ContextMenuItem onSelect={() => onAction({ type: 'rename', node })}>
          {translate('auto.components.notes.rename', 'Rename')}
        </ContextMenuItem>
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={() => onAction({ type: 'delete', node })}
        >
          {translate('auto.components.notes.delete', 'Delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}

function NoteTreeRow(props: NoteTreeLevelProps & { node: NotesTreeNode }): React.JSX.Element {
  const { node, expandedPaths, selectedPath, onToggleFolder, onSelectNote, onAction } = props
  const trigger = (row: React.JSX.Element): React.JSX.Element => (
    <NodeContextMenu node={node} onAction={onAction}>
      {row}
    </NodeContextMenu>
  )

  if (node.kind === 'folder') {
    const expanded = expandedPaths.has(node.path)
    return (
      <div>
        {trigger(
          <button
            type="button"
            className={rowClassName(false)}
            onClick={() => onToggleFolder(node.path)}
            aria-expanded={expanded}
          >
            <ChevronRight
              className={cn(
                'size-3.5 shrink-0 text-muted-foreground/70 transition-transform',
                expanded && 'rotate-90'
              )}
            />
            <Folder className="size-4 shrink-0 text-muted-foreground/80" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{node.name}</span>
          </button>
        )}
        {expanded ? (
          <div className="ml-4 border-l border-border/70 pl-1.5">
            <NoteTreeLevel {...props} nodes={node.children} />
          </div>
        ) : null}
      </div>
    )
  }

  const selected = node.path === selectedPath
  return trigger(
    <button
      type="button"
      className={rowClassName(selected)}
      aria-current={selected ? 'page' : undefined}
      onClick={() => onSelectNote(node)}
    >
      <span className="size-3.5 shrink-0" />
      <FileText
        className={cn(
          'size-4 shrink-0',
          selected ? 'text-foreground/80' : 'text-muted-foreground/70'
        )}
        strokeWidth={1.75}
      />
      <span className="min-w-0 flex-1 truncate">{node.name}</span>
    </button>
  )
}

function NoteTreeLevel(props: NoteTreeLevelProps): React.JSX.Element {
  const { nodes } = props
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      {nodes.map((node) => (
        <NoteTreeRow key={node.path} {...props} node={node} />
      ))}
    </div>
  )
}

/** Folder/markdown tree for the Notes page; the blank area offers root-level creation. */
export default function NoteTree(props: NoteTreeProps): React.JSX.Element {
  const { nodes, rootPath, onAction } = props
  if (nodes.length === 0) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex min-h-[120px] flex-1 cursor-default items-center justify-center px-4 text-center text-xs text-muted-foreground/70">
            {translate(
              'auto.components.notes.emptyTreeHint',
              'No notes yet. Right-click to create one.'
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onAction({ type: 'new-note', targetPath: rootPath })}>
            {translate('auto.components.notes.newNote', 'New note')}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onAction({ type: 'new-folder', targetPath: rootPath })}>
            {translate('auto.components.notes.newFolder', 'New folder')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    )
  }
  return <NoteTreeLevel {...props} nodes={nodes} />
}
