import { existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  CredentialDecryptionError,
  credentialFileHasContent,
  readStoredCredentialToken,
  writeCredentialFileAtomic,
  writeEncryptedCredential
} from '../integration-credential-file'

// Why: the secret stays encrypted via safeStorage while this metadata stays
// plaintext, so status reads render the connected account without decrypting —
// otherwise every Settings open would trigger an OS keychain prompt.
export type GiteeStoredMetadata = {
  version: 1
  account: string | null
  updatedAt: string
}

export type GiteeStoredSecret = {
  accessToken: string | null
}

export type GiteeCredentialSaveInput = {
  account: string | null
  accessToken: string | null
}

let cachedMetadata: GiteeStoredMetadata | null = null
let metadataLoadedFromDisk = false
let cachedSecret: GiteeStoredSecret | null = null

function getOrcaDir(): string {
  return join(homedir(), '.orca')
}

function getMetadataPath(): string {
  return join(getOrcaDir(), 'gitee-credential.json')
}

function getSecretPath(): string {
  return join(getOrcaDir(), 'gitee-credential.enc')
}

function readMetadata(): GiteeStoredMetadata | null {
  try {
    const raw = readFileSync(getMetadataPath(), 'utf8')
    const parsed = JSON.parse(raw) as GiteeStoredMetadata
    return parsed && parsed.version === 1 ? parsed : null
  } catch {
    return null
  }
}

function readSecret(): GiteeStoredSecret | null {
  let raw: Buffer
  try {
    raw = readFileSync(getSecretPath())
  } catch {
    return null
  }
  const token = readStoredCredentialToken('Gitee', raw)
  return { accessToken: token }
}

export function hasStoredGiteeCredential(): boolean {
  return credentialFileHasContent(getSecretPath())
}

export function getStoredGiteeMetadata(): GiteeStoredMetadata | null {
  if (!metadataLoadedFromDisk) {
    cachedMetadata = readMetadata()
    metadataLoadedFromDisk = true
  }
  return cachedMetadata
}

// Why: the envelope is decrypted lazily and only on a real API call, never on
// a status read. `force` bypasses the in-memory cache after a fresh save.
export function loadStoredGiteeSecret(options: { force?: boolean } = {}): GiteeStoredSecret | null {
  if (options.force || cachedSecret === null) {
    cachedSecret = readSecret()
  }
  return cachedSecret
}

export function saveGiteeCredential(input: GiteeCredentialSaveInput): void {
  mkdirSync(getOrcaDir(), { recursive: true })
  const updatedAt = new Date().toISOString()
  writeCredentialFileAtomic(
    getMetadataPath(),
    Buffer.from(
      JSON.stringify({
        version: 1,
        account: input.account,
        updatedAt
      } satisfies GiteeStoredMetadata),
      'utf-8'
    )
  )
  if (input.accessToken) {
    writeEncryptedCredential('Gitee', getSecretPath(), input.accessToken)
  }
  cachedMetadata = { version: 1, account: input.account, updatedAt }
  metadataLoadedFromDisk = true
  cachedSecret = { accessToken: input.accessToken }
}

export function clearStoredGiteeCredential(): void {
  try {
    unlinkSync(getMetadataPath())
  } catch {
    // Nothing to clean up.
  }
  try {
    unlinkSync(getSecretPath())
  } catch {
    // Nothing to clean up.
  }
  cachedMetadata = null
  metadataLoadedFromDisk = false
  cachedSecret = null
}

/** @internal - exposed for tests only */
export function _giteeCredentialPaths(): { metadataPath: string; secretPath: string } {
  return { metadataPath: getMetadataPath(), secretPath: getSecretPath() }
}

export function _giteeCredentialFileExists(): boolean {
  return existsSync(getMetadataPath()) || existsSync(getSecretPath())
}

export function _giteeCredentialDecryptionError(): CredentialDecryptionError {
  return new CredentialDecryptionError('Gitee')
}
