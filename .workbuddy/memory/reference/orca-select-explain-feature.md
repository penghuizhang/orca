---
name: orca-select-explain-feature
description: Orca 编辑器选中代码片段→AI 解释功能（已实现）
metadata:
  type: project
---

## 功能

- 右键「用 AI 解释代码」+ ⌘/Ctrl+Shift+E
- 开新 agent 标签页自动提交固定中文指令

## 实现

- 利用 MonacoEditor 的 getSelection()/getValueInRange()
- 复用 launchAgentInNewTab() 机制（与 "Fix with AI" 同款）