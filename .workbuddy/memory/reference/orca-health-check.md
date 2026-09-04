---
name: orca-health-check
description: stablyai/orca 体检关键数据（2026-08-16 实测）：规模、技术栈占比、依赖硬锁、二开难度 4/5 及缓解面
metadata:
  type: project
---

## 关键数据（2026-08-16 实测）

- **社区**：46,181 stars / 3,234 forks；近 30 天 1,997 commits（≈66/天）
- **License**：MIT，版权方 Lovecast Inc.，商用无障碍
- **规模**：15,331 文件 / 322.5 万行；TS 合计 91.5%；测试占比 52%
- **依赖硬锁**：node=24，pnpm@10.24.0 精确锁；5 个 pnpm patch
- **二开难度 4/5**：缓解面=skills/配置/CLI 层（冲突面最小）

**How to apply:** 定制优先落 skills/ + orca.yaml + CLI 层；动核心前预估测试面成本。相关：[[orca-fork-2dev]]