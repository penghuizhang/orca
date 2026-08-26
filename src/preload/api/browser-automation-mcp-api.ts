// Why: typed surface for the localhost browser-automation MCP bridge status, surfaced to the Settings UI.

export type BrowserAutomationMcpStatus = {
  enabled: boolean
  /** MCP endpoint URL (http://127.0.0.1:<port>/mcp) when running, otherwise null. */
  url: string | null
  /** Bearer token for the MCP endpoint when running, otherwise null. */
  token: string | null
}

export type BrowserAutomationMcpApi = {
  getStatus: () => Promise<BrowserAutomationMcpStatus>
}
