import { detectLanguage } from '@/lib/language-detect'

export type DefinitionTarget = {
  filePath: string
  relativePath: string
  line: number
  column: number
  matchLength: number
}

export function openDefinitionTarget(params: {
  target: DefinitionTarget
  currentFilePath: string
  currentWorktreeId: string | undefined
  openFile: (
    file: {
      filePath: string
      relativePath: string
      worktreeId: string
      language: string
      mode: 'edit'
      runtimeEnvironmentId: string | null
    },
    options: { suppressActiveRuntimeFallback: boolean }
  ) => void
  setPendingEditorReveal: (
    reveal: { filePath: string; line: number; column: number; matchLength: number } | null
  ) => void
  revealRafRef: { current: number | null }
  revealInnerRafRef: { current: number | null }
  runtimeEnvironmentId: string | null
  editor?: {
    revealRangeInCenter: (range: unknown) => void
    setPosition: (pos: { lineNumber: number; column: number }) => void
  } | null
  monacoRange?: new (sLine: number, sCol: number, eLine: number, eCol: number) => unknown
}): void {
  const {
    target,
    currentFilePath,
    currentWorktreeId,
    openFile,
    setPendingEditorReveal,
    revealRafRef,
    revealInnerRafRef,
    runtimeEnvironmentId,
    editor,
    monacoRange
  } = params

  if (target.filePath === currentFilePath && editor && monacoRange) {
    const range = new monacoRange(
      target.line,
      target.column,
      target.line,
      target.column + target.matchLength
    )
    editor.revealRangeInCenter(range)
    editor.setPosition({ lineNumber: target.line, column: target.column })
    return
  }

  if (!currentWorktreeId) {
    return
  }

  const cancelFrame = (ref: { current: number | null }): void => {
    if (ref.current !== null) {
      cancelAnimationFrame(ref.current)
      ref.current = null
    }
  }

  openFile(
    {
      filePath: target.filePath,
      relativePath: target.relativePath,
      worktreeId: currentWorktreeId,
      language: detectLanguage(target.filePath),
      mode: 'edit',
      runtimeEnvironmentId
    },
    { suppressActiveRuntimeFallback: runtimeEnvironmentId === null }
  )

  cancelFrame(revealRafRef)
  cancelFrame(revealInnerRafRef)
  setPendingEditorReveal(null)

  revealRafRef.current = requestAnimationFrame(() => {
    revealInnerRafRef.current = requestAnimationFrame(() => {
      setPendingEditorReveal({
        filePath: target.filePath,
        line: target.line,
        column: target.column,
        matchLength: target.matchLength
      })
      cancelFrame(revealRafRef)
      cancelFrame(revealInnerRafRef)
    })
  })
}
