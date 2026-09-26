#!/usr/bin/env node
// Report duplicate literals that a merge INTRODUCED, not the ones already in the tree.
//
// Why this exists: when the fork and upstream each add the same agent id (e.g. `zcode`)
// to a registration table, git sees two different insertions at two positions, merges both
// silently, and TypeScript only rejects duplicates in *object literals* (TS1117). Duplicate
// array elements, duplicate union members and duplicate catalog `id`s all compile fine — the
// ZCode collision of 2026-09-26 produced six of them and tsc caught exactly one.
//
// A raw duplicate scan is far too noisy to gate on: this repo already has ~119 legitimate
// duplicates (Node `stdio` arrays like ['ignore','pipe','pipe'], repeated argv flags, shell
// fragments). So by default the script diffs the tree against a base ref and reports only
// duplicates that are new — which is exactly the question a merge raises.
//
// A regex scan cannot do the scoping at all: it sees whole files and reports ids reused
// across unrelated scopes (91 false positives when tried). oxc-parser keeps each literal in
// its own scope, so every reported hit is a real duplicate.
//
// Usage:
//   node find-duplicate-ids.mjs --base <git-ref> [--head <git-ref>] [dir ...]
//   node find-duplicate-ids.mjs --all [dir ...]        # ignore the base, list everything
//   add --include-tests to scan test files too
//
// Exit: 0 clean, 1 duplicates introduced (or found with --all).

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { parseSync } = require('oxc-parser')

const argv = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : (argv[i + 1] ?? fallback)
}
const base = flag('--base')
const head = flag('--head')
const reportAll = argv.includes('--all')
const includeTests = argv.includes('--include-tests')
const roots = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')))
if (roots.length === 0) roots.push('src', 'mobile/src')

const AGENT_ID = /^[a-z0-9][a-z0-9-]*$/
const TEST_FILE = /(\.test\.|\.spec\.|__tests__|test-harness|test-fixture|-test-)/
const SKIP_DIR = new Set(['node_modules', 'dist', 'build', '.git', 'coverage'])

function collectFiles(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const entry of entries) {
    if (SKIP_DIR.has(entry)) continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) collectFiles(full, out)
    else if (/\.(ts|tsx|mts)$/.test(entry)) out.push(full)
  }
  return out
}

function lineIndexOf(source) {
  const starts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1)
  return (offset) => {
    let lo = 0
    let hi = starts.length - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (starts[mid] <= offset) lo = mid
      else hi = mid - 1
    }
    return lo + 1
  }
}

function parse(file, source) {
  try {
    return parseSync(file, source, { lang: 'tsx' }).program
  } catch {
    return null
  }
}

function literalText(node) {
  if (!node) return null
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value
  if (node.type === 'TemplateLiteral' && node.expressions.length === 0 && node.quasis.length === 1) {
    return node.quasis[0].value.cooked
  }
  return null
}

function keyName(prop) {
  if (!prop) return null
  if (prop.type === 'Property' || prop.type === 'ObjectProperty') {
    const k = prop.key
    if (!k) return null
    if (k.type === 'Identifier') return k.name
    if (k.type === 'Literal' && typeof k.value === 'string') return k.value
  }
  return null
}

