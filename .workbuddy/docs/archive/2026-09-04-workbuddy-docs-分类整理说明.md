# .workbuddy/docs/ 分类整理说明

日期：2026-09-04
状态：✅ 已完成

## 背景

仓库根 `docs/` 下有 40+ 篇二开设计文档，与上游文档（STYLEGUIDE.md、reference/）混杂。用户要求将二开文档统一整理到 `.workbuddy/docs/` 并按功能分类。

## 整理内容

### 目录结构

```
.workbuddy/docs/
├── calendar/           # 日历功能相关（10 篇）
├── gitee/              # Gitee 集成相关（7 篇，已废弃）
├── zcode/              # ZCode 相关（11 篇）
├── mobile/             # 移动端相关（2 篇）
├── feishu/             # 飞书相关（1 篇）
├── workflow/           # 工作流规范（3 篇）
├── reference/          # 参考文档（4 篇）
└── archive/            # 已废弃/过期文档（6 篇）
```

### 迁移清单

| 分类 | 文档数 | 主要内容 |
|------|--------|----------|
| calendar | 10 | 日历功能设计方案、数据迁移、周视图、清单简化等 |
| gitee | 7 | Gitee 集成评估、看板、PR 创建等（已废弃） |
| zcode | 11 | 智能体类型、会话标题、用量统计、代码跳转、MCP 等 |
| mobile | 2 | 移动端探索、frp 云中转 |
| feishu | 1 | 飞书多维表格调研 |
| workflow | 3 | 二开工作流程规范、agent 技能共享清单 |
| reference | 4 | 项目体检报告、本地开发环境搭建等 |
| archive | 6 | 已修复 bug、过期同步说明、废弃配置等 |

### AGENTS.md 更新

第 10 行规范从 `docs/` 改为 `.workbuddy/docs/<分类目录>/`，明确分类要求。

## 影响

- 仓库根 `docs/` 仅保留上游内容（STYLEGUIDE.md、reference/、assets/）
- 二开设计文档全部在 `.workbuddy/docs/` 分类管理
- AGENTS.md 规范已同步更新

## 待确认

无
