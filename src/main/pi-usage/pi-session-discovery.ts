import { readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import type { PiUsageProcessedFile } from './types'

function resolveSessionsDirectory(): string {
  const raw = process.env.PI_SESSIONS_DIR?.trim()
  if (raw) {
    return isAbsolute(raw) ? raw : join(homedir(), raw)
  }
  if (process.platform === 'win32') {
    return join(process.env.USERPROFILE ?? homedir(), '.pi', 'agent', 'sessions')
  }
  return join(homedir(), '.pi', 'agent', 'sessions')
}

/** Sessions live at <root>/<project-slug>/<uuid>.jsonl; walk bounded to that shape. */
export function listPiSessionFiles(): PiUsageProcessedFile[] {
  const root = resolveSessionsDirectory()
  let projectDirs: string[]
  try {
    projectDirs = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(root, entry.name))
  } catch {
    return []
  }

  const files: PiUsageProcessedFile[] = []
  for (const dir of projectDirs) {
    let entries
    try {
      // ReturnType<typeof readdirSync> resolves to the Buffer overload; inline call keeps Dirent<string>.
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.jsonl')) {
        continue
      }
      const path = join(dir, entry.name)
      try {
        const fileStat = statSync(path)
        files.push({ path, mtimeMs: fileStat.mtimeMs, size: fileStat.size })
      } catch {
        // File vanished between readdir and stat; skip it.
      }
    }
  }
  return files
}

export function getProcessedFileInfo(path: string): PiUsageProcessedFile {
  const fileStat = statSync(path)
  return { path, mtimeMs: fileStat.mtimeMs, size: fileStat.size }
}
