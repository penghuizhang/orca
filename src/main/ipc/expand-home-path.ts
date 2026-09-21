import path from 'node:path'

/**
 * Expands a leading `~` against the given home directory.
 *
 * Shared by the floating-workspace directory resolver and the Notes root resolver
 * so both agree on tilde semantics (exact `~`, `~/…`, and Windows `~\\…`).
 * Anything else is returned untouched; callers decide how to resolve relative input.
 */
export function expandHomePath(input: string, home: string): string {
  if (input === '~') {
    return home
  }
  if (input.startsWith(`~${path.sep}`)) {
    return path.join(home, input.slice(2))
  }
  if (process.platform === 'win32' && input.startsWith('~/')) {
    return path.join(home, input.slice(2))
  }
  return input
}
