import React from 'react'
import type { CalendarEntry } from '../../../../shared/calendar-types'
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

type CalendarEntryDeleteDialogProps = {
  target: CalendarEntry | null
  isSaving: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function CalendarEntryDeleteDialog({
  target,
  isSaving,
  onCancel,
  onConfirm
}: CalendarEntryDeleteDialogProps): React.JSX.Element {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {translate('auto.components.calendar.deleteEntry', 'Delete entry')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {translate('auto.components.calendar.deleteEntryDescription', 'Delete "{{title}}"?', {
              title: target?.title
            })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {translate('auto.components.calendar.cancel', 'Cancel')}
          </Button>
          <Button variant="destructive" disabled={isSaving} onClick={onConfirm}>
            {translate('auto.components.calendar.delete', 'Delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
