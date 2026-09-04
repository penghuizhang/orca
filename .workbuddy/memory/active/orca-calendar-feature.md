---
name: orca-calendar-feature
description: orca 二开日历功能（一期+优化轮+二期个性化+验收微调全部完成，PR #4 已合并 custom）
metadata:
  type: project
---

# Orca 日历功能

## 状态：已完成并合入 custom（PR #4，commit 4a5412023）

## 功能清单

### 一期（2026-08-16）
- 月视图（周一开头/农历/今天红圈）
- 分类筛选+迷你月历、当日面板、条目 CRUD
- orca-data.json 持久化、TopLevelView 'calendar' 全接线
- 设计文档：`.workbuddy/docs/calendar/2026-08-16-日历功能设计方案.md`

### 优化轮（2026-08-16）
- 点日期格子→选中+开新建弹窗（预填所点日期）
- zh.json 补全 36 个 calendar 键 + SidebarNav.calendar=日历
- 设计文档：`.workbuddy/docs/calendar/2026-08-16-日历优化-点击建条目与国际化.md`

### 二期个性化（2026-08-16，55/55 单测全绿）
1. **阴历四层**：节日+节气标注、农历年月增强、显示开关、农历日期排期
2. **周末特殊标记**：周六日底纹+表头红字+迷你月历红字
3. **法定节假日休/班+调休**：2025/2026 例外表（gov.cn 通知原文），2027 待发布逐年补
4. **跨月高亮当月**：相邻月 bg-muted/20 + chips opacity-60
- 设计文档：`.workbuddy/docs/calendar/2026-08-16-日历二期个性化功能设计.md`

### 周概览+复制清单（PR #8，2026-08-18）
- 底部本周概览条（分类计数+工时合计）
- 复制本周清单弹窗（预览 Markdown 按天分组可复制即填报）
- 设计文档：`.workbuddy/docs/calendar/2026-08-18-日历周视图与工时汇总设计.md`

### 清单格式简化+分类自定义（2026-08-18）
- 清单改按天 `1. 标题` 编号，去时间/工时/分类标签/小计/合计
- 分类自定义 = CalendarCategory 泛化 string + v2 migration 建 calendar_categories 表
- 4 个 calendar:categories:* IPC + 管理对话框
- 设计文档：`.workbuddy/docs/calendar/2026-08-18-清单格式简化与自定义分类设计.md`

### 清单历史周月查看（PR #15，2026-08-26）
- 「复制本周清单」泛化为任意区间（周/月/自定义）可查看+复制
- 纯 renderer 展示层改造，零 schema/IPC/main 改动
- 设计文档：`.workbuddy/docs/calendar/2026-08-26-日历清单历史周月查看优化设计.md`

### 数据库外部存储（2026-09-02）
- 新增 customDbPath 配置项（Settings → Advanced → Database）
- 修复 configurePackagedUserDataPath() 未调用问题
- 设计文档：`.workbuddy/docs/calendar/2026-09-02-日历数据库外部存储方案.md`

## 重要事实

- **数据存储**：日历条目存 orca-data.json（非 sqlite，懒创建），历法数据是代码常量
- **i18n 惯例**：en.json 由 sync 自动补，zh/es/ja/ko 手工补键
- **待拍板**：2027+ 节假日数据更新机制（A 代码维护推荐/B JSON/C 应用内 UI）

## 坑

- cn() 里避免 py-* 与 pt-*/pb-* 混用依赖 twMerge 合并，用三元显式切换
- i18next 复数变体键需保留基础键
- SQLite 不能 DROP CHECK，须建新表拷数据
