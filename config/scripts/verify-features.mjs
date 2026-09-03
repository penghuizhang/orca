#!/usr/bin/env node
/**
 * 打包前验证二开功能完整性
 *
 * 用法：
 *   node config/scripts/verify-features.mjs           # 验证所有功能
 *   node config/scripts/verify-features.mjs --verbose  # 详细输出
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..', '..')
const args = new Set(process.argv.slice(2))
const verbose = args.has('--verbose')

let hasError = false

function run(cmd, argv) {
  const result = spawnSync(cmd, argv, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe'
  })
  return result.stdout.trim()
}

function check(name, condition, message) {
  if (condition) {
    console.log(`✅ ${name}`)
    if (verbose && message) {
      console.log(`   ${message}`)
    }
  } else {
    console.log(`❌ ${name}`)
    if (message) {
      console.log(`   ${message}`)
    }
    hasError = true
  }
}

// 1. 检查当前分支
console.log('=== 1. 检查分支状态 ===')
const branch = run('git', ['branch', '--show-current'])
check('在 custom 分支', branch === 'custom', `当前分支: ${branch}`)

// 2. 检查未合并的功能分支
console.log('\n=== 2. 检查未合并的功能分支 ===')
const unmerged = run('git', ['branch', '--no-merged', 'custom'])
const featureBranches = unmerged.split('\n').filter(
  (b) => b.trim() && !b.includes('upstream') && !b.includes('remotes') && !b.includes('gitee') // Gitee 已放弃，忽略
)
check(
  '没有未合并的功能分支',
  featureBranches.length === 0,
  featureBranches.length > 0 ? `未合并: ${featureBranches.join(', ')}` : ''
)

// 3. 检查关键功能提交
console.log('\n=== 3. 检查关键功能提交 ===')

const requiredFeatures = [
  { name: '日历功能', grep: 'calendar-feature' },
  { name: 'zcode agent', grep: 'zcode' },
  { name: 'custom.db', grep: 'custom.db' },
  { name: '浏览器自动化 MCP', grep: 'browser-automation' },
  { name: '移除 Gitee', grep: 'remove Gitee' }
]

for (const feature of requiredFeatures) {
  const commits = run('git', ['log', '--oneline', '--grep', feature.grep, 'custom'])
  check(
    `${feature.name} 已提交`,
    commits.length > 0,
    commits.length > 0 ? `找到 ${commits.split('\n').length} 个相关提交` : '未找到相关提交'
  )
}

// 4. 检查关键文件存在性
console.log('\n=== 4. 检查关键文件存在性 ===')

const requiredFiles = [
  { name: '日历组件', path: 'src/renderer/src/components/calendar' },
  { name: 'custom.db', path: 'src/main/custom-db' },
  { name: '浏览器自动化 MCP', path: 'src/main/browser/mcp' },
  { name: 'agent-catalog.tsx', path: 'src/renderer/src/lib/agent-catalog.tsx' }
]

for (const file of requiredFiles) {
  const fullPath = resolve(repoRoot, file.path)
  check(`${file.name} 存在`, existsSync(fullPath), file.path)
}

// 5. 检查 package.json 版本
console.log('\n=== 5. 检查版本信息 ===')
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'))
console.log(`📦 当前版本: ${packageJson.version}`)

// 6. 检查工作目录状态
console.log('\n=== 6. 检查工作目录状态 ===')
const status = run('git', ['status', '--porcelain'])
// Why: .codegraph/ 是本机索引目录（见 .gitignore），不属于产品改动，不能阻塞打包。
const relevantStatus = status
  .split('\n')
  .filter((line) => line.trim() && !line.startsWith('?? .codegraph/'))
  .join('\n')
check(
  '工作目录干净',
  relevantStatus === '',
  relevantStatus ? `有未提交的更改:\n${relevantStatus}` : ''
)

// 7. 检查类型检查
console.log('\n=== 7. 检查类型检查 (可选) ===')
if (args.has('--full')) {
  console.log('运行 typecheck...')
  const typecheck = spawnSync('pnpm', ['tc'], {
    cwd: repoRoot,
    stdio: 'pipe'
  })
  check(
    '类型检查通过',
    typecheck.status === 0,
    typecheck.status !== 0 ? typecheck.stderr?.slice(0, 200) : ''
  )
} else {
  console.log('⏭️  跳过类型检查 (使用 --full 运行)')
}

// 结果
console.log(`\n${'='.repeat(50)}`)
if (hasError) {
  console.log('❌ 验证失败，请修复上述问题后再打包')
  process.exit(1)
} else {
  console.log('✅ 验证通过，可以打包')
  console.log('\n下一步: node config/scripts/build-orca-s.mjs')
}
