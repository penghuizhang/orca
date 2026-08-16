// Why: lunar names are Chinese proper nouns (like month names in Apple Calendar
// zh display); they stay Chinese in every UI locale.
export const LUNAR_MONTH_NAMES = [
  '正月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '冬月',
  '腊月'
] as const

const LUNAR_DAY_NAMES = [
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十'
] as const

// Fung F. Lee's classic table (same data as lunardate / lunar-javascript),
// 1900–2100. Encoding per entry: low 4 bits = leap month (0 = none),
// bit 16 = leap month has 30 days, bits 15..4 = month 1..12 day counts
// (1 = 30 days, 0 = 29 days).
const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, 0x04ae0,
  0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, 0x04970, 0x0a4b0,
  0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, 0x06566, 0x0d4a0, 0x0ea50,
  0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, 0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0,
  0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, 0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0,
  0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, 0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260,
  0x0f263, 0x0d950, 0x05b57, 0x056a0, 0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558,
  0x0b540, 0x0b5a0, 0x195a6, 0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46,
  0x0ab60, 0x09570, 0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5,
  0x092e0, 0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, 0x07954,
  0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, 0x05aa0, 0x076a3,
  0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, 0x0b5a0, 0x056d0, 0x055b2,
  0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, 0x14b63, 0x09370, 0x049f8, 0x04970,
  0x064b0, 0x168a6, 0x0ea50, 0x06aa0, 0x1a6c4, 0x0aae0, 0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0,
  0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, 0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50,
  0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, 0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60,
  0x0a570, 0x054e4, 0x0d160, 0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0,
  0x0d150, 0x0f252, 0x0d520
] as readonly number[]

const LUNAR_BASE_YEAR = 1900
// 1900-01-31 was the first day of lunar year 1900.
const LUNAR_BASE_UTC = Date.UTC(1900, 0, 31)
const MS_PER_DAY = 86_400_000

export type LunarMonthDay = {
  month: number
  day: number
  isLeapMonth: boolean
}

export type LunarYearMonthDay = LunarMonthDay & {
  year: number
}

function getMonthDayCount(yearInfo: number, month: number, isLeapMonth: boolean): number {
  const longMonthBit = isLeapMonth ? 16 : 16 - month
  return ((yearInfo >> longMonthBit) % 2) + 29
}

/** Days from 1900-01-31 to the given local date (UTC-based, DST-safe). */
function daysFromLunarEpoch(date: Date): number {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return Math.floor((utc - LUNAR_BASE_UTC) / MS_PER_DAY)
}

function getYearDayCount(yearInfo: number): number {
  const leapMonth = yearInfo % 16
  let days = 0
  for (let month = 1; month <= 12; month += 1) {
    days += getMonthDayCount(yearInfo, month, false)
  }
  if (leapMonth > 0) {
    days += getMonthDayCount(yearInfo, leapMonth, true)
  }
  return days
}

export function getLunarYearInfo(date: Date): LunarYearMonthDay | null {
  let remaining = daysFromLunarEpoch(date)
  if (remaining < 0) {
    return null
  }
  // Why: a lunar year can straddle two Gregorian years (e.g. 1901-01-01 is
  // still lunar 1900), so walk year by year instead of using getFullYear().
  let lunarYear = LUNAR_BASE_YEAR
  let yearInfo: number = LUNAR_INFO[0]
  for (;;) {
    const yearDays = getYearDayCount(yearInfo)
    if (remaining < yearDays) {
      break
    }
    remaining -= yearDays
    lunarYear += 1
    const nextIndex = lunarYear - LUNAR_BASE_YEAR
    if (nextIndex >= LUNAR_INFO.length) {
      return null
    }
    yearInfo = LUNAR_INFO[nextIndex]
  }
  const leapMonth = yearInfo % 16
  for (let month = 1; month <= 12; month += 1) {
    const monthDays = getMonthDayCount(yearInfo, month, false)
    if (remaining < monthDays) {
      return { year: lunarYear, month, day: remaining + 1, isLeapMonth: false }
    }
    remaining -= monthDays
    if (leapMonth === month) {
      const leapDays = getMonthDayCount(yearInfo, month, true)
      if (remaining < leapDays) {
        return { year: lunarYear, month, day: remaining + 1, isLeapMonth: true }
      }
      remaining -= leapDays
    }
  }
  return null
}

