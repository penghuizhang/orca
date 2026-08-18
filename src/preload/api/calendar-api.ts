import type {
  CalendarEntry,
  CalendarEntryCreateInput,
  CalendarEntryUpdateInput,
  CalendarCategoryCreateInput,
  CalendarCategoryInfo,
  CalendarCategoryUpdateInput
} from '../../shared/calendar-types'

export type CalendarApi = {
  list: () => Promise<CalendarEntry[]>
  create: (input: CalendarEntryCreateInput) => Promise<CalendarEntry>
  update: (args: { id: string; updates: CalendarEntryUpdateInput }) => Promise<CalendarEntry>
  delete: (args: { id: string }) => Promise<void>
  categories: {
    list: () => Promise<CalendarCategoryInfo[]>
    create: (input: CalendarCategoryCreateInput) => Promise<CalendarCategoryInfo>
    update: (args: {
      id: string
      updates: CalendarCategoryUpdateInput
    }) => Promise<CalendarCategoryInfo>
    delete: (args: { id: string }) => Promise<void>
  }
}
