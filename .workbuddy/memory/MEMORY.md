---
name: MEMORY
description: > 日记忆已分离到 daily/ 子目录；功能记忆按类型分到 active/pitfalls/reference/ 子目录
metadata:
  type: memory
  source: zcode-auto
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '854a78a9-b2f1-44ee-ac04-752659fc80ef'
  PropagateID: '854a78a9-b2f1-44ee-ac04-752659fc80ef'
  ReservedCode1: 'f162e97e-4f90-4e11-b270-0d49f3dfaf94'
  ReservedCode2: 'f162e97e-4f90-4e11-b270-0d49f3dfaf94'
---

# MEMORY.md — orca 二开工程精华索引

> 日记忆已分离到 daily/ 子目录；功能记忆按类型分到 active/pitfalls/reference/ 子目录

## 活跃功能（active/）

- [orca 笔记功能](active/orca-notes-feature.md) — 2026-09-21 实施完成+编辑器修复+打包验证；PR #23 待合并；语雀式目录树+编辑器（真实文件夹落盘 ~/OrcaNotes）；新增 TopLevelView 12 处注册 checklist 在 daily/2026-09-21
- [orca 日历功能](active/orca-calendar-feature.md) — PR #4 已合并；二期=阴历四层+周末底纹+法定休/班调休表+跨月弱化+验收微调；数据存储 orca-custom.db；**待用户拍板：2027+ 节假日数据更新机制**
- [orca 日历清单历史周月查看优化](active/orca-calendar-worklist-history.md) — PR #15 已合并；纯 renderer 展示层改造，零 schema/IPC/main 改动
- [orca-custom.db 业务库](active/orca-custom-db.md) — PR #6 已合入 custom；通用业务库 orca-custom.db（node:sqlite 接口）
- [orca zcode 智能体类型](active/orca-zcode-agent-feature.md) — PR #5 已合并；新增 agent 必改注册表
- [orca ZCode 使用统计独立面板](active/orca-zcode-usage-statistics.md) — PR #20 已合并；ZCode 独立 provider 卡片+完整详情面板
- [orca 浏览器自动化 MCP Server](active/orca-browser-automation-mcp.md) — PR #16 + PR #17 已合并；22 个工具；`src/main/browser/mcp/`
- [Pi 智能体下拉入口 + Pi 用量统计](daily/2026-09-04.md#pi-智能体下拉入口--pi-用量统计设计已评审通过) — 已完成并打包；镜像 zcode 模式

## 坑与经验（pitfalls/）

- [同名 agent id 撞车 ⇒ 7 处零冲突标记的静默重复](pitfalls/orca-agent-id-collision-silent-duplicates.md) — **2026-09-26 实测**：上游 `#22464` 加 first-class ZCode 与二开 PR #5 的 zcode 是同一个 CLI 的两个标注 ⇒ git 干净合并零冲突标记；**tsc 只抓 7 处里的 1 处**（只拒对象字面量重复键，数组/联合类型/目录 id 全正常编译）；检测必须 AST（正则误报 91 处）+ 基线差集（全树另有 119 处合法重复）；skills CLI 的 zcode 键靠搜包本体裁决（`--list` 探针不校验）；7 处统一取上游那份
- [PR 门禁地图：直 merge 不触发、首走 PR 全暴露](pitfalls/orca-pr-first-run-gate-map.md) — **2026-09-23 PR #24 实测**：pr.yml 真门禁 = changed（本地等价 `-- $(git rev-parse HEAD^1)` 正确基线）+ typecheck + localization×4，**不跑** native；历次直 merge 从没跑过 ⇒ 首个 PR 一次炸出全部二开存量（anti-slop shape×36、缺键、coverage 文案、断言行逐行推进）；修法速查见坑文件；native 剩 9 个上游 mobile 警告=两侧同态非门禁
- [合并集成缺口靠 tc 兜](pitfalls/orca-merge-integration-gap-typecheck.md) — **2026-09-23**：零/少冲突≠集成完成；上游给共享类型加必填字段（`hasPartialCost`）时二开 zcode/pi 扩展点 TS2741/2739 编译失败，报错文件不在冲突列表；修法按上游同类型成员先例补；`pnpm tc` 是合并后硬门禁
- [打包返工两坑+管道假成功](pitfalls/orca-packaging-rework-20260923.md) — **2026-09-23**：`mobile/` 独立 workspace 须 `cd mobile && pnpm install`（否则 419 expo resolve 错）；gitignored `.DS_Store` 绕过干净检查撞死 buildId CRLF 校验；`cmd | tail` 会把失败显示成 exit 0
- [changed 门禁大合并后失真](pitfalls/orca-changed-gate-baseline-degenerate.md) — **2026-09-23**：`check:code-quality:changed` 基线 origin/main，合上游后变更集=10173 文件报 3184 存量噪音；改对自己改的文件跑 5 套 oxlint 配置矩阵；zsh `for f in $var` 不分词要用 `${=var}`
- [构建号卡在旧版本](pitfalls/orca-build-version-base.md) — **2026-09-19 实测**：构建号基数 = `max(package.json 版本, 本地最高纯 vX.Y.Z tag)`；上游 main 的 package.json 长期停留旧号（main=1.4.197 而发布 tag 已 v1.4.206，`release:` 提交不在 main 历史）⇒ 本地 tag 过期就会「代码最新但版本号看着旧」；打包前用 `resolveVersionBase` 核对
- [合并上游冲突解法手册](pitfalls/orca-merge-upstream-conflict-playbook.md) — 先判「谁改了这个文件」再取舍（禁 `--ours/--theirs` 一把梭）；8 个冲突的具体解法；en.json 邻接冲突（对象闭合括号在共享后缀）；键丢失核对脚本（注意 `:2:` stage 提交后失效）
- [orca 浅克隆下的上游同步](pitfalls/orca-shallow-clone-sync.md) — **2026-09-19 实测**：`git fetch upstream` 会静默不更新引用（退出码 0 零输出，实测漏 15 天/1186 提交）；`main` 与上游无共同祖先 ⇒ 三步流程失效，改为直接 `custom merge upstream/main`；恢复需 `--unshallow`
- [打包安装 ≠ 升级生效](reference/orca-dev-workflow.md#-安装成功--升级生效2026-09-19-踩坑) — ditto 替换 `/Applications/orca-s.app` 后旧进程仍在跑（`open` 只激活旧实例）；用 `ps aux | grep daemon-entry.js` 看 `--app-version` 判断实际运行版本；若 agent 会话跑在 orca-s 终端内，只能交用户手动重启
- [doc-workflow hook 校验规则](pitfalls/doc-workflow-hook.md) — 设计文档现放 `.workbuddy/docs/<分类>/`，但 hook 仍扫描仓库根 `docs/`
- [GitHub 推送被账户未验证邮箱拦截](pitfalls/orca-github-push-email-verify.md) — 硬性 blocker；推 GitHub 仍须 https_proxy=127.0.0.1:54687（**2026-09-19 实测 SSH 推送正常，未复现**）
- [元数据复杂度风险](pitfalls/metadata-complexity-risk.md) — 过度设计元数据会导致数据查不到或丢失；简化元数据，通过 MEMORY.md 索引实现关联
- [electron-builder 国内镜像](pitfalls/orca-electron-builder-mirror.md) — .npmrc electron_mirror 对 electron-builder 无效，必须用 `ELECTRON_MIRROR` 环境变量
- [zustand v5 selector 不稳定 ⇒ React #185](pitfalls/zustand-v5-unstable-selector-react-185.md) — **已修复**：1.4.197 打包版状态栏被错误边界兜底；selector 内构造对象必炸，dev 只告警须打包验收；已取上游 `5412276776fb`（=custom `2c4e15b625e8`）
- [虚拟 worktree EditorPanel 加载失败](pitfalls/orca-virtual-worktree-editor-loading.md) — **已修复**：新 TopLevelView 的虚拟 worktree ID 必须在 3 处（connection-owner-resolution + editor-file-operation-owner×2）标记为 local-only，否则 EditorPanel 走远程 host 连接；用 `isLocalOnlyVirtualWorktree()` 统一处理
- [node:sqlite 打包验证失败](pitfalls/orca-node-sqlite-packaging.md) — **已修复**：Node 22 的 `node:sqlite` 不在 `builtinModules` 中，打包验证脚本误判为外部依赖；需在 `config/packaged-runtime-node-modules.cjs` 的 `NODE_BUILTINS` 手动添加
- [mobile 独立 workspace 打包坑](reference/orca-dev-workflow.md#-mobile-是独立-workspace根-install-不覆盖2026-09-23-踩坑) — **2026-09-23 实测**：上游把 `build:mobile-web` 改走 app-bundle 新脚本后，打包前必须 `cd mobile && pnpm install`，否则 419 个 expo/react-native-web resolve 错挂掉打包；另 changed 门禁基线是 origin/main、合并上游后失真勿用；勿用 `cmd | tail` 的退出码判打包成败


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
- [TeleAgent 档位与真实模型](reference/teleagent-model-tiers.md) — **2026-09-25 实机取证**：极速/旗舰只是服务端路由别名（chat-flash 倍率 0.2 / chat-flagship 1.0）；应用内 `Rie` 表把「旗舰」等同 **GLM-5-Turbo**（`jJe("flagship")={chat-flagship, glm-5-turbo}`），极速无对应真名记录；产品提示词明令 NewApi/ 前缀不得暴露模型名；含取证路径、死胡同、llm_tap 玩法与授权边界
- [TeleAgent 本地 API 反向代理](reference/teleagent-proxy.md) — 独立探索工程 `~/code/aistudy/2026/teleagent/`；4397 端口 + local_auth HMAC 签名；凭据靠 `sudo ps eww` 读 im-service 环境变量，PID 变即失效

## 项目结构与工作流

- **合并正确性 skill（2026-09-26 新增）**：`.workbuddy/skills/upstream-merge-safety/` —— 重复 id 检测脚本（AST + 基线差集）+ i18n 语言包按键三向合并脚本 + 冲突取舍判定表；`orca-dev-workflow` 管流程，新 skill 管正确性
- **防重踩预检（同步/打包前先跑）**：`node .agents/skills/orca-dev-workflow/scripts/orca-workflow.mjs preflight` —— 一条命令自动查「fetch 静默过期 / main 无共同祖先 / 发布 tag 过期致构建号旧 / 运行中仍是旧版」，覆盖四个坑；脚本在 `.agents/skills/`（本机，不提交）
- [团队知识入库约定](daily/2026-09-04.md#任务团队知识入库约定agentsmd--gitignore) — 记忆、设计文档、踩坑必须提交进仓库共享（`.workbuddy/` 与 `docs/**` 被 gitignore，须 `git add -f`）
- **打包安装 ≠ 升级生效（2026-09-19 实测）**：ditto 替换 `/Applications/orca-s.app` 后旧进程仍在跑（`open` 只激活旧实例）；用 `ps aux | grep daemon-entry.js` 看 `--app-version` 判断实际运行版本；若 agent 会话跑在 orca-s 终端内（进程链 `zsh ← zcode-cli ← node ← login ← orca-s Helper ← orca-s`），只能交用户手动重启。详见 [工作流程规范](reference/orca-dev-workflow.md)

## 归档文档（已迁移到 docs/）

- `docs/05-调研文档/orca-feishu-bitable-research.md` — 飞书多维表格集成调研（2026-09-03）
- `docs/09-踩坑归档/orca-custom-ci-failures.md` — CI 失败根因及修复方案（PR #14）
- `docs/09-踩坑归档/orca-userdata-path-issue.md` — userData 路径配置问题（已修复）

## 设计文档

- `.workbuddy/docs/workflow/2026-09-26-上游同步8846987c99与合并安全skill说明.md` — **2026-09-26 已实施**：PR #24 已合并（`e566cd15`）后同步上游 131 提交到 `8846987c99`；11 冲突（main.css 并集 / 6 语言包按键语义合并 / 3 处取上游排序 / skills 键实测保留 `zcode: null`）+ **7 处零冲突标记的静默重复**（zcode 撞车，tsc 只抓 1 处，检测脚本全抓）；键丢失审计双方零丢失；新建 `upstream-merge-safety` skill
- `.workbuddy/docs/workflow/2026-09-23-切分支删合并分支与上游同步打包说明.md` — **2026-09-23 已实施**：切 custom + 删已合并分支（feat/notes-editor-fix 本地+远端）+ 强拉上游 304 提交合并（2 冲突叠加 + hasPartialCost 集成修复，三向键位零丢失）+ 打包安装 **`1.4.208-local.1790130615259.c8f75151e828`**（返工 2 次：mobile 独立 workspace 未装依赖、.DS_Store 撞 buildId 校验）；回退锚点 `backup/pre-sync-2026023`；遗留=用户手动重启 orca-s
- `.workbuddy/docs/workflow/2026-09-19-上游同步与orca-s打包升级影响说明.md` — **2026-09-19 已实施**：合并上游 1186 提交（8 冲突全解）+ 追平最新 6 提交（`e2afb5eef9`）、electron 43.7.0、修掉「构建号卡 197」后装出版本 **`1.4.206-local.1789785189109.117aa480069c`**；含冲突明细、版本号机制、验证结果、遗留项（main 未同步 / 应用待手动重启）
- `.workbuddy/docs/zcode/2026-09-13-uni-agent集成方案与可行性分析.md` — uni-agent 集成 Orca：**待评审**；结论=上游为一次性 CLI + HBuilderX 本地 socket 客户端（非独立 runtime），需自研 PTY 壳才能当 TuiAgent；含 Phase1 验证清单
- `.workbuddy/docs/reference/2026-09-12-状态栏报错根因分析与修复建议.md` — 状态栏 #185 根因 + 修复与验收记录（已实施）
- `docs/2026-09-04-分支结构规范化说明.md` — 分支结构与 PR 规范
- `docs/2026-09-04-ZCode全局记忆迁移到工程目录方案.md` — 记忆迁移方案
- `docs/2026-09-04-Pi智能体下拉入口与用量统计设计.md` — Pi 智能体功能设计
- `docs/2026-09-04-记忆目录优化方案.md` — 记忆目录优化方案
- `docs/2026-09-04-记忆目录子分类方案.md` — 记忆目录子分类方案

> AI生成