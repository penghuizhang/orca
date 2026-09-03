import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
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
    // When customDbPath is configured, use the external path instead.
    // Why optional-chain: Store builds domains before runtime.state is assigned
    // (see store.ts); boot must not crash — custom path applies once loaded.
    const settings = runtime.state?.settings
    const customDbPath = settings?.customDbPath
    const dbPath =
      customDbPath && existsSync(customDbPath)
        ? customDbPath
        : join(dirname(runtime.dataFile), 'orca-custom.db')

    const customDb = new CustomDb(dbPath, CALENDAR_MIGRATIONS)
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

  /**
   * Migrate the database from the default path to a custom external path.
   * This is idempotent: if the target already exists, it does nothing.
   * If the source doesn't exist, it does nothing.
   *
   * @param defaultDbPath The default database path (next to orca-data.json)
   * @param customDbPath The custom external database path
   */
  static migrateToCustomPath(defaultDbPath: string, customDbPath: string): void {
    // If custom path already exists, no migration needed
    if (existsSync(customDbPath)) {
      return
    }

    // If default path doesn't exist, nothing to migrate
    if (!existsSync(defaultDbPath)) {
      return
    }

    // Ensure the target directory exists
    mkdirSync(dirname(customDbPath), { recursive: true })

    // Copy the database file and its WAL/SHM sidecars
    copyFileSync(defaultDbPath, customDbPath)
    const walPath = `${defaultDbPath}-wal`
    const shmPath = `${defaultDbPath}-shm`
    if (existsSync(walPath)) {
      copyFileSync(walPath, `${customDbPath}-wal`)
    }
    if (existsSync(shmPath)) {
      copyFileSync(shmPath, `${customDbPath}-shm`)
    }

    console.log(`[calendar] Migrated database from ${defaultDbPath} to ${customDbPath}`)
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
