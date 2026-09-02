import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import {
  type BrowserMcpToolDef,
  type ToolArgs,
  textResult,
  target,
  str,
  targetProps
} from './browser-mcp-tool-shared'

// Why: navigation/interaction tools — mirror RuntimeBrowserCommands 1:1; no new browser logic.

export const INTERACTIVE_NAVIGATION_TOOLS: BrowserMcpToolDef[] = [
  {
    tool: {
      name: 'browser_navigate',
      description: 'Navigate the browser tab to a URL.',
      inputSchema: {
        type: 'object',
        properties: { ...targetProps, url: { type: 'string', description: 'Destination URL.' } },
        required: ['url']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserGoto({ url: str(args, 'url'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_click',
      description: 'Click an element by ref (from browser_snapshot), CSS selector, or text.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: {
            type: 'string',
            description: 'Element ref (e.g. "@e12"), selector, or text to click.'
          }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserClick({ element: str(args, 'element'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_fill',
      description: 'Clear an input and fill it with a value.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Target element ref/selector.' },
          value: { type: 'string', description: 'Value to set.' }
        },
        required: ['element', 'value']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserFill({
        element: str(args, 'element'),
        value: str(args, 'value'),
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_type',
      description: 'Type text into the focused element or a target element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          input: { type: 'string', description: 'Text to type.' }
        },
        required: ['input']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserType({ input: str(args, 'input'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_select',
      description: 'Select an option in a dropdown by value.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Select element ref/selector.' },
          value: { type: 'string', description: 'Option value to select.' }
        },
        required: ['element', 'value']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserSelect({
        element: str(args, 'element'),
        value: str(args, 'value'),
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_hover',
      description: 'Hover over an element.',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          element: { type: 'string', description: 'Element ref/selector to hover.' }
        },
        required: ['element']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserHover({ element: str(args, 'element'), ...target(args) })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_scroll',
      description: 'Scroll the page up or down by an optional amount (pixels).',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction.' },
          amount: { type: 'number', description: 'Pixels to scroll. Optional.' }
        },
        required: ['direction']
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserScroll({
        direction: str(args, 'direction') as 'up' | 'down',
        amount: typeof args.amount === 'number' ? args.amount : undefined,
        ...target(args)
      })
      return textResult(result)
    }
  },
  {
    tool: {
      name: 'browser_wait',
      description: 'Wait for a condition (selector, text, url, load state, or a predicate).',
      inputSchema: {
        type: 'object',
        properties: {
          ...targetProps,
          selector: { type: 'string', description: 'Wait for an element selector.' },
          text: { type: 'string', description: 'Wait for text to appear.' },
          url: { type: 'string', description: 'Wait for the URL to match.' },
          load: {
            type: 'string',
            description: 'Wait for load state (e.g. "load", "networkidle").'
          },
          timeout: { type: 'number', description: 'Timeout in ms.' }
        }
      }
    },
    run: async (runtime: OrcaRuntimeService, args: ToolArgs) => {
      const result = await runtime.browserWait({
        selector: typeof args.selector === 'string' ? args.selector : undefined,
        text: typeof args.text === 'string' ? args.text : undefined,
        url: typeof args.url === 'string' ? args.url : undefined,
        load: typeof args.load === 'string' ? args.load : undefined,
        timeout: typeof args.timeout === 'number' ? args.timeout : undefined,
        ...target(args)
      })
      return textResult(result)
    }
  }
]
