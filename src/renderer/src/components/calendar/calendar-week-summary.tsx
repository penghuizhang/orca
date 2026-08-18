import React from 'react'

import type { CalendarCategory, CalendarEntry } from '../../../../shared/calendar-types'
import { CALENDAR_CATEGORIES } from '../../../../shared/calendar-types'
import {
  CALENDAR_CATEGORY_DOT_CLASSES,
  CALENDAR_CATEGORY_LABEL_FALLBACKS
} from './calendar-category-display'
import { collectWeekEntries, summarizeWeekHours } from './calendar-time'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

/** One-week summary pinned under the month grid: category counts + total hours. */
export function CalendarWeekSummary({
  weekDates,
  entries,
  visibleCategories,
  viewYear,
  onRequestCopy
}: {
  weekDates: readonly string[]
  entries: readonly CalendarEntry[]
  visibleCategories: ReadonlySet<CalendarCategory>
  viewYear: number
  onRequestCopy: () => void
}): React.JSX.Element {
  const weekEntries = collectWeekEntries(entries, weekDates, visibleCategories, viewYear)
  const totalHours = summarizeWeekHours(entries, weekDates, visibleCategories, viewYear)
  const counts = new Map<CalendarCategory, number>()
  for (const category of CALENDAR_CATEGORIES) {
    counts.set(category, 0)
  }
  for (const entry of weekEntries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted px-4 py-2 text-[13px]">
      <span className="shrink-0 font-semibold">
        {translate('auto.components.calendar.weekSummary', 'This week')}
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        {CALENDAR_CATEGORIES.map((category) => (
          <span key={category} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-full', CALENDAR_CATEGORY_DOT_CLASSES[category])} />
            {translate(
              `auto.components.calendar.category.${category}`,
              CALENDAR_CATEGORY_LABEL_FALLBACKS[category]
            )}{' '}
            {counts.get(category) ?? 0}
          </span>
        ))}
        <span>
          {translate('auto.components.calendar.weekEntryCount', '{{count}} items', {
            count: weekEntries.length
          })}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="shrink-0 font-semibold">
          {translate('auto.components.calendar.weekTotalHours', '{{hours}}h total', {
            hours: totalHours.toFixed(1)
          })}
        </span>
        <Button size="sm" variant="outline" onClick={onRequestCopy}>
          {translate('auto.components.calendar.copyWeekList', 'Copy week list')}
        </Button>
      </div>
    </div>
  )
}
