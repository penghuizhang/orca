import { dirname, join } from 'node:path'
import {
  normalizeCalendarEntry,
  type CalendarCategoryCreateInput,
  type CalendarCategoryInfo,
  type CalendarCategoryUpdateInput,
  type CalendarEntry,
  type CalendarEntryCreateInput,
  type CalendarEntryUpdateInput
} from '../../../shared/calendar-types'
import { CustomDb } from '../../custom-db/custom-db'
import {
  CalendarTable,
  CALENDAR_ENTRIES_TABLE_MIGRATION,
  CALENDAR_CATEGORIES_TABLE_MIGRATION
} from '../../custom-db/calendar-table'
import { CalendarCategoriesTable } from '../../custom-db/calendar-categories-table'
import type { StoreRuntimeState } from './store-runtime-state'
import type { WriteSchedulingOperations } from './write-scheduling'
import { scheduleSave } from './write-scheduling'

const CALENDAR_MIGRATIONS = [CALENDAR_ENTRIES_TABLE_MIGRATION, CALENDAR_CATEGORIES_TABLE_MIGRATION]

const calendarPersistenceContext = Symbol('CalendarPersistence')
type CalendarPersistenceContext = {
  runtime: StoreRuntimeState
  scheduling: WriteSchedulingOperations
  calendarTable: CalendarTable
  calendarCategoriesTable: CalendarCategoriesTable
}

export class CalendarPersistence {
  readonly [calendarPersistenceContext]: CalendarPersistenceContext

  constructor(runtime: StoreRuntimeState, scheduling: WriteSchedulingOperations) {
    // Why: fork business data lives in its own sqlite next to the profile state
    // file, so a profile switch carries its calendar (and future tables) along.
    const customDb = new CustomDb(
      join(dirname(runtime.dataFile), 'orca-custom.db'),
      CALENDAR_MIGRATIONS
    )
    this[calendarPersistenceContext] = {
      runtime,
      scheduling,
      calendarTable: new CalendarTable(customDb.database),
      calendarCategoriesTable: new CalendarCategoriesTable(customDb.database)
    }
  }

  listCalendarEntries(): CalendarEntry[] {
    return this[calendarPersistenceContext].calendarTable.list()
  }

  createCalendarEntry(input: CalendarEntryCreateInput): CalendarEntry {
    return this[calendarPersistenceContext].calendarTable.create(input)
  }

  updateCalendarEntry(id: string, updates: CalendarEntryUpdateInput): CalendarEntry {
    return this[calendarPersistenceContext].calendarTable.update(id, updates)
  }

  deleteCalendarEntry(id: string): void {
    this[calendarPersistenceContext].calendarTable.delete(id)
  }

  listCalendarCategories(): CalendarCategoryInfo[] {
    return this[calendarPersistenceContext].calendarCategoriesTable.list()
  }

  createCalendarCategory(input: CalendarCategoryCreateInput): CalendarCategoryInfo {
    return this[calendarPersistenceContext].calendarCategoriesTable.create(input)
  }

  updateCalendarCategory(id: string, updates: CalendarCategoryUpdateInput): CalendarCategoryInfo {
    return this[calendarPersistenceContext].calendarCategoriesTable.update(id, updates)
  }

  deleteCalendarCategory(id: string): void {
    this[calendarPersistenceContext].calendarCategoriesTable.delete(id)
  }

  // Why: pre-sqlite builds kept calendar entries in the JSON state file; move
  // them into orca-custom.db once, then drop the JSON field. INSERT OR IGNORE
  // (id primary key) makes retries idempotent, and the field survives when the
  // db write fails so the next launch retries instead of losing data.
  migrateLegacyCalendarEntries(): void {
    const legacy = (
      this[calendarPersistenceContext].runtime.state as unknown as {
        calendarEntries?: unknown[]
      }
    ).calendarEntries
    if (!Array.isArray(legacy) || legacy.length === 0) {
      return
    }
    let migratedAll = true
    for (const raw of legacy) {
      const entry = normalizeCalendarEntry(raw)
      if (!entry) {
        continue
      }
      try {
        this[calendarPersistenceContext].calendarTable.insert(entry)
      } catch {
        migratedAll = false
      }
    }
    if (migratedAll) {
      delete (
        this[calendarPersistenceContext].runtime.state as unknown as {
          calendarEntries?: unknown[]
        }
      ).calendarEntries
      scheduleSave(this[calendarPersistenceContext].scheduling)
    }
  }
}

export function installCalendarPersistenceContext(
  target: object,
  source: CalendarPersistence
): void {
  Object.defineProperty(target, calendarPersistenceContext, {
    value: source[calendarPersistenceContext]
  })
}
