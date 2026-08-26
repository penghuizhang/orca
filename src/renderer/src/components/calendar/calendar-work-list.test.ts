import { describe, expect, it } from 'vitest'

import type { CalendarEntry } from '../../../../shared/calendar-types'
import { hourSpan, summarizeWeekHours, weekRangeDates } from './calendar-time'
import {
  buildWorkListMarkdown,
  groupEntriesByDay,
  type WeekListStrings
} from './calendar-work-list'

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
  untitled: 'Untitled'
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

describe('groupEntriesByDay / buildWorkListMarkdown', () => {
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
    const groups = groupEntriesByDay(week, entries, new Set(), 2026)
    expect([...groups.keys()]).toEqual(week)
    expect(groups.get('2026-08-17')?.map((line) => line.entry.title)).toEqual([
      'Review docs',
      'Bug fix'
    ])
    expect(groups.get('2026-08-17')?.map((line) => line.hours)).toEqual([1.5, 0.5])
    // all-day entry stays in its day but is untimed (sorted first).
    expect(groups.get('2026-08-18')?.[0].timed).toBe(false)
  })

  it('renders the copy-paste markdown with numbered items only (no times/durations', () => {
    const md = buildWorkListMarkdown(
      { kind: 'week', anchor: '2026-08-18' },
      entries,
      new Set(),
      2026,
      'en-US',
      WEEK_STRINGS
    )
    expect(md).toContain('## Monday 8/17')
    expect(md).toContain('1. Review docs')
    expect(md).toContain('2. Bug fix')
    // all-day entry still appears — numbered like any other, sorted first that day
    expect(md).toContain('1. On call')
    // week title keeps the long-form heading
    expect(md).toContain('# August 17, 2026 – August 23 work list')
    // no times, durations, categories, subtotals, or grand totals
    expect(md).not.toContain('09:00-10:30')
    expect(md).not.toContain('1.5h')
    expect(md).not.toContain('[Meeting]')
    expect(md).not.toContain('Subtotal')
    expect(md).not.toContain('Total')
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
    const md = buildWorkListMarkdown(
      { kind: 'week', anchor: '2026-08-18' },
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

  it('renders a month range with the month title and every in-range day', () => {
    const md = buildWorkListMarkdown(
      { kind: 'month', year: 2026, month: 7 },
      [entry({ id: 'j', date: '2026-07-01', title: 'Quarter plan', category: 'meeting' })],
      new Set(),
      2026,
      'en-US',
      WEEK_STRINGS
    )
    expect(md).toContain('# July 2026 work list')
    expect(md).toContain('## Wednesday 7/1')
    expect(md).toContain('1. Quarter plan')
  })

  it('renders a custom range with a start–end title', () => {
    const md = buildWorkListMarkdown(
      { kind: 'custom', start: '2026-07-01', end: '2026-07-02' },
      [
        entry({ id: 'x', date: '2026-07-01', title: 'Day one', category: 'feature' }),
        entry({ id: 'y', date: '2026-07-02', title: 'Day two', category: 'feature' })
      ],
      new Set(),
      2026,
      'en-US',
      WEEK_STRINGS
    )
    expect(md).toContain('# Jul 1, 2026 – Jul 2, 2026 work list')
    expect(md).toContain('1. Day one')
    expect(md).toContain('1. Day two')
  })
})
