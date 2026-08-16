import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { CALENDAR_CATEGORIES, type CalendarCategory } from '../../../../shared/calendar-types'
import {
  CALENDAR_CATEGORY_DOT_CLASSES,
  CALENDAR_CATEGORY_LABEL_FALLBACKS
} from './calendar-category-display'
import {
  addMonths,
  buildMonthMatrix,
  formatMonthTitle,
  isInMonth,
  toDateKey
} from './calendar-time'
import { isWeekendDateKey } from './holiday-data'
import { Checkbox } from '@/components/ui/checkbox'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

export function CalendarSidePanel({
  visibleCategories,
  onToggleCategory,
  year,
  month,
  selectedDateKey,
  todayKey,
  locale,
  showLunarInfo,
  onToggleLunarInfo,
  onMonthChange,
  onSelectDate
}: {
  /** Set size 0 means "all visible"; removing categories hides them. */
  visibleCategories: ReadonlySet<CalendarCategory>
  onToggleCategory: (category: CalendarCategory) => void
  year: number
  month: number
  selectedDateKey: string
  todayKey: string
  locale: string
  showLunarInfo: boolean
  onToggleLunarInfo: () => void
  onMonthChange: (year: number, month: number) => void
  onSelectDate: (dateKey: string) => void
}): React.JSX.Element {
  const cells = buildMonthMatrix(year, month)

  return (
    <aside className="hidden w-52 shrink-0 flex-col gap-4 border-r border-border px-3 py-4 lg:flex">
      <div>
        <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {translate('auto.components.calendar.categories', 'Categories')}
        </h2>
        <div className="flex flex-col gap-0.5">
          {CALENDAR_CATEGORIES.map((category) => {
            const visible = visibleCategories.size === 0 || visibleCategories.has(category)
            return (
              <label
                key={category}
                className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-[13px] hover:bg-accent"
              >
                <Checkbox checked={visible} onCheckedChange={() => onToggleCategory(category)} />
                <span
                  className={cn('size-2.5 rounded-full', CALENDAR_CATEGORY_DOT_CLASSES[category])}
                />
                <span className="flex-1 text-foreground/90">
                  {translate(
                    `auto.components.calendar.category.${category}`,
                    CALENDAR_CATEGORY_LABEL_FALLBACKS[category]
                  )}
                </span>
              </label>
            )
          })}
        </div>
        <div className="mt-1 border-t border-border pt-1">
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-[13px] hover:bg-accent">
            <Checkbox checked={showLunarInfo} onCheckedChange={() => onToggleLunarInfo()} />
            <span className="flex-1 text-foreground/90">
              {translate('auto.components.calendar.showLunarInfo', 'Show lunar info')}
            </span>
          </label>
        </div>
      </div>

      <div className="mt-auto">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="text-[13px] font-medium">{formatMonthTitle(year, month, locale)}</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label={translate('auto.components.calendar.previousMonth', 'Previous month')}
              onClick={() => {
                const next = addMonths(year, month, -1)
                onMonthChange(next.year, next.month)
              }}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label={translate('auto.components.calendar.nextMonth', 'Next month')}
              onClick={() => {
                const next = addMonths(year, month, 1)
                onMonthChange(next.year, next.month)
              }}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 text-center">
          {cells.map((cell) => {
            const dateKey = toDateKey(cell)
            const inMonth = isInMonth(cell, year, month)
            const isSelected = dateKey === selectedDateKey
            const isToday = dateKey === todayKey
            const isWeekend = isWeekendDateKey(dateKey)
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(dateKey)}
                className={cn(
                  'mx-auto flex size-7 items-center justify-center rounded-full text-[11px] leading-none',
                  inMonth ? 'text-foreground/90 hover:bg-accent' : 'text-muted-foreground/40',
                  isWeekend && !isSelected && 'text-destructive font-semibold',
                  isSelected && 'bg-accent font-semibold',
                  isToday && !isSelected && 'text-destructive font-semibold'
                )}
              >
                {cell.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
