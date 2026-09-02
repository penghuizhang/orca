#!/usr/bin/env node
/**
 * Orca 二开一键同步和打包脚本
 *
 * 用法：
 *   node config/scripts/orca-sync-and-build.mjs           # 同步 + 打包
 *   node config/scripts/orca-sync-and-build.mjs --sync    # 仅同步
 *   node config/scripts/orca-sync-and-build.mjs --build   # 仅打包
 *   node config/scripts/orca-sync-and-build.mjs --install # 同步 + 打包 + 安装
 *   node config/scripts/orca-sync-and-build.mjs --dry-run # 预览模式
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..', '..')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const syncOnly = args.has('--sync')
const buildOnly = args.has('--build')
const install = args.has('--install')

function run(cmd, argv, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${cmd} ${argv.join(' ')}`)
    return { status: 0 }
  }
  const result = spawnSync(cmd, argv, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options
  })
  if (result.status !== 0) {
    console.error(`[error] ${cmd} ${argv.join(' ')} failed (exit ${result.status})`)
    process.exit(result.status ?? 1)
  }
  return result
}

console.log('🚀 Orca 二开同步和打包')
console.log('='.repeat(50))

// 同步上游代码
if (!buildOnly) {
  console.log('\n📥 步骤 1: 同步上游代码')
  console.log('-'.repeat(50))
  run('node', ['config/scripts/sync-upstream.mjs', '--auto'])
}

// 打包应用
if (!syncOnly) {
  console.log('\n📦 步骤 2: 打包应用')
  console.log('-'.repeat(50))
  const buildArgs = ['config/scripts/build-orca-s.mjs']
  if (install) {
    buildArgs.push('--install')
  }
  run('node', buildArgs)
}

console.log(`\n${'='.repeat(50)}`)
console.log('✅ 完成！')
if (install) {
  console.log('应用已安装到 /Applications/orca-s.app')
} else {
  console.log('运行 node config/scripts/build-orca-s.mjs --install 安装应用')
}
