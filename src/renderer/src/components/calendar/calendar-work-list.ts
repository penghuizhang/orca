import type { CalendarCategory, CalendarEntry } from '../../../../shared/calendar-types'
import {
  collectWeekEntries,
  fromDateKey,
  hourSpan,
  lunarRepeatDateKey,
  rangeDates,
  rangeLabel,
  type WorkListRange
} from './calendar-time'

export type WeekListStrings = {
  workList: string
  untitled: string
}

/** Entry line fragment plus its computed hours (0 for untimed/all-day). */
type ListLine = { entry: CalendarEntry; hours: number; timed: boolean }

function formatDayHeading(dateKey: string, locale: string): string {
  const date = fromDateKey(dateKey)
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)
  const day = new Intl.DateTimeFormat(locale, { month: 'numeric', day: 'numeric' }).format(date)
  return `${weekday} ${day}`
}

/** Group entries by day (ordered like the range) preserving start-time order. */
export function groupEntriesByDay(
  rangeDates: readonly string[],
  entries: readonly CalendarEntry[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number
): Map<string, ListLine[]> {
  const lines = new Map<string, ListLine[]>()
  for (const dateKey of rangeDates) {
    lines.set(dateKey, [])
  }
  for (const entry of collectWeekEntries(entries, rangeDates, visibleCategories, viewYear)) {
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

/** Markdown title for a week range keeps the long-form "start – end" heading. */
function weekMarkdownTitle(
  dates: readonly string[],
  locale: string,
  strings: WeekListStrings
): string {
  const start = fromDateKey(dates[0])
  const end = fromDateKey(dates.at(-1) ?? dates[0])
  const startText = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(start)
  const endText = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(end)
  return `# ${startText} – ${endText} ${strings.workList}`
}

/** Build the copy-paste Markdown list for any range, grouped by day. */
export function buildWorkListMarkdown(
  range: WorkListRange,
  entries: readonly CalendarEntry[],
  visibleCategories: ReadonlySet<CalendarCategory>,
  viewYear: number,
  locale: string,
  strings: WeekListStrings
): string {
  const dates = rangeDates(range)
  const lines = groupEntriesByDay(dates, entries, visibleCategories, viewYear)
  const title =
    range.kind === 'week'
      ? weekMarkdownTitle(dates, locale, strings)
      : `# ${rangeLabel(range, locale)} ${strings.workList}`
  const sections: string[] = []
  for (const [dateKey, dayLines] of lines) {
    if (dayLines.length === 0) {
      continue
    }
    sections.push(`## ${formatDayHeading(dateKey, locale)}`)
    dayLines.forEach((line, index) => {
      const titleText = line.entry.title.trim() || strings.untitled
      sections.push(`${index + 1}. ${titleText}`)
    })
    sections.push('')
  }
  return `${title}\n\n${sections.join('\n').trimEnd()}`
}
