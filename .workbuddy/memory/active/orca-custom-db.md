---
name: orca-custom-db
description: 第四个二开任务：二开专属通用业务库 orca-custom.db（node:sqlite），日历条目迁入为 v1
  业务表，后续日志等功能加表——用户拍板独立建库；PR #6 已合入 custom 并打包验证
metadata:
  node_type: memory
  type: project
  originSessionId: sess_65ce4132-f06c-4cf8-8c86-ca587383a40c
---

# 二开专属业务库 orca-custom.db（2026-08-16 用户拍板，**PR #6 已合并 + v2 已实施**）

**v2 migration（2026-08-18，自定义分类任务附带）**：新增 `CALENDAR_CATEGORIES_TABLE_MIGRATION`（version 2）——建 calendar_categories 表（id PK/name/color/built_in/sort_order）+ seed 内置 4 类（INSERT OR IGNORE）→ 因**SQLite 不支持 ALTER DROP CHECK，重建 calendar_entries 去 CHECK（建 calendar_entries_v2 新表→INSERT OR IGNORE 拷数据→DROP 旧→RENAME→重建 date 索引，同事务）**；store migration 数组变 `[CALENDAR_ENTRIES_TABLE_MIGRATION, CALENDAR_CATEGORIES_TABLE_MIGRATION]`；新 CalendarCategoriesTable（delete 前查 entries 引用、built_in 不可删改）；SQL 归档 docs/06-SQL脚本/2026-08-18-自定义分类迁移v2.sql（迁移在临时 DB 实测无损+幂等）。**约束后续沿用：二开 SQL 变更都归档 docs/06-SQL脚本/YYYY-MM-DD-用途.sql**。详见 [[orca-calendar-feature]]。

**用户决策**：二开功能数据**不复用 Orca 原生库**（orchestration.db 等），单独建二开专属业务库；接口可用原生 `node:sqlite`；该库是**通用业务库**（不只日历，后续日志等其他功能也加表）；库名 **orca-custom.db**（用户经提问确认，非口误 "circle"），默认路径 `<userData>/profiles/local-default/orca-custom.db`（dev=`~/Library/Application Support/orca-dev/`，打包 orca-s=`~/Library/Application Support/orca-s/`）；**2026-09-02 新增**：支持通过 `customDbPath` 配置项将数据库放到外部目录（如 `/Users/zhangpenghui/software/sqlite/orca-custom.db`），避免版本更新丢失。详见 [[orca-userdata-path-issue]]。

**Orca 原生 sqlite 事实（2026-08-16 调研，纠正早前记录）**：Orca 用 **Node 内置 `node:sqlite`（DatabaseSync）**，封装在 `src/main/sqlite/sync-database.ts`（statement 缓存薄封装），**不是 better-sqlite3**、无 native 打包问题；生产已用于 orchestration.db（`src/main/runtime/orchestration/db.ts`，有自己的 SCHEMA_VERSION v28 迁移体系，不复用）、hermes-cron-output、opencode-usage scanner；Electron 43 内置 Node ≥22.5 可用。

**要迁移的现状（存储链路）**：日历条目存 `<userData>/orca-data.json` 的 `state.calendarEntries` 字段（persistence.ts Store，debounced 落盘+退出 flush）；链路 renderer → preload（`window.orca.calendar.*`，src/preload/index.ts:4781）→ ipcMain（src/main/ipc/calendar.ts）→ Store 5 方法（persistence.ts:5552-5602）；消费点集中（persistence 5 处 + persisted-state-types 类型 + constants.ts:453 默认值），renderer 全走 IPC → **改动可收敛 main 进程，renderer/preload/IPC 零感知**；历法/节假日常量（holiday-data.ts/solar-term.ts）仍是代码内置不迁移。Store 加载是 `JSON.parse as PersistedState` 纯断言 → 移除字段后旧 JSON 多余字段自然忽略（已验证）。

