import { getEnvAuthConfig, hasAuth, type GiteeAuthConfig } from './gitee-auth-config'
import { loadStoredGiteeSecret } from './credential-store'

// Env vars win over in-app credentials so existing headless/SSH setups keep
// working unchanged. The stored secret is decrypted lazily and only here, on a
// real API call — never on a status read.
export function resolveGiteeAuthConfig(): GiteeAuthConfig {
  const env = getEnvAuthConfig()
  if (hasAuth(env)) {
    return env
  }
  try {
    const secret = loadStoredGiteeSecret({ force: true })
    return secret?.accessToken ? { baseUrl: env.baseUrl, accessToken: secret.accessToken } : env
  } catch {
    // Decryption denied or unavailable: fall through as unauthenticated.
    return env
  }
}
