import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { app, ipcMain } from 'electron'
import { DEFAULT_NOTES_ROOT_DIRECTORY } from '../../shared/notes-root-directory'
import type { Store } from '../persistence'
import { authorizeExternalPath } from './filesystem-auth'
import { expandHomePath } from './expand-home-path'

/**
 * Resolves the configured Notes root against the home directory; relative input
 * resolves inside home so a hand-edited settings value can never escape to `/`.
 */
function resolveNotesRootInput(input: string): string {
  const home = app.getPath('home')
  const expanded = expandHomePath(input, home)
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(home, expanded)
}

export function registerNotesDirectoryHandlers(store: Store): void {
  ipcMain.handle('notes:getRootDirectory', async (): Promise<string> => {
    const configured = store.getSettings().notesRootDirectory ?? DEFAULT_NOTES_ROOT_DIRECTORY
    const rootPath = resolveNotesRootInput(configured)
    // Why: first open should just work — the default ~/OrcaNotes does not exist yet.
    await mkdir(rootPath, { recursive: true })
    // Why: allowed-roots grants are session-scoped, so authorize on every page open;
    // descendants then pass every fs CRUD authorization check without new IPC.
    authorizeExternalPath(rootPath)
    return rootPath
  })
}
