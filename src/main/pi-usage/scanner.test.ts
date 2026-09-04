import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scanPiUsageSessions } from './scanner'

const WORKTREE_PATH = '/repo/worktree-a'

const worktrees = [
  {
    repoId: 'repo-1',
    worktreeId: 'wt-1',
    path: WORKTREE_PATH,
    displayName: 'worktree-a'
  }
]

let sessionsDir: string

function writeSessionFile(name: string, lines: unknown[]): void {
  writeFileSync(
    join(sessionsDir, 'project-slug', name),
    `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
    'utf-8'
  )
}

function assistantLine(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'message',
    message: {
      role: 'assistant',
      provider: 'opencode-go',
      model: 'omen-alpha',
      usage: {
        input: 100,
        output: 50,
        cacheRead: 200,
        cacheWrite: 10,
        reasoning: 5,
        totalTokens: 365,
        cost: { input: 0.01, output: 0.02, cacheRead: 0.001, cacheWrite: 0, total: 0.031 }
      },
      timestamp: Date.UTC(2026, 8, 4, 12, 0, 0),
      ...overrides
    }
  }
}

beforeEach(() => {
  sessionsDir = mkdtempSync(join(tmpdir(), 'orca-pi-usage-'))
  mkdirSync(join(sessionsDir, 'project-slug'), { recursive: true })
  process.env.PI_SESSIONS_DIR = sessionsDir
})

afterEach(() => {
  delete process.env.PI_SESSIONS_DIR
  rmSync(sessionsDir, { recursive: true, force: true })
})

describe('scanPiUsageSessions', () => {
  it('parses session logs into sessions and daily aggregates with project attribution', async () => {
    writeSessionFile('sess-a.jsonl', [
      { type: 'session', id: 'sess-a', cwd: WORKTREE_PATH, timestamp: '2026-09-04T11:00:00.000Z' },
      { type: 'message', message: { role: 'user', content: 'hi' } },
      assistantLine(),
      assistantLine({ timestamp: Date.UTC(2026, 8, 4, 13, 0, 0) }),
      'not json',
      { type: 'compaction' }
    ])

    const result = await scanPiUsageSessions(worktrees, [])

    expect(result.sessions).toHaveLength(1)
    const session = result.sessions[0]
    expect(session).toMatchObject({
      sessionId: 'sess-a',
      cwd: WORKTREE_PATH,
      projectLabel: 'worktree-a',
      totalEvents: 2,
      inputTokens: 200,
      outputTokens: 100,
      reasoningTokens: 10,
      cacheReadTokens: 400,
      cacheWriteTokens: 20,
      costUsd: expect.closeTo(0.062, 5),
      models: ['omen-alpha'],
      providers: ['opencode-go']
    })

    expect(result.dailyAggregates).toEqual([
      {
        day: '2026-09-04',
        inputTokens: 200,
        outputTokens: 100,
        reasoningTokens: 10,
        cacheReadTokens: 400,
        cacheWriteTokens: 20,
        totalTokens: 310
      }
    ])
    expect(result.processedFiles).toHaveLength(1)
  })

  it('falls back to cwd basename outside known worktrees and drops files without usage', async () => {
    writeSessionFile('sess-b.jsonl', [
      { type: 'session', id: 'sess-b', cwd: '/elsewhere/project-x' },
      assistantLine()
    ])
    writeSessionFile('empty.jsonl', [{ type: 'session', id: 'empty', cwd: '/elsewhere/project-x' }])

    const result = await scanPiUsageSessions(worktrees, [])

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0]).toMatchObject({
      sessionId: 'sess-b',
      projectLabel: 'project-x'
    })
  })

  it('returns empty results when the sessions directory is missing', async () => {
    process.env.PI_SESSIONS_DIR = join(sessionsDir, 'does-not-exist')
    const result = await scanPiUsageSessions(worktrees, [])
    expect(result).toEqual({ processedFiles: [], sessions: [], dailyAggregates: [] })
  })
})
