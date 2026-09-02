import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { CustomDb, type CustomDbMigration } from './custom-db'

const tempDirs: string[] = []

function tempDbPath(): string {
  const dir = mkdtempSync(join(tmpdir(), 'orca-custom-db-test-'))
  tempDirs.push(dir)
  return join(dir, 'test.db')
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true })
  }
})

function openDb(migrations: readonly CustomDbMigration[], path = tempDbPath()): CustomDb {
  return new CustomDb(path, migrations)
}

const V1_MIGRATION: CustomDbMigration = {
  version: 1,
  up: (d) => d.exec('CREATE TABLE t1 (id TEXT PRIMARY KEY)')
}

describe('CustomDb migration ladder', () => {
  it('runs pending migrations and stamps user_version', () => {
    const db = openDb([V1_MIGRATION])
    const version = db.prepare('PRAGMA user_version').get() as { user_version: number }
    expect(version.user_version).toBe(1)
    db.exec("INSERT INTO t1 (id) VALUES ('a')")
    expect((db.prepare('SELECT COUNT(*) AS n FROM t1').get() as { n: number }).n).toBe(1)
  })

  it('upgrades an existing lower-version database to the latest ladder', () => {
    const path = tempDbPath()
    const db = openDb([V1_MIGRATION], path)
    db.exec("INSERT INTO t1 (id) VALUES ('keep')")
    db.close()
    // Reopen the same file with a ladder that has one more migration: v2 adds a table.
    const reopened = openDb(
      [V1_MIGRATION, { version: 2, up: (d) => d.exec('CREATE TABLE t2 (id TEXT PRIMARY KEY)') }],
      path
    )
    const version = reopened.prepare('PRAGMA user_version').get() as { user_version: number }
    expect(version.user_version).toBe(2)
    reopened.exec("INSERT INTO t2 (id) VALUES ('b')")
    expect((reopened.prepare('SELECT COUNT(*) AS n FROM t2').get() as { n: number }).n).toBe(1)
    // v1 data survives the v2 upgrade.
    expect((reopened.prepare('SELECT COUNT(*) AS n FROM t1').get() as { n: number }).n).toBe(1)
  })

  it('rolls back a failed migration and keeps the old version', () => {
    const path = tempDbPath()
    const db = openDb([V1_MIGRATION], path)
    db.close()
    const failing: CustomDbMigration = {
      version: 2,
      up: (d: DatabaseSync) => {
        d.exec('CREATE TABLE t2 (id TEXT PRIMARY KEY)')
        throw new Error('boom')
      }
    }
    expect(() => openDb([V1_MIGRATION, failing], path)).toThrow('boom')
    // Reopen normally: t2 must not exist and the version stays at 1.
    const reopened = openDb([V1_MIGRATION], path)
    expect(reopened.prepare('PRAGMA user_version').get()).toEqual({ user_version: 1 })
    expect((reopened.prepare('SELECT COUNT(*) AS n FROM t1').get() as { n: number }).n).toBe(0)
  })

  it('skips already-applied migrations (idempotent reopen)', () => {
    const path = tempDbPath()
    const db = openDb([V1_MIGRATION], path)
    db.exec("INSERT INTO t1 (id) VALUES ('keep')")
    db.close()
    const reopened = openDb([V1_MIGRATION], path)
    expect((reopened.prepare('SELECT COUNT(*) AS n FROM t1').get() as { n: number }).n).toBe(1)
  })
})
