import type { DirEntry } from '../../../../shared/filesystem-entry-types'

export type NotesTreeNode =
  | { kind: 'folder'; name: string; path: string; children: NotesTreeNode[] }
  | { kind: 'note'; name: string; path: string }

/** Injected fs bridge call so tree building stays unit-testable without Electron. */
export type NotesReadDir = (dirPath: string) => Promise<DirEntry[]>

const MARKDOWN_EXTENSION_PATTERN = /\.(md|mdx|markdown)$/i
// Why: guards against symlink loops and runaway deep trees; notes are human-organized.
const MAX_NOTES_TREE_DEPTH = 20

export function isMarkdownNoteName(name: string): boolean {
  return MARKDOWN_EXTENSION_PATTERN.test(name)
}

/** Notes created in-app always get a markdown extension so the editor picks rich mode. */
export function ensureMarkdownExtension(name: string): string {
  return isMarkdownNoteName(name) ? name : `${name}.md`
}

/** Strips separators and control characters so a dialog-provided name cannot escape its folder. */
export function sanitizeNotesEntryName(raw: string): string {
  const dashed = raw.trim().replace(/[/\\]/g, '-')
  // Why: filter code points directly instead of a control-character regex so the lint rule stays clean.
  let name = ''
  for (const char of dashed) {
    const code = char.codePointAt(0) ?? 0
    if (code > 0x1f && code !== 0x7f) {
      name += char
    }
  }
  return name
}

export function joinNotesPath(rootPath: string, ...segments: string[]): string {
  return [rootPath.replace(/[/\\]+$/, ''), ...segments].join('/')
}

/** Parent directory of a joined notes path; empty string when the path has no separator. */
export function notesParentPath(entryPath: string): string {
  const separatorIndex = entryPath.lastIndexOf('/')
  return separatorIndex === -1 ? '' : entryPath.slice(0, separatorIndex)
}

function compareNotesNodes(a: NotesTreeNode, b: NotesTreeNode): number {
  if (a.kind !== b.kind) {
    return a.kind === 'folder' ? -1 : 1
  }
  return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
}

export function sortNotesTreeNodes(nodes: NotesTreeNode[]): NotesTreeNode[] {
  const sorted = [...nodes].sort(compareNotesNodes)
  for (const node of sorted) {
    if (node.kind === 'folder') {
      node.children = sortNotesTreeNodes(node.children)
    }
  }
  return sorted
}

async function readNotesDirectory(
  dirPath: string,
  readDir: NotesReadDir,
  depth: number
): Promise<NotesTreeNode[]> {
  if (depth > MAX_NOTES_TREE_DEPTH) {
    return []
  }
  let entries: DirEntry[]
  try {
    entries = await readDir(dirPath)
  } catch {
    // Why: an unreadable subfolder (or a folder raced away) must not blank the whole tree.
    return []
  }
  const nodes: NotesTreeNode[] = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }
    const entryPath = joinNotesPath(dirPath, entry.name)
    if (entry.isDirectory && !entry.isSymlink) {
      nodes.push({
        kind: 'folder',
        name: entry.name,
        path: entryPath,
        children: await readNotesDirectory(entryPath, readDir, depth + 1)
      })
    } else if (!entry.isDirectory && isMarkdownNoteName(entry.name)) {
      nodes.push({ kind: 'note', name: entry.name, path: entryPath })
    }
  }
  return sortNotesTreeNodes(nodes)
}

/** Builds the folder/markdown tree for the notes root; non-markdown files are skipped. */
export async function readNotesTree(
  rootPath: string,
  readDir: NotesReadDir
): Promise<NotesTreeNode[]> {
  return readNotesDirectory(rootPath, readDir, 0)
}

function matchesQuery(node: NotesTreeNode, query: string): boolean {
  return node.name.toLowerCase().includes(query)
}

/** Keeps matching nodes plus the ancestor chain leading to them; folders always stay when a child matches. */
export function filterNotesTree(nodes: NotesTreeNode[], query: string): NotesTreeNode[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return nodes
  }
  const filtered: NotesTreeNode[] = []
  for (const node of nodes) {
    if (node.kind === 'folder') {
      const children = filterNotesTree(node.children, query)
      if (children.length > 0) {
        filtered.push({ ...node, children })
      } else if (matchesQuery(node, normalized)) {
        filtered.push({ ...node, children: [] })
      }
    } else if (matchesQuery(node, normalized)) {
      filtered.push(node)
    }
  }
  return filtered
}
