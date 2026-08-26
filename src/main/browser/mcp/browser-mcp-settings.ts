import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getSecretStore } from '../../../shared/secret-store'

// Why: the MCP bearer token is a localhost-only defense-in-depth secret; we seal it with the host SecretStore when available.

type StoredToken = { ciphertext?: string; plaintext?: string }

export async function loadOrCreateBrowserMcpToken(userData: string): Promise<string> {
  const dir = join(userData, 'browser-mcp')
  const file = join(dir, 'token.json')

  try {
    if (existsSync(file)) {
      const raw = JSON.parse(readFileSync(file, 'utf8')) as StoredToken
      const store = getSecretStore()
      if (raw.ciphertext && store.isEncryptionAvailable()) {
        return store.decryptString(Buffer.from(raw.ciphertext, 'base64'))
      }
      if (raw.plaintext) {
        return raw.plaintext
      }
    }
  } catch {
    // fall through to (re)create
  }

  const token = randomUUID()
  try {
    const store = getSecretStore()
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    if (store.isEncryptionAvailable()) {
      writeFileSync(
        file,
        JSON.stringify({ ciphertext: store.encryptString(token).toString('base64') })
      )
    } else {
      writeFileSync(file, JSON.stringify({ plaintext: token }))
    }
  } catch {
    // token lives in memory only for this session
  }
  return token
}
