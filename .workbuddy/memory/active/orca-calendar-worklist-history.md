---
name: orca-calendar-worklist-history
description: orca 日历「复制本周清单」泛化为任意区间历史工作清单查看+复制（PR #15 已合并）
metadata:
  type: project
---

## 状态

已完成并合入 custom（PR #15）

## 功能

- 「复制本周清单」泛化为任意区间（周/月/自定义）
- 纯 renderer 展示层改造，零 schema/IPC/main 改动

## 关键组件

- WorkListRange + calendar-range-picker.tsx + calendar-range-summary.tsx
- calendar-work-list-dialog.tsx + calendar-work-list.ts