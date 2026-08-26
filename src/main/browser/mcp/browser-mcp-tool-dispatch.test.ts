import { describe, expect, it, vi } from 'vitest'
import { BROWSER_MCP_TOOLS, callBrowserMcpTool } from './browser-mcp-tool-definitions'
import type { OrcaRuntimeService } from '../../runtime/orca-runtime'

function makeRuntime(): OrcaRuntimeService {
  return {
    browserTabList: vi.fn().mockResolvedValue({ tabs: [] }),
    browserTabCurrent: vi.fn().mockResolvedValue({ tab: { browserPageId: 'p1' } }),
    browserSnapshot: vi.fn().mockResolvedValue({ refs: [] }),
    browserScreenshot: vi.fn().mockResolvedValue({ data: 'aGVsbG8=', format: 'png' }),
    browserEval: vi.fn().mockResolvedValue({ result: 42 }),
    browserGoto: vi.fn().mockResolvedValue({ url: 'https://x.test' }),
    browserClick: vi.fn().mockResolvedValue({ ok: true }),
    browserFill: vi.fn().mockResolvedValue({ ok: true }),
    browserType: vi.fn().mockResolvedValue({ ok: true }),
    browserSelect: vi.fn().mockResolvedValue({ ok: true }),
    browserHover: vi.fn().mockResolvedValue({ ok: true }),
    browserScroll: vi.fn().mockResolvedValue({ ok: true }),
    browserWait: vi.fn().mockResolvedValue({ ok: true }),
    browserBack: vi.fn().mockResolvedValue({ ok: true }),
    browserReload: vi.fn().mockResolvedValue({ ok: true }),
    browserForward: vi.fn().mockResolvedValue({ ok: true }),
    browserDblclick: vi.fn().mockResolvedValue({ ok: true }),
    browserKeypress: vi.fn().mockResolvedValue({ ok: true }),
    browserClear: vi.fn().mockResolvedValue({ ok: true }),
    browserSelectAll: vi.fn().mockResolvedValue({ ok: true }),
    browserCheck: vi.fn().mockResolvedValue({ ok: true }),
    browserFocus: vi.fn().mockResolvedValue({ ok: true })
  } as unknown as OrcaRuntimeService
}

function textOf(result: { content: { type: string; text?: string; data?: string }[] }): string {
  return result.content.map((c) => c.text ?? c.data ?? '').join('')
}

describe('browser MCP tool catalog', () => {
  it('exposes the expected read-only and interactive tools', () => {
    const names = BROWSER_MCP_TOOLS.map((t) => t.name)
    expect(names).toContain('browser_tab_list')
    expect(names).toContain('browser_snapshot')
    expect(names).toContain('browser_screenshot')
    expect(names).toContain('browser_evaluate')
    expect(names).toContain('browser_click')
    expect(names).toContain('browser_fill')
    expect(names).toContain('browser_navigate')
    expect(names).toContain('browser_check')
  })
})

describe('callBrowserMcpTool dispatch', () => {
  it('routes browser_snapshot to the runtime with target params', async () => {
    const runtime = makeRuntime()
    await callBrowserMcpTool(runtime, 'browser_snapshot', { page: 'p9', worktree: 'w1' })
    expect(runtime.browserSnapshot).toHaveBeenCalledWith({ worktree: 'w1', page: 'p9' })
  })

  it('returns an image content block for screenshots', async () => {
    const runtime = makeRuntime()
    const result = await callBrowserMcpTool(runtime, 'browser_screenshot', { page: 'p9' })
    expect(result.content[0]?.type).toBe('image')
    expect(textOf(result as never)).toBe('aGVsbG8=')
  })

  it('routes interactive tools with their required args', async () => {
    const runtime = makeRuntime()
    await callBrowserMcpTool(runtime, 'browser_fill', { page: 'p9', element: '@e3', value: 'hi' })
    expect(runtime.browserFill).toHaveBeenCalledWith({
      element: '@e3',
      value: 'hi',
      worktree: undefined,
      page: 'p9'
    })
  })

  it('returns an error result for unknown tools', async () => {
    const runtime = makeRuntime()
    const result = await callBrowserMcpTool(runtime, 'browser_no_such', {})
    expect(result.isError).toBe(true)
  })

  it('returns an error result when the runtime throws', async () => {
    const runtime = makeRuntime()
    ;(runtime.browserSnapshot as unknown as vi.Mock).mockRejectedValueOnce(new Error('boom'))
    const result = await callBrowserMcpTool(runtime, 'browser_snapshot', {})
    expect(result.isError).toBe(true)
    expect(textOf(result as never)).toContain('boom')
  })
})
