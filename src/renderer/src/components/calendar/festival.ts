import { getLunarDayText, getLunarMonthDayCount, getLunarYearInfo } from './lunar-date'
import { getSolarTermName } from './solar-term'

// Why: festival names are Chinese proper nouns — they stay Chinese in every UI
// locale, like the lunar names. All entries are lunar-fixed dates.
const LUNAR_FESTIVALS: readonly (readonly [month: number, day: number, name: string])[] = [
  [1, 1, '春节'],
  [1, 15, '元宵节'],
  [2, 2, '龙抬头'],
  [5, 5, '端午节'],
  [7, 7, '七夕'],
  [7, 15, '中元节'],
  [8, 15, '中秋节'],
  [9, 9, '重阳节'],
  [12, 8, '腊八节'],
  [12, 23, '小年']
]

/** Traditional festival falling on this date, or null. 除夕 = last lunar day of the year. */
export function getFestivalName(date: Date): string | null {
  const info = getLunarYearInfo(date)
  if (!info) {
    return null
  }
  if (info.month === 12 && info.day === getLunarMonthDayCount(info.year, 12)) {
    return '除夕'
  }
  for (const [month, day, name] of LUNAR_FESTIVALS) {
    if (info.month === month && info.day === day) {
      return name
    }
  }
  return null
}

/**
 * Cell caption for a day: festival beats solar term beats the plain lunar day
 * name (e.g. 除夕 over 廿九, 立秋 over the lunar day). Null = no lunar info
 * available for the date (before the 1900 lunar epoch).
 */
export function getDayLabel(date: Date): string | null {
  return getFestivalName(date) ?? getSolarTermName(date) ?? getLunarDayText(date)
}
