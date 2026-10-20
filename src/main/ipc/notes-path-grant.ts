/**
 * Session-scoped grant for the configured notes root.
 *
 * The notes root lives outside every store-owned allowed root, so the generic filesystem
 * handlers deny it until the notes page asks for the directory once. Nothing is granted
 * before that first ask.
 */
let grantedNotesRoot: string | null = null

export function grantNotesRootAccess(resolvedRoot: string): void {
  grantedNotesRoot = resolvedRoot
}

export function getGrantedNotesRoot(): string | null {
  return grantedNotesRoot
}

export function __resetGrantedNotesRootForTests(): void {
  grantedNotesRoot = null
}
