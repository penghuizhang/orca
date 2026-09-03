#!/usr/bin/env node
// One-shot orca-s build: runs the full packaging pipeline and reports artifacts.
//   node config/scripts/build-orca-s.mjs            — build arm64 (default)
//   node config/scripts/build-orca-s.mjs --x64      — build the Intel slice instead
//   node config/scripts/build-orca-s.mjs --install  — build, then install to
//     /Applications, clear the quarantine attribute and launch the app
//   node config/scripts/build-orca-s.mjs --dry-run  — print what would run
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

import { getLocalBuildIdentity } from './build-mac-local.mjs'

const repoRoot = resolve(import.meta.dirname, '..', '..')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const install = args.has('--install')
const archFlag = args.has('--x64') ? '--x64' : '--arm64'
const archName = archFlag === '--x64' ? 'x64' : 'arm64'

// Why: this machine's nvm default points at a missing Node; pnpm build:mac
// needs Node 24 (engines floor). Inject the known-good bin dir explicitly.
const nvmNodeBin = `${homedir()}/.nvm/versions/node/v24.19.0/bin`
const env = { ...process.env, PATH: `${nvmNodeBin}:${process.env.PATH ?? ''}` }
// Why: github release downloads time out on this network; npmmirror (Alibaba)
// is the domestic mirror for electron + electron-builder binaries. Overridable.
if (!process.env.ELECTRON_MIRROR) {
  env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
}
if (!process.env.ELECTRON_BUILDER_BINARIES_MIRROR) {
  env.ELECTRON_BUILDER_BINARIES_MIRROR = 'https://npmmirror.com/mirrors/electron-builder-binaries/'
}

function run(command, argv, options = {}) {
  if (dryRun) {
    console.log(`[orca-s] would run: ${command} ${argv.join(' ')}`)
    return { status: 0 }
  }
  // Why: caller env objects spread process.env (including the shell PATH), so
  // optionEnv first lets the injected Node PATH win — electron-builder then
  // runs under v24.19.0 and does not misjudge node:sqlite as a bare import.
  const { env: optionEnv, ...spawnOptions } = options
  const result = spawnSync(command, argv, {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...optionEnv, ...env },
    ...spawnOptions
  })
  if (result.status !== 0) {
    console.error(`[orca-s] ${command} failed (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
  return result
}

// Why: only the custom trunk carries the orca-s build identity and the full
// fork feature set; packaging any other branch silently ships the wrong build.
const branch = spawnSync('git', ['branch', '--show-current'], {
  cwd: repoRoot,
  encoding: 'utf8',
  env
}).stdout.trim()
if (branch !== 'custom') {
  console.error(`[orca-s] must build from the custom branch (current: ${branch || '(detached)'}).`)
  console.error('  git checkout custom && node config/scripts/build-orca-s.mjs [--install]')
  process.exit(1)
}
const dirty = spawnSync('git', ['status', '--porcelain'], {
  cwd: repoRoot,
  encoding: 'utf8',
  env
}).stdout
if (dirty.trim()) {
  console.warn('[orca-s] working tree is not clean — the package will include uncommitted changes.')
}

// 验证二开功能完整性
console.log('[orca-s] 验证二开功能完整性...')
const verifyResult = spawnSync('node', ['config/scripts/verify-features.mjs'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env
})
if (verifyResult.status !== 0) {
  console.error('[orca-s] 二开功能验证失败，请先修复问题')
  process.exit(1)
}

function artifacts() {
  const dist = resolve(repoRoot, 'dist')
  if (!existsSync(dist)) {
    return []
  }
  return readdirSync(dist)
    .filter((name) => name.endsWith('.dmg') || name.endsWith('.zip'))
    .sort()
}

function hostSlice() {
  return archName === 'x64' ? 'mac' : 'mac-arm64'
}

console.log(`[orca-s] building ${archName} from ${repoRoot}`)
// Why: build:mac always packs both slices; run the same front half by hand so
// electron-builder gets an explicit --arm64/--x64 and only one slice is built.
run('pnpm', ['run', 'build:desktop'])
run('pnpm', ['run', 'build:computer-macos'])
run('pnpm', ['run', 'build:notification-status-macos'])
run('pnpm', ['run', 'ensure:electron-runtime'])
const identity = getLocalBuildIdentity()
console.log(`[orca-s] local update version ${identity.version}`)
run(
  'pnpm',
  ['exec', 'electron-builder', '--config', 'config/electron-builder.config.cjs', '--mac', archFlag],
  {
    env: {
      ...process.env,
      ORCA_BUILD_COMMIT: identity.commit,
      ORCA_LOCAL_BUILD_VERSION: identity.version,
      ORCA_MAC_TARGET_ARCHS: archName
    }
  }
)

const files = artifacts()
if (files.length === 0) {
  console.error('[orca-s] no dmg/zip artifacts found under dist/')
  process.exit(1)
}
console.log('[orca-s] artifacts:')
for (const name of files) {
  console.log(`  dist/${name}`)
}

if (install) {
  const appSource = resolve(repoRoot, 'dist', hostSlice(), 'orca-s.app')
  const appTarget = '/Applications/orca-s.app'
  if (!existsSync(appSource)) {
    console.error(`[orca-s] missing ${appSource} (unexpected host slice?)`)
    process.exit(1)
  }
  console.log(`[orca-s] installing ${appSource} -> ${appTarget}`)
  if (!dryRun) {
    // Why: remove first — ditto merges into an existing destination.
    if (existsSync(appTarget)) {
      rmSync(appTarget, { recursive: true, force: true })
    }
    // Why ditto, not fs.cpSync: .app bundles carry relative framework symlinks
    // (Versions/Current); cpSync resolves them to absolute dist paths, breaking
    // the code seal so macOS refuses launch (silent exit 1) and the installed
    // app dangles on dist/ surviving. ditto preserves links verbatim.
    run('ditto', [appSource, appTarget])
    run('xattr', ['-cr', appTarget])
    console.log('[orca-s] launching orca-s…')
    run('open', [appTarget])
  }
  console.log('[orca-s] done. First launch may need right-click -> Open after a fresh install.')
} else {
  console.log('[orca-s] done. Re-run with --install to copy into /Applications.')
}
