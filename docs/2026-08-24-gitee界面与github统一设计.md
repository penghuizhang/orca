# Gitee 界面与 GitHub 视觉统一设计

日期：2026-08-24
类型：UI 统一设计（调研结论 + 实施方案，待评审）
前置：[gitee-cli 结合方案分析](2026-08-24-gitee-cli结合方案分析.md)、[gitee 创建 PR 集成设计](2026-08-24-gitee创建PR集成设计.md)

## 1. 用户问题

> 界面样式效果能和 GitHub 的一样吗？我们现在是完成了一些，但是和 GitHub 的效果感觉不统一。

## 2. 实地核查结论

### 2.1 好消息：基础已经对齐
- Gitee 看板（`TaskPage.tsx` 内联段，约 11242 行起）结构已"对齐 GitHub"：五列（ID/标题/负责人/状态/更新）、`GitPullRequest`/`CircleDot` 图标、状态筛选 + 搜索 + 项目多选下拉、lucide 图标。
- `GiteeItemDialog.tsx` 用的是**规范 shadcn 原语**（`Dialog`/`ScrollArea`/`Tabs`）+ `cn`/`translate`，不是裸 HTML。

### 2.2 真分歧（有据可查）
对照 `docs/STYLEGUIDE.md` 与 `src/renderer/src/assets/main.css`：

| # | 分歧 | 证据 | 违反规范 |
|---|---|---|---|
| 1 | **裸状态色**，未走语义 token | 看板用 `bg-emerald-500/15 text-emerald-600` / `bg-purple-500/15 text-purple-600`；main.css 已有 `--status-success`(+`-background`/`-border`)、对应 purple/closed token | STYLEGUIDE「Never hardcode a hex... if a variable already covers it」 |
| 2 | **大量任意字号** | Gitee 看板/对话框集中使用 `text-[10px]`×34、`text-[11px]`×43、`text-[12px]`×23、`text-[13px]`×12（共 112 处）；GitHub 同款走规范字阶 `text-xs`/`text-sm` | STYLEGUIDE「字号走规范字阶，不得自造」 |
| 3 | **架构未抽取** | Gitee 看板仍**内联在 `TaskPage.tsx`（14090 行）**手写 JSX，原计划抽成独立 `GiteeTasksBoard.tsx` 未落地；GitHub 有独立任务子系统（preset/search/`GithubTaskDrawer`） | AGENTS「单文件超长 / max-lines 风险」；copy 架构本意是"独立文件收敛" |
| 4 | **重复元素** | 看板里状态 badge 出现两次（标题后 + 状态列），GitHub 单行一次 | 视觉噪声 |
| 5 | **详情对话框密度低** | `GiteeItemDialog` 是自定义 3 页签对话；GitHub PR 详情（checks/reviews/timeline/diff）密度更高、观感更"重" | 功能/观感不一致 |
| 6 | **右栏 hosted-review 缺口** | GitHub PR 在 source-control 面板有状态/checks/review；Gitee 目前几乎没有 | 表面不统一（**Phase 1 创建 PR 设计落地后，Gitee PR 将复用同一 hosted-review 表面，是最大统一增益**） |

### 2.3 关键判断
**能统一，且与「copy 架构」决策不冲突。**
- copy 架构的初衷是**不复用 GitHub 的数据绑定渲染组件**（躲上游日更对 GitHub 组件的破坏）。
- 视觉统一靠的是**同一套 token / shadcn 原语 / 规范字阶 / 间距 + 抽取独立组件复用共享 presentational 构件**——这恰是 STYLEGUIDE 的硬性要求，与"不绑 GitHub 数据流"是两件事，可两全。

## 3. 统一方案（三档，由浅入深）

