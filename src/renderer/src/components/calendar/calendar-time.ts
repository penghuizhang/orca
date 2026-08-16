import type { CalendarEntry } from '../../../../shared/calendar-types'
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
