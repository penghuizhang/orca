import { randomUUID } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import {
  applyCalendarEntryUpdate,
  compareCalendarEntriesByStart,
  normalizeCalendarEntry
} from '../../shared/calendar-types'
import type {
  CalendarEntry,
  CalendarEntryCreateInput,
  CalendarEntryUpdateInput
} from '../../shared/calendar-types'
import type { CustomDbMigration } from './custom-db'

/** v1 of orca-custom.db: the calendar entries business table. */
export const CALENDAR_ENTRIES_TABLE_MIGRATION: CustomDbMigration = {
  version: 1,
  up: (db: DatabaseSync) => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_entries (
        id            TEXT PRIMARY KEY,
        title         TEXT NOT NULL DEFAULT '',
        date          TEXT NOT NULL,
        all_day       INTEGER NOT NULL DEFAULT 0,
        start_time    TEXT,
        end_time      TEXT,
        category      TEXT NOT NULL DEFAULT 'other'
          CHECK(category IN ('meeting','feature','milestone','other')),
        description   TEXT NOT NULL DEFAULT '',
        lunar_repeat  TEXT,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_calendar_entries_date ON calendar_entries(date);
    `)
  }
}

type CalendarEntryRow = {
  id: string
  title: string
  date: string
  all_day: number
  start_time: string | null
  end_time: string | null
  category: string
  description: string
  lunar_repeat: string | null
  created_at: number
  updated_at: number
}

function rowToEntry(row: CalendarEntryRow): CalendarEntry | null {
  let lunarRepeat: CalendarEntry['lunarRepeat'] = null
  if (row.lunar_repeat !== null) {
    try {
      lunarRepeat = JSON.parse(row.lunar_repeat) as CalendarEntry['lunarRepeat']
    } catch {
      return null
    }
  }
  return normalizeCalendarEntry({
    id: row.id,
    title: row.title,
    date: row.date,
    allDay: row.all_day === 1,
    startTime: row.start_time,
    endTime: row.end_time,
    category: row.category,
    description: row.description,
    lunarRepeat,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  })
}

function entryToRow(entry: CalendarEntry): CalendarEntryRow {
  return {
    id: entry.id,
    title: entry.title,
    date: entry.date,
    all_day: entry.allDay ? 1 : 0,
    start_time: entry.startTime,
    end_time: entry.endTime,
    category: entry.category,
    description: entry.description,
    lunar_repeat: entry.lunarRepeat ? JSON.stringify(entry.lunarRepeat) : null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt
  }
}

const SELECT_COLUMNS = [
  'id',
  'title',
  'date',
  'all_day',
  'start_time',
  'end_time',
  'category',
  'description',
  'lunar_repeat',
  'created_at',
  'updated_at'
].join(', ')

export class CalendarTable {
  constructor(private readonly db: DatabaseSync) {}

  list(): CalendarEntry[] {
    const rows = this.db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM calendar_entries`)
      .all() as CalendarEntryRow[]
    return rows
      .map((row) => rowToEntry(row))
      .filter((entry): entry is CalendarEntry => entry !== null)
      .sort(compareCalendarEntriesByStart)
  }

  create(input: CalendarEntryCreateInput): CalendarEntry {
    const now = Date.now()
    const entry = normalizeCalendarEntry({
      id: randomUUID(),
      title: input.title,
      date: input.date,
      allDay: input.allDay,
      startTime: input.startTime,
      endTime: input.endTime,
      category: input.category,
      description: input.description,
      lunarRepeat: input.lunarRepeat,
      createdAt: now,
      updatedAt: now
    })
    if (!entry) {
      throw new Error('Invalid calendar entry.')
    }
    this.insert(entry)
    return entry
  }

  /** Insert an already-validated entry verbatim; id conflicts are ignored (migration idempotence). */
  insert(entry: CalendarEntry): void {
    const row = entryToRow(entry)
    this.db
      .prepare(
        `INSERT OR IGNORE INTO calendar_entries (${SELECT_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        row.id,
        row.title,
        row.date,
        row.all_day,
        row.start_time,
        row.end_time,
        row.category,
        row.description,
        row.lunar_repeat,
        row.created_at,
        row.updated_at
      )
  }

  update(id: string, updates: CalendarEntryUpdateInput): CalendarEntry {
    const row = this.db
      .prepare(`SELECT ${SELECT_COLUMNS} FROM calendar_entries WHERE id = ?`)
      .get(id) as CalendarEntryRow | undefined
    if (!row) {
      throw new Error('Calendar entry not found.')
    }
    const current = rowToEntry(row)
    if (!current) {
      throw new Error('Calendar entry not found.')
    }
    const updated = applyCalendarEntryUpdate(current, updates)
    if (!updated) {
      throw new Error('Invalid calendar entry update.')
    }
    updated.updatedAt = Date.now()
    const updatedRow = entryToRow(updated)
    this.db
      .prepare(
        `UPDATE calendar_entries SET
           title = ?, date = ?, all_day = ?, start_time = ?, end_time = ?,
           category = ?, description = ?, lunar_repeat = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(
        updatedRow.title,
        updatedRow.date,
        updatedRow.all_day,
        updatedRow.start_time,
        updatedRow.end_time,
        updatedRow.category,
        updatedRow.description,
        updatedRow.lunar_repeat,
        updatedRow.updated_at,
        id
      )
    return updated
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM calendar_entries WHERE id = ?').run(id)
  }
}
