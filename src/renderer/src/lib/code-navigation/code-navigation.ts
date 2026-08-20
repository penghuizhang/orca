export type DefinitionRange = {
  line: number
  column: number
  endColumn: number
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function definitionPatternForLanguage(language: string, word: string): RegExp | null {
  const w = escapeRegExp(word)
  switch (language) {
    case 'typescript':
    case 'javascript':
      return new RegExp(`(?:function|class|interface|type|enum|const|let|var)\\s+${w}\\b`)
    case 'python':
      return new RegExp(`(?:def|class)\\s+${w}\\b`)
    case 'go':
      return new RegExp(`(?:func|type)\\s+(?:\\([^)]*\\)\\s*)?${w}\\b`)
    case 'java':
    case 'kotlin':
    case 'csharp':
    case 'swift':
    case 'rust':
    case 'cpp':
    case 'c':
      return new RegExp(`\\b(?:class|struct|enum|interface|func|fn)\\s+${w}\\b`)
    default:
      return null
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
  const pattern = definitionPatternForLanguage(language, word)
  const wholeWord = new RegExp(`\\b${escapeRegExp(word)}\\b`)
  const ranges: DefinitionRange[] = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (!wholeWord.test(line)) {
      continue
    }
    const isDefinition = pattern ? pattern.test(line) : false
    if (!isDefinition) {
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
  const pattern = definitionPatternForLanguage(language, word)
  const all: RankedMatch[] = []
  for (const file of files) {
    if (currentFilePath && file.filePath === currentFilePath) {
      continue
    }
    for (const m of file.matches) {
      const isDefinition = pattern ? pattern.test(m.lineContent) : false
      all.push({
        filePath: file.filePath,
        relativePath: file.relativePath,
        line: m.line,
        column: m.column,
        matchLength: m.matchLength,
        lineContent: m.lineContent,
        isDefinition
      })
    }
  }
  all.sort((a, b) => {
    if (a.isDefinition !== b.isDefinition) {
      return a.isDefinition ? -1 : 1
    }
    return a.filePath.localeCompare(b.filePath) || a.line - b.line
  })
  return all
}

export function isDefinitionLine(lineContent: string, word: string, language: string): boolean {
  const pattern = definitionPatternForLanguage(language, word)
  if (!pattern) {
    return false
  }
  return pattern.test(lineContent)
}
