import type { editor, languages, Position, CancellationToken, Uri, Range } from 'monaco-editor'
import { findSameFileDefinitionRanges } from './code-navigation'

type MonacoLike = {
  languages: {
    registerDefinitionProvider: (
      languageId: string,
      provider: languages.DefinitionProvider
    ) => { dispose: () => void }
  }
  Range: new (sLine: number, sCol: number, eLine: number, eCol: number) => unknown
}

const SUPPORTED_LANGUAGES = [
  'typescript',
  'javascript',
  'python',
  'go',
  'java',
  'kotlin',
  'csharp',
  'swift',
  'rust',
  'cpp',
  'c',
  'php',
  'ruby'
]

export function registerCodeDefinitionProvider(
  monaco: MonacoLike,
  getWorktreeContext: () => { worktreeId?: string; filePath: string }
): { dispose: () => void } {
  const disposables = SUPPORTED_LANGUAGES.map((lang) =>
    monaco.languages.registerDefinitionProvider(lang, {
      provideDefinition(
        model: editor.ITextModel,
        position: Position,
        token: CancellationToken
      ): languages.Definition | null {
        const wordInfo = (
          model as unknown as { getWordAtPosition: (p: Position) => { word: string } | null }
        ).getWordAtPosition(position)
        const word = wordInfo?.word?.trim()
        if (!word) {
          return null
        }
        if (token.isCancellationRequested) {
          return null
        }
        const language = (
          model as unknown as { getLanguageId: () => string }
        ).getLanguageId() as string
        const content = model.getValue()
        const sameFile = findSameFileDefinitionRanges(content, word, language)
        if (sameFile.length === 0) {
          return null
        }
        const r = sameFile[0]
        return [
          {
            uri: model.uri as unknown as Uri,
            range: new monaco.Range(r.line, r.column, r.line, r.endColumn) as unknown as Range
          }
        ]
      }
    })
  )

  void getWorktreeContext
  return {
    dispose: () => {
      for (const d of disposables) {
        d.dispose()
      }
    }
  }
}
