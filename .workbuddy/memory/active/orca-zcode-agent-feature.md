---
name: orca-zcode-agent-feature
description: Orca 新增 zcode 为完整 agent 类型（PR #5，已合并 custom）
metadata:
  node_type: memory
  type: project
  originSessionId: sess_d28d23a6-80e9-4727-8999-dd4edb17dbcd
---

# Orca ZCode Agent 类型

**状态**：已完成并合入 custom（PR #5）

## 新增 agent 必改清单（注册表机制）

- `src/shared/tui-agent.ts`（TuiAgent 联合类型）
- `src/shared/tui-agent-config.ts`（TUI_AGENT_CONFIG）
- `agent-kind.ts`（遥测映射）
- `tui-agent-display-names.ts`（显示名）
- `skills-cli-agent-keys.ts`（不确定的键给 null）
- `renderer agent-status.ts` 的 ICONABLE_AGENT_TYPES
- `renderer agent-catalog.tsx`（图标+描述）
- i18n `src/renderer/src/i18n/locales/{en,zh,es,fr,ja,ko}.json` ——**实为 6 语言**（此前误记为 en/zh/es/ja/ko 五语言；2026-09-13 核实仓库含 fr.json）

## 踩坑

- en.json 被日历 merge 弄坏（缺逗号+对象未闭合）→ 已修复
- tui-agent-config 撞 max-lines 300 → 用桌面端 per-file bump 300→360
