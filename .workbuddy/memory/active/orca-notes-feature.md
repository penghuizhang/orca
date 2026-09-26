---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '87d5ce57-927d-4901-98a3-12051a22adb1'
  PropagateID: '87d5ce57-927d-4901-98a3-12051a22adb1'
  ReservedCode1: 'ec9c0481-e99e-4de6-ac7f-cc945672cac3'
  ReservedCode2: 'ec9c0481-e99e-4de6-ac7f-cc945672cac3'
---

# orca 笔记功能（语雀式本地笔记）

- 首次实现：2026-09-21，一次实施完成
- 设计文档：`.workbuddy/docs/notes/2026-09-21-笔记功能设计方案.md`（含 §八实施记录）
- 原型：`.workbuddy/docs/notes/2026-09-21-笔记功能原型.html`
- 日志：`daily/2026-09-21.md`

## 功能形态

侧边栏「笔记」入口（日历下方，NotebookPen 图标）→ `TopLevelView 'notes'` → `NotesPage` 两栏：左目录树（真实文件夹 + .md 落盘，默认根 `~/OrcaNotes` 可切换）+ 右编辑器（与浮动工作区 100% 同链路：工具栏/大纲/斜杠命令/搜索/自动保存全保留）。浮动工作区共存不动。

## 架构关键点（二开续接必读）

1. **存储**：真实文件夹即真相源，无 SQLite。根目录配置 `settings.notesRootDirectory`（默认值常量 `DEFAULT_NOTES_ROOT_DIRECTORY` 在 `src/shared/constants.ts`，与 `NOTES_WORKTREE_ID='global-notes'` 同文件）。
2. **主进程只有一个 handler**：`notes:getRootDirectory`（`src/main/ipc/notes-directory.ts`）——展开 `~` → 首次 mkdir → `authorizeExternalPath` 会话授权 → 返回绝对路径。之后全部 CRUD 复用 `window.api.fs.*`（已过 `resolveAuthorizedPath` 白名单）。
3. **编辑器**：树点击 → `openFile({ worktreeId: NOTES_WORKTREE_ID, runtimeEnvironmentId: null, suppressActiveRuntimeFallback: true })` → `<EditorPanel activeFileId />`。保存/脏状态/Cmd+S 全由现有机制承担，编辑器零改动。
4. **新视图注册 12 处 checklist**（比日历时代的 9 处多了 replay 分支、prevView 初始值、web-app-api 适配层）：见 daily/2026-09-21 经验沉淀。
5. **i18n**：`auto.components.notes.*` 27 键 ×6 语言；fallback 与 en.json 一致 ⇒ 不进 runtime-required。

## 二期候选（未做）

多标签打开笔记 / ripgrep 跨笔记全文搜索 / `[[链接]]` 互链（复用 MarkdownDocLink）/ 新建模板（纪要·日报）/ 目录 watch 外部改动自动刷新 / 最近打开下拉。

## 编辑器加载修复（2026-09-21 已实施）

- 根因：`NOTES_WORKTREE_ID` 没有像 `FLOATING_TERMINAL_WORKTREE_ID` 一样在 3 个位置被标记为 local-only
- 修复：引入 `isLocalOnlyVirtualWorktree()` 共享谓词（`src/shared/constants.ts`），扩展 3 处现有 special-case
- 改动文件：constants.ts / connection-owner-resolution.ts / editor-file-operation-owner.ts（共 4 文件）
- 冒烟验证：✅ 编辑器加载成功，工具栏完整渲染

## 打包验证

- 2026-09-21：`1.4.206-local.1789965906013.ac6c942591fd`，arm64/x64 DMG 验证通过，已安装需手动重启
- 2026-09-23：随上游同步（304 提交）重打包 `1.4.208-local.1790130615259.c8f75151e828`；notes 键位三向核对六语言零丢失、notes 单测 10/10

## PR 状态

- **PR #23 已合并**（2026-09-23 确认）：origin/custom 曾含 merge commit `4cb9ea278c`；分支 `feat/notes-editor-fix` 已删（本地 + 远端）
- 删除前验证：`git diff feat origin/custom` 为空 + `git cherry` 等价（- 号）——PR 经 GitHub API 重建过提交，远端 `475824e224a5` 与本地 `070b951f20` 哈希不同但补丁零差异，故 `branch -D` 安全
- 当时推送方式：GitHub API 逐 blob 上传（代理阻塞 + SSH DNS 不通；2026-09-23 实测 SSH push 正常，无需 API 变通）

> AI生成
