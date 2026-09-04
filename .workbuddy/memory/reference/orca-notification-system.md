---
name: orca-notification-system
description: Orca 通知系统架构与"完成通知不弹"排查
metadata:
  type: project
---

## 通知开关层级

- `Enable Notifications`（master，默认 true）
- `Agent Task Complete`（默认 true）
- `Suppress While Focused`（默认 true，**设计行为非 bug**）

## "完成通知不弹"排查

1. **头号嫌疑**：Suppress While Focused 默认 true
2. macOS 权限按 bundle ID 授权 → orca-s 自签重打包后易失效
3. 用 Settings→Notifications「Send Test Notification」验证