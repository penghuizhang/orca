import type { DatabaseSync } from 'node:sqlite'
import type {
  CalendarCategoryColor,
  CalendarCategoryInfo,
  CalendarCategoryCreateInput,
  CalendarCategoryUpdateInput
} from '../../shared/calendar-types'
import { CALENDAR_CATEGORY_COLORS } from '../../shared/calendar-types'

type CalendarCategoryRow = {
  id: string
  name: string
  color: string
  built_in: number
  sort_order: number
  created_at: number
  updated_at: number
}

function rowToInfo(row: CalendarCategoryRow): CalendarCategoryInfo {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    builtIn: row.built_in === 1
  }
}

/** Slug candidate for a user-defined category id ('产品评审' -> '产品评审'). */
function toCategoryId(name: string): string {
  return name.trim()
}

export class CalendarCategoriesTable {
  constructor(private readonly db: DatabaseSync) {}

  list(): CalendarCategoryInfo[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, color, built_in, sort_order, created_at, updated_at
         FROM calendar_categories
         ORDER BY built_in DESC, sort_order ASC, created_at ASC`
      )
      .all() as CalendarCategoryRow[]
    return rows.map(rowToInfo)
  }

  create(input: CalendarCategoryCreateInput): CalendarCategoryInfo {
    const name = input.name.trim()
    if (name.length === 0) {
      throw new Error('Category name cannot be empty.')
    }
    if (!(CALENDAR_CATEGORY_COLORS as readonly string[]).includes(input.color)) {
      throw new Error('Unknown category color.')
    }
    const id = toCategoryId(name)
    const existing = this.db
      .prepare('SELECT id FROM calendar_categories WHERE id = ? OR name = ?')
      .get(id, name) as { id: string } | undefined
    if (existing) {
      throw new Error(`Category "${name}" already exists.`)
    }
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO calendar_categories (id, name, color, built_in, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM calendar_categories), ?, ?)`
      )
      .run(id, name, input.color, now, now)
    return { id, name, color: input.color, builtIn: false }
  }

  update(id: string, updates: CalendarCategoryUpdateInput): CalendarCategoryInfo {
    const row = this.db
      .prepare(
        `SELECT id, name, color, built_in, sort_order, created_at, updated_at
         FROM calendar_categories WHERE id = ?`
      )
      .get(id) as CalendarCategoryRow | undefined
    if (!row) {
      throw new Error('Category not found.')
    }
    if (row.built_in === 1) {
      throw new Error('Built-in categories cannot be renamed.')
    }
    const name = updates.name !== undefined ? updates.name.trim() : row.name
    if (name.length === 0) {
      throw new Error('Category name cannot be empty.')
    }
    const color =
      updates.color !== undefined &&
      (CALENDAR_CATEGORY_COLORS as readonly string[]).includes(updates.color)
        ? updates.color
        : row.color
    const conflict = this.db
      .prepare('SELECT id FROM calendar_categories WHERE name = ? AND id <> ?')
      .get(name, id) as { id: string } | undefined
    if (conflict) {
      throw new Error(`Category "${name}" already exists.`)
    }
    this.db
      .prepare('UPDATE calendar_categories SET name = ?, color = ?, updated_at = ? WHERE id = ?')
      .run(name, color, Date.now(), id)
    return { id, name, color, builtIn: false }
  }

  /** Deletes only unused custom categories; built-ins and referenced ones are rejected. */
  delete(id: string): void {
    const row = this.db
      .prepare('SELECT id, built_in FROM calendar_categories WHERE id = ?')
      .get(id) as { id: string; built_in: number } | undefined
    if (!row) {
      throw new Error('Category not found.')
    }
    if (row.built_in === 1) {
      throw new Error('Built-in categories cannot be deleted.')
    }
    const inUse = this.db
      .prepare('SELECT 1 FROM calendar_entries WHERE category = ? LIMIT 1')
      .get(id) as unknown
    if (inUse !== undefined) {
      throw new Error('Category is in use — reassign its entries first.')
    }
    this.db.prepare('DELETE FROM calendar_categories WHERE id = ?').run(id)
  }
}

export type { CalendarCategoryColor }