export function getLunarMonthDay(date: Date): LunarMonthDay | null {
  const info = getLunarYearInfo(date)
  return info ? { month: info.month, day: info.day, isLeapMonth: info.isLeapMonth } : null
}

/** Day count (29/30) of a regular lunar month, 0 when the year is out of range. */
export function getLunarMonthDayCount(year: number, month: number): number {
  const index = year - LUNAR_BASE_YEAR
  if (index < 0 || index >= LUNAR_INFO.length || month < 1 || month > 12) {
    return 0
  }
  return getMonthDayCount(LUNAR_INFO[index], month, false)
}

/**
 * Reverse lookup: Gregorian date of a lunar (year, month, day). Leap months
 * only exist in the year they follow. Null = no such lunar day (e.g. 腊月三十
 * in a 29-day 腊月, or a leap month in the wrong year).
 */
export function lunarToGregorianDate(
  year: number,
  month: number,
  day: number,
  isLeapMonth = false
): Date | null {
  const index = year - LUNAR_BASE_YEAR
  if (index < 0 || index >= LUNAR_INFO.length || month < 1 || month > 12 || day < 1) {
    return null
  }
  const yearInfo = LUNAR_INFO[index]
  const leapMonth = yearInfo % 16
  if (isLeapMonth && leapMonth !== month) {
    return null
  }
  let days = 0
  for (let y = LUNAR_BASE_YEAR; y < year; y += 1) {
    days += getYearDayCount(LUNAR_INFO[y - LUNAR_BASE_YEAR])
  }
  // Why: the leap month follows its namesake regular month, so a leap-month
  // target must include the regular month itself in the running total.
  for (let m = 1; m < month + (isLeapMonth ? 1 : 0); m += 1) {
    days += getMonthDayCount(yearInfo, m, false)
  }
  if (leapMonth > 0 && leapMonth < month) {
    days += getMonthDayCount(yearInfo, leapMonth, true)
  }
  const monthDayCount = isLeapMonth
    ? getMonthDayCount(yearInfo, month, true)
    : getMonthDayCount(yearInfo, month, false)
  if (day > monthDayCount) {
    return null
  }
  days += day - 1
  const utc = new Date(LUNAR_BASE_UTC + days * MS_PER_DAY)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const EARTHLY_BRANCHES = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥'
] as const

/** Stem-branch year name, e.g. 2026 → 丙午年. */
export function getLunarYearName(year: number): string {
  return `${HEAVENLY_STEMS[(year - 4) % 10]}${EARTHLY_BRANCHES[(year - 4) % 12]}年`
}

/** Full lunar date line for the day panel, e.g. 丙午年 七月十六. */
export function getLunarYearMonthDayText(date: Date): string | null {
  const info = getLunarYearInfo(date)
  if (!info) {
    return null
  }
  return `${getLunarYearName(info.year)}${info.isLeapMonth ? '闰' : ''}${
    LUNAR_MONTH_NAMES[info.month - 1]
  }${LUNAR_DAY_NAMES[info.day - 1]}`
}

/**
 * Cell caption: the first day of a lunar month shows the month name
 * (leap months prefixed with 闰); other days show the day name.
 */
export function getLunarDayText(date: Date): string {
  const result = getLunarMonthDay(date)
  if (!result) {
    return ''
  }
  if (result.day === 1) {
    const monthName = LUNAR_MONTH_NAMES[result.month - 1]
    return result.isLeapMonth ? `闰${monthName}` : monthName
  }
  return LUNAR_DAY_NAMES[result.day - 1]
}
