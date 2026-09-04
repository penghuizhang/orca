---
name: orca-zcode-usage-statistics
description: ZCode 独立使用统计——全链路集成完成（PR #20，custom 分支）
metadata:
  type: project
---

# ZCode 使用统计独立面板

**状态**：已完成并打包（PR #20，custom 分支）

## 功能

- ZCode 独立 provider 卡片+完整详情面板
- 与 Claude/Codex/OpenCode 并列显示
- 每日图表/型号分解/Provider 分解/最近会话

## 数据源

- 路径：`~/.zcode/cli/db/db.sqlite`（约 550MB）
- 记录数：25,694 条使用记录（514 会话）
- 核心表：model_usage

## 关键修复

- getSnapshot 签名缺 scope/range/limit 参数
- Set→JSON→Object 反序列化导致 `r.models is not iterable`
