---
name: doc-workflow-hook
description: 本机 doc-workflow stop hook 的校验规则——设计文档放 .workbuddy/docs/<分类>/，hook 仍扫描仓库根 docs/（需更新）
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_c36a3100-c006-4d2e-a08d-e3ae068b3846
---

本机 hook `~/.zcode/hooks/doc-workflow-hook.sh` 会在任务命中开发/文档工作流时做 stop 校验（2026-08-16 会话实测，曾被它 block 一次）：

1. **设计/影响说明文档**：只扫描**仓库根 `docs/`**（`docs.rglob("*.md")`），要求存在 mtime ≥ 会话开始时间的 `.md` 文件；**`.workbuddy/docs/` 不在扫描范围**，放在那里会被判「缺少 docs/ 设计文档」而 block 会话收尾。
2. **日记忆**：必须存在 `.workbuddy/memory/YYYY-MM-DD.md`（当天），且 mtime ≥ 会话开始。
3. 触发条件：会话开始 prompt 命中 `开发|实现|修复|重构|设计|文档|配置|调研|整理|迁移|README|AGENTS|UI|界面|复刻|接口|测试` 任一关键词，且工程是项目（根有 `.workbuddy/memory/` + `docs/`）。hook 状态记在 `~/.zcode/hooks/state/<session>.json`，`started` 跨轮不重置。

**Why:** 用户 harness 的硬性门禁；设计文档现放 `.workbuddy/docs/`（AGENTS.md 已更新），但 hook 仍扫描仓库根 `docs/`，会 block 会话收尾。

**How to apply:** 设计/影响说明文档写 `.workbuddy/docs/<分类目录>/YYYY-MM-DD-中文描述.md`；记忆写 `.workbuddy/memory/YYYY-MM-DD.md`；两个产物路径都要在最终响应列出。**⚠️ hook 待更新**：需将 `doc-workflow-hook.sh` 扫描路径从 `docs/` 改为 `.workbuddy/docs/`，或在 `.workbuddy/docs/` 下放占位 `.md` 临时绕过。关联 [[orca-fork-2dev]]、[[orca-workbuddy-docs-classification]]。
