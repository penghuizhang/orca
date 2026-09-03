import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'

import type {
  CalendarCategory,
  CalendarCategoryColor,
  CalendarCategoryInfo,
  CalendarEntry,
  CalendarEntryCreateInput
} from '../../../../shared/calendar-types'
import { CalendarMonthGrid } from './calendar-month-grid'
import { CalendarMonthPicker } from './calendar-month-picker'
import { CalendarSidePanel } from './calendar-side-panel'
import { CalendarDayPanel } from './calendar-day-panel'
import { CalendarEntryDialog } from './calendar-entry-dialog'
import { CalendarRangeSummary } from './calendar-range-summary'
import { CalendarWorkListDialog } from './calendar-work-list-dialog'
import { CalendarCategoryManagerDialog } from './calendar-category-manager-dialog'
import { CalendarEntryDeleteDialog } from './calendar-entry-delete-dialog'
import {
  addMonths,
  fromDateKey,
  isInMonth,
  todayDateKey,
  type WorkListRange
} from './calendar-time'
import { Button } from '@/components/ui/button'
import { translate, getIntlLocale } from '@/i18n/i18n'
import { useAppStore } from '@/store'

export default function CalendarPage(): React.JSX.Element {
  const locale = getIntlLocale()
  const showLunarInfo = useAppStore((s) => s.settings?.showCalendarLunarInfo !== false)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [categoryInfos, setCategoryInfos] = useState<CalendarCategoryInfo[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const now = useMemo(() => new Date(), [])
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayDateKey())
  const [visibleCategories, setVisibleCategories] = useState<ReadonlySet<CalendarCategory>>(
    () => new Set()
  )
  const [dialogOpen, setDialogOpen] = useState(false)
  const [weekListOpen, setWeekListOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CalendarEntry | null>(null)
  const todayKey = useMemo(() => todayDateKey(), [])
  // Why: the work-list range is independent of the selected day — switching
  // days edits the right-hand panel, not the reporting range.
  const [range, setRange] = useState<WorkListRange>({ kind: 'week', anchor: todayDateKey() })

  const refreshCategories = useCallback(async (): Promise<void> => {
    try {
      setCategoryInfos(await window.api.calendar.categories.list())
    } catch {
      toast.error(
        translate(
          'auto.components.calendar.categoriesLoadFailed',
          'Failed to load calendar categories.'
        )
      )
    }
  }, [])

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
    void refreshCategories()
  }, [refresh, refreshCategories])

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

  const toggleCategory = useCallback(
    (category: CalendarCategory): void => {
      setVisibleCategories((current) => {
        const next = new Set(current)
        if (next.has(category)) {
          next.delete(category)
        } else {
          next.add(category)
        }
        // Why: a full set means "all visible", same as the empty starting state.
        return next.size === categoryInfos.length ? new Set() : next
      })
    },
    [categoryInfos]
  )

  const createCategory = useCallback(
    async (input: { name: string; color: CalendarCategoryColor }): Promise<void> => {
      try {
        await window.api.calendar.categories.create(input)
        await refreshCategories()
        toast.success(translate('auto.components.calendar.categoryCreated', 'Category added.'))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : translate('auto.components.calendar.categorySaveFailed', 'Failed to save category.')
        )
      }
    },
    [refreshCategories]
  )

  const updateCategory = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: CalendarCategoryColor }
    ): Promise<void> => {
      try {
        await window.api.calendar.categories.update({ id, updates })
        await refreshCategories()
        toast.success(translate('auto.components.calendar.categoryUpdated', 'Category updated.'))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : translate('auto.components.calendar.categorySaveFailed', 'Failed to save category.')
        )
      }
    },
    [refreshCategories]
  )

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      try {
        await window.api.calendar.categories.delete({ id })
        await refreshCategories()
        setVisibleCategories(
          (current) => new Set([...current].filter((category) => category !== id))
        )
        toast.success(translate('auto.components.calendar.categoryDeleted', 'Category deleted.'))
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : translate('auto.components.calendar.categorySaveFailed', 'Failed to save category.')
        )
      }
    },
    [refreshCategories]
  )

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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border">
          <div className="flex min-h-0 flex-1">
            <CalendarSidePanel
              visibleCategories={visibleCategories}
              onToggleCategory={toggleCategory}
              onRequestManageCategories={() => setCategoryManagerOpen(true)}
              categories={categoryInfos}
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
              categories={categoryInfos}
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
              categories={categoryInfos}
              locale={locale}
              showLunarInfo={showLunarInfo}
              onCreateEntry={openCreateDialog}
              onEditEntry={openEditDialog}
            />
          </div>
          <CalendarRangeSummary
            range={range}
            entries={entries}
            visibleCategories={visibleCategories}
            categories={categoryInfos}
            viewYear={viewYear}
            locale={locale}
            onRangeChange={setRange}
            onRequestCopy={() => setWeekListOpen(true)}
          />
        </div>
      </div>

      <CalendarWorkListDialog
        open={weekListOpen}
        range={range}
        onRangeChange={setRange}
        entries={entries}
        visibleCategories={visibleCategories}
        viewYear={viewYear}
        locale={locale}
        onOpenChange={setWeekListOpen}
      />

      <CalendarEntryDialog
        open={dialogOpen}
        entry={editingEntry}
        defaultDate={selectedDateKey}
        isSaving={isSaving}
        categories={categoryInfos}
        onOpenChange={setDialogOpen}
        onSave={(input) => void saveEntry(input)}
        onRequestDelete={setDeleteTarget}
      />

      <CalendarCategoryManagerDialog
        open={categoryManagerOpen}
        categories={categoryInfos}
        onOpenChange={setCategoryManagerOpen}
        onCreate={createCategory}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />

      <CalendarEntryDeleteDialog
        target={deleteTarget}
        isSaving={isSaving}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </main>
  )
}
