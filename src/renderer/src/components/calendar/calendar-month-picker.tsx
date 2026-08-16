import React, { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { formatMonthTitle } from './calendar-time'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'

// Why: the lunar table covers 1900–2100, so month navigation stays inside it.
const MIN_YEAR = 1900
const MAX_YEAR = 2100

/** Header month title that opens a year/month picker on click. */
export function CalendarMonthPicker({
  year,
  month,
  locale,
  onSelect
}: {
  year: number
  month: number
  locale: string
  onSelect: (year: number, month: number) => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year)

  const openPicker = useCallback(
    (next: boolean): void => {
      if (next) {
        setPickerYear(year)
      }
      setOpen(next)
    },
    [year]
  )

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, index, 1))
      ),
    [locale]
  )
  const yearLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(new Date(pickerYear, 0, 1)),
    [pickerYear, locale]
  )

  return (
    <Popover open={open} onOpenChange={openPicker}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={translate('auto.components.calendar.pickMonth', 'Pick a month')}
          className="min-w-32 rounded-md px-2 py-0.5 text-center text-sm font-medium hover:bg-accent"
        >
          {formatMonthTitle(year, month, locale)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56">
        <div className="flex items-center justify-between px-1 pb-2">
          <button
            type="button"
            aria-label={translate('auto.components.calendar.previousYear', 'Previous year')}
            onClick={() => setPickerYear((current) => Math.max(MIN_YEAR, current - 1))}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium">{yearLabel}</span>
          <button
            type="button"
            aria-label={translate('auto.components.calendar.nextYear', 'Next year')}
            onClick={() => setPickerYear((current) => Math.min(MAX_YEAR, current + 1))}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {monthNames.map((name, index) => {
            const isSelected = index + 1 === month && pickerYear === year
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onSelect(pickerYear, index + 1)
                  setOpen(false)
                }}
                className={cn(
                  'rounded-md px-2 py-1.5 text-xs hover:bg-accent',
                  isSelected && 'bg-accent font-semibold'
                )}
              >
                {name}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
