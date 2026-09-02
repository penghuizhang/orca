import { describe, expect, it } from 'vitest'

import {
  getDayStatus,
  getHolidayBlock,
  getHolidayException,
  isWeekendDateKey
} from './holiday-data'

describe('getHolidayException', () => {
  it('marks 2026 statutory holidays as rest (dates from the gov.cn notice)', () => {
    expect(getHolidayException('2026-10-01')).toBe('rest')
    expect(getHolidayException('2026-10-05')).toBe('rest')
    expect(getHolidayException('2026-02-17')).toBe('rest')
    expect(getHolidayException('2026-05-01')).toBe('rest')
  })

  it('marks 2026 make-up workdays as work', () => {
    expect(getHolidayException('2026-01-04')).toBe('work')
    expect(getHolidayException('2026-02-14')).toBe('work')
    expect(getHolidayException('2026-02-28')).toBe('work')
    expect(getHolidayException('2026-05-09')).toBe('work')
    expect(getHolidayException('2026-09-20')).toBe('work')
    expect(getHolidayException('2026-10-10')).toBe('work')
  })

  it('covers 2025 for adjacent-month and historical views', () => {
    expect(getHolidayException('2025-01-01')).toBe('rest')
    expect(getHolidayException('2025-01-26')).toBe('work')
    expect(getHolidayException('2025-10-01')).toBe('rest')
    expect(getHolidayException('2025-10-11')).toBe('work')
  })

  it('is null outside published years', () => {
    expect(getHolidayException('2027-01-01')).toBeNull()
    expect(getHolidayException('2026-08-16')).toBeNull()
  })
})

describe('isWeekendDateKey / getDayStatus', () => {
  it('detects weekends', () => {
    expect(isWeekendDateKey('2026-08-16')).toBe(true)
    expect(isWeekendDateKey('2026-08-15')).toBe(true)
    expect(isWeekendDateKey('2026-08-17')).toBe(false)
  })

  it('derives rest/work: exceptions win, weekends rest, weekdays plain', () => {
    expect(getDayStatus('2026-10-01')).toBe('rest')
    expect(getDayStatus('2026-10-10')).toBe('work')
    expect(getDayStatus('2026-08-16')).toBe('rest')
    expect(getDayStatus('2026-08-17')).toBeNull()
  })
})

describe('getHolidayBlock', () => {
  it('returns the named span for statutory holidays', () => {
    expect(getHolidayBlock('2026-10-01')).toEqual({ name: '国庆节', totalDays: 7 })
    expect(getHolidayBlock('2026-10-05')).toEqual({ name: '国庆节', totalDays: 7 })
    expect(getHolidayBlock('2026-02-15')).toEqual({ name: '春节', totalDays: 9 })
    expect(getHolidayBlock('2026-02-17')).toEqual({ name: '春节', totalDays: 9 })
    expect(getHolidayBlock('2025-01-01')).toEqual({ name: '元旦', totalDays: 1 })
  })

  it('is null outside holiday spans, including make-up workdays', () => {
    expect(getHolidayBlock('2026-10-10')).toBeNull()
    expect(getHolidayBlock('2026-10-08')).toBeNull()
    expect(getHolidayBlock('2026-08-16')).toBeNull()
    expect(getHolidayBlock('2027-01-01')).toBeNull()
  })
})
