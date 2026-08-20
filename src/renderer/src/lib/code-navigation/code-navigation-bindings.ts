import * as monaco from 'monaco-editor'
import type { editor } from 'monaco-editor'
import type React from 'react'
import { toast } from 'sonner'
import { resolveDefinitionTarget } from './code-navigation-trigger'
import { useAppStore } from '@/store'
import { getRightSidebarWorktreeRuntimeSettings } from '@/components/right-sidebar/file-explorer-runtime-owner'

export function installCodeNavigationBindings(params: {
  editorInstance: editor.IStandaloneCodeEditor
  worktreeId: string | undefined
  getFilePath: () => string
  languageRef: React.MutableRefObject<string>
  contentRef: React.MutableRefObject<string>
}): { dispose: () => void } {
  const { editorInstance, worktreeId, getFilePath, languageRef, contentRef } = params
  const isMac = navigator.userAgent.includes('Mac')
  let revealRaf: number | null = null
  let revealInnerRaf: number | null = null

  const cancelFrames = (): void => {
    if (revealRaf !== null) {
      cancelAnimationFrame(revealRaf)
      revealRaf = null
    }
    if (revealInnerRaf !== null) {
      cancelAnimationFrame(revealInnerRaf)
      revealInnerRaf = null
    }
  }

  const navigateAtPosition = async (position: {
    lineNumber: number
    column: number
  }): Promise<void> => {
    const model = editorInstance.getModel()
    if (!model) {
      return
    }
    const wordInfo = (
      model as unknown as {
        getWordAtPosition: (p: { lineNumber: number; column: number }) => { word: string } | null
      }
    ).getWordAtPosition(position)
    const word = wordInfo?.word?.trim()
    if (!word) {
      return
    }
    const language = languageRef.current
    const content = contentRef.current ?? model.getValue()
    const filePath = getFilePath()
    const target = await resolveDefinitionTarget({ word, language, content, filePath, worktreeId })
    if (!target) {
      toast.info(`No definition found for "${word}"`)
      return
    }
    if (target.filePath === filePath) {
      const range = new monaco.Range(
        target.line,
        target.column,
        target.line,
        target.column + target.matchLength
      )
      editorInstance.revealRangeInCenter(range)
      editorInstance.setPosition({ lineNumber: target.line, column: target.column })
      return
    }
    if (!worktreeId) {
      toast.info(`No definition found for "${word}"`)
      return
    }
    const state = useAppStore.getState()
    const settings = getRightSidebarWorktreeRuntimeSettings(worktreeId)
    const runtimeEnvironmentId = settings.activeRuntimeEnvironmentId?.trim() || null
    state.openFile(
      {
        filePath: target.filePath,
        relativePath: target.relativePath,
        worktreeId,
        language:
          target.filePath.endsWith('.ts') || target.filePath.endsWith('.tsx')
            ? 'typescript'
            : language,
        mode: 'edit',
        runtimeEnvironmentId
      },
      { suppressActiveRuntimeFallback: runtimeEnvironmentId === null }
    )
    cancelFrames()
    state.setPendingEditorReveal(null)
    revealRaf = requestAnimationFrame(() => {
      revealInnerRaf = requestAnimationFrame(() => {
        useAppStore.getState().setPendingEditorReveal({
          filePath: target.filePath,
          line: target.line,
          column: target.column,
          matchLength: target.matchLength
        })
        cancelFrames()
      })
    })
  }

  const mouseSub = editorInstance.onMouseDown((e) => {
    const browserEvent = e.event.browserEvent as MouseEvent
    const isNavClick = isMac ? browserEvent.metaKey : browserEvent.ctrlKey
    if (!isNavClick) {
      return
    }
    if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
      return
    }
    const position = e.target.position
    if (!position) {
      return
    }
    e.event.preventDefault()
    void navigateAtPosition(position)
  })

  const action = editorInstance.addAction({
    id: 'orca.goToDefinition',
    label: 'Go to Definition',
    keybindings: [monaco.KeyCode.F12],
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1,
    run: async () => {
      const pos = editorInstance.getPosition()
      if (!pos) {
        return
      }
      await navigateAtPosition(pos)
    }
  })

  return {
    dispose: () => {
      cancelFrames()
      mouseSub.dispose()
      action.dispose()
    }
  }
}
