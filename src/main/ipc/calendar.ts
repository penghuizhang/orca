import { ipcMain } from 'electron'

import type { Store } from '../persistence'
import type {
  CalendarEntry,
  CalendarEntryCreateInput,
  CalendarEntryUpdateInput,
  CalendarCategoryCreateInput,
  CalendarCategoryInfo,
  CalendarCategoryUpdateInput
} from '../../shared/calendar-types'

export function registerCalendarHandlers(store: Store): void {
  ipcMain.handle('calendar:list', (): CalendarEntry[] => store.listCalendarEntries())
  ipcMain.handle(
    'calendar:create',
    (_event, input: CalendarEntryCreateInput): CalendarEntry => store.createCalendarEntry(input)
  )
  ipcMain.handle(
    'calendar:update',
    (_event, args: { id: string; updates: CalendarEntryUpdateInput }): CalendarEntry =>
      store.updateCalendarEntry(args.id, args.updates)
  )
  ipcMain.handle('calendar:delete', (_event, args: { id: string }): void => {
    store.deleteCalendarEntry(args.id)
  })

  ipcMain.handle('calendar:categories:list', (): CalendarCategoryInfo[] =>
    store.listCalendarCategories()
  )
  ipcMain.handle(
    'calendar:categories:create',
    (_event, input: CalendarCategoryCreateInput): CalendarCategoryInfo =>
      store.createCalendarCategory(input)
  )
  ipcMain.handle(
    'calendar:categories:update',
    (_event, args: { id: string; updates: CalendarCategoryUpdateInput }): CalendarCategoryInfo =>
      store.updateCalendarCategory(args.id, args.updates)
  )
  ipcMain.handle('calendar:categories:delete', (_event, args: { id: string }): void => {
    store.deleteCalendarCategory(args.id)
  })
}