// Returns Map<kind, Set<value>> of every duplicate literal found in one source.
function duplicatesIn(file, source) {
  const ast = parse(file, source)
  const found = new Map()
  if (!ast) return found
  const toLine = lineIndexOf(source)

  const add = (kind, node, value) => {
    // An empty string in a text-building array is intentional; a repeat of it is not a bug.
    if (value === '' || value == null) return
    if (!found.has(kind)) found.set(kind, new Map())
    const byValue = found.get(kind)
    if (!byValue.has(value)) byValue.set(value, toLine(node.start ?? 0))
  }

  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return
    if (node.type === 'ObjectExpression') {
      const seen = new Set()
      for (const prop of node.properties) {
        const name = keyName(prop)
        if (name == null) continue
        if (seen.has(name)) add('object-key', node, name)
        else seen.add(name)
      }
    } else if (node.type === 'ArrayExpression') {
      const seen = new Set()
      for (const el of node.elements) {
        const text = literalText(el)
        // Ids and enum values never contain whitespace; strings that do are shell or
        // code-snippet arrays where a repeated line is the point, not a bug.
        if (text == null || /\s/.test(text)) continue
        if (seen.has(text)) add('array-element', node, text)
        else seen.add(text)
      }
      // A catalog is an array of objects: two entries with the same `id` render as two rows.
      const objects = node.elements.filter((e) => e?.type === 'ObjectExpression')
      if (objects.length > 1) {
        const ids = new Set()
        for (const obj of objects) {
          const idProp = obj.properties.find((p) => keyName(p) === 'id')
          const id = idProp ? literalText(idProp.value) : null
          if (id == null) continue
          if (ids.has(id)) add('catalog-id', obj, id)
          else ids.add(id)
        }
      }
    } else if (node.type === 'TSUnionType') {
      const seen = new Set()
      for (const t of node.types) {
        if (t.type !== 'TSLiteralType') continue
        const text = literalText(t.literal)
        if (text == null) continue
        if (seen.has(text)) add('union-member', node, text)
        else seen.add(text)
      }
    }
    // Braces are load-bearing: without them the `else` binds to the inner
    // `if (child?.type)` and single-object children are never visited at all.
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const child of value) {
          if (child && typeof child.type === 'string') visit(child)
        }
      } else if (value && typeof value.type === 'string') {
        visit(value)
      }
    }
  }
  visit(ast)
  return found
}

function readAt(rev, file) {
  try {
    return execFileSync('git', ['show', `${rev}:${file}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore']
    })
  } catch {
    return null
  }
}

function readWorking(file) {
  try {
    return readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

const findings = []
let scanned = 0
let skippedNew = 0

for (const root of roots) {
  for (const file of collectFiles(root)) {
    if (!includeTests && TEST_FILE.test(file)) continue

    let before = null
    if (base) {
      before = readAt(base, file)
      // A file the base does not have is new from upstream: its internal duplicates are
      // upstream's own and already passed their CI, not something this merge introduced.
      if (before === null) {
        skippedNew++
        continue
      }
    }

    const source = head ? readAt(head, file) : readWorking(file)
    if (source === null) continue

    scanned++
    const current = duplicatesIn(file, source)
    if (current.size === 0) continue

    const baseline = before === null ? new Map() : duplicatesIn(file, before)

    for (const [kind, byValue] of current) {
      const already = baseline.get(kind)
      for (const [value, line] of byValue) {
        if (!reportAll && base && already?.has(value)) continue
        findings.push({ file, line, kind, value })
      }
    }
  }
}

const scope = `${scanned} 个文件 / ${roots.join(', ')}${includeTests ? '' : '（已排除测试文件）'}`
if (findings.length === 0) {
  console.log(
    reportAll || !base
      ? `✓ 未发现重复字面量（${scope}）`
      : `✓ 合并未引入新的重复字面量（对比 ${base}${head ? ` → ${head}` : ''}，${scope}${skippedNew ? `，跳过 ${skippedNew} 个上游新增文件` : ''}）`
  )
  process.exit(0)
}

console.log(`✗ 发现 ${findings.length} 处重复字面量${base && !reportAll ? `（合并相对 ${base} 新增）` : ''}：\n`)
for (const f of findings) {
  console.log(`${f.file}:${f.line}  [${f.kind}] "${f.value}"`)
}
console.log('\n重复项在 JS 里后者静默覆盖前者，在 UI 里表现为条目出现两次。')
console.log('两侧各自新增了同名 id 时，逐个判定保留哪一份——通常保留上游那份实测依据更完整的。')
process.exit(1)
