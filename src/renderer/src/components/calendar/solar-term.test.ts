import { describe, expect, it } from 'vitest'

import { getSolarTermName } from './solar-term'

function day(year: number, month: number, dayOfMonth: number): Date {
  return new Date(year, month - 1, dayOfMonth)
}

describe('getSolarTermName', () => {
  it('maps 2026 term dates (清明 4/5 cross-checks the official 2026 holiday notice)', () => {
    expect(getSolarTermName(day(2026, 1, 5))).toBe('小寒')
    expect(getSolarTermName(day(2026, 3, 20))).toBe('春分')
    expect(getSolarTermName(day(2026, 4, 5))).toBe('清明')
    expect(getSolarTermName(day(2026, 6, 21))).toBe('夏至')
    expect(getSolarTermName(day(2026, 8, 7))).toBe('立秋')
    expect(getSolarTermName(day(2026, 9, 23))).toBe('秋分')
    expect(getSolarTermName(day(2026, 12, 22))).toBe('冬至')
  })

  it('returns null on ordinary days', () => {
    expect(getSolarTermName(day(2026, 8, 16))).toBeNull()
    expect(getSolarTermName(day(2026, 10, 1))).toBeNull()
  })

  it('covers adjacent years', () => {
    expect(getSolarTermName(day(2025, 3, 20))).toBe('春分')
    expect(getSolarTermName(day(2024, 12, 21))).toBe('冬至')
  })
})
