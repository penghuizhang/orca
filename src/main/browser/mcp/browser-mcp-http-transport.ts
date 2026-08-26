import { createServer, type Server as HttpServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { Server } from '@modelcontextprotocol/sdk/server'
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'
import { BROWSER_MCP_TOOLS, callBrowserMcpTool } from './browser-mcp-tool-definitions'

// Why: the MCP endpoint is a localhost-only automation bridge; it must never bind a public interface.

export type RunningMcpServer = {
  port: number
  close: () => Promise<void>
}

export async function startMcpHttpServer(opts: {
  port: number
  token: string
  runtime: OrcaRuntimeService
}): Promise<RunningMcpServer> {
  const server = new Server(
    { name: 'orca-browser-automation', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: BROWSER_MCP_TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    return callBrowserMcpTool(opts.runtime, name, (args ?? {}) as Record<string, unknown>)
  })

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => randomUUID() })
  await server.connect(transport)

  const httpServer: HttpServer = createServer((req, res) => {
    const authHeader = req.headers['authorization']
    if (authHeader !== `Bearer ${opts.token}`) {
      res.writeHead(401, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'unauthorized' }))
      return
    }
    if (req.url !== '/mcp') {
      res.writeHead(404)
      res.end()
      return
    }
    void transport.handleRequest(req, res)
  })

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject)
    httpServer.listen(opts.port, '127.0.0.1', () => resolve())
  })

  const address = httpServer.address()
  const boundPort = typeof address === 'object' && address ? address.port : opts.port

  return {
    port: boundPort,
    close: async () => {
      await server.close()
      await transport.close()
      await new Promise<void>((resolve) => httpServer.close(() => resolve()))
    }
  }
}
