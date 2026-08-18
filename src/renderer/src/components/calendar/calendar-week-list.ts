import type { CalendarCategory, CalendarEntry } from '../../../../shared/calendar-types'
import { collectWeekEntries, fromDateKey, hourSpan, lunarRepeatDateKey } from './calendar-time'

export type WeekListStrings = {
  workList: string
  subtotal: string
  total: string
  untimed: string
  hourUnit: string
  categories: Record<CalendarCategory, string>
}

/** Entry line fragment plus its computed hours (0 for untimed/all-day). */
type ListLine = { entry: CalendarEntry; hours: number; timed: boolean }

function formatDayHeading(dateKey: string, locale: string): string {
  const date = fromDateKey(dateKey)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  const day = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(date)
  return `${weekday} ${day}`
}

/** Group week entries by day (Monday first) preserving start-time order. */
export function groupWeekEntriesByDay(
  weekDates: readonly string[],
  entries: readonly CalendarEntry[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number
): Map<string, ListLine[]> {
  const lines = new Map<string, ListLine[]>()
  for (const dateKey of weekDates) {
    lines.set(dateKey, [])
  }
  for (const entry of collectWeekEntries(entries, weekDates, visibleCategories, viewYear)) {
    const targetKey = entry.lunarRepeat
      ? lunarRepeatDateKey(entry.lunarRepeat, viewYear)
      : entry.date
    if (targetKey === null || !lines.has(targetKey)) {
      continue
    }
    const hours = hourSpan(entry)
    lines.get(targetKey)?.push({ entry, hours, timed: hours > 0 })
  }
  return lines
}

/** Build the copy-paste Markdown list for one week, e.g. Friday timesheet prep. */
export function buildWeekListMarkdown(
  weekDates: readonly string[],
  entries: readonly CalendarEntry[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number,
  locale: string,
  strings: WeekListStrings
): string {
  const lines = groupWeekEntriesByDay(weekDates, entries, visibleCategories, viewYear)
  const start = fromDateKey(weekDates[0])
  const end = fromDateKey(weekDates.at(-1) ?? weekDates[0])
  const startText = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(start)
  const endText = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric'
  }).format(end)
  const sections: string[] = []
  let totalHours = 0
  let entryCount = 0
  for (const [dateKey, dayLines] of lines) {
    if (dayLines.length === 0) {
      continue
    }
    const dayHours = dayLines.reduce((sum, line) => sum + line.hours, 0)
    const bullets = dayLines.map((line) => {
      const categoryName = strings.categories[line.entry.category]
      if (!line.timed) {
        return `- ${line.entry.title} [${categoryName}] (${strings.untimed})`
      }
      const time = line.entry.startTime
        ? `${line.entry.startTime}-${line.entry.endTime ?? ''} `
        : ''
      const hours = `${line.hours.toFixed(1)}${strings.hourUnit}`
      return `- ${time}${line.entry.title} ${hours} [${categoryName}]`
    })
    sections.push(`## ${formatDayHeading(dateKey, locale)}`)
    sections.push(...bullets)
    sections.push(`${strings.subtotal} ${dayHours.toFixed(1)}${strings.hourUnit}`)
    totalHours += dayHours
    entryCount += dayLines.length
    sections.push('')
  }
  const totalLine = `**${strings.total} ${totalHours.toFixed(1)}${strings.hourUnit} (${entryCount})**`
  return `# ${startText} – ${endText} ${strings.workList}\n\n${sections.join('\n')}\n${totalLine}`
}
