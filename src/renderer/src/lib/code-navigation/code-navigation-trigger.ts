import { findSameFileDefinitionRanges, rankSearchMatches } from './code-navigation'
import { searchRuntimeFiles } from '@/runtime/runtime-file-client'
import { getRightSidebarWorktreeRuntimeSettings } from '@/components/right-sidebar/file-explorer-runtime-owner'
import { getConnectionId } from '@/lib/connection-context'
import { getIndexedWorktreeById } from '@/store/worktree-repo-index'
import { useAppStore } from '@/store'

type SearchFileWithMatches = {
  filePath: string
  relativePath: string
  matches: { line: number; column: number; matchLength: number; lineContent: string }[]
}

export async function resolveDefinitionTarget(params: {
  word: string
  language: string
  content: string
  filePath: string
  worktreeId?: string
}): Promise<{
  filePath: string
  relativePath: string
  line: number
  column: number
  matchLength: number
} | null> {
  const { word, language, content, filePath, worktreeId } = params
  if (!word) {
    return null
  }
  const same = findSameFileDefinitionRanges(content, word, language)
  if (same.length > 0) {
    const r = same[0]
    return {
      filePath,
      relativePath: filePath,
      line: r.line,
      column: r.column,
      matchLength: word.length
    }
  }
  if (!worktreeId) {
    return null
  }
  const state = useAppStore.getState()
  const worktree = getIndexedWorktreeById(state.worktreesByRepo, worktreeId)
  const worktreePath = worktree?.path ?? null
  if (!worktreePath) {
    return null
  }
  const settings = getRightSidebarWorktreeRuntimeSettings(worktreeId)
  const connectionId = getConnectionId(worktreeId) ?? undefined
  try {
    const result = await searchRuntimeFiles(
      { settings, worktreeId, worktreePath, connectionId },
      { query: word, rootPath: worktreePath, wholeWord: true, caseSensitive: true, maxResults: 20 }
    )
    const ranked = rankSearchMatches(
      word,
      result.files as unknown as SearchFileWithMatches[],
      language,
      filePath
    )
    if (ranked.length === 0) {
      return null
    }
    const top = ranked[0]
    return {
      filePath: top.filePath,
      relativePath: top.relativePath,
      line: top.line,
      column: top.column,
      matchLength: top.matchLength
    }
  } catch {
    return null
  }
}
