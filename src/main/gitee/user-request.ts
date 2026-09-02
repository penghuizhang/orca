import { authHeaders, type GiteeAuthConfig } from './gitee-auth-config'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

const USER_REQUEST_TIMEOUT_MS = 6000

export type RawGiteeUser = {
  login?: string | null
  name?: string | null
}

// Why: a timeout, DNS failure, 5xx, or unparseable body says nothing about the
// credential. Collapsing those to the same miss as a 401 told users their
// token was invalid when the network was simply unreachable.
export type GiteeUserResult =
  | { ok: true; user: RawGiteeUser }
  | { ok: false; reason: 'rejected' | 'unreachable' }

export function accountNameFromUser(user: RawGiteeUser | null): string | null {
  return user?.login ?? user?.name ?? null
}

// Shared by live env-var status checks and by connect-time verification, so a
// credential is proven against `/user` before it is ever persisted.
export async function fetchGiteeUserResult(
  config: GiteeAuthConfig,
  timeoutMs: number = USER_REQUEST_TIMEOUT_MS
): Promise<GiteeUserResult> {
  let response: Response
  try {
    const base = config.baseUrl.replace(/\/+$/, '')
    response = await fetch(`${base}/user`, {
      headers: {
        Accept: 'application/json',
        ...authHeaders(config)
      },
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
  if (!response.ok) {
    await cancelUnreadResponseBody(response)
    // Only the credential-bearing statuses are the credential's fault; 5xx and
    // the rest are the server or the path in between.
    const rejected = response.status === 401 || response.status === 403
    return { ok: false, reason: rejected ? 'rejected' : 'unreachable' }
  }
  try {
    const user = (await response.json()) as RawGiteeUser
    return { ok: true, user }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}
