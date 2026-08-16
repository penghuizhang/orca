import { describe, expect, it } from 'vitest'

import {
  applyCalendarEntryUpdate,
  compareCalendarEntriesByStart,
  isCalendarCategory,
  isValidCalendarDate,
  isValidCalendarTime,
  normalizeCalendarEntry
} from './calendar-types'

function validEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entry-1',
    title: '  周会  ',
    date: '2026-08-16',
    allDay: false,
    startTime: '09:30',
    endTime: '10:30',
    category: 'meeting',
    description: 'sync',
    createdAt: 100,
    updatedAt: 100,
    ...overrides
  }
}

describe('isValidCalendarDate', () => {
  it('accepts real calendar days', () => {
    expect(isValidCalendarDate('2026-08-16')).toBe(true)
    expect(isValidCalendarDate('2024-02-29')).toBe(true)
  })

  it('rejects impossible days and malformed strings', () => {
    expect(isValidCalendarDate('2026-02-30')).toBe(false)
    expect(isValidCalendarDate('2023-02-29')).toBe(false)
    expect(isValidCalendarDate('2026-8-16')).toBe(false)
    expect(isValidCalendarDate('2026-08-16T00:00:00')).toBe(false)
    expect(isValidCalendarDate(20260816)).toBe(false)
    expect(isValidCalendarDate(null)).toBe(false)
  })
})

describe('isValidCalendarTime', () => {
  it('accepts HH:mm within range', () => {
    expect(isValidCalendarTime('00:00')).toBe(true)
    expect(isValidCalendarTime('23:59')).toBe(true)
    expect(isValidCalendarTime('09:30')).toBe(true)
  })

  it('rejects out-of-range and malformed times', () => {
    expect(isValidCalendarTime('24:00')).toBe(false)
    expect(isValidCalendarTime('9:30')).toBe(false)
    expect(isValidCalendarTime('09:60')).toBe(false)
    expect(isValidCalendarTime('0930')).toBe(false)
    expect(isValidCalendarTime(null)).toBe(false)
  })
})

describe('isCalendarCategory', () => {
  it('accepts the four categories only', () => {
    expect(isCalendarCategory('meeting')).toBe(true)
    expect(isCalendarCategory('feature')).toBe(true)
    expect(isCalendarCategory('milestone')).toBe(true)
    expect(isCalendarCategory('other')).toBe(true)
    expect(isCalendarCategory('parties')).toBe(false)
    expect(isCalendarCategory(1)).toBe(false)
  })
})

describe('normalizeCalendarEntry', () => {
  it('trims the title and keeps valid fields', () => {
    const entry = normalizeCalendarEntry(validEntry())
    expect(entry).not.toBeNull()
    expect(entry?.title).toBe('周会')
    expect(entry?.startTime).toBe('09:30')
  })

  it('drops rows without id or with invalid date', () => {
    expect(normalizeCalendarEntry(validEntry({ id: '' }))).toBeNull()
    expect(normalizeCalendarEntry(validEntry({ date: '2026-13-01' }))).toBeNull()
    expect(normalizeCalendarEntry('junk')).toBeNull()
    expect(normalizeCalendarEntry(null)).toBeNull()
  })

  it('falls back on unknown categories and non-string descriptions', () => {
    const entry = normalizeCalendarEntry(
      validEntry({ category: 'vacation', description: 42, title: undefined })
    )
    expect(entry?.category).toBe('other')
    expect(entry?.description).toBe('')
    expect(entry?.title).toBe('')
  })

  it('clears times on all-day entries and keeps them on timed ones', () => {
    expect(normalizeCalendarEntry(validEntry({ allDay: true }))?.startTime).toBeNull()
    expect(normalizeCalendarEntry(validEntry({ startTime: '9:30' }))?.startTime).toBeNull()
    expect(normalizeCalendarEntry(validEntry({ startTime: null }))?.startTime).toBeNull()
  })

  it('defaults missing timestamps to a number', () => {
    const entry = normalizeCalendarEntry(validEntry({ createdAt: undefined }))
    expect(typeof entry?.createdAt).toBe('number')
  })
})

describe('applyCalendarEntryUpdate', () => {
  it('merges only provided fields', () => {
    const current = normalizeCalendarEntry(validEntry())!
    const updated = applyCalendarEntryUpdate(current, { title: '评审' })
    expect(updated?.title).toBe('评审')
    expect(updated?.date).toBe('2026-08-16')
    expect(updated?.startTime).toBe('09:30')
  })

  it('clears times when switching to all-day', () => {
    const current = normalizeCalendarEntry(validEntry())!
    const updated = applyCalendarEntryUpdate(current, { allDay: true })
    expect(updated?.allDay).toBe(true)
    expect(updated?.startTime).toBeNull()
    expect(updated?.endTime).toBeNull()
  })

  it('normalizes an end time earlier than the start to the start', () => {
    const current = normalizeCalendarEntry(validEntry())!
    const updated = applyCalendarEntryUpdate(current, { endTime: '08:00' })
    expect(updated?.endTime).toBe('09:30')
  })

  it('rejects updates that make the date invalid', () => {
    const current = normalizeCalendarEntry(validEntry())!
    expect(applyCalendarEntryUpdate(current, { date: 'oops' })).toBeNull()
  })
})

describe('compareCalendarEntriesByStart', () => {
  it('sorts all-day first, then by start time', () => {
    const entries = [
      normalizeCalendarEntry(validEntry({ id: 'b', startTime: '14:00' }))!,
      normalizeCalendarEntry(validEntry({ id: 'allday', allDay: true }))!,
      normalizeCalendarEntry(validEntry({ id: 'a', startTime: '09:00' }))!
    ]
    const sorted = [...entries].sort(compareCalendarEntriesByStart)
    expect(sorted.map((entry) => entry.id)).toEqual(['allday', 'a', 'b'])
  })
})

describe('normalizeCalendarEntry lunarRepeat', () => {
  it('defaults to null when absent (old persisted data)', () => {
    const entry = normalizeCalendarEntry(validEntry())
    expect(entry!.lunarRepeat).toBeNull()
  })

  it('keeps a valid lunar repeat', () => {
    const entry = normalizeCalendarEntry(validEntry({ lunarRepeat: { month: 8, day: 15 } }))
    expect(entry!.lunarRepeat).toEqual({ month: 8, day: 15 })
  })

  it('rejects invalid lunar repeats', () => {
    expect(
      normalizeCalendarEntry(validEntry({ lunarRepeat: { month: 13, day: 1 } }))!.lunarRepeat
    ).toBeNull()
    expect(
      normalizeCalendarEntry(validEntry({ lunarRepeat: { month: 8, day: 0 } }))!.lunarRepeat
    ).toBeNull()
    expect(normalizeCalendarEntry(validEntry({ lunarRepeat: 'bad' }))!.lunarRepeat).toBeNull()
    expect(normalizeCalendarEntry(validEntry({ lunarRepeat: null }))!.lunarRepeat).toBeNull()
  })

  it('round-trips lunarRepeat through updates', () => {
    const current = normalizeCalendarEntry(validEntry({ lunarRepeat: null }))!
    const updated = applyCalendarEntryUpdate(current, { lunarRepeat: { month: 5, day: 5 } })
    expect(updated!.lunarRepeat).toEqual({ month: 5, day: 5 })
    const cleared = applyCalendarEntryUpdate(updated!, { lunarRepeat: null })
    expect(cleared!.lunarRepeat).toBeNull()
  })
})
