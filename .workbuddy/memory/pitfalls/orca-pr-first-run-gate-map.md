# orca PR 门禁地图：直 merge 不触发、首个 PR 全暴露（2026-09-23 PR #24 实测）

## 症状
历史上每次上游同步都 `custom 直接 merge + push`，**从不触发 pr.yml**；第一次走 PR（#24）时，二开存量把 PR CI 的全部门禁一次炸出：anti-slop 命名 36 处、localization 四门禁（缺键/runtime catalog/coverage 文案）、changed 门禁断言行——而这些门禁脚本在上游 `1b85..ae3d` 区间**零改动**（不是上游变严，是从来没跑过）。

## pr.yml 的真门禁（与本地全量 lint 不同）
1. `pnpm run check:code-quality:changed -- <base.sha>` — CI 传的是 PR base；**本地等价**：`pnpm run check:code-quality:changed -- $(git rev-parse HEAD^1)`（直接跑=基线 origin/main，大合并后必失真报存量噪音）
2. `pnpm run typecheck`
3. **localization 四连**：`verify:localization-catalog` / `-runtime-catalog` / `-extraction` / `-coverage`
4. 全量 `pnpm test`、`pnpm build` 等（由 CI 覆盖）

pr.yml **不跑** `audit:code-quality:native`；mobile.yml 的 Lint 在 `working-directory: mobile` 跑裸 `oxlint`（mobile/package.json），不 deny-warnings。

## 修法速查（PR #24 已验证）
- localization 缺键 / runtime catalog 不同步 → `pnpm run sync:localization-catalog --fix 前身是 --fix：sync:localization-catalog`、`pnpm run sync:localization-runtime-catalog`（自动补 en.json + 重生成 en-runtime-required.json）
- coverage「unlocalized strings」→ 就地 `translate(key, fallback, {{value0}} 插值)` + 六语词条（二开文案的正解）；确属不可本地化的加 `config/localization-coverage-allowlist.json`（格式 `{filePath, kind, text, dynamic, count}`）
- changed 门禁 `consistent-type-assertions` → 断言行上方按上游先例加 `// oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: …`；**注意它逐行推进**（修一行露出下一行），只给 diff 新增行加，别碰基线原行（碰了反而变"新增"）
- anti-slop `no-shape-in-symbol-names` 禁子串 `shape` → 直接改名（例：`UsageShape`→`UsageContract`，子串替换一次覆盖 `ClaudeUsageShape` 等派生名）
- `no-object-parameters` → 照兄弟 `installXxxContext(target: OwnType, …)` 先例定型

## 遗留（非阻塞）
本地全量 `pnpm lint` 在 `audit:code-quality:native` 恒红：9 个**上游 mobile 存量** no-cycle 警告（`mobile/src/terminal/document/*`、`transport/*`），`1b85..ae3d` 区间 mobile 零改动=与上游两侧同态；不卡 pr.yml，也不卡 mobile.yml。不要为此改上游 mobile 代码。

相关：[[orca-merge-integration-gap-typecheck]]、[[orca-changed-gate-baseline-degenerate]]、日记忆 `daily/2026-09-23.md#任务上游同步第二轮26-提交走-pr-合入-custompr-24`
