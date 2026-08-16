# MEMORY.md — orca 二开工程精华索引

- [2026-08-16 日历功能](2026-08-16.md) — calendar-feature 分支（**全功能+优化均未提交**，尽快 commit 防共享目录事故）；一期（月视图/农历/分类/CRUD/持久化）已实现；优化轮（点击格子弹新建、zh.json 补 36 键国际化、en title 键拆 pageTitle）已全绿验证；设计文档 docs/2026-08-16-日历功能设计方案.md + docs/2026-08-16-日历优化-点击建条目与国际化.md；【惯例】en.json 由 sync 自动补、**zh/es/ja/ko 手工补键**
- [2026-08-16 调研：二开可行性 + fork 同步策略](2026-08-16.md) — 上游日更（v1.4.18x）、MIT、有 skills/ 扩展机制；main 纯净跟踪上游、定制走独立分支；二开文档放 .workbuddy/ 不碰上游 docs/
- [2026-08-16 环境搭建](2026-08-16.md) — Node 24.19.0 已装；【坑】本机 nvm use 24 失败，必须 `nvm use 24.19`，非交互 shell 用 PATH 注入 `$HOME/.nvm/versions/node/v24.19.0/bin`；`pnpm dev` 已验证可跑；打包用 `pnpm build:mac`
- [2026-08-16 项目体检报告](docs/2026-08-16-项目体检报告.md) — 46k stars/日更 66 commits；322.5 万行 TS（91.5%），52% 是测试；Node 24 + pnpm 10.24 硬锁；二开难度 4/5，定制可走 skills/CLI 层绕开核心
- [2026-08-16 Gitee 集成方案（第一个二开任务）](docs/2026-08-16-Gitee集成评估与方案.md) — Orca 已有多 provider 架构（forge-provider.ts 注册 5 家，加 provider=新增实现+注册一行）；Gitee 无官方 CLI 须走 HTTP+PAT（仿 bitbucket）；分级 L0 识别/L1 PR+Issue 浏览/L2 深功能；待用户拍板范围；**L2-B 看板入口可见性修复（161a378e3）**：存量 profile 的 visibleTaskProviders 缺 gitee 致入口隐藏，照搬 jira 一次性迁移加 visibleTaskProvidersDefaultedForGitee；docs/2026-08-16-任务页Gitee看板.md
- [2026-08-16 zcode 多模态诊断](2026-08-16.md) — 【坑】opencode-go 商全部模型（含用户自配 mimo-v2.5-free，网关报 not supported）无视觉；唯一可用=智谱免费 glm-4.1v-thinking-flash；已写 ~/.zcode/cli/config.json + v2/agents-state.json 子代理模型覆盖，待桌面版重启验证
- [2026-08-16 orca-s 打包（custom）](2026-08-16.md) — 一键 `node config/scripts/build-orca-s.mjs [--install]` 只能 custom 分支；**默认只打 arm64**（ORCA_MAC_TARGET_ARCHS，--x64 可选）；electron 下载走 npmmirror（腾讯云/清华无 electron 镜像，实测 404）；【坑】run() env 合并顺序（注入 PATH 必须后置生效，否则 electron-builder 跑 shell 默认 node v22 误判 node:sqlite）；【坑】打包产物双击打不开=Gatekeeper 拒 adhoc 未公证（spctl rejected），应用正常，用 `open /Applications/orca-s.app` 或右键打开
