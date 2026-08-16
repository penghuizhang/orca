import { getEnvAuthConfig, hasAuth, type GiteeAuthConfig } from './gitee-auth-config'
import { accountNameFromUser, fetchGiteeUserResult } from './user-request'
import {
  clearStoredGiteeCredential,
  getStoredGiteeMetadata,
  hasStoredGiteeCredential,
  loadStoredGiteeSecret,
  saveGiteeCredential
} from './credential-store'
import type {
  GiteeConnectArgs,
  GiteeConnectResult,
  GiteeConnectionStatus
} from '../../shared/gitee-credentials'

export type { GiteeConnectArgs, GiteeConnectResult, GiteeConnectionStatus }

const VERIFY_TIMEOUT_MS = 6000

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function buildCandidateConfig(input: GiteeConnectArgs): GiteeAuthConfig {
  return {
    baseUrl: getEnvAuthConfig().baseUrl,
    accessToken: normalize(input.accessToken)
  }
}

// Verifying against `/user` before persisting keeps the stored "connected
// account" honest and lets the dialog reject a dead token inline.
export async function connectGitee(input: GiteeConnectArgs): Promise<GiteeConnectResult> {
  const config = buildCandidateConfig(input)
  if (!hasAuth(config)) {
    return { ok: false, error: 'Enter a Gitee access token.' }
  }
  const result = await fetchGiteeUserResult(config, VERIFY_TIMEOUT_MS)
  if (!result.ok) {
    return {
      ok: false,
      // Why: telling someone their token is invalid when the network is down
      // sends them to regenerate a credential that was fine.
      error:
        result.reason === 'rejected'
          ? 'Gitee rejected this token. Check it in Gitee → Settings → Private Tokens, then try again.'
          : 'Could not reach Gitee. Check your connection, then try again.'
    }
  }
  const account = accountNameFromUser(result.user)
  saveGiteeCredential({
    account,
    accessToken: config.accessToken
  })
  return { ok: true, account }
}

export function disconnectGitee(): void {
  clearStoredGiteeCredential()
}

// Reads env vars and plaintext metadata only — never decrypts — so the Settings
// card can call it on every open without a keychain prompt.
export function getGiteeConnectionStatus(): GiteeConnectionStatus {
  const env = getEnvAuthConfig()
  if (hasAuth(env)) {
    return { configured: true, source: 'environment', account: null }
  }
  if (!hasStoredGiteeCredential()) {
    return { configured: false, source: 'none', account: null }
  }
  return {
    configured: true,
    source: 'stored',
    account: getStoredGiteeMetadata()?.account ?? null
  }
}

/** @internal - exposed for tests only */
export function _giteeStoredSecretToken(): string | null {
  return loadStoredGiteeSecret({ force: true })?.accessToken ?? null
}

export type GiteeAuthStatus = {
  configured: boolean
  authenticated: boolean
  account: string | null
  tokenConfigured: boolean
}

// Preflight is a config probe, not a live verification: a configured token is
// reported authenticated and the card's Re-check performs the real /user call.
export function getGiteeAuthStatus(): GiteeAuthStatus {
  const env = getEnvAuthConfig()
  if (hasAuth(env)) {
    return { configured: true, authenticated: true, account: null, tokenConfigured: true }
  }
  const tokenConfigured = hasStoredGiteeCredential()
  return {
    configured: tokenConfigured,
    authenticated: tokenConfigured,
    account: getStoredGiteeMetadata()?.account ?? null,
    tokenConfigured
  }
}
