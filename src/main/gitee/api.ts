import { authHeaders, type GiteeAuthConfig } from './gitee-auth-config'
import { cancelUnreadResponseBody } from '../lib/unread-response-body'

const API_REQUEST_TIMEOUT_MS = 8000

// Why: Gitee errors collapse to the same shape as the user-request probe so
// callers can distinguish a dead credential from a dead network.
export type GiteeApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'rejected' | 'unreachable' }

export async function requestGiteeJson<T>(
  config: GiteeAuthConfig,
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  timeoutMs: number = API_REQUEST_TIMEOUT_MS
): Promise<GiteeApiResult<T>> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      query.set(key, String(value))
    }
  }
  const queryString = query.toString()
  const base = config.baseUrl.replace(/\/+$/, '')
  const url = `${base}${path}${queryString ? `?${queryString}` : ''}`
  let response: Response
  try {
    response = await fetch(url, {
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
    const rejected = response.status === 401 || response.status === 403
    return { ok: false, reason: rejected ? 'rejected' : 'unreachable' }
  }
  try {
    return { ok: true, data: (await response.json()) as T }
  } catch {
    return { ok: false, reason: 'unreachable' }
  }
}
