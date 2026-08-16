import { chmodSync, existsSync } from 'node:fs'
import type { DatabaseSync } from 'node:sqlite'

/**
 * Generic business database for Orca fork customizations (`orca-custom.db`).
 *
 * Why a separate database: fork features (calendar entries today, logs and
 * other custom tables later) must not ride upstream's orchestration.db schema
 * (owned SCHEMA_VERSION + domain semantics) or orca-data.json (rewritten
 * wholesale on every upstream state migration). One file, one migration
 * ladder, any number of business tables.
 */

export type CustomDbMigration = {
  version: number
  up: (db: DatabaseSync) => void
}

// Why: node:sqlite is behind a builtin-module lookup so this file can be
// imported (for types) without crashing on runtimes that lack it — same
// pattern as upstream's src/main/sqlite/sync-database.ts.
function loadDatabaseSync(): typeof DatabaseSync {
  if (typeof process.getBuiltinModule !== 'function') {
    throw new Error('node:sqlite is unavailable in this Node.js runtime')
  }
  return (process.getBuiltinModule('node:sqlite') as { DatabaseSync: typeof DatabaseSync })
    .DatabaseSync
}

// Why: the custom DB is user-owned state; on POSIX the parent profile dir is
// already private but the sqlite files land 0644 by default, so tighten them
// like upstream's orchestration DB does.
function hardenDatabaseFiles(dbPath: string): void {
  if (process.platform === 'win32') {
    return
  }
  for (const path of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (existsSync(path)) {
      chmodSync(path, 0o600)
    }
  }
}

export class CustomDb {
  private readonly db: DatabaseSync

  constructor(dbPath: string, migrations: readonly CustomDbMigration[]) {
    const DatabaseSync = loadDatabaseSync()
    this.db = new DatabaseSync(dbPath)
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA synchronous = NORMAL')
    this.db.exec('PRAGMA busy_timeout = 5000')
    this.migrate(migrations)
    hardenDatabaseFiles(dbPath)
  }

  /** Runs pending migrations in order, each in its own transaction. */
  private migrate(migrations: readonly CustomDbMigration[]): void {
    const row = this.db.prepare('PRAGMA user_version').get() as { user_version: number }
    let current = typeof row?.user_version === 'number' ? row.user_version : 0
    for (const migration of migrations) {
      if (migration.version <= current) {
        continue
      }
      this.db.exec('BEGIN')
      try {
        migration.up(this.db)
        this.db.exec(`PRAGMA user_version = ${migration.version}`)
        this.db.exec('COMMIT')
        current = migration.version
      } catch (error) {
        this.db.exec('ROLLBACK')
        throw error
      }
    }
  }

  prepare(sql: string) {
    return this.db.prepare(sql)
  }

  /** Raw handle for business tables that issue their own statements. */
  get database(): DatabaseSync {
    return this.db
  }

  exec(sql: string): void {
    this.db.exec(sql)
  }

  close(): void {
    this.db.close()
  }
}
