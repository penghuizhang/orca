import { describe, expect, it } from 'vitest'

import { getDayLabel, getFestivalName } from './festival'

function day(year: number, month: number, dayOfMonth: number): Date {
  return new Date(year, month - 1, dayOfMonth)
}

describe('getFestivalName', () => {
  it('maps fixed lunar festivals (dates cross-check the official 2026 holiday notice)', () => {
    // 2026 春节 = 正月初一 = 2/17 (notice: 2/15 is 腊月二十八).
    expect(getFestivalName(day(2026, 2, 17))).toBe('春节')
    // 2026 端午 = 五月初五 = 6/19 (notice: 6/19-6/21 放假).
    expect(getFestivalName(day(2026, 6, 19))).toBe('端午节')
    // 2026 中秋 = 八月十五 = 9/25 (notice: 9/25-9/27 放假).
    expect(getFestivalName(day(2026, 9, 25))).toBe('中秋节')
    expect(getFestivalName(day(2026, 8, 19))).toBe('七夕')
  })

  it('resolves 除夕 as the last lunar day of the year (29 or 30)', () => {
    // 2026-02-16 is 腊月二十九 in a 29-day 腊月 (notice: 2/15 is 腊月二十八).
    expect(getFestivalName(day(2026, 2, 16))).toBe('除夕')
    expect(getFestivalName(day(2026, 2, 17))).not.toBe('除夕')
  })

  it('returns null on ordinary days', () => {
    expect(getFestivalName(day(2026, 8, 16))).toBeNull()
  })
})

describe('getDayLabel', () => {
  it('prioritizes festival over solar term over lunar day text', () => {
    // 春节 beats the lunar day name (正月初一).
    expect(getDayLabel(day(2026, 2, 17))).toBe('春节')
    // 立秋 is a solar term, no festival that day.
    expect(getDayLabel(day(2026, 8, 7))).toBe('立秋')
    // Plain day falls back to the lunar day name.
    expect(getDayLabel(day(2026, 8, 16))).toBe('初四')
  })
})
