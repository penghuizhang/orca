import { stat } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { homedir } from 'node:os'
import type { ZCodeUsageProcessedDatabase } from './types'

type ZCodeDatabaseOverride = {
  isConfigured: boolean
  path: string | null
}

function getZCodeDatabaseOverride(): ZCodeDatabaseOverride {
  const raw = process.env.ZCODE_DB?.trim()
  if (!raw) {
    return { isConfigured: false, path: null }
  }
  if (raw === ':memory:') {
    return { isConfigured: true, path: null }
  }
  return {
    isConfigured: true,
    path: isAbsolute(raw) ? raw : join(resolveZCodeDataDirectory(), raw)
  }
}

function resolveZCodeDataDirectory(): string {
  const home = homedir()
  if (process.platform === 'win32') {
    return join(process.env.USERPROFILE ?? home, '.zcode', 'cli', 'db')
  }
  return join(home, '.zcode', 'cli', 'db')
}

export async function listZCodeDatabases(): Promise<string[]> {
  const databaseOverride = getZCodeDatabaseOverride()
  if (databaseOverride.isConfigured) {
    if (!databaseOverride.path) {
      return []
    }
    try {
      const dbStat = await stat(databaseOverride.path)
      return dbStat.isFile() ? [databaseOverride.path] : []
    } catch {
      return []
    }
  }

  const dataDirectory = resolveZCodeDataDirectory()
  try {
    const { readdirSync } = await import('node:fs')
    const entries = readdirSync(dataDirectory, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name === 'db.sqlite')
      .map((entry) => join(dataDirectory, entry.name))
  } catch {
    return []
  }
}

export async function getProcessedDatabaseInfo(
  dbPath: string
): Promise<ZCodeUsageProcessedDatabase> {
  const dbStat = await stat(dbPath)
  return {
    path: dbPath,
    mtimeMs: dbStat.mtimeMs,
    size: dbStat.size
  }
}