**设计（docs/2026-08-16-日历数据迁移sqlite设计方案.md，待用户评审后实施）**：
- 新目录 `src/main/custom-db/`：`custom-db.ts` 库骨架（直接 DatabaseSync + pragma WAL/synchronous=NORMAL/busy_timeout=5000 + POSIX 0o600 硬化；**通用迁移机制**：MIGRATIONS 数组 + `PRAGMA user_version` 跟踪 + 事务内执行失败回滚）+ `calendar-table.ts`（v1 迁移建 calendar_entries 表：id TEXT PK / date / all_day / start_time / end_time / category CHECK / description / lunar_repeat TEXT(JSON) / created_at / updated_at + date 索引；校验排序复用 shared 层 normalizeCalendarEntry/applyCalendarEntryUpdate/compareCalendarEntriesByStart，行为与现状一致）
- Store 5 方法改委托；`calendarEntries` 从 PersistedState 移除 → **回退 persisted-state-types.ts / constants.ts 两个上游文件的自定义字段（减小上游日更 sync 冲突面，这是迁移的实际收益）**
- 遗留迁移：启动检测 JSON 旧条目 → 逐条 normalize + `INSERT OR IGNORE`（id 主键幂等）→ 全部成功才清 JSON 字段+持久化；失败保留字段+日志下次重试，不阻塞启动
- 未来扩展：新二开功能（如日志）= MIGRATIONS 追加 vN 建表 + 对应 `*-table.ts`，骨架零改动
- 风险：迁库后日历数据唯一副本=orca-custom.db，**不参与 orca-data.json 的备份轮转（LEGACY_BACKUP_COUNT=5，src/main/orca-profiles/）与云 profile 机制**；个人数据量小可接受
- 实施前须备份当前 orca-data.json；走 feature/calendar-sqlite → PR → custom；约束清单见设计文档 §6

**Why:** 用户明确要求二开数据独立成库并强调通用性（后续日志等）；该库是后续二开功能的公共底座，命名/接口/迁移机制决策必须记住。
**How to apply:** 实施时先备份 orca-data.json；按设计文档约束清单自查（renderer/IPC 零改动、不复用不修改 orchestration.db 与 sync-database.ts、迁移幂等失败保留、大 JSON 提交后 json.load）；验收用 sqlite3 CLI 查 `<userData>/orca-custom.db`。相关 [[orca-calendar-feature]] [[orca-fork-2dev]]

**实施完成（2026-08-16 深夜，feature/calendar-sqlite → PR #6 已创建）**：
- custom-db.ts 骨架：migrations 由构造参数注入（避免骨架↔业务表循环依赖）；CustomDb 暴露 `database` getter 供业务表用原生 DatabaseSync
- calendar-table.ts：create() 生成 id + `insert()`（INSERT OR IGNORE 保留原 id 供迁移幂等）；lunar_repeat JSON 往返经 normalize 校验；非法行读时丢弃
- persistence.ts：Store 构造创建 CustomDb（路径 `join(dirname(dataFile),'orca-custom.db')`，跟随 profile 数据文件）+ 5 方法委托（create/update/delete 不再触发 orca-data.json flush，数据已不在 state）+ `migrateLegacyCalendarEntries()`（构造末尾：旧 JSON 条目逐条 insert，全部成功才 delete 字段+scheduleSave，失败保留下次重试）
- 回退 persisted-state-types.ts:107 / constants.ts:453 的 calendarEntries（上游文件零二开字段）
- 测试 13 例（custom-db：升级/回滚/幂等 4 例；calendar-table：CRUD/lunarRepeat/排序/非法行/insert 幂等 9 例）+ persistence 相关 101 例全过；typecheck 三套绿；备份 orca-dev/orca-data.json.bak-20260816-sqlite-migration
- 提交 1304488b8（+549/-50）；PR #6 https://github.com/penghuizhang/orca/pull/6 待用户合并验收
