import { describe, expect, it } from 'vitest'

import {
  getLunarDayText,
  getLunarMonthDay,
  getLunarYearInfo,
  getLunarYearMonthDayText,
  getLunarYearName,
  lunarToGregorianDate
} from './lunar-date'

function day(year: number, month: number, dayOfMonth: number): Date {
  return new Date(year, month - 1, dayOfMonth)
}

describe('getLunarMonthDay', () => {
  it('maps well-known dates (verified against Python lunardate)', () => {
    expect(getLunarMonthDay(day(1900, 1, 31))).toEqual({ month: 1, day: 1, isLeapMonth: false })
    expect(getLunarMonthDay(day(2000, 1, 1))).toEqual({ month: 11, day: 25, isLeapMonth: false })
    expect(getLunarMonthDay(day(2024, 2, 10))).toEqual({ month: 1, day: 1, isLeapMonth: false })
    expect(getLunarMonthDay(day(2026, 8, 16))).toEqual({ month: 7, day: 4, isLeapMonth: false })
  })

  it('handles leap months and straddling years', () => {
    // 1901-01-01 belongs to lunar year 1900 (year boundary crosses Gregorian years).
    expect(getLunarMonthDay(day(1901, 1, 1))).toEqual({ month: 11, day: 11, isLeapMonth: false })
    // 2033 has a leap 11th month (the classic 2033-problem year).
    expect(getLunarMonthDay(day(2033, 12, 22))).toEqual({ month: 11, day: 1, isLeapMonth: true })
  })

  it('returns null outside the table range', () => {
    expect(getLunarMonthDay(day(1899, 12, 31))).toBeNull()
    expect(getLunarMonthDay(day(1900, 1, 30))).toBeNull()
    // 2101-01-01 still falls in lunar year 2100 (the table's last year)…
    expect(getLunarMonthDay(day(2101, 1, 1))).toEqual({ month: 12, day: 2, isLeapMonth: false })
    // …but the next lunar year is beyond the table.
    expect(getLunarMonthDay(day(2101, 3, 1))).toBeNull()
  })
})

describe('getLunarDayText', () => {
  it('shows the month name on the first day, the day name otherwise', () => {
    expect(getLunarDayText(day(2026, 8, 13))).toBe('七月')
    expect(getLunarDayText(day(2026, 8, 16))).toBe('初四')
    expect(getLunarDayText(day(2000, 1, 1))).toBe('廿五')
    expect(getLunarDayText(day(2033, 12, 22))).toBe('闰冬月')
  })

  it('returns an empty string outside the range', () => {
    expect(getLunarDayText(day(1899, 12, 31))).toBe('')
  })
})

describe('getLunarYearInfo / lunarToGregorianDate', () => {
  it('exposes the lunar year, crossing Gregorian year boundaries', () => {
    // 2026-02-16 is still lunar year 2025 (腊月廿九) — 春节 lands on 2/17.
    expect(getLunarYearInfo(day(2026, 2, 17))).toEqual({
      year: 2026,
      month: 1,
      day: 1,
      isLeapMonth: false
    })
    expect(getLunarYearInfo(day(2026, 2, 16))).toEqual({
      year: 2025,
      month: 12,
      day: 29,
      isLeapMonth: false
    })
  })

  it('reverses lunar dates to the Gregorian dates the 2026 notice publishes', () => {
    expect(toDate(lunarToGregorianDate(2026, 1, 1, false)!)).toBe('2026-02-17')
    expect(toDate(lunarToGregorianDate(2026, 5, 5, false)!)).toBe('2026-06-19')
    expect(toDate(lunarToGregorianDate(2026, 8, 15, false)!)).toBe('2026-09-25')
  })

  it('round-trips arbitrary dates', () => {
    for (const sample of [day(2025, 8, 10), day(2026, 1, 1), day(2033, 12, 22), day(2000, 1, 1)]) {
      const info = getLunarYearInfo(sample)
      expect(info).not.toBeNull()
      const back = lunarToGregorianDate(info!.year, info!.month, info!.day, info!.isLeapMonth)
      expect(toDate(back!)).toBe(toDate(sample))
    }
  })

  it('returns null for nonexistent lunar days', () => {
    // 腊月三十 does not exist in 29-day 腊月 years; assert day 29 always exists.
    expect(lunarToGregorianDate(2026, 12, 30, false)).toBeNull()
    expect(lunarToGregorianDate(2026, 12, 29, false)).not.toBeNull()
    expect(lunarToGregorianDate(2026, 7, 1, true)).toBeNull() // 2026 has no leap month
  })
})

describe('getLunarYearName / getLunarYearMonthDayText', () => {
  it('names stem-branch years', () => {
    expect(getLunarYearName(2025)).toBe('乙巳年')
    expect(getLunarYearName(2026)).toBe('丙午年')
  })

  it('formats the full lunar date line', () => {
    expect(getLunarYearMonthDayText(day(2026, 2, 17))).toBe('丙午年正月初一')
    expect(getLunarYearMonthDayText(day(2026, 8, 16))).toBe('丙午年七月初四')
    expect(getLunarYearMonthDayText(day(1899, 12, 31))).toBeNull()
  })
})

function toDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}
