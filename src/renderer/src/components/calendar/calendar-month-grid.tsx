import React from 'react'

import type {
  CalendarCategory,
  CalendarCategoryInfo,
  CalendarEntry
} from '../../../../shared/calendar-types'
import { getDayLabel } from './festival'
import { getHolidayBlock, getHolidayException, isWeekendDateKey } from './holiday-data'
import {
  formatWeekdayHeaders,
  fromDateKey,
  isInMonth,
  isSameDay,
  buildMonthMatrix,
  toDateKey,
  lunarRepeatDateKey
} from './calendar-time'
import { categoryColor } from './calendar-category-display'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'

const MAX_VISIBLE_CHIPS = 3

export function CalendarMonthGrid({
  year,
  month,
  entries,
  selectedDateKey,
  todayKey,
  visibleCategories,
  categories,
  locale,
  showLunarInfo,
  onSelectDate,
  onEditEntry,
  onRequestCreate
}: {
  year: number
  month: number
  entries: readonly CalendarEntry[]
  selectedDateKey: string
  todayKey: string
  visibleCategories: ReadonlySet<CalendarCategory>
  categories: readonly CalendarCategoryInfo[]
  locale: string
  showLunarInfo: boolean
  onSelectDate: (dateKey: string) => void
  onEditEntry: (entry: CalendarEntry) => void
  /** Empty-cell click: open the create dialog for that day. */
  onRequestCreate: (dateKey: string) => void
}): React.JSX.Element {
  const cells = buildMonthMatrix(year, month)
  const weekdayHeaders = formatWeekdayHeaders(locale)
  const entriesByDay = new Map<string, CalendarEntry[]>()
  for (const entry of entries) {
    if (visibleCategories.size > 0 && !visibleCategories.has(entry.category)) {
      continue
    }
    // Why: lunar-repeat entries land on their occurrence within the view year,
    // not on the stored anchor date.
    const targetKey = entry.lunarRepeat ? lunarRepeatDateKey(entry.lunarRepeat, year) : entry.date
    if (!targetKey) {
      continue
    }
    const dayEntries = entriesByDay.get(targetKey) ?? []
    dayEntries.push(entry)
    entriesByDay.set(targetKey, dayEntries)
  }
  const today = fromDateKey(todayKey)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 grid-cols-7 border-b border-border">
        {weekdayHeaders.map((header, index) => (
          <div
            key={header}
            className={cn(
              'px-2 py-1.5 text-right text-[11px] font-medium tracking-wide uppercase text-muted-foreground',
              index >= 5 && 'font-semibold text-destructive'
            )}
          >
            {header}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6">
        {cells.map((cell, index) => {
          const dateKey = toDateKey(cell)
          const inMonth = isInMonth(cell, year, month)
          const isToday = isSameDay(cell, today)
          const isSelected = dateKey === selectedDateKey
          const isWeekend = isWeekendDateKey(dateKey)
          const exception = getHolidayException(dateKey)
          const dayLabel = showLunarInfo ? getDayLabel(cell) : null
          // Why: one banner spans each contiguous run of a statutory holiday
          // within a grid row, so the eye reads the whole stretch at once.
          const block = getHolidayBlock(dateKey)
          const rowStart = Math.floor(index / 7) * 7
          const previousBlock =
            index > rowStart ? getHolidayBlock(toDateKey(cells[index - 1])) : null
          const isBlockStart = block !== null && previousBlock?.name !== block.name
          let segmentLength = 1
          if (isBlockStart) {
            for (let i = index + 1; i < rowStart + 7; i += 1) {
              if (getHolidayBlock(toDateKey(cells[i]))?.name !== block.name) {
                break
              }
              segmentLength += 1
            }
          }
          const dayEntries = entriesByDay.get(dateKey) ?? []
          const sortedDayEntries = [...dayEntries].sort((left, right) =>
            left.allDay === right.allDay ? 0 : left.allDay ? -1 : 1
          )
          const visibleEntries = sortedDayEntries.slice(0, MAX_VISIBLE_CHIPS)
          const hiddenCount = sortedDayEntries.length - visibleEntries.length
          return (
            <div
              key={dateKey}
              onClick={() => {
                onSelectDate(dateKey)
                onRequestCreate(dateKey)
              }}
              className={cn(
                'relative flex min-h-0 cursor-pointer flex-col items-stretch gap-0.5 border-t border-l border-border px-1.5 transition-colors hover:bg-accent/60',
                // Why: the banner overlays the top padding, so every cell it
                // crosses must reserve the same headroom (plain ternary: the
                // merge of py-1 and pt-* is not reliable in every twMerge version).
                block !== null ? 'pt-4 pb-1' : 'py-1',
                // Why: a make-up workday (补班) Saturday/Sunday is a workday, so
                // it loses the weekend tint; the 班 badge tells the truth.
                isWeekend &&
                  exception !== 'work' &&
                  'bg-muted-foreground/10 dark:bg-muted-foreground/15',
                !inMonth && 'bg-muted/20',
                isSelected && 'bg-accent'
              )}
            >
              {isBlockStart && block ? (
                <div
                  className="pointer-events-none absolute left-0 top-0 z-10 flex h-3.5 items-center overflow-hidden rounded-sm bg-destructive/10 px-1 text-[10px] font-medium text-destructive"
                  style={{ width: `calc(${segmentLength} * 100% + ${segmentLength - 1}px)` }}
                >
                  <span className="truncate">
                    {`${block.name} · ${translate(
                      'auto.components.calendar.holidayDays',
                      '{{count}} days',
                      {
                        count: block.totalDays
                      }
                    )}`}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-1">
                <span className="flex min-w-0 items-center gap-1">
                  {exception === 'rest' ? (
                    <span className="shrink-0 rounded-sm bg-destructive/10 px-0.5 text-[9px] font-semibold leading-none text-destructive">
                      {translate('auto.components.calendar.restBadge', '休')}
                    </span>
                  ) : exception === 'work' ? (
                    <span className="shrink-0 rounded-sm bg-muted-foreground/10 px-0.5 text-[9px] leading-none text-muted-foreground">
                      {translate('auto.components.calendar.workBadge', '班')}
                    </span>
                  ) : null}
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] leading-none',
                      isToday && 'bg-destructive font-semibold text-destructive-foreground',
                      !isToday && isSelected && 'font-semibold',
                      !inMonth && 'text-muted-foreground/50',
                      isWeekend && !isToday && !isSelected && 'font-semibold text-destructive'
                    )}
                  >
                    {cell.getDate()}
                  </span>
                </span>
                {/* Why: the banner already names the holiday; the corner label
                    would duplicate it and crowd the cell. */}
                {dayLabel && !block ? (
                  <span className="truncate text-[10px] text-muted-foreground">{dayLabel}</span>
                ) : null}
              </div>
              <div className="flex min-h-0 flex-col gap-0.5 overflow-hidden">
                {visibleEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditEntry(entry)
                    }}
                    className={cn(
                      'flex min-w-0 items-center gap-1 rounded-sm px-1 py-px text-left text-[11px] leading-4 text-foreground/90',
                      entry.allDay ? 'bg-accent-foreground/10' : 'bg-accent-foreground/5',
                      'truncate hover:bg-accent-foreground/15',
                      !inMonth && 'opacity-60'
                    )}
                  >
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        categoryColor(entry.category, categories)
                      )}
                    />
                    <span className="truncate">
                      {!entry.allDay && entry.startTime ? `${entry.startTime} ` : ''}
                      {entry.title || translate('auto.components.calendar.untitled', 'Untitled')}
                    </span>
                  </button>
                ))}
                {hiddenCount > 0 ? (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    {translate('auto.components.calendar.moreEntries', '+{{count}} more', {
                      count: hiddenCount
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
