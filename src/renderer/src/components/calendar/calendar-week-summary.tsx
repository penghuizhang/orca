import React from 'react'

import type {
  CalendarCategory,
  CalendarCategoryInfo,
  CalendarEntry
} from '../../../../shared/calendar-types'
import { allCategoryInfos, categoryColor, categoryName } from './calendar-category-display'
import { collectWeekEntries } from './calendar-time'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

/** One-week summary pinned under the month grid: category counts + copy action. */
export function CalendarWeekSummary({
  weekDates,
  entries,
  visibleCategories,
  categories,
  viewYear,
  onRequestCopy
}: {
  weekDates: readonly string[]
  entries: readonly CalendarEntry[]
  visibleCategories: ReadonlySet<CalendarCategory>
  categories: readonly CalendarCategoryInfo[]
  viewYear: number
  onRequestCopy: () => void
}): React.JSX.Element {
  const weekEntries = collectWeekEntries(entries, weekDates, visibleCategories, viewYear)
  const counts = new Map<string, number>()
  for (const entry of weekEntries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted px-4 py-2 text-[13px]">
      <span className="shrink-0 font-semibold">
        {translate('auto.components.calendar.weekSummary', 'This week')}
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        {allCategoryInfos(categories).map((info) => {
          const count = counts.get(info.id) ?? 0
          return (
            <span key={info.id} className="flex items-center gap-1.5">
              <span className={cn('size-2 rounded-full', categoryColor(info.id, categories))} />
              {categoryName(info.id, categories, (key, fallback) => translate(key, fallback))}{' '}
              {count}
            </span>
          )
        })}
        <span>
          {translate('auto.components.calendar.weekEntryCount', '{{count}} items', {
            count: weekEntries.length
          })}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <Button size="sm" variant="outline" onClick={onRequestCopy}>
          {translate('auto.components.calendar.copyWeekList', 'Copy week list')}
        </Button>
      </div>
    </div>
  )
}
