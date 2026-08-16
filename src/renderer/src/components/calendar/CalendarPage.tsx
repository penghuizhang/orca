import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import type {
  CalendarCategory,
  CalendarEntry,
  CalendarEntryCreateInput
} from '../../../../shared/calendar-types'
import { CALENDAR_CATEGORIES } from '../../../../shared/calendar-types'
import { CalendarMonthGrid } from './calendar-month-grid'
import { CalendarMonthPicker } from './calendar-month-picker'
import { CalendarSidePanel } from './calendar-side-panel'
import { CalendarDayPanel } from './calendar-day-panel'
import { CalendarEntryDialog } from './calendar-entry-dialog'
import { addMonths, fromDateKey, isInMonth, todayDateKey } from './calendar-time'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { translate, getIntlLocale } from '@/i18n/i18n'
import { useAppStore } from '@/store'

export default function CalendarPage(): React.JSX.Element {
  const locale = getIntlLocale()
  const showLunarInfo = useAppStore((s) => s.settings?.showCalendarLunarInfo !== false)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const now = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayDateKey())
  const [visibleCategories, setVisibleCategories] = useState<ReadonlySet<CalendarCategory>>(
    () => new Set()
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEntry | null>(null)
  const todayKey = useMemo(() => todayDateKey(), [])

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setEntries(await window.api.calendar.list())
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate('auto.components.calendar.loadFailed', 'Failed to load calendar entries.')
      )
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selectDate = useCallback(
    (dateKey: string): void => {
      setSelectedDateKey(dateKey)
      const date = fromDateKey(dateKey)
      if (!isInMonth(date, viewYear, viewMonth)) {
        setViewYear(date.getFullYear())
        setViewMonth(date.getMonth() + 1)
      }
    },
    [viewYear, viewMonth]
  )

  const toggleCategory = useCallback((category: CalendarCategory): void => {
    setVisibleCategories((current) => {
      const next = new Set(current)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      // Why: a full set means "all visible", same as the empty starting state.
      return next.size === CALENDAR_CATEGORIES.length ? new Set() : next
    })
  }, [])

  const toggleLunarInfo = useCallback((): void => {
    void updateSettings({ showCalendarLunarInfo: !showLunarInfo })
  }, [showLunarInfo, updateSettings])

  const openCreateDialog = useCallback((): void => {
    setEditingEntry(null)
    setDialogOpen(true)
  }, [])

  const openEditDialog = useCallback((entry: CalendarEntry): void => {
    setEditingEntry(entry)
    setDialogOpen(true)
  }, [])

  const saveEntry = useCallback(
    async (input: CalendarEntryCreateInput): Promise<void> => {
      setIsSaving(true)
      try {
        const saved = editingEntry
          ? await window.api.calendar.update({ id: editingEntry.id, updates: input })
          : await window.api.calendar.create(input)
        setEntries((current) => {
          const next = current.filter((entry) => entry.id !== saved.id)
          return [...next, saved]
        })
        setDialogOpen(false)
        setSelectedDateKey(saved.date)
        toast.success(
          editingEntry
            ? translate('auto.components.calendar.entryUpdated', 'Entry updated.')
            : translate('auto.components.calendar.entryCreated', 'Entry added.')
        )
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : translate('auto.components.calendar.saveFailed', 'Failed to save entry.')
        )
      } finally {
        setIsSaving(false)
      }
    },
    [editingEntry]
  )

  const confirmDelete = useCallback(async (): Promise<void> => {
    if (!deleteTarget) {
      return
    }
    const target = deleteTarget
    setDeleteTarget(null)
    setIsSaving(true)
    try {
      await window.api.calendar.delete({ id: target.id })
      setEntries((current) => current.filter((entry) => entry.id !== target.id))
      setDialogOpen(false)
      toast.success(translate('auto.components.calendar.entryDeleted', 'Entry deleted.'))
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : translate('auto.components.calendar.deleteFailed', 'Failed to delete entry.')
      )
    } finally {
      setIsSaving(false)
    }
  }, [deleteTarget])

  const goToToday = (): void => {
    const today = new Date()
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth() + 1)
    setSelectedDateKey(todayDateKey())
  }

  return (
    <main className="relative flex h-full min-h-0 flex-col bg-background pt-5 text-foreground md:pt-6">
      <header
        className="flex shrink-0 items-center gap-2 px-3 pb-3 md:px-5"
        // Why: no stacked center titlebar on this page; keep the title clear of Windows/Linux window controls.
        style={
          {
            paddingRight: 'max(1.25rem, var(--window-controls-width, 0px))'
          } as React.CSSProperties
        }
      >
        <h1 className="truncate text-base font-semibold leading-8">
          {translate('auto.components.calendar.pageTitle', 'Calendar')}
        </h1>
        <div className="ml-3 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translate('auto.components.calendar.previousMonth', 'Previous month')}
            onClick={() => {
              const next = addMonths(viewYear, viewMonth, -1)
              setViewYear(next.year)
              setViewMonth(next.month)
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <CalendarMonthPicker
            year={viewYear}
            month={viewMonth}
            locale={locale}
            onSelect={(nextYear, nextMonth) => {
              setViewYear(nextYear)
              setViewMonth(nextMonth)
            }}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translate('auto.components.calendar.nextMonth', 'Next month')}
            onClick={() => {
              const next = addMonths(viewYear, viewMonth, 1)
              setViewYear(next.year)
              setViewMonth(next.month)
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" className="ml-1" onClick={goToToday}>
            {translate('auto.components.calendar.today', 'Today')}
          </Button>
        </div>
        <div className="ml-auto">
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="size-4" />
            {translate('auto.components.calendar.newEntry', 'New entry')}
          </Button>
        </div>
      </header>

      {/* Why: match other pages (Automations etc.): padded page gutter + one
          rounded card so the grid never runs into the window edges. */}
      <div className="flex min-h-0 flex-1 px-3 pb-4 md:px-5">
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
          <CalendarSidePanel
            visibleCategories={visibleCategories}
            onToggleCategory={toggleCategory}
            year={viewYear}
            month={viewMonth}
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            locale={locale}
            showLunarInfo={showLunarInfo}
            onToggleLunarInfo={toggleLunarInfo}
            onMonthChange={(year, month) => {
              setViewYear(year)
              setViewMonth(month)
            }}
            onSelectDate={selectDate}
          />
          <CalendarMonthGrid
            year={viewYear}
            month={viewMonth}
            entries={entries}
            selectedDateKey={selectedDateKey}
            todayKey={todayKey}
            visibleCategories={visibleCategories}
            locale={locale}
            showLunarInfo={showLunarInfo}
            onSelectDate={selectDate}
            onEditEntry={openEditDialog}
            // Why: onSelectDate above set the dialog's default date to the clicked day.
            onRequestCreate={openCreateDialog}
          />
          <CalendarDayPanel
            dateKey={selectedDateKey}
            entries={entries}
            visibleCategories={visibleCategories}
            locale={locale}
            showLunarInfo={showLunarInfo}
            onCreateEntry={openCreateDialog}
            onEditEntry={openEditDialog}
          />
        </div>
      </div>

      <CalendarEntryDialog
        open={dialogOpen}
        entry={editingEntry}
        defaultDate={selectedDateKey}
        isSaving={isSaving}
        onOpenChange={setDialogOpen}
        onSave={(input) => void saveEntry(input)}
        onRequestDelete={setDeleteTarget}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {translate('auto.components.calendar.deleteEntry', 'Delete entry')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {translate('auto.components.calendar.deleteEntryDescription', 'Delete "{{title}}"?', {
                title: deleteTarget?.title
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              {translate('auto.components.calendar.cancel', 'Cancel')}
            </Button>
            <Button variant="destructive" disabled={isSaving} onClick={() => void confirmDelete()}>
              {translate('auto.components.calendar.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
