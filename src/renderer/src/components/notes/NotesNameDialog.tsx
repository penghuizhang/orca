import React, { useEffect, useRef, useState } from 'react'
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
import { translate } from '@/i18n/i18n'

export type NotesNameDialogMode = 'new-note' | 'new-folder' | 'rename'

export type NotesNameDialogState = {
  mode: NotesNameDialogMode
  /** Display name of the entry being renamed; omitted for creation modes. */
  currentName?: string
}

type NotesNameDialogProps = {
  state: NotesNameDialogState | null
  busy: boolean
  onCancel: () => void
  onSubmit: (name: string) => void
}

function dialogCopy(state: NotesNameDialogState): {
  title: string
  description: string
  action: string
} {
  if (state.mode === 'new-note') {
    return {
      title: translate('auto.components.notes.newNote', 'New note'),
      description: translate(
        'auto.components.notes.newNoteDescription',
        'Create a markdown note. The .md extension is added automatically.'
      ),
      action: translate('auto.components.notes.create', 'Create')
    }
  }
  if (state.mode === 'new-folder') {
    return {
      title: translate('auto.components.notes.newFolder', 'New folder'),
      description: translate(
        'auto.components.notes.newFolderDescription',
        'Create a folder inside the current directory.'
      ),
      action: translate('auto.components.notes.create', 'Create')
    }
  }
  return {
    title: translate('auto.components.notes.renameTitle', 'Rename'),
    description: translate(
      'auto.components.notes.renameDescription',
      'Enter a new name for "{{name}}".',
      { name: state.currentName ?? '' }
    ),
    action: translate('auto.components.notes.save', 'Save')
  }
}

export function NotesNameDialog({
  state,
  busy,
  onCancel,
  onSubmit
}: NotesNameDialogProps): React.JSX.Element {
  const open = state !== null
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (state !== null) {
      setName(state.mode === 'rename' ? (state.currentName ?? '') : '')
      // Why: focus after the dialog mounts so Enter-to-submit works without an extra click.
      const timer = window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [state])

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && !busy

  const handleSubmit = (): void => {
    if (canSubmit) {
      onSubmit(trimmed)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && !busy && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{state ? dialogCopy(state).title : ''}</DialogTitle>
          <DialogDescription className="text-xs">
            {state ? dialogCopy(state).description : ''}
          </DialogDescription>
        </DialogHeader>
        <Input
          ref={inputRef}
          value={name}
          placeholder={translate('auto.components.notes.namePlaceholder', 'Name')}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              handleSubmit()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            {translate('auto.components.notes.cancel', 'Cancel')}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {state ? dialogCopy(state).action : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
