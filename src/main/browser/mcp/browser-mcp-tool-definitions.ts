import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import { type BrowserMcpToolDef, errorResult } from './browser-mcp-tool-shared'
import { READONLY_BROWSER_MCP_TOOLS } from './browser-mcp-readonly-tools'
import { INTERACTIVE_NAVIGATION_TOOLS } from './browser-mcp-interactive-tools'
import { INTERACTIVE_ELEMENT_TOOLS } from './browser-mcp-interactive-element-tools'

// Why: thin adapter over RuntimeBrowserCommands — every tool is a 1:1 mapping, no browser logic here.

const BROWSER_MCP_TOOL_DEFS: BrowserMcpToolDef[] = [
  ...READONLY_BROWSER_MCP_TOOLS,
  ...INTERACTIVE_NAVIGATION_TOOLS,
  ...INTERACTIVE_ELEMENT_TOOLS
]

export const BROWSER_MCP_TOOLS: Tool[] = BROWSER_MCP_TOOL_DEFS.map((def) => def.tool)

export async function callBrowserMcpTool(
  runtime: OrcaRuntimeService,
  name: string,
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const def = BROWSER_MCP_TOOL_DEFS.find((d) => d.tool.name === name)
  if (!def) {
    return errorResult(`Unknown browser tool: ${name}`)
  }
  try {
    return await def.run(runtime, args)
  } catch (error) {
    return errorResult(error instanceof Error ? error.message : String(error))
  }
}
