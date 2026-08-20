export type DefinitionRange = {
  line: number
  column: number
  endColumn: number
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Tokens that, when they immediately precede an identifier, mark it as a *call/use*
// site rather than a declaration (e.g. `const y = sseChat(...)`, `return sseChat(...)`).
const CALL_CONTEXT = /(?:=|return|await|new|yield|void|typeof|&&|\|\||\?|,|;|\()\s*$/

function declarationScoreForLine(lineContent: string, word: string, language: string): number {
  const w = escapeRegExp(word)
  switch (language) {
    case 'typescript':
    case 'javascript': {
      // Keyword declarations: function/class/interface/type/enum/const/let/var NAME
      if (
        new RegExp(`(?:function|class|interface|type|enum|const|let|var)\\s+${w}\\b`).test(
          lineContent
        )
      ) {
        return 3
      }
      // Method / arrow declarations: (optional modifiers) NAME ( | NAME: ( | NAME = (
      // A negative lookbehind ensures NAME is not a member access (`obj.NAME`).
      const method = new RegExp(
        `(?<!\\w|\\.|\\$)(?:(?:async|public|private|protected|static|readonly|export|override|abstract|get|set)\\s+)*${w}\\s*\\??\\s*(?:\\(|[:=]\\s*\\()`
      )
      const m = method.exec(lineContent)
      if (m) {
        const before = lineContent.slice(0, m.index).trim()
        if (CALL_CONTEXT.test(before)) {
          return 0
        }
        return 2
      }
      return 0
    }
    case 'python':
      return new RegExp(`(?:def|class)\\s+${w}\\b`).test(lineContent) ? 3 : 0
    case 'go':
      return new RegExp(`(?:func|type)\\s+(?:\\([^)]*\\)\\s*)?${w}\\b`).test(lineContent) ? 3 : 0
    case 'java':
    case 'kotlin':
    case 'csharp':
    case 'swift':
    case 'rust':
    case 'cpp':
    case 'c':
      return new RegExp(`\\b(?:class|struct|enum|interface|func|fn)\\s+${w}\\b`).test(lineContent)
        ? 3
        : 0
    default:
      return 0
  }
}

export function findSameFileDefinitionRanges(
  content: string,
  word: string,
  language: string
): DefinitionRange[] {
  if (!word || !content) {
    return []
  }
  const lines = content.split('\n')
  const wholeWord = new RegExp(`\\b${escapeRegExp(word)}\\b`)
  const ranges: DefinitionRange[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!wholeWord.test(line)) {
      continue
    }
    if (declarationScoreForLine(line, word, language) === 0) {
      continue
    }
    const col = line.search(new RegExp(`\\b${escapeRegExp(word)}\\b`))
    if (col === -1) {
      continue
    }
    ranges.push({ line: i + 1, column: col + 1, endColumn: col + 1 + word.length })
  }
  return ranges
}

export type RankedMatch = {
  filePath: string
  relativePath: string
  line: number
  column: number
  matchLength: number
  lineContent: string
  isDefinition: boolean
  score: number
}

type SearchFileWithMatches = {
  filePath: string
  relativePath: string
  matches: { line: number; column: number; matchLength: number; lineContent: string }[]
}

export function rankSearchMatches(
  word: string,
  files: SearchFileWithMatches[],
  language: string,
  currentFilePath?: string
): RankedMatch[] {
  const all: RankedMatch[] = []
  for (const file of files) {
    if (currentFilePath && file.filePath === currentFilePath) {
      continue
    }
    for (const m of file.matches) {
      const score = declarationScoreForLine(m.lineContent, word, language)
      all.push({
        filePath: file.filePath,
        relativePath: file.relativePath,
        line: m.line,
        column: m.column,
        matchLength: m.matchLength,
        lineContent: m.lineContent,
        isDefinition: score > 0,
        score
      })
    }
  }
  // Highest declaration score first; tie-break by file path then line so the
  // canonical declaration file wins over incidental same-symbol usages.
  all.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score
    }
    return a.filePath.localeCompare(b.filePath) || a.line - b.line
  })
  return all
}

export function isDefinitionLine(lineContent: string, word: string, language: string): boolean {
  return declarationScoreForLine(lineContent, word, language) > 0
}
