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

- [orca 笔记功能](active/orca-notes-feature.md) — 2026-09-21 实施完成+编辑器修复+打包验证；PR #23 已合并；语雀式目录树+编辑器（真实文件夹落盘 ~/OrcaNotes）；新增 TopLevelView 12 处注册 checklist 在 daily/2026-09-21
- [orca 日历功能](active/orca-calendar-feature.md) — PR #4 已合并；二期=阴历四层+周末底纹+法定休/班调休表+跨月弱化+验收微调；数据存储 orca-custom.db；**待用户拍板：2027+ 节假日数据更新机制**
- **已完成且稳定的二开功能**（各自设计文档见下 / 明细在 active/ 与 docs/）：日历清单历史周月查看优化（PR #15，纯 renderer）｜orca-custom.db 业务库（PR #6，node:sqlite）｜zcode 智能体类型（PR #5）｜ZCode 使用统计面板（PR #20）｜浏览器自动化 MCP（PR #16+#17，22 工具）｜Pi 智能体入口+用量（镜像 zcode 模式）

## 坑与经验（pitfalls/）

- [同名 agent id 撞车 ⇒ 7 处零冲突标记的静默重复](pitfalls/orca-agent-id-collision-silent-duplicates.md) — **2026-09-26 实测**：上游 `#22464` 加 first-class ZCode 与二开 PR #5 的 zcode 是同一个 CLI 的两个标注 ⇒ git 干净合并零冲突标记；**tsc 只抓 7 处里的 1 处**（只拒对象字面量重复键，数组/联合类型/目录 id 全正常编译）；检测必须 AST（正则误报 91 处）+ 基线差集（全树另有 119 处合法重复）；skills CLI 的 zcode 键靠搜包本体裁决（`--list` 探针不校验）；7 处统一取上游那份
- [PR 门禁地图：直 merge 不触发、首走 PR 全暴露](pitfalls/orca-pr-first-run-gate-map.md) — **2026-09-23 PR #24 实测**：pr.yml 真门禁 = changed（本地等价 `-- $(git rev-parse HEAD^1)` 正确基线）+ typecheck + localization×4，**不跑** native；历次直 merge 从没跑过 ⇒ 首个 PR 一次炸出全部二开存量（anti-slop shape×36、缺键、coverage 文案、断言行逐行推进）；修法速查见坑文件；native 剩 9 个上游 mobile 警告=两侧同态非门禁
- [合并集成缺口靠 tc 兜](pitfalls/orca-merge-integration-gap-typecheck.md) — **2026-09-23**：零/少冲突≠集成完成；上游给共享类型加必填字段（`hasPartialCost`）时二开 zcode/pi 扩展点 TS2741/2739 编译失败，报错文件不在冲突列表；修法按上游同类型成员先例补；`pnpm tc` 是合并后硬门禁
- [打包返工两坑+管道假成功](pitfalls/orca-packaging-rework-20260923.md) — **2026-10-20**：`verify-features` 第 2 项还拦「有未合并的本地分支」（删前先 `for-each-ref --points-at` 确认另有引用）；`.DS_Store` 要**全树清**（本轮 93 个，但**有 5 个被 git 跟踪**不能删）。**2026-09-26 续测**：`build-orca-s.mjs` **硬性拒绝非 custom 分支且无跳过开关** ⇒ 同步 PR 必须先合并才能打包；未跟踪文件只豁免 `?? .codegraph/`。**2026-09-23**：`mobile/` 独立 workspace 须 `cd mobile && pnpm install`（否则 419 expo resolve 错）；gitignored `.DS_Store` 绕过干净检查撞死 buildId CRLF 校验；`cmd | tail` 会把失败显示成 exit 0。**2026-11-13**：`plain-node-entry-guard` 只在打包期跑——二开 main 侧模块**顶层** `import { app } from 'electron'` 会被拖进 backend-entry chunk 直接 Build failed（tc 查不出，改走 `host.userDataPath`）；二开自己的 `build-orca-s.mjs`/`verify-features.mjs` 引用上游旧路径也要同步改，且补丁须先 commit（打包要求工作区干净）
- [changed 门禁大合并后失真](pitfalls/orca-changed-gate-baseline-degenerate.md) — **2026-09-23**：`check:code-quality:changed` 基线 origin/main，合上游后变更集=10173 文件报 3184 存量噪音；改对自己改的文件跑 5 套 oxlint 配置矩阵；zsh `for f in $var` 不分词要用 `${=var}`
- [构建号卡在旧版本](pitfalls/orca-build-version-base.md) — **2026-09-19 实测**：构建号基数 = `max(package.json 版本, 本地最高纯 vX.Y.Z tag)`；上游 main 的 package.json 长期停留旧号（main=1.4.197 而发布 tag 已 v1.4.206，`release:` 提交不在 main 历史）⇒ 本地 tag 过期就会「代码最新但版本号看着旧」；打包前用 `resolveVersionBase` 核对
- [合并上游冲突解法手册](pitfalls/orca-merge-upstream-conflict-playbook.md) — 先判「谁改了这个文件」再取舍（禁 `--ours/--theirs` 一把梭）；8 个冲突的具体解法；en.json 邻接冲突（对象闭合括号在共享后缀）；键丢失核对脚本（注意 `:2:` stage 提交后失效）
- [上游大重构同步套路](pitfalls/orca-upstream-sync-large-refactor.md) — **2026-11-13（5818 提交/55 冲突）**：`merge-tree --name-only` 输出别直接 `wc -l`（Auto-merging 行会造出 187 假数，真值以 `git status` 的 UU/UD 为准）；modify/delete 冲突一律「迁二开 delta 到上游新路径 + `git rm` 旧路径」；批量 import 替换要核对自引用误伤；上游批量删测试先 `git show HEAD:<file>` 判定（二开还可能留着已删功能的陈旧测试）；门禁红先用 HEAD 对照证明是否本次引入
- [orca 浅克隆下的上游同步](pitfalls/orca-shallow-clone-sync.md) — **2026-09-19 实测**：`git fetch upstream` 会静默不更新引用（退出码 0 零输出，实测漏 15 天/1186 提交）；`main` 与上游无共同祖先 ⇒ 三步流程失效，改为直接 `custom merge upstream/main`；恢复需 `--unshallow`
- [fetch 龟速真凶：insteadOf 把 HTTPS 改写回 SSH](pitfalls/orca-fetch-proxy-insteadof-trap.md) — **2026-10-20 实测**：全局 `url.git@github.com:.insteadOf` 让 `http.proxy` 完全失效（`GIT_CURL_VERBOSE` 零输出＝没走 HTTP），fetch 锁死 25KB/s；用**带端口形式** `https://github.com:443/...` 绕开前缀匹配 ⇒ 2.4MB/s（≈90×）。推送把 `gh auth token` 拼进 URL（`gh auth git-credential` 当 helper 时 git 拿不到口令）；别拉 `refs/heads/*`（上游 7982 分支）
- [打包安装 ≠ 升级生效](reference/orca-dev-workflow.md#-安装成功--升级生效2026-09-19-踩坑) — ditto 替换 `/Applications/orca-s.app` 后旧进程仍在跑（`open` 只激活旧实例）；用 `ps aux | grep daemon-entry.js` 看 `--app-version` 判断实际运行版本；若 agent 会话跑在 orca-s 终端内，只能交用户手动重启
- [doc-workflow hook 校验规则](pitfalls/doc-workflow-hook.md) — 设计文档现放 `.workbuddy/docs/<分类>/`，但 hook 仍扫描仓库根 `docs/`
- [GitHub 推送被账户未验证邮箱拦截](pitfalls/orca-github-push-email-verify.md) — 历史 blocker（邮箱拦截未再复现）；推送走 `https://github.com:443` + 代理 + `gh auth token` 拼 URL、`credential.helper` 置空。**2026-11-13**：大包（5818 提交）推送会 HTTP 408，需 `postBuffer=1G + HTTP/1.1 + pack.threads=1 + lowSpeedTime=600`，成功后 `ls-remote` 核对远端 tip（URL 推送不更新本地跟踪引用）
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
- [orca 二开工作流程规范](reference/orca-dev-workflow.md) — 分支结构 + 标准化脚本 + 工程 skill；含「打包安装≠升级生效」（旧进程仍在跑，`ps aux | grep daemon-entry.js` 看 `--app-version`；agent 会话在 orca-s 终端内时只能交用户手动重启）
- [orca 选中代码 AI 解释功能](reference/orca-select-explain-feature.md) — 编辑器选中代码片段→AI 解释（选中即问）；已实现
- [.workbuddy/docs/ 分类整理](reference/orca-workbuddy-docs-classification.md) — 46 篇二开设计文档从 docs/ 迁到 .workbuddy/docs/ 下 8 个分类
- [Orca 外部 agent 集成机制与边界](reference/orca-agent-integration-surfaces.md) — 注册表约 15 处；检测/启动在执行宿主本地；6 种注入模式均要求长驻进程、**无 one-shot 通道**；MCP 只读 4 处配置｜[uni-agent 集成](reference/orca-uni-agent-integration.md) — 待评审：HBuilderX 本地 socket + 一次性 CLI，需自研 PTY 壳才能当 TuiAgent
- [TeleAgent 档位与真实模型](reference/teleagent-model-tiers.md) — 2026-09-25 取证：极速/旗舰只是服务端路由别名（0.2/1.0 倍率），「旗舰」= **GLM-5-Turbo**；提示词禁露模型名｜[本地 API 反向代理](reference/teleagent-proxy.md) — `~/code/aistudy/2026/teleagent/`，4397 端口 + local_auth HMAC，凭据靠 `sudo ps eww` 读环境变量

## 项目结构与工作流

- **合并正确性 skill**：`.workbuddy/skills/upstream-merge-safety/`（重复 id AST 检测 + 语言包三向合并 + 冲突取舍判定表）；**防重踩预检**：`node .agents/skills/orca-dev-workflow/scripts/orca-workflow.mjs preflight`（fetch 静默过期 / main 无共同祖先 / tag 过期致构建号旧 / 运行中仍是旧版）
- [团队知识入库约定](daily/2026-09-04.md#任务团队知识入库约定agentsmd--gitignore) — 记忆、设计文档、踩坑必须提交进仓库共享（`.workbuddy/` 与 `docs/**` 被 gitignore，须 `git add -f`）
- **归档文档**：`docs/05-调研文档/orca-feishu-bitable-research.md`（飞书多维表格调研）、`docs/09-踩坑归档/orca-custom-ci-failures.md`（PR #14 CI 失败根因）、`docs/09-踩坑归档/orca-userdata-path-issue.md`（userData 路径，已修复）

## 设计文档

- **2026-11-13 同步 b0c0377664（5818 提交）**：`.workbuddy/docs/workflow/2026-11-13-上游同步b0c0377664与orca-s重打包影响说明.md` — 55 冲突 + 55 处 tc 集成缺口 + 3 处打包期缺口全修；custom tip `0488b74eddc`（已推）；产物 `1.4.258-local.1794556594904.595c98fa853d` 已装、**待用户 Cmd+Q 重启**；遗留 3378 条陈旧 i18n 键
- **2026-10-20 同步 a18b44bfc0（578 提交）**：`.workbuddy/docs/workflow/2026-10-20-上游同步a18b44bfc0与orca-s重打包影响说明.md` — 9 冲突 + 11 处集成缺口（2 处运行期破损）
- **2026-09-26 同步 8846987c99（131 提交）**：`.workbuddy/docs/workflow/2026-09-26-上游同步8846987c99与合并安全skill说明.md` — 11 冲突 + 7 处静默重复；建 upstream-merge-safety skill
- **2026-09-23 同步（304 提交）**：`.workbuddy/docs/workflow/2026-09-23-切分支删合并分支与上游同步打包说明.md` — 2 冲突 + hasPartialCost 修复，装 `1.4.208-local.1790130615259.*`｜**2026-09-19 同步（1186 提交）**：`.workbuddy/docs/workflow/2026-09-19-上游同步与orca-s打包升级影响说明.md` — 8 冲突全解，装 `1.4.206-local.1789785189109.*`
- **2026-09-13 uni-agent 可行性**：`.workbuddy/docs/zcode/2026-09-13-uni-agent集成方案与可行性分析.md`（待评审）｜**2026-09-12 状态栏 #185**：`.workbuddy/docs/reference/2026-09-12-状态栏报错根因分析与修复建议.md`（已修复）
- **2026-09-04 基础方案（docs/ 根）**：五篇 `docs/2026-09-04-*.md` — 分支结构规范化 / ZCode 全局记忆迁移 / Pi 智能体下拉入口与用量 / 记忆目录优化 / 记忆目录子分类
> AI生成
## 并发会话与中断（2026-10-17）

- [并发会话共用 worktree ⇒ 在途合并被抹掉](pitfalls/orca-concurrent-session-shared-worktree.md) — 2026-10-17 实测：另一会话同目录做同一同步会 reset 掉在途冲突解决。**对策：解完立刻提交、发现并发后停止动索引/工作区、成果存成分支、打包绝不并发**；另附 `ELECTRON_MIRROR` 国内镜像 432KB/s 实测
- 2026-10-17 同步 a87aa4ccdb 的成果（`2c7cc684a7` / 真 merge `e7f4b1863f`）**已被 2026-10-20 的 custom 直推取代**；该轮记的「tc 通过」经复核不成立（见 [集成缺口坑](pitfalls/orca-merge-integration-gap-typecheck.md)）
