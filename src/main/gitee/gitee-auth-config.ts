export const GITEE_API_BASE_URL = 'https://gitee.com/api/v5'

export type GiteeAuthConfig = {
  baseUrl: string
  accessToken: string | null
}

export function envValue(name: string): string | null {
  const value = process.env[name]?.trim() ?? ''
  return value.length > 0 ? value : null
}

export function getEnvAuthConfig(): GiteeAuthConfig {
  return {
    baseUrl: envValue('ORCA_GITEE_API_BASE_URL') ?? GITEE_API_BASE_URL,
    accessToken: envValue('ORCA_GITEE_ACCESS_TOKEN')
  }
}

export function hasAuth(config: GiteeAuthConfig): boolean {
  return Boolean(config.accessToken)
}

// Why: Gitee v5 accepts the PAT as `Authorization: token <token>` or as the
// `?access_token=` query param; the header keeps the secret out of URLs.
export function authHeaders(config: GiteeAuthConfig): Record<string, string> {
  if (!config.accessToken) {
    return {}
  }
  return { Authorization: `token ${config.accessToken}` }
}
