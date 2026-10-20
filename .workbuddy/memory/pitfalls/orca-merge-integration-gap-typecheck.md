---
name: orca-merge-integration-gap-typecheck
description: 合并上游零/少冲突≠集成完成——上游给共享类型加必填字段时二开扩展点编译失败，pnpm tc 是硬门禁；附 hasPartialCost 实例与修法
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_95f46680-c848-4e17-9bac-98fc3986c422
---

合并上游进 custom 时，**预演冲突清单为空或很少不代表集成完成**：上游对共享类型/接口加**必填字段**，二开的扩展实现不在冲突文件里，照样 `pnpm tc` 编译失败。

**实例（2026-09-23，304 提交增量，2 冲突之外的第 3 处缺口）**：上游给 `UsageProviderOverview` 加必填 `hasPartialCost: boolean` ⇒ `usage-provider-normalization.ts` 里二开 zcode/pi 两个 createProvider 缺字段（TS2741×2）+ 上游新测试 fixture `buildUsageOverview` 缺二开的 `zcode`/`pi` 键（TS2739×1），共 3 错——三个报错文件都不在冲突列表里。

**Why:** 只核对「冲突都解了 + 键位没丢」会漏掉这类静默集成缺口，跑到打包或运行时才炸；2026-09-19 的 React #185（合并干净但上游新 hook 有坑）是同族教训的运行时版。

**How to apply:**
- 合并后 `pnpm tc` 是不可省的硬门禁（verify-features 默认 `--full` 才跑 typecheck，单独跑 `pnpm tc`）。
- 修法按上游**同类型其他成员的取值先例**：无 unpriced 概念的 provider → `hasPartialCost: false`；测试 fixture 按既有零值形态 `{ scanState: null, summary: null, daily: [] }`。
- 同族形态：上游给共享**枚举/联合类型**加成员（如 `UsageProviderId` 加 `'devin'`）时二开的 `'zcode'/'pi'` 要取并集——那个会以冲突形式出现，hasPartialCost 这种必填字段则不产生冲突。

## 升级版（2026-10-20，578 提交增量，9 冲突之外藏了 11 处缺口、其中 2 处是运行期破损）

本轮把上一条的教训推到更狠的形态：**上一轮记的「tc 通过」本身是假的**。

**为什么假得起来**：`config/scripts/run-typecheck-projects-in-parallel.mjs` 在本轮被上游改了默认编译器——
旧版 `compiler: 'native'`（tsc），新版**默认 bun**（`--compiler=native` 才回落）。
上游同时新增 `bun@1.4.3` devDependency；**未装 bun 时 runner 直接抛错退出**（"Bun 1.4.3 from devDependencies is missing"），
于是「没跑完但退出码被管道/误读吃掉」很容易被当成通过。⇒ **`pnpm tc` 的结论必须以「四个项目各自 ✓ No type errors」为证据，不能只看退出码。**

**11 处缺口清单（全部不在冲突列表里）**：

| 缺口 | 形态 | 性质 |
|------|------|------|
| `zcode/pi` scanner 第二参 | 上游已把 `scan` 第二参从「上次处理记录列表」换成 `UsageSourceCacheRef` 对象，我方 scanner 在对象上调 `.map()` | **运行期破损**（用量面板从上一轮起就打不开数据） |
| `UsageProvider` 泛型 4→2 | `<TSession, TDaily>` | 类型 |
| 持久化 state 缺 `schemaVersion` | 契约新增必填 | 类型（且 `this.schemaVersion` 运行期取到 undefined） |
| store config 的 `jsonIndent` | 上游删除该配置项 | 类型（多余属性） |
| store config 缺 `splitCacheFile` | 契约必填且运行期会被调用 | **潜在运行期降级**（大缓存拆分路径失效） |
| `authorizeExternalPath` | 上游**删除**了整个「外部路径会话级授权」机制（改为 `extraRoots` 按调用传） | **运行期破损**（二开笔记 `~/OrcaNotes` 全部 fs 操作会被拒） |
| `getRuntimeEnvironmentIdForWorktree` | 上游把 owner API 重构为 `resolveOwner*` 体系 | 类型 |
| 上游新测试缺二开必填字段 | `UsageOverviewInput` 缺 `zcode`/`pi` | 类型 |

**修法要点（可复用的判断）**：
- **先证明「是不是本轮引入」**：`git diff --stat <上一轮合并> HEAD -- <出错文件>` 为空 + 该文件最后变更日期早于本轮 ⇒ 既有缺口，**不是本轮合并造成**，但仍必须修（门禁要过）。
- **对齐上游同族的实现，不要自创**：zcode/pi 的 sidecar 迁移照抄上游 claude 范式
  （记录自带 `sessions`/`dailyAggregates` + `readUsageSourceCache`/`writeUsageSourceCache`，写失败只 warn 不算扫描失败）；
  笔记授权照抄上游 `extraRoots` 思路，落地为「会话级 grant + `getAllowedRoots` 纳入」；schemaVersion 照抄 muse 的「版本不符即丢弃、但保留 opt-in」。
- **顺手修掉被契约变化激活的隐藏 bug**：zcode 的「跳过未变更数据库」原先只复用元数据、不带该库的会话统计
  （旧生命周期是**替换** sessions 而非合并）⇒ 同一会话内第二次扫描会丢数据。记录自带聚合后该路径才真正正确。
- 记录类型要拆：`bookkeeping 形状` 与 `bookkeeping & { sessions, dailyAggregates }`（对齐上游 `ClaudeUsagePersistedFile = ClaudeUsageProcessedFile & {...}`）。

**How to apply（补充）：**
- 合并后先 `pnpm install`（新增 devDependency 会让 tc 直接不可用），再跑 `pnpm tc`，**四个项目逐个看到 ✓** 才算过。
- 把「上一轮/历史记忆里的验证结论」当作**待复核**而非事实：本轮核实出上一轮的 tc 结论不成立。

关联 [[orca-merge-upstream-conflict-playbook]]、[[orca-shallow-clone-sync]]、[[orca-dev-workflow]]、[[orca-fetch-proxy-insteadof-trap]]。
