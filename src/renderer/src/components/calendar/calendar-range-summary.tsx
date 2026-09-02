import React from 'react'

import type {
  CalendarCategory,
  CalendarCategoryInfo,
  CalendarEntry
} from '../../../../shared/calendar-types'
import { allCategoryInfos, categoryColor, categoryName } from './calendar-category-display'
import { CalendarRangePicker } from './calendar-range-picker'
import { collectWeekEntries, rangeDates, rangeLabel, summarizeWeekHours } from './calendar-time'
import type { WorkListRange } from './calendar-time'
import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

/** Range-aware summary pinned under the month grid: picker + category counts + copy. */
export function CalendarRangeSummary({
  range,
  entries,
  visibleCategories,
  categories,
  viewYear,
  locale,
  onRangeChange,
  onRequestCopy
}: {
  range: WorkListRange
  entries: readonly CalendarEntry[]
  visibleCategories: ReadonlySet<CalendarCategory>
  categories: readonly CalendarCategoryInfo[]
  viewYear: number
  locale: string
  onRangeChange: (range: WorkListRange) => void
  onRequestCopy: () => void
}): React.JSX.Element {
  const dates = rangeDates(range)
  const rangeEntries = collectWeekEntries(entries, dates, visibleCategories, viewYear)
  const counts = new Map<string, number>()
  for (const entry of rangeEntries) {
    counts.set(entry.category, (counts.get(entry.category) ?? 0) + 1)
  }
  const hours = summarizeWeekHours(entries, dates, visibleCategories, viewYear)

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-border bg-muted px-4 py-2 text-[13px]">
      <CalendarRangePicker value={range} onChange={onRangeChange} variant="bar" />
      <span className="shrink-0 font-semibold">{rangeLabel(range, locale)}</span>
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
            count: rangeEntries.length
          })}
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="font-medium">
          {translate('auto.components.calendar.weekTotalHours', '{{hours}}h total', { hours })}
        </span>
        <Button size="sm" variant="outline" onClick={onRequestCopy}>
          {translate('auto.components.calendar.copyList', 'Copy list')}
        </Button>
      </div>
    </div>
  )
}
