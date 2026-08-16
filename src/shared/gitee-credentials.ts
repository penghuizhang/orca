// Where the active credential comes from. Drives whether the UI offers
// Disconnect, which is only meaningful for in-app `stored` credentials.
export type GiteeCredentialSource = 'environment' | 'stored' | 'none'

export type GiteeConnectArgs = {
  accessToken: string
}

// Deliberately excludes the secret: it never crosses the IPC boundary back to
// the renderer.
export type GiteeConnectionStatus = {
  configured: boolean
  source: GiteeCredentialSource
  account: string | null
}

export type GiteeConnectResult = { ok: true; account: string | null } | { ok: false; error: string }
