import { FLOATING_TERMINAL_WORKTREE_ID } from './floating-workspace-id'

// Why: synthetic local workspace for Notes-page files; keeps notes out of the floating-workspace tab group.
export const NOTES_WORKTREE_ID = 'global-notes'

/** Virtual workspace ids that are always local — never route through a remote host. */
export function isLocalOnlyVirtualWorktree(worktreeId: string | undefined | null): boolean {
  return worktreeId === FLOATING_TERMINAL_WORKTREE_ID || worktreeId === NOTES_WORKTREE_ID
}
