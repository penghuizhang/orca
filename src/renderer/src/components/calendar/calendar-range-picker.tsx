import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import type { WorkListRange } from './calendar-time'
import { addMonths, fromDateKey, shiftRange, toDateKey, todayDateKey } from './calendar-time'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'

type RangePreset = 'week-this' | 'week-last' | 'month-this' | 'month-last' | 'custom'

/** Preset ranges, all computed relative to today (not the month-grid view). */
function presetRange(preset: RangePreset): WorkListRange {
  const today = fromDateKey(todayDateKey())
  switch (preset) {
    case 'week-this':
      return { kind: 'week', anchor: todayDateKey() }
    case 'week-last': {
      const anchor = new Date(today)
      anchor.setDate(anchor.getDate() - 7)
      return { kind: 'week', anchor: toDateKey(anchor) }
    }
    case 'month-this':
      return { kind: 'month', year: today.getFullYear(), month: today.getMonth() + 1 }
    case 'month-last': {
      const month = addMonths(today.getFullYear(), today.getMonth() + 1, -1)
      return { kind: 'month', ...month }
    }
    case 'custom': {
      const end = new Date(today)
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return { kind: 'custom', start: toDateKey(start), end: toDateKey(end) }
    }
  }
}

/** Map a live range back to a preset id (falls back to "custom" when navigated). */
function detectPreset(range: WorkListRange): RangePreset {
  const today = fromDateKey(todayDateKey())
  if (range.kind === 'week') {
    if (range.anchor === todayDateKey()) {
      return 'week-this'
    }
    const last = new Date(today)
    last.setDate(last.getDate() - 7)
    if (range.anchor === toDateKey(last)) {
      return 'week-last'
    }
  } else if (range.kind === 'month') {
    if (range.year === today.getFullYear() && range.month === today.getMonth() + 1) {
      return 'month-this'
    }
    const lastMonth = addMonths(today.getFullYear(), today.getMonth() + 1, -1)
    if (range.year === lastMonth.year && range.month === lastMonth.month) {
      return 'month-last'
    }
  }
  return 'custom'
}

/** Shared range selector for the summary bar and the work-list dialog. */
export function CalendarRangePicker({
  value,
  onChange,
  variant
}: {
  value: WorkListRange
  onChange: (range: WorkListRange) => void
  variant: 'bar' | 'dialog'
}): React.JSX.Element {
  const preset = detectPreset(value)
  const selector = (
    <Select value={preset} onValueChange={(next) => onChange(presetRange(next as RangePreset))}>
      <SelectTrigger size="sm" className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week-this">
          {translate('auto.components.calendar.rangeWeek', 'This week')}
        </SelectItem>
        <SelectItem value="week-last">
          {translate('auto.components.calendar.rangeLastWeek', 'Last week')}
        </SelectItem>
        <SelectItem value="month-this">
          {translate('auto.components.calendar.rangeMonth', 'This month')}
        </SelectItem>
        <SelectItem value="month-last">
          {translate('auto.components.calendar.rangeLastMonth', 'Last month')}
        </SelectItem>
        <SelectItem value="custom">
          {translate('auto.components.calendar.rangeCustom', 'Custom range')}
        </SelectItem>
      </SelectContent>
    </Select>
  )

  if (variant === 'bar') {
    return selector
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {selector}
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={translate('auto.components.calendar.rangePrev', 'Previous period')}
        onClick={() => onChange(shiftRange(value, -1))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={translate('auto.components.calendar.rangeNext', 'Next period')}
        onClick={() => onChange(shiftRange(value, 1))}
      >
        <ChevronRight className="size-4" />
      </Button>
      {value.kind === 'custom' && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {translate('auto.components.calendar.rangeStart', 'Start')}
          </span>
          <Input
            type="date"
            value={value.start}
            onChange={(event) => onChange({ ...value, start: event.target.value || value.start })}
            className="w-[150px]"
          />
          <span className="text-xs text-muted-foreground">
            {translate('auto.components.calendar.rangeEnd', 'End')}
          </span>
          <Input
            type="date"
            value={value.end}
            onChange={(event) => onChange({ ...value, end: event.target.value || value.end })}
            className="w-[150px]"
          />
        </div>
      )}
    </div>
  )
}
