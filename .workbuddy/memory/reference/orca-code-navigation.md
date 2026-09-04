---
name: orca-code-navigation
description: Command 点击跳转到定义能力评估与 MVP 实现（PR #10 已合并）
metadata:
  type: project
---

## 功能

- Cmd/Ctrl+Click / F12 跳转到定义
- 同文件：revealRangeInCenter + setPosition
- 跨文件：openFile + pendingEditorReveal

## 实现

- 新增 `src/renderer/src/lib/code-navigation/` 模块
- 纯文本启发式 + ripgrep 跨文件搜索（13 语言 provider）

## 坑

- TS/JS 定义正则只命中 function/class/interface 等关键字声明
- 修复：扩展正则匹配 async/const/箭头函数/接口方法