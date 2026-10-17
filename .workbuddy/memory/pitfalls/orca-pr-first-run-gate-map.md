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

## 2026-09-26 续测：两个在本 fork 里本就过不了的失败

### `cross-version wire compatibility` —— 结构性跑不通，与源码无关

```
Error: Cross-version harness found no stable desktop release tags matching vX.Y.Z (saw 0 tag(s) total).
Error: Cross-version harness could not resolve ref "v1.4.190" to a commit
```

该测试用**上游 stablyai/orca 的桌面发布 tag**（`v1.4.184`/`v1.4.190`/`v1.4.199`）与当前代码做 skew。
实测 tag 数：**fork `penghuizhang/orca` 只有 2 个（都是 `backup/pre-sync-*`）**，upstream 有 2181 个
⇒ GitHub checkout 永远解析不到。

**本地能过是因为本机 clone 里有上游 tag**（同步时 `git fetch upstream 'refs/tags/*:refs/tags/*'` 拉的）
——**本地过 ≠ CI 能过**，别被自己骗了。

两条出路（都属 CI 基础设施，需维护者拍板）：① job 里加一步 `git remote add upstream https://github.com/stablyai/orca.git && git fetch upstream 'refs/tags/*:refs/tags/*'`（保留真实 skew，代价是每次拉大量 tag）；② 设 `ORCA_CROSS_VERSION_BASELINE_REF` 指向 fork 内存在的 ref（便宜，但「旧客户端」不再是真正的旧发布，削弱检查意义）。

### 4 个既存测试失败 —— 判定「是否本次引入」的手法

2026-09-26 的 4 个失败在 `origin/custom`（合并前基线）上**一模一样**，且相关文件逐字节相同 ⇒ 非本次引入。两个根因：PR #18 移除 Gitee 集成不彻底（测试期望删了 `linkedGiteePR`，`getSelectedReviewLookupHints` 仍返回它）；`host-port-bootstrap-wiring.test.ts` 断言的调用顺序过期（实现新增 `configurePackagedUserDataPath()`）。

**证明手法（以后每次 CI 红都先做这一步）**：

```bash
git worktree add --detach /tmp/orca-base origin/custom
ln -s <repo>/node_modules /tmp/orca-base/node_modules
cd /tmp/orca-base && pnpm test <失败的测试文件>     # 同样失败 = 既存
git worktree remove --force /tmp/orca-base
```

**既存问题不要顺手塞进同步 PR**（会把最该被看清的改动埋掉），在 PR 里开评论写根因 + 建议单独开 PR。

## 遗留（非阻塞）
本地全量 `pnpm lint` 在 `audit:code-quality:native` 恒红：9 个**上游 mobile 存量** no-cycle 警告（`mobile/src/terminal/document/*`、`transport/*`），`1b85..ae3d` 区间 mobile 零改动=与上游两侧同态；不卡 pr.yml，也不卡 mobile.yml。不要为此改上游 mobile 代码。

相关：[[orca-merge-integration-gap-typecheck]]、[[orca-changed-gate-baseline-degenerate]]、日记忆 `daily/2026-09-23.md#任务上游同步第二轮26-提交走-pr-合入-custompr-24`
