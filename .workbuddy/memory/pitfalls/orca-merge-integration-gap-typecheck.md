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

关联 [[orca-merge-upstream-conflict-playbook]]、[[orca-shallow-clone-sync]]、[[orca-dev-workflow]]。
