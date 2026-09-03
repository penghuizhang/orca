import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export function createLocalBuildVersion(baseVersion, timestamp, commit) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(baseVersion)) {
    throw new Error(`Package version is not valid semver: ${baseVersion}`)
  }
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) {
    throw new Error('Local build timestamp is invalid.')
  }
  const sanitizedCommit = commit.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12)
  if (!sanitizedCommit) {
    throw new Error('Git commit identity is empty.')
  }
  const suffix = `local.${timestamp}.${sanitizedCommit}`
  return baseVersion.includes('-') ? `${baseVersion}.${suffix}` : `${baseVersion}-${suffix}`
}

function parseVersionCore(version) {
  const [core, ...prerelease] = version.split('-')
  return { numbers: core.split('.').map(Number), prerelease: prerelease.join('-') }
}

function compareReleaseVersions(left, right) {
  const parsedLeft = parseVersionCore(left)
  const parsedRight = parseVersionCore(right)
  for (let index = 0; index < 3; index += 1) {
    if (parsedLeft.numbers[index] !== parsedRight.numbers[index]) {
      return parsedLeft.numbers[index] - parsedRight.numbers[index]
    }
  }
  if (parsedLeft.prerelease === parsedRight.prerelease) {
    return 0
  }
  if (!parsedLeft.prerelease) {
    return 1
  }
  if (!parsedRight.prerelease) {
    return -1
  }
  return parsedLeft.prerelease < parsedRight.prerelease ? -1 : 1
}

/**
 * Why: mainline package.json lags the release-cut tags (e.g. source says
 * 1.4.178-rc.2 while the pulled code is past the v1.4.196 cut), so a plain
 * package.json base leaves packaged builds visibly stuck. Prefer the newest
 * final release tag; fall back to package.json when tags are absent.
 */
export function resolveVersionBase(packageVersion, listTags) {
  let base = packageVersion
  let tags
  try {
    tags =
      listTags ??
      execFileSync('git', ['tag', '--list', 'v[0-9]*.[0-9]*.[0-9]*'], {
        encoding: 'utf8'
      }).split('\n')
  } catch {
    return base
  }
  for (const tag of tags) {
    const candidate = tag.trim().replace(/^v/, '')
    if (!/^\d+\.\d+\.\d+$/.test(candidate)) {
      continue
    }
    if (compareReleaseVersions(candidate, base) > 0) {
      base = candidate
    }
  }
  return base
}

export function getLocalBuildIdentity() {
  const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  const commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    encoding: 'utf8'
  }).trim()
  return {
    commit,
    version: createLocalBuildVersion(resolveVersionBase(packageJson.version), Date.now(), commit)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const identity = getLocalBuildIdentity()
  console.log(`[build:mac] local update version ${identity.version}`)
  execFileSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'electron-builder', '--config', 'config/electron-builder.config.cjs', '--mac'],
    {
      env: {
        ...process.env,
        ORCA_BUILD_COMMIT: identity.commit,
        ORCA_LOCAL_BUILD_VERSION: identity.version
      },
      stdio: 'inherit'
    }
  )
}
