import { describe, expect, it } from 'vitest'

import type { CalendarEntry } from '../../../../shared/calendar-types'
import { hourSpan, summarizeWeekHours, weekRangeDates } from './calendar-time'
import {
  buildWeekListMarkdown,
  groupWeekEntriesByDay,
  type WeekListStrings
} from './calendar-week-list'

function entry(partial: Partial<CalendarEntry> & { id: string; date: string }): CalendarEntry {
  return {
    title: 'task',
    allDay: false,
    startTime: null,
    endTime: null,
    category: 'feature',
    description: '',
    lunarRepeat: null,
    createdAt: 0,
    updatedAt: 0,
    ...partial
  }
}

const WEEK_STRINGS: WeekListStrings = {
  workList: 'work list',
  subtotal: 'Subtotal',
  total: 'Total',
  untimed: 'untimed',
  hourUnit: 'h',
  categories: { meeting: 'Meeting', feature: 'Feature', milestone: 'Milestone', other: 'Other' }
}

describe('weekRangeDates', () => {
  it('anchors every day of the week to the same Monday', () => {
    expect(weekRangeDates('2026-08-18')).toEqual([
      '2026-08-17',
      '2026-08-18',
      '2026-08-19',
      '2026-08-20',
      '2026-08-21',
      '2026-08-22',
      '2026-08-23'
    ])
  })

  it('handles a Monday itself and a Sunday', () => {
    expect(weekRangeDates('2026-08-17')[0]).toBe('2026-08-17')
    expect(weekRangeDates('2026-08-23')[6]).toBe('2026-08-23')
  })

  it('crosses month boundaries', () => {
    expect(weekRangeDates('2026-09-01')).toEqual([
      '2026-08-31',
      '2026-09-01',
      '2026-09-02',
      '2026-09-03',
      '2026-09-04',
      '2026-09-05',
      '2026-09-06'
    ])
  })
})

describe('hourSpan', () => {
  it('computes whole and half hours', () => {
    expect(
      hourSpan(entry({ id: '1', date: '2026-08-18', startTime: '09:00', endTime: '10:30' }))
    ).toBe(1.5)
    expect(
      hourSpan(entry({ id: '2', date: '2026-08-18', startTime: '14:00', endTime: '16:00' }))
    ).toBe(2)
  })

  it('floors to the nearest half hour', () => {
    expect(
      hourSpan(entry({ id: '1', date: '2026-08-18', startTime: '09:07', endTime: '10:52' }))
    ).toBe(1.5)
  })

  it('returns 0 for all-day, missing-time, or zero-length entries', () => {
    expect(hourSpan(entry({ id: '1', date: '2026-08-18', allDay: true }))).toBe(0)
    expect(
      hourSpan(entry({ id: '2', date: '2026-08-18', startTime: '09:00', endTime: null }))
    ).toBe(0)
    expect(
      hourSpan(entry({ id: '3', date: '2026-08-18', startTime: '09:00', endTime: '09:00' }))
    ).toBe(0)
    expect(hourSpan(entry({ id: '4', date: '2026-08-18', startTime: null, endTime: null }))).toBe(0)
  })
})

describe('summarizeWeekHours', () => {
  const week = weekRangeDates('2026-08-18')
  const entries: CalendarEntry[] = [
    entry({
      id: 'in1',
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '10:30',
      category: 'meeting'
    }),
    entry({ id: 'in2', date: '2026-08-18', startTime: '14:00', endTime: '16:00' }),
    entry({
      id: 'in3',
      date: '2026-08-21',
      startTime: '10:00',
      endTime: '11:30',
      category: 'other'
    }),
    entry({ id: 'allday', date: '2026-08-19', allDay: true }),
    entry({ id: 'out', date: '2026-08-24', startTime: '09:00', endTime: '18:00' })
  ]

  it('sums only entries inside the week, ignoring all-day and out-of-week', () => {
    expect(summarizeWeekHours(entries, week, new Set(), 2026)).toBe(5)
  })

  it('respects the visible-category filter', () => {
    expect(summarizeWeekHours(entries, week, new Set(['meeting']), 2026)).toBe(1.5)
    expect(summarizeWeekHours(entries, week, new Set(['feature', 'other']), 2026)).toBe(3.5)
  })
})

describe('groupWeekEntriesByDay / buildWeekListMarkdown', () => {
  const week = weekRangeDates('2026-08-18')
  const entries: CalendarEntry[] = [
    entry({
      id: 'a',
      date: '2026-08-17',
      startTime: '09:00',
      endTime: '10:30',
      title: 'Review docs',
      category: 'meeting'
    }),
    entry({
      id: 'b',
      date: '2026-08-17',
      startTime: '14:00',
      endTime: '14:30',
      title: 'Bug fix',
      category: 'feature'
    }),
    entry({
      id: 'c',
      date: '2026-08-18',
      startTime: '09:00',
      endTime: '10:00',
      title: 'Standup',
      category: 'meeting'
    }),
    entry({ id: 'd', date: '2026-08-18', allDay: true, title: 'On call', category: 'other' })
  ]

  it('groups entries by day in week order with computed hours', () => {
    const groups = groupWeekEntriesByDay(week, entries, new Set(), 2026)
    expect([...groups.keys()]).toEqual(week)
    expect(groups.get('2026-08-17')?.map((line) => line.entry.title)).toEqual([
      'Review docs',
      'Bug fix'
    ])
    expect(groups.get('2026-08-17')?.map((line) => line.hours)).toEqual([1.5, 0.5])
    // all-day entry stays in its day but is untimed (sorted first).
    expect(groups.get('2026-08-18')?.[0].timed).toBe(false)
  })

  it('renders the copy-paste markdown with subtotals and a grand total', () => {
    const md = buildWeekListMarkdown(week, entries, new Set(), 2026, 'en-US', WEEK_STRINGS)
    expect(md).toContain('## Monday 8/17')
    expect(md).toContain('- 09:00-10:30 Review docs 1.5h [Meeting]')
    expect(md).toContain('Subtotal 2.0h')
    expect(md).toContain('On call [Other] (untimed)')
    expect(md).toContain('**Total 3.0h (4)**')
  })

  it('excludes out-of-week entries and respects the category filter', () => {
    const withOut = [
      ...entries,
      entry({
        id: 'e',
        date: '2026-08-24',
        startTime: '09:00',
        endTime: '18:00',
        title: 'Next week'
      })
    ]
    const md = buildWeekListMarkdown(
      week,
      withOut,
      new Set(['meeting']),
      2026,
      'en-US',
      WEEK_STRINGS
    )
    expect(md).not.toContain('Next week')
    expect(md).not.toContain('Bug fix')
    expect(md).toContain('Review docs')
  })
})
