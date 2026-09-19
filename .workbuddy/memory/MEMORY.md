---
name: MEMORY
description: > 日记忆已分离到 daily/ 子目录；功能记忆按类型分到 active/pitfalls/reference/ 子目录
metadata:
  type: memory
  source: zcode-auto
---

# MEMORY.md — orca 二开工程精华索引

> 日记忆已分离到 daily/ 子目录；功能记忆按类型分到 active/pitfalls/reference/ 子目录

## 活跃功能（active/）

- [orca 日历功能](active/orca-calendar-feature.md) — PR #4 已合并；二期=阴历四层+周末底纹+法定休/班调休表+跨月弱化+验收微调；数据存储 orca-custom.db；**待用户拍板：2027+ 节假日数据更新机制**
- [orca 日历清单历史周月查看优化](active/orca-calendar-worklist-history.md) — PR #15 已合并；纯 renderer 展示层改造，零 schema/IPC/main 改动
- [orca-custom.db 业务库](active/orca-custom-db.md) — PR #6 已合入 custom；通用业务库 orca-custom.db（node:sqlite 接口）
- [orca zcode 智能体类型](active/orca-zcode-agent-feature.md) — PR #5 已合并；新增 agent 必改注册表
- [orca ZCode 使用统计独立面板](active/orca-zcode-usage-statistics.md) — PR #20 已合并；ZCode 独立 provider 卡片+完整详情面板
- [orca 浏览器自动化 MCP Server](active/orca-browser-automation-mcp.md) — PR #16 + PR #17 已合并；22 个工具；`src/main/browser/mcp/`
- [Pi 智能体下拉入口 + Pi 用量统计](daily/2026-09-04.md#pi-智能体下拉入口--pi-用量统计设计已评审通过) — 已完成并打包；镜像 zcode 模式

## 坑与经验（pitfalls/）

- [orca 浅克隆下的上游同步](pitfalls/orca-shallow-clone-sync.md) — **2026-09-19 实测**：`git fetch upstream` 会静默不更新引用（退出码 0 零输出，实测漏 15 天/1186 提交）；`main` 与上游无共同祖先 ⇒ 三步流程失效，改为直接 `custom merge upstream/main`；恢复需 `--unshallow`
- [打包安装 ≠ 升级生效](reference/orca-dev-workflow.md#-安装成功--升级生效2026-09-19-踩坑) — ditto 替换 `/Applications/orca-s.app` 后旧进程仍在跑（`open` 只激活旧实例）；用 `ps aux | grep daemon-entry.js` 看 `--app-version` 判断实际运行版本；若 agent 会话跑在 orca-s 终端内，只能交用户手动重启
- [doc-workflow hook 校验规则](pitfalls/doc-workflow-hook.md) — 设计文档现放 `.workbuddy/docs/<分类>/`，但 hook 仍扫描仓库根 `docs/`
- [GitHub 推送被账户未验证邮箱拦截](pitfalls/orca-github-push-email-verify.md) — 硬性 blocker；推 GitHub 仍须 https_proxy=127.0.0.1:54687（**2026-09-19 实测 SSH 推送正常，未复现**）
- [元数据复杂度风险](pitfalls/metadata-complexity-risk.md) — 过度设计元数据会导致数据查不到或丢失；简化元数据，通过 MEMORY.md 索引实现关联
- [electron-builder 国内镜像](pitfalls/orca-electron-builder-mirror.md) — .npmrc electron_mirror 对 electron-builder 无效，必须用 `ELECTRON_MIRROR` 环境变量
- [zustand v5 selector 不稳定 ⇒ React #185](pitfalls/zustand-v5-unstable-selector-react-185.md) — **已修复**：1.4.197 打包版状态栏被错误边界兜底；selector 内构造对象必炸，dev 只告警须打包验收；已取上游 `5412276776fb`（=custom `2c4e15b625e8`）


## 参考资料（reference/）

- [orca 体检报告](reference/orca-health-check.md) — 46k stars/日更 66 commits；TS 合计 91.5%；测试占比 52%；二开难度 4/5
- [orca 通知系统+完成通知不弹排查](reference/orca-notification-system.md) — Suppress While Focused 默认 true=设计行为非 bug
- [orca Code Navigation](reference/orca-code-navigation.md) — Command 跳转评估+MVP已落地；纯文本启发式+ripgrep跨文件+13语言provider
- [orca 移动端探索与自建中转](reference/orca-mobile-relay.md) — mobile/=RN(Expo) 配套 App；frp 隧道已实施配通
- [orca fork 二开项目](reference/orca-fork-2dev.md) — penghuizhang/orca 二开；main 纯净、custom 主干；**禁止往 main/master/orca 提 PR**
- [orca 二开工作流程规范](reference/orca-dev-workflow.md) — 分支结构明确；标准化脚本已提交；工程专属 skill `.agents/skills/orca-dev-workflow/`
- [orca 选中代码 AI 解释功能](reference/orca-select-explain-feature.md) — 编辑器选中代码片段→AI 解释（选中即问）；已实现
- [.workbuddy/docs/ 分类整理](reference/orca-workbuddy-docs-classification.md) — 46 篇二开设计文档从 docs/ 迁移到 .workbuddy/docs/ 下 8 个分类目录
- [Orca 外部 agent 集成机制与边界](reference/orca-agent-integration-surfaces.md) — 注册表约 15 处；检测/启动在执行宿主本地；6 种注入模式均要求长驻进程、**无 one-shot 通道**；MCP 只读 4 处配置；附「能否直接注册」三问
- [uni-agent 集成 Orca](reference/orca-uni-agent-integration.md) — **待评审**；uni-agent 是 HBuilderX 本地 socket 客户端 + 一次性 CLI，需自研 PTY 壳才能当 TuiAgent

## 项目结构与工作流

- [团队知识入库约定](daily/2026-09-04.md#任务团队知识入库约定agentsmd--gitignore) — 记忆、设计文档、踩坑必须提交进仓库共享（`.workbuddy/` 与 `docs/**` 被 gitignore，须 `git add -f`）
- **打包安装 ≠ 升级生效（2026-09-19 实测）**：ditto 替换 `/Applications/orca-s.app` 后旧进程仍在跑（`open` 只激活旧实例）；用 `ps aux | grep daemon-entry.js` 看 `--app-version` 判断实际运行版本；若 agent 会话跑在 orca-s 终端内（进程链 `zsh ← zcode-cli ← node ← login ← orca-s Helper ← orca-s`），只能交用户手动重启。详见 [工作流程规范](reference/orca-dev-workflow.md)

## 归档文档（已迁移到 docs/）

- `docs/05-调研文档/orca-feishu-bitable-research.md` — 飞书多维表格集成调研（2026-09-03）
- `docs/09-踩坑归档/orca-custom-ci-failures.md` — CI 失败根因及修复方案（PR #14）
- `docs/09-踩坑归档/orca-userdata-path-issue.md` — userData 路径配置问题（已修复）

## 设计文档

- `.workbuddy/docs/workflow/2026-09-19-上游同步与orca-s打包升级影响说明.md` — **2026-09-19 已实施**：合并上游 1186 提交（8 冲突全解）、electron 43.7.0、新包 `1.4.197-local.1789782638720.140117ca1732` 已装；含冲突解决明细、验证结果、遗留项（main 未同步 / 应用待手动重启）
- `.workbuddy/docs/zcode/2026-09-13-uni-agent集成方案与可行性分析.md` — uni-agent 集成 Orca：**待评审**；结论=上游为一次性 CLI + HBuilderX 本地 socket 客户端（非独立 runtime），需自研 PTY 壳才能当 TuiAgent；含 Phase1 验证清单
- `.workbuddy/docs/reference/2026-09-12-状态栏报错根因分析与修复建议.md` — 状态栏 #185 根因 + 修复与验收记录（已实施）
- `docs/2026-09-04-分支结构规范化说明.md` — 分支结构与 PR 规范
- `docs/2026-09-04-ZCode全局记忆迁移到工程目录方案.md` — 记忆迁移方案
- `docs/2026-09-04-Pi智能体下拉入口与用量统计设计.md` — Pi 智能体功能设计
- `docs/2026-09-04-记忆目录优化方案.md` — 记忆目录优化方案
- `docs/2026-09-04-记忆目录子分类方案.md` — 记忆目录子分类方案
