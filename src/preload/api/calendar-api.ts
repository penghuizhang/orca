import type {
  CalendarEntry,
  CalendarEntryCreateInput,
  CalendarEntryUpdateInput
} from '../../shared/calendar-types'

export type CalendarApi = {
  list: () => Promise<CalendarEntry[]>
  create: (input: CalendarEntryCreateInput) => Promise<CalendarEntry>
  update: (args: { id: string; updates: CalendarEntryUpdateInput }) => Promise<CalendarEntry>
  delete: (args: { id: string }) => Promise<void>
}
