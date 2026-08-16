import type { CalendarCategory } from '../../../../shared/calendar-types'

// Why: tailwind only generates literal classes; mapping entries must stay whole.
export const CALENDAR_CATEGORY_DOT_CLASSES: Record<CalendarCategory, string> = {
  meeting: 'bg-amber-500',
  feature: 'bg-blue-500',
  milestone: 'bg-green-500',
  other: 'bg-zinc-500'
}

export const CALENDAR_CATEGORY_LABEL_FALLBACKS: Record<CalendarCategory, string> = {
  meeting: 'Meeting',
  feature: 'Feature',
  milestone: 'Milestone',
  other: 'Other'
}
