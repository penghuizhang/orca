import {
  createRemoteRefProbeCache,
  type RemoteRefLocalGitOptions
} from '../git/remote-ref-probe-cache'

export type GiteeRepoRef = {
  host: string
  owner: string
  repo: string
  apiBaseUrl: string
  webBaseUrl: string
}

// Why: Gitee 只有公有云一个 host（企业仓库也挂在 gitee.com 下），精确匹配即可，
// 不做任意 host 探测，从根上避免把其他平台误判为 Gitee。
const GITEE_HOSTS = new Set(['gitee.com', 'www.gitee.com'])

const repoRefProbeCache = createRemoteRefProbeCache(parseGiteeRepoRef)

/** @internal - exposed for tests only */
export function _resetGiteeRepoRefCache(): void {
  repoRefProbeCache.clear()
}

/** @internal - exposed for tests only */
export function _getGiteeRepoRefCacheSize(): number {
  return repoRefProbeCache.size()
}

function parsePath(pathname: string): { owner: string; repo: string } | null {
  const withoutSuffix = pathname.replace(/\/+$/, '').replace(/\.git$/i, '')
  const parts = withoutSuffix
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length !== 2) {
    return null
  }
  const [owner, repo] = parts
  if (!owner || !repo) {
    return null
  }
  return { owner, repo }
}

function makeRepoRef(host: string, path: string): GiteeRepoRef | null {
  const normalizedHost = host.toLowerCase()
  if (!GITEE_HOSTS.has(normalizedHost)) {
    return null
  }
  const parsed = parsePath(path)
  if (!parsed) {
    return null
  }
  const webBaseUrl = `https://${normalizedHost}`
  return {
    host: normalizedHost,
    owner: parsed.owner,
    repo: parsed.repo,
    apiBaseUrl: `${webBaseUrl}/api/v5`,
    webBaseUrl
  }
}

export function parseGiteeRepoRef(remoteUrl: string): GiteeRepoRef | null {
  const trimmed = remoteUrl.trim()
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    const scpLike = trimmed.match(/^(?:[^@/:]+@)?([^:\s/]+):([^\s]+?)(?:\.git)?$/)
    if (scpLike) {
      return makeRepoRef(scpLike[1] ?? '', scpLike[2] ?? '')
    }
    return null
  }

  try {
    const url = new URL(trimmed)
    const protocol = url.protocol.toLowerCase()
    if (!['http:', 'https:', 'ssh:', 'git+ssh:'].includes(protocol)) {
      return null
    }
    return makeRepoRef(url.hostname, url.pathname)
  } catch {
    return null
  }
}

export async function getGiteeRepoRefForRemote(
  repoPath: string,
  remoteName: string,
  connectionId?: string | null,
  localGitOptions: RemoteRefLocalGitOptions = {}
): Promise<GiteeRepoRef | null> {
  return repoRefProbeCache.get(repoPath, remoteName, connectionId, localGitOptions)
}

export async function getGiteeRepoRef(
  repoPath: string,
  connectionId?: string | null,
  localGitOptions: RemoteRefLocalGitOptions = {}
): Promise<GiteeRepoRef | null> {
  return getGiteeRepoRefForRemote(repoPath, 'origin', connectionId, localGitOptions)
}
