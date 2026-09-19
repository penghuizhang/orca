---
name: orca-dev-workflow
description: Orca 二开工作流程规范——分支结构、同步流程、打包前检查清单、版本号策略
metadata:
  node_type: memory
  type: project
  originSessionId: sess_0bd3b2f6-85c1-4b31-8df2-f82b288c3492
---

# Orca 二开工作流程规范（2026-09-02 建立）

## 分支结构

- **upstream/main**：官方上游代码
- **main**：纯净分支，仅同步上游代码（`--ff-only`），不包含任何二开功能
- **custom**：二开主干，包含所有二开功能，开发基于此分支
- **feature/xxxx**：具体功能开发分支，从 custom 或 main 切出

### ⚠️ PR 目标分支（核心规则，不得违反）

**功能分支（feature/xxxx）开发完成后，PR 只能合并到 custom 分支。**

| 分支 | PR 目标 | 说明 |
|------|---------|------|
| feature/xxxx | **custom** | 唯一正确的 PR 合并目标 |
| custom | **禁止提 PR** | 二开主干，不往 main/master/orca 提 PR |
| main | **禁止提 PR** | 纯净分支，只接受上游同步的 merge |

**错误做法**：往 main、master、orca 分支提 PR（会导致二开代码污染纯净分支或冲突）。
**正确做法**：feature 分支 → PR → custom → 定期打包。

## 标准同步流程

### ⚠️ 本机仓库是浅克隆 → 三步流程走不通（2026-09-19 实测）

`git rev-parse --is-shallow-repository` = true（`.git/shallow` 10 条 graft，2026-08-15~09-03）。后果：

1. **`main` 与 `upstream/main` 无共同祖先**：`git merge-base main upstream/main` 为空 → `git merge upstream/main`（在 main 上）直接 `refusing to merge unrelated histories`。
2. 而 `custom` 与上游有正常合并基 → **直接 `custom merge upstream/main` 可行**。

**实际可用流程（2026-09-19 验证）**：

```bash
# ① 强拉上游（浅克隆下普通 fetch 会静默不更新引用！见 pitfalls/orca-shallow-clone-sync）
git fetch upstream 'refs/heads/*:refs/remotes/upstream/*' --force
git log -1 --format='%h %ci %s' refs/remotes/upstream/main   # 必须核对日期，不能只看退出码
# ② 预演冲突（提前拿到冲突文件清单）
git merge-tree --write-tree --name-only custom refs/remotes/upstream/main | head -20
# ③ 合并
git tag -f backup/pre-sync-YYYYMMDD custom && git push origin custom   # 合并前存档
git merge refs/remotes/upstream/main --no-edit
# ④ 解决冲突 → pnpm install → pnpm tc → verify-features → 打包
```

**main 分支**：因无共同祖先，本地无法同步；恢复标准三步流程需 `git fetch upstream --unshallow`（全量历史下载，待用户拍板）。且 main 早已非纯净（PR #19 曾把 custom 合入 main），当前 main 是 custom 的祖先。

**merge commit 建议 `--no-verify`**：合并会暂存上万文件，lint-staged 会对全部上游文件跑 oxlint/oxfmt（重排版上游代码 + 极慢）。

冲突面（2026-09-19 为 8 文件）：`pnpm-workspace.yaml`、`src/shared/global-settings-types.ts`、`src/renderer/src/store/index.ts`、`src/renderer/src/store/slices/usage-provider-slices.ts`、`src/renderer/src/i18n/locales/en.json`、codex-accounts 两个夹具、`client-ui-schemas.ts`（上游已把实现搬到 `src/shared/rpc-contract/client-ui-params.ts`）。

### 历史流程（浅克隆修复前，仅作参考）

```
git fetch upstream
git checkout main && git merge upstream/main --no-edit && git push origin main
git checkout custom && git merge main --no-edit && git push origin custom
```

## 打包前检查清单

1. 确认在 custom 分支
2. 确认 custom 包含所有功能分支：`git branch --no-merged custom | grep -v upstream | grep -v remotes`
3. **同步上游后跑一遍受影响模块的测试**（2026-09-12 补）：合并无冲突 ≠ 新引入的上游代码没坑。1.4.197 状态栏崩掉就是上游新代码带进来的（合并干净，但新 hook 的 selector 引用不稳定），若同步后先跑 ports/状态栏相关测试即可拦下，详见 [[zustand-v5-unstable-selector-react-185]]
4. 运行 typecheck/oxlint/build 验证
5. 运行 `node config/scripts/build-orca-s.mjs`
6. **工作区必须干净（含未跟踪文件）**（2026-09-19 补）：`verify-features.mjs` 第 6 项只豁免 `?? .codegraph/`，仓库根残留任何未跟踪文件（如 `.zcode/plans/plan-*.md`）都会 exit 1 直接阻塞打包。

**验收必须用打包安装版**：部分缺陷（如 React #185 无限重渲染）dev 下只打警告不报错，`pnpm dev` 看着正常不代表装出来的包正常。

