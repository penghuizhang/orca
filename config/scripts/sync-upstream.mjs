#!/usr/bin/env node
/**
 * 同步上游代码到 custom 分支
 *
 * 用法：
 *   node config/scripts/sync-upstream.mjs           # 交互式同步
 *   node config/scripts/sync-upstream.mjs --dry-run  # 预览模式
 *   node config/scripts/sync-upstream.mjs --auto     # 自动同步（无交互）
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..', '..')
const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const auto = args.has('--auto')

function run(cmd, argv, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${cmd} ${argv.join(' ')}`)
    return { status: 0, stdout: '' }
  }
  const result = spawnSync(cmd, argv, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: auto ? 'pipe' : 'inherit',
    ...options
  })
  if (result.status !== 0) {
    console.error(`[error] ${cmd} ${argv.join(' ')} failed (exit ${result.status})`)
    if (result.stderr) {
      console.error(result.stderr)
    }
    process.exit(result.status ?? 1)
  }
  return result
}

// 1. 检查当前状态
console.log('=== 步骤 1: 检查当前状态 ===')
const branch = run('git', ['branch', '--show-current']).stdout.trim()
if (branch !== 'main' && branch !== 'custom') {
  console.log(`当前分支: ${branch}`)
  console.log('建议先切换到 main 或 custom 分支')
}

// 2. 获取上游最新代码
console.log('\n=== 步骤 2: 获取上游最新代码 ===')
run('git', ['fetch', 'upstream'])

// 3. 检查上游是否有更新
const behind = run('git', ['rev-list', '--count', 'HEAD..upstream/main']).stdout.trim()
if (behind === '0') {
  console.log('上游没有新提交，无需同步')
  process.exit(0)
}
console.log(`上游有 ${behind} 个新提交`)

// 4. 更新 main 分支
console.log('\n=== 步骤 3: 更新 main 分支 ===')
run('git', ['checkout', 'main'])
run('git', ['merge', 'upstream/main', '--no-edit'])

// 5. 同步到 custom
console.log('\n=== 步骤 4: 同步到 custom 分支 ===')
run('git', ['checkout', 'custom'])
const mergeResult = run('git', ['merge', 'main', '--no-edit'])

if (mergeResult.status !== 0) {
  console.error('\n[警告] 合并冲突，请手动解决冲突后运行:')
  console.error('  git add .')
  console.error('  git commit')
  console.error('  node config/scripts/sync-upstream.mjs --continue')
  process.exit(1)
}

// 6. 验证二开功能完整性
console.log('\n=== 步骤 5: 验证二开功能完整性 ===')
const verifyResult = run('node', ['config/scripts/verify-features.mjs'], { stdio: 'inherit' })
if (verifyResult.status !== 0) {
  console.error('[错误] 二开功能验证失败，请检查')
  process.exit(1)
}

// 7. 推送到 origin
console.log('\n=== 步骤 6: 推送到 origin ===')
run('git', ['push', 'origin', 'main'])
run('git', ['push', 'origin', 'custom'])

console.log('\n✅ 同步完成！')
console.log('下一步: node config/scripts/build-orca-s.mjs')
