import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import {
  type BrowserMcpToolDef,
  type ToolArgs,
  textResult,
  imageResult,
  target,
  str,
  targetProps
} from './browser-mcp-tool-shared'

// Why: read-only tools — safe to expose first so an agent can perceive the page before acting on it.

export const READONLY_BROWSER_MCP_TOOLS: BrowserMcpToolDef[] = [
  {
    tool: {
      name: 'browser_tab_list',
      description: 'List open browser tabs (worktree id, page id, url, title, active flag).',
      inputSchema: {
        type: 'object',
        properties: {
          worktree: { type: 'string', description: 'Restrict to a worktree. Optional.' }
        }
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserTabList({
        worktree: typeof args.worktree === 'string' ? args.worktree : undefined
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_tab_current',
      description: 'Return the currently active browser tab (page id, url, title).',
      inputSchema: {
        type: 'object',
        properties: {
          worktree: { type: 'string', description: 'Worktree selector. Optional.' }
        }
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserTabCurrent({
        worktree: typeof args.worktree === 'string' ? args.worktree : undefined
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_snapshot',
      description:
        'Capture an accessibility/DOM snapshot of the page with clickable element refs. Use the returned refs with browser_click/browser_fill.',
      inputSchema: { type: 'object', properties: targetProps }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserSnapshot(target(args))
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_screenshot',
      description: 'Screenshot the browser tab. Returns an image.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          format: {
            type: 'string',
            enum: ['png', 'jpeg'],
            description: 'Image format. Default png.'
          }
        }
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserScreenshot({
        format: typeof args.format === 'string' ? (args.format as 'png' | 'jpeg') : undefined,
        ...target(args)
      })
      return imageResult(result.data, result.format === 'jpeg' ? 'image/jpeg' : 'image/png')
    }
  },
  {
    tool: {
      name: 'browser_evaluate',
      description: 'Execute a JavaScript expression in the page context and return the result.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          expression: { type: 'string', description: 'JavaScript expression to evaluate.' }
        },
        required: ['expression']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserEval({
        expression: str(args, 'expression'),
        ...target(args)
      })
      return textResult(result)
    }
  }
]
