---
name: orca-changed-gate-baseline-degenerate
description: pnpm check:code-quality:changed 基线是 origin/main——custom
  合并上游后变更集退化为全库（万级文件）报千级存量噪音，不可作门禁，改定点 lint 自改文件
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_95f46680-c848-4e17-9bac-98fc3986c422
---

`pnpm run check:code-quality:changed`（`config/scripts/check-changed-code-quality.mjs`）用 `resolvePullRequestDiffBase` 取基线，本地无 PR 上下文时**回落到 `origin/main`**。

**症状（2026-09-23 实测）**：custom 刚合并上游 304 提交后跑它——变更集 = **10173 个文件**（≈全库），扫 20 分钟报 **3184 个 finding**（全是 native-chat 等上游/存量代码的 restyle 噪音），与本次自改的几个文件毫无关系。

**Why:** 该门禁设计给「PR 相对 custom 的增量」用；大合并后 custom 与 origin/main 的差异天然巨大，结果不可行动（按手册也不该给上游代码跑重排版/门禁）。

**How to apply:** 大合并后弃用该门禁，改为对**本次真正自改的文件**跑 oxlint 配置矩阵：root / `--config config/oxlint-design-system.json` / `config/oxlint-code-quality-casting.json` / `config/oxlint-react-doctor.json` / `--type-aware --config config/oxlint-code-quality-type-aware.json`，逐文件各应 0 warnings 0 errors。
**zsh 坑**：`for f in $FILES` 不分词（SH_WORD_SPLIT 默认关）会把整串当一个参数导致「No files found」——用 `${=FILES}` 或直接内联文件列表。

关联 [[orca-dev-workflow]]、[[orca-merge-upstream-conflict-playbook]]。
