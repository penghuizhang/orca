import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate } from '@/i18n/i18n'
import type { NotesTreeNode } from './notes-tree-model'

type NotesDeleteConfirmDialogProps = {
  node: NotesTreeNode | null
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function NotesDeleteConfirmDialog({
  node,
  busy,
  onCancel,
  onConfirm
}: NotesDeleteConfirmDialogProps): React.JSX.Element {
  return (
    <Dialog open={node !== null} onOpenChange={(open) => !open && !busy && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {translate('auto.components.notes.deleteTitle', 'Delete {{kind}}', {
              kind:
                node?.kind === 'folder'
                  ? translate('auto.components.notes.folder', 'folder')
                  : translate('auto.components.notes.note', 'note')
            })}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {node?.kind === 'folder'
              ? translate(
                  'auto.components.notes.deleteFolderDescription',
                  'Delete "{{name}}" and everything inside it? This cannot be undone.',
                  { name: node.name }
                )
              : translate(
                  'auto.components.notes.deleteNoteDescription',
                  'Delete "{{name}}"? This cannot be undone.',
                  { name: node?.name ?? '' }
                )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            {translate('auto.components.notes.cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onConfirm}>
            {translate('auto.components.notes.delete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
