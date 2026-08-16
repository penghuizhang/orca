import { describe, expect, it } from 'vitest'
import { CalendarTable, CALENDAR_ENTRIES_TABLE_MIGRATION } from './calendar-table'
import { CustomDb } from './custom-db'
import type { CalendarEntryCreateInput } from '../../shared/calendar-types'

function openTable(): CalendarTable {
  const db = new CustomDb(':memory:', [CALENDAR_ENTRIES_TABLE_MIGRATION])
  return new CalendarTable(db.database)
}

const INPUT: CalendarEntryCreateInput = {
  title: 'Standup',
  date: '2026-08-17',
  allDay: false,
  startTime: '09:30',
  endTime: '10:00',
  category: 'meeting',
  description: 'daily',
  lunarRepeat: null
}

describe('CalendarTable', () => {
  it('round-trips a created entry with its generated id and timestamps', () => {
    const table = openTable()
    const created = table.create(INPUT)
    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBeGreaterThan(0)
    expect(table.list()).toEqual([created])
  })

  it('persists lunar repeat as JSON and reads it back', () => {
    const table = openTable()
    const created = table.create({
      ...INPUT,
      title: 'Mid-Autumn',
      allDay: true,
      startTime: null,
      endTime: null,
      lunarRepeat: { month: 8, day: 15 }
    })
    const listed = table.list()
    expect(listed).toHaveLength(1)
    expect(listed[0].lunarRepeat).toEqual({ month: 8, day: 15 })
    expect(listed[0].id).toBe(created.id)
  })

  it('rejects invalid lunar repeat rows on read (dropped like the JSON path)', () => {
    const db = new CustomDb(':memory:', [CALENDAR_ENTRIES_TABLE_MIGRATION])
    const table = new CalendarTable(db.database)
    table.create({ ...INPUT, lunarRepeat: { month: 8, day: 15 } })
    // Corrupt the stored JSON directly to simulate a tampered row.
    db.exec("UPDATE calendar_entries SET lunar_repeat = '{oops'")
    expect(table.list()).toHaveLength(0)
  })

  it('sorts all-day entries before timed ones, then by start time', () => {
    const table = openTable()
    const late = table.create({
      ...INPUT,
      title: 'Late',
      date: '2026-08-17',
      startTime: '11:00',
      endTime: '11:30'
    })
    const allDay = table.create({
      ...INPUT,
      title: 'All day',
      date: '2026-08-18',
      allDay: true,
      startTime: null,
      endTime: null
    })
    const early = table.create({
      ...INPUT,
      title: 'Early',
      date: '2026-08-17',
      startTime: '08:00',
      endTime: '08:30'
    })
    expect(table.list().map((e) => e.title)).toEqual(['All day', 'Early', 'Late'])
    expect(table.list().map((e) => e.id)).toEqual([allDay.id, early.id, late.id])
  })

  it('updates fields and normalizes allDay clearing of times', () => {
    const table = openTable()
    const created = table.create(INPUT)
    const updated = table.update(created.id, { allDay: true })
    expect(updated.startTime).toBeNull()
    expect(updated.endTime).toBeNull()
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
    expect(table.list()[0]).toEqual(updated)
  })

  it('normalizes end before start into a point event', () => {
    const table = openTable()
    const created = table.create(INPUT)
    const updated = table.update(created.id, { endTime: '09:00' })
    expect(updated.endTime).toBe('09:30')
  })

  it('throws on update of a missing id', () => {
    const table = openTable()
    expect(() => table.update('nope', { title: 'x' })).toThrow('Calendar entry not found.')
  })

  it('deletes entries', () => {
    const table = openTable()
    const created = table.create(INPUT)
    table.delete(created.id)
    expect(table.list()).toHaveLength(0)
  })

  it('insert keeps existing ids (migration idempotence)', () => {
    const table = openTable()
    const created = table.create(INPUT)
    const duplicate = { ...created, title: 'Renamed after migration retry' }
    table.insert(duplicate)
    expect(table.list()).toHaveLength(1)
    expect(table.list()[0].title).toBe('Standup')
  })
})
