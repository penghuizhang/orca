// Why: the 24 solar terms are sun-position dates, not lunar dates; this is the
// standard minute-offset approximation used by Chinese calendar libraries
// (accurate to the day for 1900–2100). Term names are Chinese proper nouns —
// they stay Chinese in every UI locale, like the lunar names.
const TERM_NAMES = [
  '小寒',
  '大寒',
  '立春',
  '雨水',
  '惊蛰',
  '春分',
  '清明',
  '谷雨',
  '立夏',
  '小满',
  '芒种',
  '夏至',
  '小暑',
  '大暑',
  '立秋',
  '处暑',
  '白露',
  '秋分',
  '寒露',
  '霜降',
  '立冬',
  '小雪',
  '大雪',
  '冬至'
] as const

const TERM_MONTHS = [
  1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12
] as const

const TERM_MINUTE_OFFSETS = [
  0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343,
  285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758
] as const

const TERM_BASE_UTC = Date.UTC(1900, 0, 6, 2, 5)
const MS_PER_TROPICAL_YEAR = 31_556_925_974.7
const MS_PER_MINUTE = 60_000

function termDate(year: number, index: number): Date {
  const utc = new Date(
    TERM_BASE_UTC +
      MS_PER_TROPICAL_YEAR * (year - 1900) +
      TERM_MINUTE_OFFSETS[index] * MS_PER_MINUTE
  )
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** Name of the solar term that falls on this date, or null. */
export function getSolarTermName(date: Date): string | null {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  for (let index = 0; index < TERM_NAMES.length; index += 1) {
    if (TERM_MONTHS[index] !== month) {
      continue
    }
    const term = termDate(year, index)
    if (
      term.getFullYear() === year &&
      term.getMonth() + 1 === month &&
      term.getDate() === date.getDate()
    ) {
      return TERM_NAMES[index]
    }
  }
  return null
}
