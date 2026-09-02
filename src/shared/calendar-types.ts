export const CALENDAR_CATEGORIES = ['meeting', 'feature', 'milestone', 'other'] as const

/**
 * Category identifier: built-in ids plus user-defined ones (see
 * CALENDAR_CATEGORY_COLORS / calendar_categories table). Any non-empty string
 * is valid so unknown stored values are kept instead of being clobbered.
 */
export type CalendarCategory = string

/** Color swatch options for user-defined categories (tailwind literals). */
export const CALENDAR_CATEGORY_COLORS = [
  'bg-red-500',
  'bg-orange-500',
  'bg-purple-500',
  'bg-teal-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-yellow-500',
  'bg-lime-500'
] as const

export type CalendarCategoryColor = (typeof CALENDAR_CATEGORY_COLORS)[number]

/** Display metadata for a calendar category (built-in or user-defined). */
export type CalendarCategoryInfo = {
  id: string
  /** Display name; built-ins keep the English fallback (i18n keys win), customs store user text. */
  name: string
  /** Tailwind dot color class, e.g. 'bg-amber-500'. */
  color: string
  /** Built-in categories are seeded and cannot be renamed or deleted. */
  builtIn: boolean
}

export type CalendarCategoryCreateInput = {
  name: string
  color: CalendarCategoryColor
}

export type CalendarCategoryUpdateInput = Partial<CalendarCategoryCreateInput>

export function isCalendarCategory(value: unknown): value is CalendarCategory {
  return typeof value === 'string' && value.length > 0
}

/**
 * Yearly recurrence on a lunar date (month 1–12, day 1–30). Leap months are
 * not supported; `date` keeps the anchor (first occurrence) Gregorian day.
 */
export type CalendarLunarRepeat = { month: number; day: number }

export function isCalendarLunarRepeat(value: unknown): value is CalendarLunarRepeat {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const repeat = value as Record<string, unknown>
  return (
    typeof repeat.month === 'number' &&
    Number.isInteger(repeat.month) &&
    repeat.month >= 1 &&
    repeat.month <= 12 &&
    typeof repeat.day === 'number' &&
    Number.isInteger(repeat.day) &&
    repeat.day >= 1 &&
    repeat.day <= 30
  )
}

export type CalendarEntry = {
  id: string
  title: string
  /** Local calendar day, YYYY-MM-DD, no timezone component — single-machine local app. */
  date: string
  allDay: boolean
  /** HH:mm, null for all-day entries. */
  startTime: string | null
  endTime: string | null
  category: CalendarCategory
  description: string
  /** Yearly lunar recurrence; null = fixed solar date. */
  lunarRepeat: CalendarLunarRepeat | null
  createdAt: number
  updatedAt: number
}

export type CalendarEntryCreateInput = Omit<CalendarEntry, 'id' | 'createdAt' | 'updatedAt'>
export type CalendarEntryUpdateInput = Partial<CalendarEntryCreateInput>

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CALENDAR_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !CALENDAR_DATE_PATTERN.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day))
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  )
}

export function isValidCalendarTime(value: unknown): value is string {
  return typeof value === 'string' && CALENDAR_TIME_PATTERN.test(value)
}

/** Sort key: all-day first, then by start time (nulls after HH:mm strings). */
export function compareCalendarEntriesByStart(left: CalendarEntry, right: CalendarEntry): number {
  if (left.allDay !== right.allDay) {
    return left.allDay ? -1 : 1
  }
  return (left.startTime ?? '99:99').localeCompare(right.startTime ?? '99:99')
}

/**
 * Validate persisted/IPC input into a safe CalendarEntry; null = drop (corrupt row)
 * or reject (bad input). Distrusts every field like the automation normalizers.
 */
export function normalizeCalendarEntry(value: unknown): CalendarEntry | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const entry = value as Partial<CalendarEntry>
  if (typeof entry.id !== 'string' || entry.id.length === 0) {
    return null
  }
  if (!isValidCalendarDate(entry.date)) {
    return null
  }
  const title = typeof entry.title === 'string' ? entry.title.trim() : ''
  const allDay = entry.allDay === true
  const startTime = !allDay && isValidCalendarTime(entry.startTime) ? entry.startTime : null
  const endTime = !allDay && isValidCalendarTime(entry.endTime) ? entry.endTime : null
  return {
    id: entry.id,
    title,
    date: entry.date,
    allDay,
    startTime,
    endTime,
    category: isCalendarCategory(entry.category) ? entry.category : 'other',
    description: typeof entry.description === 'string' ? entry.description : '',
    lunarRepeat: isCalendarLunarRepeat(entry.lunarRepeat)
      ? { month: entry.lunarRepeat.month, day: entry.lunarRepeat.day }
      : null,
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
    updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.now()
  }
}

/** Merge update fields into an entry with the same field-level distrust. */
export function applyCalendarEntryUpdate(
  current: CalendarEntry,
  updates: CalendarEntryUpdateInput
): CalendarEntry | null {
  const candidate: CalendarEntry = {
    ...current,
    ...(updates.title !== undefined ? { title: updates.title } : {}),
    ...(updates.date !== undefined ? { date: updates.date } : {}),
    ...(updates.allDay !== undefined ? { allDay: updates.allDay } : {}),
    ...(updates.startTime !== undefined ? { startTime: updates.startTime } : {}),
    ...(updates.endTime !== undefined ? { endTime: updates.endTime } : {}),
    ...(updates.category !== undefined ? { category: updates.category } : {}),
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    ...(updates.lunarRepeat !== undefined ? { lunarRepeat: updates.lunarRepeat } : {})
  }
  if (candidate.allDay) {
    candidate.startTime = null
    candidate.endTime = null
  }
  if (candidate.startTime !== null && candidate.endTime !== null) {
    // Why: an end before the start is unusable for sorting/display — normalize to a point event.
    if (candidate.endTime < candidate.startTime) {
      candidate.endTime = candidate.startTime
    }
  }
  return normalizeCalendarEntry(candidate)
}
