import React from 'react'
import { toast } from 'sonner'

import type { CalendarCategory, CalendarEntry } from '../../../../shared/calendar-types'
import { buildWeekListMarkdown, type WeekListStrings } from './calendar-week-list'
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

/** Preview + copy dialog for the per-week work list (Friday timesheet prep). */
export function CalendarWeekListDialog({
  open,
  weekDates,
  entries,
  visibleCategories,
  viewYear,
  locale,
  onOpenChange
}: {
  open: boolean
  weekDates: readonly string[]
  entries: readonly CalendarEntry[]
  visibleCategories: ReadonlySet<CalendarCategory>
  viewYear: number
  locale: string
  onOpenChange: (open: boolean) => void
}): React.JSX.Element {
  const strings: WeekListStrings = {
    workList: translate('auto.components.calendar.weekListWorkList', 'work list'),
    untitled: translate('auto.components.calendar.untitled', 'Untitled')
  }

  const markdown = buildWeekListMarkdown(
    weekDates,
    entries,
    visibleCategories,
    viewYear,
    locale,
    strings
  )

  const copyToClipboard = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(markdown)
      toast.success(translate('auto.components.calendar.weekListCopied', 'Week list copied.'))
    } catch {
      toast.error(
        translate(
          'auto.components.calendar.weekListCopyFailed',
          'Copy failed — select the text manually.'
        )
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {translate('auto.components.calendar.copyWeekList', 'Copy week list')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {translate(
              'auto.components.calendar.weekListDescription',
              'One week of work, grouped by day, ready to paste into your timesheet.'
            )}
          </DialogDescription>
        </DialogHeader>
        <pre className="scrollbar-sleek max-h-[50vh] overflow-auto rounded-md border border-border bg-muted p-3 text-xs leading-5 whitespace-pre-wrap">
          {markdown}
        </pre>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.calendar.cancel', 'Cancel')}
          </Button>
          <Button onClick={() => void copyToClipboard()}>
            {translate('auto.components.calendar.copyToClipboard', 'Copy to clipboard')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
