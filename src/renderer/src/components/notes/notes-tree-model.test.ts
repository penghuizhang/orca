import { describe, expect, it } from 'vitest'
import type { DirEntry } from '../../../../shared/filesystem-entry-types'
import {
  ensureMarkdownExtension,
  filterNotesTree,
  isMarkdownNoteName,
  joinNotesPath,
  notesParentPath,
  readNotesTree,
  sanitizeNotesEntryName,
  sortNotesTreeNodes,
  type NotesTreeNode
} from './notes-tree-model'

function dirEntry(
  name: string,
  options: { directory?: boolean; symlink?: boolean } = {}
): DirEntry {
  return {
    name,
    isDirectory: options.directory ?? false,
    isSymlink: options.symlink ?? false
  }
}

describe('sanitizeNotesEntryName', () => {
  it('strips path separators so names cannot escape their folder', () => {
    expect(sanitizeNotesEntryName('a/b')).toBe('a-b')
    expect(sanitizeNotesEntryName('..\\..\\evil')).toBe('..-..-evil')
  })

  it('strips control characters and trims surrounding whitespace', () => {
    expect(sanitizeNotesEntryName('  name\t')).toBe('name')
    expect(sanitizeNotesEntryName('na\u0007me\u007f')).toBe('name')
  })
})

describe('ensureMarkdownExtension / isMarkdownNoteName', () => {
  it('appends .md only when no markdown extension is present', () => {
    expect(ensureMarkdownExtension('note')).toBe('note.md')
    expect(ensureMarkdownExtension('note.md')).toBe('note.md')
    expect(ensureMarkdownExtension('note.MARKDOWN')).toBe('note.MARKDOWN')
    expect(isMarkdownNoteName('a.mdx')).toBe(true)
    expect(isMarkdownNoteName('a.txt')).toBe(false)
  })
})

describe('joinNotesPath / notesParentPath', () => {
  it('joins with forward separators and drops the root trailing slash', () => {
    expect(joinNotesPath('/root/', 'a', 'b.md')).toBe('/root/a/b.md')
  })

  it('returns the directory prefix and empty string for root-level paths', () => {
    expect(notesParentPath('/root/a/b.md')).toBe('/root/a')
    expect(notesParentPath('note.md')).toBe('')
  })
})

describe('readNotesTree', () => {
  it('builds folders and markdown notes while skipping hidden files, symlinks, and non-markdown files', async () => {
    const listings = new Map<string, DirEntry[]>([
      [
        '/root',
        [
          dirEntry('.hidden'),
          dirEntry('draft.txt'),
          dirEntry('guide.md'),
          dirEntry('docs', { directory: true })
        ]
      ],
      [
        '/root/docs',
        [dirEntry('linked', { directory: true, symlink: true }), dirEntry('design.md')]
      ]
    ])
    const tree = await readNotesTree('/root', (dirPath) => {
      const entries = listings.get(dirPath)
      if (!entries) {
        throw new Error('ENOENT')
      }
      return Promise.resolve(entries)
    })
    expect(tree).toEqual([
      {
        kind: 'folder',
        name: 'docs',
        path: '/root/docs',
        children: [{ kind: 'note', name: 'design.md', path: '/root/docs/design.md' }]
      },
      { kind: 'note', name: 'guide.md', path: '/root/guide.md' }
    ])
  })

  it('keeps sibling folders readable when one subdirectory fails to list', async () => {
    const tree = await readNotesTree('/root', (dirPath) => {
      if (dirPath === '/root') {
        return Promise.resolve([
          dirEntry('broken', { directory: true }),
          dirEntry('ok', { directory: true })
        ])
      }
      if (dirPath === '/root/ok') {
        return Promise.resolve([])
      }
      return Promise.reject(new Error('EACCES'))
    })
    expect(tree.map((node) => node.name)).toEqual(['broken', 'ok'])
    const broken = tree[0] as Extract<NotesTreeNode, { kind: 'folder' }>
    expect(broken.children).toEqual([])
  })
})

describe('sortNotesTreeNodes / filterNotesTree', () => {
  const nodes: NotesTreeNode[] = [
    { kind: 'note', name: 'b.md', path: '/root/b.md' },
    { kind: 'folder', name: 'z-dir', path: '/root/z-dir', children: [] },
    { kind: 'note', name: 'a.md', path: '/root/a.md' }
  ]

  it('sorts folders before notes and children recursively', () => {
    const sorted = sortNotesTreeNodes(nodes)
    expect(sorted.map((node) => node.name)).toEqual(['z-dir', 'a.md', 'b.md'])
  })

  it('filters by name and keeps the ancestor chain of matches', () => {
    const tree: NotesTreeNode[] = [
      {
        kind: 'folder',
        name: 'project',
        path: '/root/project',
        children: [
          { kind: 'note', name: '需求.md', path: '/root/project/需求.md' },
          { kind: 'note', name: 'readme.md', path: '/root/project/readme.md' }
        ]
      },
      { kind: 'note', name: '需求分析.md', path: '/root/需求分析.md' }
    ]
    const filtered = filterNotesTree(tree, '需求')
    expect(filtered).toHaveLength(2)
    const project = filtered[0] as Extract<NotesTreeNode, { kind: 'folder' }>
    expect(project.children.map((child) => child.name)).toEqual(['需求.md'])
  })

  it('returns the input unchanged for an empty query', () => {
    expect(filterNotesTree(nodes, '  ')).toBe(nodes)
  })
})
