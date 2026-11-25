---
name: orca-upstream-sync-large-refactor
description: 上游一次性重构规模很大（数千提交、模块搬家、批量删测试）时的同步套路——冲突预演正确读法、重命名冲突迁移法、被删测试的判定、门禁红的归属证明
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_6c9f01f7-a3ad-4470-8eb6-3d63d187d4f3
---

2026-11-13 同步 `b0c0377664`（5818 提交，55 冲突）实测。适用于「上游做了结构性重构」的同步轮次。

## 冲突预演的正确读法

`git merge-tree --write-tree --name-only <ours> <theirs>` 的输出**不是纯文件清单**：首行是 tree OID，之后依次是冲突路径、`Auto-merging ...` 行、`CONFLICT (...)` 行。

- 错误读法：`tail -n +2 | grep -c .` → 得到 **187**（把 Auto-merging/CONFLICT 行也数了）。
- 正确读法：取 `Auto-merging` 之前的路径段，或干脆以实际 merge 后的 `git status --short` 里 `UU/UD/DU` 计数为准（本轮真实 55 = 33 content + 22 modify/delete）。

## 上游搬家（modify/delete）冲突：迁 delta，不迁文件

上游把文件改名/拆目录时，git 报 `CONFLICT (modify/delete)`，旧路径留在工作区。

做法：
1. `git diff <base> HEAD -- <old-path>` 取二开在该文件上的**增量**（本轮普遍只有 1~14 行）。
2. 打开上游**新路径**的同名/同职责文件，把增量手工搬进去（签名变了要跟着适配，如上游给工厂函数加了 `t?: Translate`）。
3. `git rm <old-path>`；保留旧文件会让 `tc` 因引用已删导出而炸。

## 纯 import 路径搬家：脚本化「取上游侧 + 补二开标识符」

`store/index.ts`、`store/types.ts`、`main-process-state.ts` 这类文件冲突块里几乎全是 import 路径改写。可写脚本把冲突块替换为上游侧，再补回二开独有的标识符（如 `ZCodeUsageSlice`/`PiUsageSlice`、`createZCodeUsageSlice`）。

**批量 import 替换必须回头核对自引用误伤**：本轮把 `'./SettingsFormControls'` 全量替换成 `'./form-controls/SettingsFormControls'` 时，误伤了 `form-controls/` 目录内部的测试；`'./write-scheduling'` → `'./profile-writing/write-scheduling'` 也误伤了 `profile-writing/` 内的文件。

## 上游批量删测试 ≠ 删二开功能

上游会成批删「low-value」测试（本轮：`test: remove 17 low-value ... suites`）。判定顺序：

1. `git show HEAD:<file>` 看该测试在合并前是否存在、二开是否改过它。
2. 确认被测**行为**是否还在：模块整块消失 → 接受删除；行为还在 → 在新位置补回二开断言。
3. ⚠️ 二开也可能留着**已失效功能**的陈旧测试（本轮 gitee 集成 2026-09-02 已移除，4 个含 gitee 断言的测试本就无法编译）⇒ 这种直接 drop，别当成上游删了二开功能去「恢复」。

## 门禁红要证明归属，别默认背锅

出现门禁失败时先用 `git show HEAD:<file>` 或 `git show HEAD:<path>` 取合并前的同名文件/键集对照：

- 本轮 `verify:localization-extraction` 报 3378 条「无源引用」陈旧键，合并前 custom 同样 3378 条 ⇒ 存量债，记 TODO 不塞进同步。
- 本轮 `verify:localization-catalog` 的键复用/文案漂移是二开自己代码造成的，属本次必修。

## 二开功能契约被上游替换时

上游把整个子系统换宿主（本轮 usage IPC → `main/backend/usage-service.ts`）时，二开的扩展要跟着换：
- 枚举/联合类型（`UsageProviderSchema`）补二开成员；
- 二开 store 的构造参数改上游新契约（`UsageStoreHost`）；
- 注意宿主契约里**不要带 electron**，否则打包期 `plain-node-entry-guard` 才报（见 [[orca-packaging-rework-20260923]]）。

关联 [[orca-merge-upstream-conflict-playbook]]、[[orca-merge-integration-gap-typecheck]]、[[orca-agent-id-collision-silent-duplicates]]、[[orca-packaging-rework-20260923]]。
