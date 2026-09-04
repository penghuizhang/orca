---
name: metadata-complexity-risk
description: 元数据复杂度风险——过度设计元数据会导致数据查不到或丢失，应简化元数据，通过索引实现关联
metadata:
  node_type: memory
  type: feedback
  source: manual
  created: 2026-09-04
  originSessionId: sess_64ad9335-bd03-4caf-b89b-66b7206b08ed
---

## 问题

元数据信息如果没维护好，数据会查不到或丢失。

## 根因

1. **元数据过度设计**：添加了 `docs`、`related`、`memory` 等复杂字段
2. **双向关联负担**：记忆文件和设计文档需要互相引用，维护成本高
3. **系统优先查找元数据**：如果元数据不准确，就找不到相关文档

## 解决方案

### 简化元数据格式

**日记忆**（保持简单）：
```yaml
---
name: 2026-09-04
description: 2026-09-04 会话记录
metadata:
  type: daily
  source: zcode-auto
---
```

**功能记忆**（保持详细，但简化）：
```yaml
---
name: orca-calendar-feature
description: orca 二开日历功能（PR #4 已合并）
metadata:
  type: project
  source: manual
  module: calendar
---
```

**设计文档**（保持详细，但简化）：
```yaml
---
title: 日历功能设计方案
date: 2026-08-16
metadata:
  type: design
  module: calendar
---
```

### 关联方式：通过索引，不通过元数据

**MEMORY.md 索引**（核心关联）：
```markdown
## 活跃功能（active/）

- [orca 日历功能](active/orca-calendar-feature.md) — PR #4 已合并；设计文档：`docs/02-功能设计/calendar/2026-08-16-日历功能设计方案.md`
```

### 删除复杂元数据

- 删除 `docs` 字段（关联通过索引）
- 删除 `related` 字段（关联通过索引）
- 删除 `memory` 字段（设计文档不需要引用记忆）

### 保留必要元数据

- `name`、`description`、`type`、`source`
- `module`（可选，便于按模块检索）

## 经验教训

1. **简单可靠**：元数据越简单，维护成本越低
2. **索引为核心**：MEMORY.md 索引是核心关联方式，元数据只是辅助
3. **避免过度设计**：不要为了"完美"而增加复杂度
4. **用户实际需求优先**：用户需要的是能找到文档，而不是复杂的元数据结构
