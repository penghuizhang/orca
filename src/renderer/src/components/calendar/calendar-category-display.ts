import type { CalendarCategory, CalendarCategoryInfo } from '../../../../shared/calendar-types'
import { CALENDAR_CATEGORIES } from '../../../../shared/calendar-types'

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

/** Dot color: built-ins use their fixed class, custom ids their stored color, unknown ids zinc. */
export function categoryColor(
  id: CalendarCategory,
  categories: readonly CalendarCategoryInfo[]
): string {
  if ((CALENDAR_CATEGORIES as readonly string[]).includes(id)) {
    return CALENDAR_CATEGORY_DOT_CLASSES[id]
  }
  return categories.find((category) => category.id === id)?.color ?? 'bg-zinc-500'
}

/** Ordered list of built-in + custom categories for select/filter/summary rendering. */
export function allCategoryInfos(
  categories: readonly CalendarCategoryInfo[]
): CalendarCategoryInfo[] {
  const builtIns: CalendarCategoryInfo[] = CALENDAR_CATEGORIES.map((id) => ({
    id,
    name: CALENDAR_CATEGORY_LABEL_FALLBACKS[id],
    color: CALENDAR_CATEGORY_DOT_CLASSES[id],
    builtIn: true
  }))
  const customs = categories.filter((category) => !category.builtIn)
  return [...builtIns, ...customs]
}

/** Local label for a calendar category (i18n wins for built-ins). */
export function categoryName(
  id: CalendarCategory,
  categories: readonly CalendarCategoryInfo[],
  translateFn: (key: string, fallback: string) => string
): string {
  if ((CALENDAR_CATEGORIES as readonly string[]).includes(id)) {
    return translateFn(
      `auto.components.calendar.category.${id}`,
      CALENDAR_CATEGORY_LABEL_FALLBACKS[id]
    )
  }
  return categories.find((category) => category.id === id)?.name ?? id
}
