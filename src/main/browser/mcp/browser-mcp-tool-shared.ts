import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'

// Why: shared building blocks for the browser-automation MCP tools. Keep this file free of tool lists so it stays small.

export type ToolArgs = Record<string, unknown>

export type BrowserMcpToolDef = {
  tool: Tool
  run: (runtime: OrcaRuntimeService, args: ToolArgs) => Promise<CallToolResult>
}

export function textResult(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: 'text',
        text: typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      }
    ]
  }
}

export function imageResult(data: string, mimeType: string): CallToolResult {
  return { content: [{ type: 'image', data, mimeType }] }
}

export function errorResult(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

export function target(args: ToolArgs): { worktree?: string; page?: string } {
  return {
    worktree: typeof args.worktree === 'string' ? args.worktree : undefined,
    page: typeof args.page === 'string' ? args.page : undefined
  }
}

export function str(args: ToolArgs, key: string): string {
  const v = args[key]
  if (typeof v !== 'string') {
    throw new Error(`Missing required string argument: ${key}`)
  }
  return v
}

export const targetProps = {
  worktree: {
    type: 'string',
    description:
      'Worktree selector (id, name, or "id:<id>"). Optional — defaults to the active worktree.'
  },
  page: {
    type: 'string',
    description:
      'Browser page id from browser_tab_list. Optional — defaults to the active browser tab.'
  }
} as const