### L1 快速收敛（推荐先做，零架构改动）
纯样式对齐，风险低，直接消除 #1/#2/#4：
- 把 Gitee 看板 + `GiteeItemDialog` 的裸色换成 main.css 语义 token：open→`--status-success*`、merged→对应 purple token、closed/draft→`muted` 系。
- 把 `text-[Npx]` 全部替换为规范字阶（`text-[10px]`→`text-xs` 之类，按 STYLEGUIDE 字阶映射）。
- 去掉看板里重复的状态 badge（保留状态列一处）。
- 间距/行高对齐 GitHub 任务行。
- 验证：oxlint + 视觉 CDP 对比（dev 起两个 provider 并排截图比对）。

### L2 结构收敛（解 max-lines + 复用构件）
- 把 Gitee 看板从 `TaskPage.tsx` 抽出 **`GiteeTasksBoard.tsx`**（原计划，顺带消除 14090 行单文件风险）。
- 让其消费与 GitHub 看板相同的**共享 presentational 构件**（行 `Row`、头像 `Avatar`、标签 `LabelChip`、状态 `StateBadge`）——若 GitHub 侧尚无共享构件，则先对齐其 markup/间距，预留复用点。
- 收益：代码层面不再漂移，未来上游改 GitHub 行样式时 Gitee 可同步。

### L3 深度统一（可选，受数据模型制约）
- `GiteeItemDialog` 复用 GitHub PR 详情的 **presentational** 构件（checks / timeline / diff 区块），但不复用其数据绑定组件（Gitee issue 号为字母数字、PR 号为整数，模型不同）。
- 受上游 churn 风险制约，建议**仅重样式、不重用 GitHub 数据组件**，保持 copy 架构边界。

### 叠加项：Phase 1 创建 PR 设计
前一份设计（右栏 hosted-review 接 Gitee）落地后，Gitee PR 与 GitHub PR 将**共用 source-control 面板的同一套状态/checks/review 展示**——这是"像 GitHub 一样"最直接、增益最大的统一点，应优先于 L2/L3 排期。

## 4. 约束核对
- 【约束】STYLEGUIDE：颜色用 main.css token，不硬编码 hex；字号走规范字阶，不自造 → L1 直接满足。
- 【约束】shadcn 原语优先（`src/renderer/src/components/ui/`），不重造 headless 行为 → L2 复用构件时满足。
- 【约束】跨平台：纯前端样式，无平台分支。
- 【约束】不禁用 oxlint max-lines；L2 抽 `GiteeTasksBoard` 恰好消除单文件超长风险。
- 【约束】i18n：新 copy 走 `translate`，新增 key 跑 `sync:localization-catalog`（fork 键 gitee×N 保留）。
- 【约束】copy 架构边界：L2/L3 只复用 presentational 构件，不绑 GitHub 数据流 → 不 reintroduce 上游 churn 风险。

## 5. 实施顺序与待拍板
1. **先做 Phase 1（创建 PR 集成）**——右栏统一增益最大。
2. **L1 样式收敛**——小步、低风险、直接消除最刺眼的裸色/任意字号。
3. **L2 结构收敛**——抽 `GiteeTasksBoard` + 共享构件。
4. **L3**（可选）——对话框深度统一。

待拍板：
- A. 是否接受"视觉统一 ≠ 复用 GitHub 组件"的边界（即 L2/L3 只复用 presentational 构件）？
- B. 排期：Phase 1 优先，L1 紧随，L2/L3 是否要做、何时做？
- C. L1 是否要我先做一轮 `TaskPage.tsx` Gitee 段 + `GiteeItemDialog.tsx` 的 token/字阶替换（纯样式 PR）。

## 6. 结论
Gitee 界面**能**和 GitHub 统一，且基础已在。当前"不统一"的硬证据是：裸状态色（应换 `--status-*` token）+ 112 处任意字号（应换规范字阶）+ 看板未抽独立组件 + 右栏 hosted-review 缺口。最优先的统一动作是落地前一份的 Phase 1（右栏共面），随后用 L1 纯样式收敛消除裸色/字号，再用 L2 抽组件复用共享构件——全程不触碰 copy 架构的数据流边界。
