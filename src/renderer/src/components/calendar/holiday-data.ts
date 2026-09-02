// Why: only the exceptions to the weekly rhythm — statutory holidays and
// make-up workdays (调休补班). Plain weekends derive their rest status
// implicitly; nothing here for them.
// 2026 source: 国务院办公厅《关于2026年部分节假日安排的通知》(gov.cn, 2025-11),
// verified 2026-08-16. 2025 is the published public schedule (covers the
// adjacent-month cells of January 2026 and historical navigation).
import { fromDateKey } from './calendar-time'

const HOLIDAY_EXCEPTIONS: Record<string, 'rest' | 'work'> = {
  // ── 2025 ──
  '2025-01-01': 'rest',
  '2025-01-26': 'work',
  '2025-01-28': 'rest',
  '2025-01-29': 'rest',
  '2025-01-30': 'rest',
  '2025-01-31': 'rest',
  '2025-02-01': 'rest',
  '2025-02-02': 'rest',
  '2025-02-03': 'rest',
  '2025-02-04': 'rest',
  '2025-02-08': 'work',
  '2025-04-04': 'rest',
  '2025-04-05': 'rest',
  '2025-04-06': 'rest',
  '2025-04-27': 'work',
  '2025-05-01': 'rest',
  '2025-05-02': 'rest',
  '2025-05-03': 'rest',
  '2025-05-04': 'rest',
  '2025-05-05': 'rest',
  '2025-05-31': 'rest',
  '2025-06-01': 'rest',
  '2025-06-02': 'rest',
  '2025-09-28': 'work',
  '2025-10-01': 'rest',
  '2025-10-02': 'rest',
  '2025-10-03': 'rest',
  '2025-10-04': 'rest',
  '2025-10-05': 'rest',
  '2025-10-06': 'rest',
  '2025-10-07': 'rest',
  '2025-10-08': 'rest',
  '2025-10-11': 'work',
  // ── 2026 ──
  '2026-01-01': 'rest',
  '2026-01-02': 'rest',
  '2026-01-03': 'rest',
  '2026-01-04': 'work',
  '2026-02-14': 'work',
  '2026-02-15': 'rest',
  '2026-02-16': 'rest',
  '2026-02-17': 'rest',
  '2026-02-18': 'rest',
  '2026-02-19': 'rest',
  '2026-02-20': 'rest',
  '2026-02-21': 'rest',
  '2026-02-22': 'rest',
  '2026-02-23': 'rest',
  '2026-02-28': 'work',
  '2026-04-04': 'rest',
  '2026-04-05': 'rest',
  '2026-04-06': 'rest',
  '2026-05-01': 'rest',
  '2026-05-02': 'rest',
  '2026-05-03': 'rest',
  '2026-05-04': 'rest',
  '2026-05-05': 'rest',
  '2026-05-09': 'work',
  '2026-06-19': 'rest',
  '2026-06-20': 'rest',
  '2026-06-21': 'rest',
  '2026-09-20': 'work',
  '2026-09-25': 'rest',
  '2026-09-26': 'rest',
  '2026-09-27': 'rest',
  '2026-10-01': 'rest',
  '2026-10-02': 'rest',
  '2026-10-03': 'rest',
  '2026-10-04': 'rest',
  '2026-10-05': 'rest',
  '2026-10-06': 'rest',
  '2026-10-07': 'rest',
  '2026-10-10': 'work'
}

/**
 * Named statutory-holiday spans (contiguous rest days). The grid renders one
 * banner per span so users see at a glance how many days run together.
 * 2026 source: 国务院办公厅《关于2026年部分节假日安排的通知》(gov.cn, 2025-11),
 * verified 2026-08-16. 2025 is the published public schedule.
 */
export const HOLIDAY_BLOCKS: readonly {
  name: string
  start: string
  end: string
}[] = [
  // ── 2025 ──
  { name: '元旦', start: '2025-01-01', end: '2025-01-01' },
  { name: '春节', start: '2025-01-28', end: '2025-02-04' },
  { name: '清明节', start: '2025-04-04', end: '2025-04-06' },
  { name: '劳动节', start: '2025-05-01', end: '2025-05-05' },
  { name: '端午节', start: '2025-05-31', end: '2025-06-02' },
  { name: '国庆节', start: '2025-10-01', end: '2025-10-08' },
  // ── 2026 ──
  { name: '元旦', start: '2026-01-01', end: '2026-01-03' },
  { name: '春节', start: '2026-02-15', end: '2026-02-23' },
  { name: '清明节', start: '2026-04-04', end: '2026-04-06' },
  { name: '劳动节', start: '2026-05-01', end: '2026-05-05' },
  { name: '端午节', start: '2026-06-19', end: '2026-06-21' },
  { name: '中秋节', start: '2026-09-25', end: '2026-09-27' },
  { name: '国庆节', start: '2026-10-01', end: '2026-10-07' }
]

/** Named holiday span containing the date, or null (also null on make-up workdays). */
export function getHolidayBlock(dateKey: string): { name: string; totalDays: number } | null {
  for (const block of HOLIDAY_BLOCKS) {
    if (dateKey >= block.start && dateKey <= block.end) {
      const start = fromDateKey(block.start)
      const end = fromDateKey(block.end)
      return {
        name: block.name,
        totalDays: Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
      }
    }
  }
  return null
}

/** Table-only lookup: statutory holiday ('rest') or make-up workday ('work'). */
export function getHolidayException(dateKey: string): 'rest' | 'work' | null {
  return HOLIDAY_EXCEPTIONS[dateKey] ?? null
}

/** True for Saturday/Sunday. */
export function isWeekendDateKey(dateKey: string): boolean {
  const [year, month, day] = dateKey.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 || weekday === 6
}

/**
 * Derived day status: table exception wins, otherwise weekends rest and
 * weekdays are plain workdays (null). Unlike getHolidayException, this treats
 * a normal weekend as rest — for the day-panel status line, not the grid badge.
 */
export function getDayStatus(dateKey: string): 'rest' | 'work' | null {
  const exception = getHolidayException(dateKey)
  if (exception) {
    return exception
  }
  return isWeekendDateKey(dateKey) ? 'rest' : null
}
