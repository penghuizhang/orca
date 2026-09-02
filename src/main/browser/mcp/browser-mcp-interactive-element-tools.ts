import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import {
  type BrowserMcpToolDef,
  type ToolArgs,
  textResult,
  target,
  str,
  targetProps
} from './browser-mcp-tool-shared'

// Why: history + element-level interaction tools — mirror RuntimeBrowserCommands 1:1.

export const INTERACTIVE_ELEMENT_TOOLS: BrowserMcpToolDef[] = [
  {
    tool: {
      name: 'browser_back',
      description: 'Navigate back in the tab history.',
      inputSchema: { type: 'object', properties: targetProps }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserBack(target(args))
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_reload',
      description: 'Reload the browser tab.',
      inputSchema: { type: 'object', properties: targetProps }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserReload(target(args))
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_forward',
      description: 'Navigate forward in the tab history.',
      inputSchema: { type: 'object', properties: targetProps }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserForward(target(args))
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_dblclick',
      description: 'Double-click an element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector to double-click.' }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserDblclick({
        element: str(args, 'element'),
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_keypress',
      description: 'Send a key press (e.g. "Enter", "Escape").',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          key: { type: 'string', description: 'Key to press.' }
        },
        required: ['key']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserKeypress({ key: str(args, 'key'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_clear',
      description: 'Clear the value of an input element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector to clear.' }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserClear({ element: str(args, 'element'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_select_all',
      description: 'Select all text in an element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector.' }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserSelectAll({
        element: str(args, 'element'),
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_check',
      description: 'Check or uncheck a checkbox/radio element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector.' },
          checked: { type: 'boolean', description: 'True to check, false to uncheck.' }
        },
        required: ['element', 'checked']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserCheck({
        element: str(args, 'element'),
        checked: args.checked === true,
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_focus',
      description: 'Focus an element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector to focus.' }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserFocus({ element: str(args, 'element'), ...target(args) })
      return textResult(result)
    }
  }
]
