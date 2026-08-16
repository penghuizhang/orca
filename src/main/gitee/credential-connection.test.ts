import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import type * as Os from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const OLD_ENV = process.env
const OLD_FETCH = globalThis.fetch
let tempHome = ''

async function loadModule() {
  vi.resetModules()
  vi.doMock('electron', () => ({
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: (value: string) => Buffer.from(value),
      decryptString: (value: Buffer) => value.toString('utf-8')
    }
  }))
  vi.doMock('node:os', async () => {
    const actual = await vi.importActual<typeof Os>('node:os')
    return { ...actual, homedir: () => tempHome }
  })
  return import('./credential-connection')
}

beforeEach(() => {
  process.env = { ...OLD_ENV }
  for (const key of ['ORCA_GITEE_ACCESS_TOKEN', 'ORCA_GITEE_API_BASE_URL']) {
    delete process.env[key]
  }
  tempHome = mkdtempSync(join(tmpdir(), 'orca-gitee-conn-'))
})

afterEach(() => {
  process.env = OLD_ENV
  globalThis.fetch = OLD_FETCH
})

describe('Gitee credential connection', () => {
  it('verifies the token against /user before saving and reports a stored connection', async () => {
    const conn = await loadModule()
    globalThis.fetch = vi.fn(async () =>
      Response.json({ login: 'ada', name: 'Ada Lovelace' })
    ) as unknown as typeof fetch

    const result = await conn.connectGitee({ accessToken: 'pat-123' })
    expect(result).toEqual({ ok: true, account: 'ada' })
    expect(conn.getGiteeConnectionStatus()).toEqual({
      configured: true,
      source: 'stored',
      account: 'ada'
    })
    expect(conn._giteeStoredSecretToken()).toBe('pat-123')
  })

  it('rejects a token Gitee denies and does not persist it', async () => {
    const conn = await loadModule()
    globalThis.fetch = vi.fn(
      async () =>
        new Response('{"message":"401 Unauthorized"}', {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
    ) as unknown as typeof fetch

    const result = await conn.connectGitee({ accessToken: 'bad-token' })
    expect(result.ok).toBe(false)
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('Gitee rejected this token') as string
    })
    expect(conn.getGiteeConnectionStatus()).toEqual({
      configured: false,
      source: 'none',
      account: null
    })
  })

  it('distinguishes an unreachable network from a rejected token', async () => {
    const conn = await loadModule()
    globalThis.fetch = vi.fn(async () => {
      throw new TypeError('fetch failed')
    }) as unknown as typeof fetch

    const result = await conn.connectGitee({ accessToken: 'pat-123' })
    expect(result).toEqual({
      ok: false,
      error: expect.stringContaining('Could not reach Gitee') as string
    })
  })

  it('prefers environment credentials and never decrypts for a status read', async () => {
    process.env.ORCA_GITEE_ACCESS_TOKEN = 'env-pat'
    const conn = await loadModule()
    expect(conn.getGiteeConnectionStatus()).toEqual({
      configured: true,
      source: 'environment',
      account: null
    })
  })

  it('disconnect clears the stored credential', async () => {
    const conn = await loadModule()
    globalThis.fetch = vi.fn(async () => Response.json({ login: 'ada' })) as unknown as typeof fetch

    await conn.connectGitee({ accessToken: 'pat-123' })
    conn.disconnectGitee()
    expect(conn.getGiteeConnectionStatus()).toEqual({
      configured: false,
      source: 'none',
      account: null
    })
  })

  it('rejects an empty token without calling the network', async () => {
    const conn = await loadModule()
    const fetchMock = vi.fn() as unknown as typeof fetch
    globalThis.fetch = fetchMock

    const result = await conn.connectGitee({ accessToken: '   ' })
    expect(result).toEqual({ ok: false, error: 'Enter a Gitee access token.' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
