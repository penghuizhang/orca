---
name: orca-workbuddy-docs-classification
description: orca 二开设计文档分类存放规范——.workbuddy/docs/ 下按功能模块分 8 个目录，AGENTS.md 已同步更新
metadata:
  type: project
  originSessionId: sess_2026-09-04
---

2026-09-04 用户拍板：二开设计文档统一放 `.workbuddy/docs/` 分类目录，不再放仓库根 `docs/`。

**分类目录（8 个）**：calendar / gitee / zcode / mobile / feishu / workflow / reference / archive

**迁移统计**：46 篇文档从 `docs/` 迁移到 `.workbuddy/docs/` 对应分类；仓库根 `docs/` 仅保留上游内容（STYLEGUIDE.md、reference/、assets/）。

**AGENTS.md 已更新**：第 10 行规范从 `docs/` 改为 `.workbuddy/docs/<分类目录>/`。

**文档路径对照（旧→新）**：
- 日历相关 → `.workbuddy/docs/calendar/`
- Gitee 相关（已废弃）→ `.workbuddy/docs/gitee/`
- ZCode/Pi/MCP/代码跳转 → `.workbuddy/docs/zcode/`
- 移动端/frp → `.workbuddy/docs/mobile/`
- 飞书 → `.workbuddy/docs/feishu/`
- 工作流规范 → `.workbuddy/docs/workflow/`
- 参考文档 → `.workbuddy/docs/reference/`
- 已废弃/过期 → `.workbuddy/docs/archive/`

**Why:** 用户要求按功能模块分类管理，便于查找和维护。

**How to apply:** 新设计文档必须放 `.workbuddy/docs/<对应分类>/YYYY-MM-DD-中文描述.md`；MEMORY.md 中引用旧路径 `docs/` 的条目需在下次更新时同步改为新路径。关联 [[doc-workflow-hook]]。
