import type { CalendarCategory, CalendarEntry } from '../../../../shared/calendar-types'
import { compareCalendarEntriesByStart } from '../../../../shared/calendar-types'
import { lunarToGregorianDate } from './lunar-date'

export const WEEKDAY_COLUMNS = 7
export const MONTH_GRID_ROWS = 6

/** Local calendar day as YYYY-MM-DD, matching the entry `date` field. */
export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayDateKey(): string {
  return toDateKey(new Date())
}

/** Parse YYYY-MM-DD into a local-midnight Date. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

/** True when the date belongs to the given calendar month (grid cell dimming). */
export function isInMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month - 1
}

export function addMonths(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta
  return { year: Math.floor(total / 12), month: (total % 12) + 1 }
}

/**
 * 6x7 Monday-first matrix for the given month. Cells outside the month are
 * adjacent-month days so the grid always covers exactly six weeks.
 */
export function buildMonthMatrix(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month - 1, 1)
  const mondayFirstOffset = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month - 1, 1 - mondayFirstOffset)
  return Array.from({ length: WEEKDAY_COLUMNS * MONTH_GRID_ROWS }, (_, index) => {
    const cell = new Date(gridStart)
    cell.setDate(gridStart.getDate() + index)
    return cell
  })
}

/** Entries for one day, all-day first then by start time. */
export function getDayEntries(entries: readonly CalendarEntry[], dateKey: string): CalendarEntry[] {
  return entries.filter((entry) => entry.date === dateKey).sort(compareCalendarEntriesByStart)
}

/** Gregorian dateKey of a lunar-repeat rule in the given year, or null if that lunar day does not exist that year. */
export function lunarRepeatDateKey(
  repeat: { month: number; day: number },
  year: number
): string | null {
  const date = lunarToGregorianDate(year, repeat.month, repeat.day, false)
  return date ? toDateKey(date) : null
}

/**
 * Entries displayed on dateKey within viewYear: fixed-solar entries by their
 * `date`, lunar-repeat entries by their occurrence in viewYear. Display order
 * (all-day first, then start time).
 */
export function collectEntriesByDateKey(
  entries: readonly CalendarEntry[],
  dateKey: string,
  viewYear: number
): CalendarEntry[] {
  return entries
    .filter((entry) =>
      entry.lunarRepeat
        ? lunarRepeatDateKey(entry.lunarRepeat, viewYear) === dateKey
        : entry.date === dateKey
    )
    .sort(compareCalendarEntriesByStart)
}

/** Month title like "2026年8月" / "August 2026", following the app locale. */
export function formatMonthTitle(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(
    new Date(year, month - 1, 1)
  )
}

/** Day panel heading like "8月16日 周日" / "Aug 16, Sunday". */
export function formatDayPanelTitle(dateKey: string, locale: string): string {
  const date = fromDateKey(dateKey)
  const datePart = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(date)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  return `${datePart} ${weekday}`
}

/** Monday-first short weekday headers, e.g. ["Mon", "Tue", ...]. */
export function formatWeekdayHeaders(locale: string): string[] {
  const headers: string[] = []
  // 2024-01-01 is a Monday; the seven days from it cover one full week.
  const monday = new Date(2024, 0, 1)
  for (let index = 0; index < WEEKDAY_COLUMNS; index += 1) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + index)
    headers.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date))
  }
  return headers
}

/** Entry start display: all-day or the HH:mm start time. */
export function formatEntryStart(entry: CalendarEntry): string {
  if (entry.allDay || !entry.startTime) {
    return ''
  }
  return entry.endTime ? `${entry.startTime}–${entry.endTime}` : entry.startTime
}

/** The Monday-anchored week (inclusive) containing the given date key. */
export function weekRangeDates(dateKey: string): string[] {
  const date = fromDateKey(dateKey)
  const mondayOffset = (date.getDay() + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - mondayOffset)
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    return toDateKey(day)
  })
}

/** Week range title like "2026年8月17日 – 8月23日" / "Aug 17 – Aug 23, 2026". */
export function formatWeekRangeTitle(dateKeys: readonly string[], locale: string): string {
  const start = fromDateKey(dateKeys[0])
  const end = fromDateKey(dateKeys.at(-1) ?? dateKeys[0])
  const startFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(
    start
  )
  const endFormat = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(end)
  const year = new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(start)
  return `${startFormat} – ${endFormat}, ${year}`
}

/** Decimal hours for a timed entry, floored to the nearest half hour. */
export function hourSpan(entry: CalendarEntry): number {
  if (entry.allDay || !entry.startTime || !entry.endTime) {
    return 0
  }
  if (entry.endTime <= entry.startTime) {
    return 0
  }
  const [startHour, startMinute] = entry.startTime.split(':').map(Number)
  const [endHour, endMinute] = entry.endTime.split(':').map(Number)
  const minutes = endHour * 60 + endMinute - (startHour * 60 + startMinute)
  return Math.floor(minutes / 30) / 2
}

/** Total decimal hours across entries in the week, honoring a visible-category filter. */
export function summarizeWeekHours(
  entries: readonly CalendarEntry[],
  weekDates: readonly string[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number
): number {
  const inWeek = new Set(weekDates)
  return entries.reduce((total, entry) => {
    const targetKey = entry.lunarRepeat
      ? lunarRepeatDateKey(entry.lunarRepeat, viewYear)
      : entry.date
    if (targetKey === null || !inWeek.has(targetKey)) {
      return total
    }
    if (visibleCategories.size > 0 && !visibleCategories.has(entry.category)) {
      return total
    }
    return total + hourSpan(entry)
  }, 0)
}

/** Entries that fall within the given week (inclusive), honoring the visible-category filter. */
export function collectWeekEntries(
  entries: readonly CalendarEntry[],
  weekDates: readonly string[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number
): CalendarEntry[] {
  const inWeek = new Set(weekDates)
  return entries
    .filter((entry) => {
      const targetKey = entry.lunarRepeat
        ? lunarRepeatDateKey(entry.lunarRepeat, viewYear)
        : entry.date
      return targetKey !== null && inWeek.has(targetKey)
    })
    .filter((entry) => visibleCategories.size === 0 || visibleCategories.has(entry.category))
    .sort(compareCalendarEntriesByStart)
}
