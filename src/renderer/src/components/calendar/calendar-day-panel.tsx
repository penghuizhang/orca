import React from 'react'
import { Plus } from 'lucide-react'

import type { CalendarEntry, CalendarCategory } from '../../../../shared/calendar-types'
import {
  CALENDAR_CATEGORY_DOT_CLASSES,
  CALENDAR_CATEGORY_LABEL_FALLBACKS
} from './calendar-category-display'
import {
  collectEntriesByDateKey,
  formatDayPanelTitle,
  formatEntryStart,
  fromDateKey
} from './calendar-time'
import { getDayLabel } from './festival'
import { getHolidayException } from './holiday-data'
import { getLunarDayText, getLunarYearMonthDayText } from './lunar-date'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

export function CalendarDayPanel({
  dateKey,
  entries,
  visibleCategories,
  locale,
  showLunarInfo,
  onCreateEntry,
  onEditEntry
}: {
  dateKey: string
  entries: readonly CalendarEntry[]
  visibleCategories: ReadonlySet<CalendarCategory>
  locale: string
  showLunarInfo: boolean
  onCreateEntry: () => void
  onEditEntry: (entry: CalendarEntry) => void
}): React.JSX.Element {
  const date = fromDateKey(dateKey)
  const visibleEntries = collectEntriesByDateKey(entries, dateKey, date.getFullYear()).filter(
    (entry) => visibleCategories.size === 0 || visibleCategories.has(entry.category)
  )
  const lunarText = showLunarInfo ? getLunarYearMonthDayText(date) : null
  const label = showLunarInfo ? getDayLabel(date) : null
  // Why: the plain lunar day name already appears in the lunar line; only
  // festivals and solar terms add information on top of it.
  const specialLabel = label !== null && label !== getLunarDayText(date)
  const status = getHolidayException(dateKey)

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-l border-border px-3 py-4 md:flex">
      <h2 className="pb-1 text-sm font-semibold">{formatDayPanelTitle(dateKey, locale)}</h2>
      <div className="flex items-center gap-1.5 pb-3 text-[11px] text-muted-foreground">
        {lunarText ? <span className="truncate">{lunarText}</span> : null}
        {specialLabel ? <span className="text-destructive/90">{specialLabel}</span> : null}
        {status === 'rest' ? (
          <span className="font-semibold text-destructive">
            {translate('auto.components.calendar.restBadge', '休')}
          </span>
        ) : status === 'work' ? (
          <span className="font-medium">
            {translate('auto.components.calendar.workBadge', '班')}
          </span>
        ) : null}
      </div>
      <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto">
        {visibleEntries.length === 0 ? (
          <p className="px-1 pt-6 text-center text-xs text-muted-foreground">
            {translate('auto.components.calendar.noEntries', 'No entries')}
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {visibleEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onEditEntry(entry)}
                className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    CALENDAR_CATEGORY_DOT_CLASSES[entry.category]
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] leading-5 text-foreground/95">
                    {entry.title || translate('auto.components.calendar.untitled', 'Untitled')}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {entry.allDay ? (
                      <span>{translate('auto.components.calendar.allDay', 'All day')}</span>
                    ) : (
                      <span className="font-medium">{formatEntryStart(entry)}</span>
                    )}
                    <span className="truncate">
                      {translate(
                        `auto.components.calendar.category.${entry.category}`,
                        CALENDAR_CATEGORY_LABEL_FALLBACKS[entry.category]
                      )}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 pt-2">
        <Button variant="outline" className="w-full" onClick={onCreateEntry}>
          <Plus className="size-4" />
          {translate('auto.components.calendar.newEntry', 'New entry')}
        </Button>
      </div>
    </aside>
  )
}
