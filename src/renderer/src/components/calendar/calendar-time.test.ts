import { describe, expect, it } from 'vitest'

import {
  addMonths,
  buildMonthMatrix,
  collectEntriesByDateKey,
  formatMonthTitle,
  fromDateKey,
  getDayEntries,
  isInMonth,
  lunarRepeatDateKey,
  rangeDates,
  rangeLabel,
  shiftRange,
  toDateKey,
  weekRangeDates,
  WEEKDAY_COLUMNS,
  MONTH_GRID_ROWS
} from './calendar-time'
import type { CalendarEntry } from '../../../../shared/calendar-types'

function day(year: number, month: number, dayOfMonth: number): Date {
  return new Date(year, month - 1, dayOfMonth)
}

describe('toDateKey / fromDateKey', () => {
  it('round-trips local calendar days', () => {
    expect(toDateKey(day(2026, 8, 16))).toBe('2026-08-16')
    expect(toDateKey(day(2026, 1, 1))).toBe('2026-01-01')
    expect(toDateKey(fromDateKey('1999-12-31'))).toBe('1999-12-31')
  })
})

describe('addMonths', () => {
  it('rolls across year boundaries in both directions', () => {
    expect(addMonths(2026, 8, 1)).toEqual({ year: 2026, month: 9 })
    expect(addMonths(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
    expect(addMonths(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(addMonths(2026, 8, -8)).toEqual({ year: 2025, month: 12 })
  })
})

describe('buildMonthMatrix', () => {
  it('is a 6x7 Monday-first grid covering the whole month', () => {
    const cells = buildMonthMatrix(2026, 8)
    expect(cells).toHaveLength(WEEKDAY_COLUMNS * MONTH_GRID_ROWS)
    // 2026-08-01 is a Saturday, so the grid must start on Monday 2026-07-27.
    expect(toDateKey(cells[0])).toBe('2026-07-27')
    expect(toDateKey(cells[6])).toBe('2026-08-02')
    // Every August day appears somewhere in the grid.
    const keys = new Set(cells.map(toDateKey))
    for (let dayOfMonth = 1; dayOfMonth <= 31; dayOfMonth += 1) {
      expect(keys.has(toDateKey(day(2026, 8, dayOfMonth)))).toBe(true)
    }
  })

  it('starts exactly at the 1st when the month opens on a Monday', () => {
    // 2024-07-01 is a Monday.
    expect(toDateKey(buildMonthMatrix(2024, 7)[0])).toBe('2024-07-01')
  })
})

describe('isInMonth', () => {
  it('detects grid padding cells', () => {
    expect(isInMonth(day(2026, 7, 27), 2026, 8)).toBe(false)
    expect(isInMonth(day(2026, 8, 1), 2026, 8)).toBe(true)
  })
})

describe('getDayEntries', () => {
  it('filters by day and sorts all-day first then by start time', () => {
    const entries: CalendarEntry[] = [
      {
        id: '1',
        title: 'late',
        date: '2026-08-16',
        allDay: false,
        startTime: '14:00',
        endTime: null,
        category: 'meeting',
        description: '',
        lunarRepeat: null,
        createdAt: 0,
        updatedAt: 0
      },
      {
        id: '2',
        title: 'early',
        date: '2026-08-16',
        allDay: false,
        startTime: '09:30',
        endTime: null,
        category: 'feature',
        description: '',
        lunarRepeat: null,
        createdAt: 0,
        updatedAt: 0
      },
      {
        id: '3',
        title: 'whole day',
        date: '2026-08-16',
        allDay: true,
        startTime: null,
        endTime: null,
        category: 'other',
        description: '',
        lunarRepeat: null,
        createdAt: 0,
        updatedAt: 0
      },
      {
        id: '4',
        title: 'other day',
        date: '2026-08-17',
        allDay: false,
        startTime: '09:00',
        endTime: null,
        category: 'other',
        description: '',
        lunarRepeat: null,
        createdAt: 0,
        updatedAt: 0
      }
    ]
    expect(getDayEntries(entries, '2026-08-16').map((entry) => entry.id)).toEqual(['3', '2', '1'])
  })
})

describe('formatMonthTitle', () => {
  it('follows the given locale', () => {
    expect(formatMonthTitle(2026, 8, 'zh-CN')).toBe('2026年8月')
    expect(formatMonthTitle(2026, 8, 'en-US')).toBe('August 2026')
  })
})

describe('rangeDates', () => {
  it('expands a week to the same Monday-anchored 7 days', () => {
    expect(rangeDates({ kind: 'week', anchor: '2026-08-18' })).toEqual(weekRangeDates('2026-08-18'))
  })

  it('expands a month to its calendar days (leap-year aware)', () => {
    const aug = rangeDates({ kind: 'month', year: 2026, month: 8 })
    expect(aug).toHaveLength(31)
    expect(aug[0]).toBe('2026-08-01')
    expect(aug.at(-1)).toBe('2026-08-31')
    expect(rangeDates({ kind: 'month', year: 2026, month: 2 })).toHaveLength(28)
    expect(rangeDates({ kind: 'month', year: 2024, month: 2 })).toHaveLength(29)
  })

  it('expands a custom span inclusively, auto-swapping reversed endpoints', () => {
    expect(rangeDates({ kind: 'custom', start: '2026-08-01', end: '2026-08-10' })).toHaveLength(10)
    expect(rangeDates({ kind: 'custom', start: '2026-08-10', end: '2026-08-01' })[0]).toBe(
      '2026-08-01'
    )
  })
})

describe('rangeLabel', () => {
  it('labels a week like the week-range title', () => {
    expect(rangeLabel({ kind: 'week', anchor: '2026-08-18' }, 'en-US')).toBe(
      'Aug 17 – Aug 23, 2026'
    )
  })

  it('labels a month by its title', () => {
    expect(rangeLabel({ kind: 'month', year: 2026, month: 8 }, 'en-US')).toBe('August 2026')
    expect(rangeLabel({ kind: 'month', year: 2026, month: 8 }, 'zh-CN')).toBe('2026年8月')
  })

  it('labels a custom span with start and end', () => {
    expect(rangeLabel({ kind: 'custom', start: '2026-08-01', end: '2026-08-31' }, 'en-US')).toBe(
      'Aug 1, 2026 – Aug 31, 2026'
    )
  })
})

describe('shiftRange', () => {
  it('moves a week by ±7 days', () => {
    expect(shiftRange({ kind: 'week', anchor: '2026-08-18' }, 1)).toEqual({
      kind: 'week',
      anchor: '2026-08-25'
    })
    expect(shiftRange({ kind: 'week', anchor: '2026-08-18' }, -1)).toEqual({
      kind: 'week',
      anchor: '2026-08-11'
    })
  })

  it('moves a month by ±1', () => {
    expect(shiftRange({ kind: 'month', year: 2026, month: 8 }, 1)).toEqual({
      kind: 'month',
      year: 2026,
      month: 9
    })
    expect(shiftRange({ kind: 'month', year: 2026, month: 1 }, -1)).toEqual({
      kind: 'month',
      year: 2025,
      month: 12
    })
  })

  it('shifts a custom span by its own length + 1 day gap', () => {
    const shifted = shiftRange({ kind: 'custom', start: '2026-08-01', end: '2026-08-10' }, 1)
    expect(shifted).toEqual({ kind: 'custom', start: '2026-08-11', end: '2026-08-20' })
  })
})

describe('lunarRepeatDateKey / collectEntriesByDateKey', () => {
  const solarEntry = {
    id: 'solar',
    title: '固定日期',
    date: '2026-09-25',
    allDay: false,
    startTime: '10:00',
    endTime: '11:00',
    category: 'meeting' as const,
    description: '',
    lunarRepeat: null,
    createdAt: 0,
    updatedAt: 0
  }
  const lunarEntry = {
    ...solarEntry,
    id: 'lunar',
    title: '中秋团圆',
    date: '2026-09-25',
    lunarRepeat: { month: 8, day: 15 }
  }

  it('maps a lunar-repeat entry to its occurrence within the view year', () => {
    expect(lunarRepeatDateKey({ month: 8, day: 15 }, 2026)).toBe('2026-09-25')
    expect(lunarRepeatDateKey({ month: 8, day: 15 }, 2025)).toBe('2025-10-06')
  })

  it('buckets solar and lunar entries together per displayed day', () => {
    const in2026 = collectEntriesByDateKey([solarEntry, lunarEntry], '2026-09-25', 2026)
    expect(in2026.map((entry) => entry.id).sort()).toEqual(['lunar', 'solar'])
    // The same rule maps to 2025-10-06 in the 2025 view year; the solar entry
    // stays on its fixed 2026 date.
    const in2025 = collectEntriesByDateKey([solarEntry, lunarEntry], '2025-10-06', 2025)
    expect(in2025.map((entry) => entry.id)).toEqual(['lunar'])
  })

  it('skips lunar days that do not exist in a year', () => {
    expect(lunarRepeatDateKey({ month: 12, day: 30 }, 2026)).toBeNull()
  })
})