### ⚠️ 安装成功 ≠ 升级生效（2026-09-19 踩坑）

`build-orca-s.mjs --install` 用 ditto 替换 `/Applications/orca-s.app` 后调 `open`，但 **macOS 不会替换正在运行的进程**——若应用本来就在跑，`open` 只是激活旧实例，磁盘是新版、内存里还是旧版。

- **判断实际运行版本**：`ps aux | grep "daemon-entry.js"` 看 `--app-version` 参数。
- **让新版生效必须重启应用**（Cmd+Q 后重开）。
- **注意**：若当前 agent 会话本身跑在 orca-s 的终端里（进程链 `zsh ← zcode-cli ← node ← login ← orca-s Helper ← orca-s`），重启会杀掉会话 —— 只能交用户手动重启。

### 打包前的可选步骤：备份旧版 dmg

`rm -rf dist/` 会清掉上一版 dmg（回退用）。若需回退能力，先 `cp dist/orca-s-macos-arm64.dmg /tmp/orca-s-rollback/<版本>.dmg` 再清。

## 版本号策略

- 基础版本号与上游一致（如 `1.4.178-rc.2`）
- 本地构建版本：`基础版本号.local.时间戳.commit hash`（自动生成，无需手动改 package.json）

## 已确认所有二开功能均已合并到 custom

| 功能 | PR | 状态 |
|------|----|----|
| 日历功能 | #4 | ✅ 已合并 |
| zcode agent 类型 | #5 | ✅ 已合并 |
| custom.db 业务库 | #6 | ✅ 已合并 |
| 日历清单历史周月查看 | #15 | ✅ 已合并 |
| 浏览器自动化 MCP | #16 #17 | ✅ 已合并 |
| 移除 Gitee 集成 | #18 | ✅ 已合并 |
| ZCode 使用统计独立面板 | #20 | ✅ 已合并 |
| Pi 智能体下拉入口 + Pi 用量统计 | — | ✅ 已合并（镜像 zcode 模式） |

**2026-09-19 再次验证**：合并上游 1186 提交后，上述功能全部在位（verify-features 全绿 + `app.asar` 特征串命中）。

已放弃的 Gitee 分支（gitee-create-pr-phase1、gitee-ui-unification-l1）无需合并。

## 标准化脚本（2026-09-02 提交 commit 4602b7bb06）

已提交到 custom 分支的标准化脚本：

| 脚本 | 用途 |
|------|------|
| `config/scripts/sync-upstream.mjs` | 自动同步 upstream → main → custom |
| `config/scripts/verify-features.mjs` | 打包前验证二开功能完整性 |
| `config/scripts/orca-sync-and-build.mjs` | 一键同步和打包（整合上述两个） |
| `config/scripts/build-orca-s.mjs` | 打包脚本（已添加自动验证步骤） |

标准操作流程：
```bash
node config/scripts/orca-sync-and-build.mjs          # 完整流程（同步 + 打包）
node config/scripts/orca-sync-and-build.mjs --sync   # 仅同步
node config/scripts/orca-sync-and-build.mjs --build  # 仅打包
node config/scripts/orca-sync-and-build.mjs --install # 同步 + 打包 + 安装
node config/scripts/verify-features.mjs              # 单独验证
```

## orca-dev-workflow Skill

工程专属 skill，位于 `.agents/skills/orca-dev-workflow/`（被 .gitignore 忽略，不提交）。注意：此 skill 不在全局 `~/.agents/skills/`，而是在项目目录内，随项目走。
触发词："同步 orca"、"打包 orca"、"更新 orca"、"orca sync"、"orca build"
命令：sync-and-build（默认）、sync、build、verify、status

## 团队知识入库必须 force-add（2026-09-13 核实）

仓库 `.gitignore` 忽略 **`.workbuddy/`（line 152）** 与 **`docs/**`（line 96）**，所以「记忆/设计文档要提交进仓库共享」在本仓库必须用 **`git add -f`** 强制入库：

- 记忆与设计文档默认处于 ignored 状态，裸 `git add` 无效（`git check-ignore -v` 会命中上述两条）。
- 既有约定是**强制暂存但不由 agent 提交**：`git add -f` 后留 staged（`A`），由用户统一 commit。
- `.workbuddy/memory` 与 zcode 自动记忆目录 `~/.zcode/cli/memories/projects/<proj>/memory` 是**同一目录**（同 inode 软链接）——改一处即两处生效，不要当两份维护。

## 设计文档

- `docs/2026-09-02-二开工作流程规范.md` — 完整工作流程规范（本地，不提交）
- `docs/2026-09-02-二开工作流程改进设计.md` — 改进方案（本地，不提交）

**Why:** 用户反馈同步上游代码后打包出现二开功能丢失，需要规范化流程避免人为失误。

**How to apply:** 每次同步/打包前按检查清单执行；打包前必须验证 `git branch --no-merged custom` 无未合并的功能分支；优先使用标准化脚本而非手动操作。
