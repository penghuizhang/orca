---
name: doc-workflow-hook
description: 本机 doc-workflow stop hook 的精确校验规则（设计文档只扫仓库根 docs/；日记忆只认 .workbuddy/memory/YYYY-MM-DD.md，不认 daily/）及合规产物写法
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_c36a3100-c006-4d2e-a08d-e3ae068b3846
---

本机 hook `~/.zcode/hooks/doc-workflow-hook.sh`（python，`--prompt` 注入提醒 / `--stop` 校验）会在任务命中开发/文档工作流时做 stop 校验。**2026-08-16 首次踩坑，2026-09-13 读源码确认精确规则**：

1. **设计/影响说明文档**：`has_design()` 只扫**仓库根 `docs/`**（`docs.rglob("*.md")`），要求存在 `mtime ≥ started` 的 `.md`。**`.workbuddy/docs/` 不在扫描范围**。
2. **日记忆**：`has_memory()` 只认 **`.workbuddy/memory/YYYY-MM-DD.md`（当天、根级）**，`mtime ≥ started`。**不认 `daily/` 子目录**——即使项目约定日记忆放 `daily/`，也必须再放一份根级文件。
3. 触发条件：会话开始 prompt 命中 `开发|实现|修复|重构|设计|文档|配置|调研|整理|迁移|README|AGENTS|UI|界面|复刻|接口|测试` 任一，且工程是「项目」（根有 `.workbuddy/memory/` + `docs/`）。
4. 前置短路：`not required or not changed_since(root, start)` ⇒ 不校验。`changed_since` 遍历全仓库文件 mtime（忽略 `node_modules`/`.git`/`.zcode`）。
5. 状态文件 `~/.zcode/hooks/state/<session>.json`，`started` 跨轮不重置（首轮记录，避免跨轮产物被误报缺失）。

**Why:** 用户 harness 的硬性 stop 门禁，不满足会 block 会话收尾。

**How to apply（同时产出四份，本次已验证通过）：**
- canonical 设计文档 → `.workbuddy/docs/<分类>/YYYY-MM-DD-中文描述.md`（AGENTS.md 规范）
- **hook 合规**：仓库根 `docs/YYYY-MM-DD-中文描述.md` 放摘要+指针（本仓库 `docs/**` 被 gitignore，属本地钩子产物，可不入库）
- 日记忆 → `.workbuddy/memory/daily/YYYY-MM-DD.md`（项目约定）
- **hook 合规**：再放 `.workbuddy/memory/YYYY-MM-DD.md` 指针文件（hook 只认根级）
最终响应要列出两类产物路径。关联 [[orca-fork-2dev]]、[[orca-workbuddy-docs-classification]]、[[orca-dev-workflow]]。
