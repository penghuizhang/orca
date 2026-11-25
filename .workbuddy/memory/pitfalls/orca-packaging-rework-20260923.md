---
name: orca-packaging-rework-20260923
description: orca 打包前两条新清单——mobile/ 独立 workspace 须单独 pnpm install（419 resolve
  错）、源码树 .DS_Store 撞 buildId CRLF 校验；附管道退出码假成功坑
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_95f46680-c848-4e17-9bac-98fc3986c422
---

2026-09-26 续测（`1.4.212-local.1790404501373.c422bc84e07d` 一次通过）补两条前置：

3. **`build-orca-s.mjs` 硬性拒绝非 custom 分支，没有跳过开关**：源码注释写明「packaging any other branch silently ships the wrong build」。⇒ **同步 PR 必须先合进 custom 才能打包**，同步分支上打不出来（2026-09-26 是用户先合了 PR #25 才打）。
4. **未跟踪文件仍只豁免 `?? .codegraph/`**：仓库根的 `test-data-rules-proto-top.png`（非本次任务产生）会让 `verify-features` 第 6 项 exit 1。处置方式：移到 `/tmp/orca-untracked-backup/` 之类的地方并告知用户位置（可逆），或加进 `.gitignore`（会进 PR）。打包前先 `git status --short` 看一眼。
5. **`verify-features` 第 2 项会拦「有未合并的本地分支」**（`git branch --no-merged custom` 过滤掉 upstream/remotes/gitee 后非空即 exit 1）。历史遗留的废弃分支（如 2026-10-20 的 `backup/sync-a87aa4ccdb-2c7cc68` = 废弃 squash）会卡住打包。**删前先 `git for-each-ref --points-at <sha>` 确认同一提交还有别的引用（分支/tag）**，有即可 `git branch -D` 零损失。
6. **`.DS_Store` 要全树清，不只 `mobile/{src,app}`**（2026-10-20 实测）：本轮 `verify-mobile-web-app-bundle` 报的是 **`mobile/src/.DS_Store`**，但同一棵树里另有 **92 个**未跟踪 `.DS_Store`（`.anti-slop-plugin/`、`native/`、`tests/e2e/.cross-version-checkouts/*` 等）⇒ 别等构建报错，**打包前直接 `find . -name .DS_Store -not -path "*/node_modules/*" -not -path "./.git/*" -not -path "./dist/*" -not -path "./out/*"` 清一遍**。⚠️ 有 **5 个 `.DS_Store` 是被 git 跟踪的**（`.workbuddy/.DS_Store`、`.workbuddy/docs/`、`.workbuddy/memory/`、`docs/assets/`、`docs/site/`）——**删它们会产生工作区 diff**，清理时务必只删 `git ls-files --error-unmatch` 判定为未跟踪的那些。

7. **`plain-node-entry-guard` 只在打包期跑，`pnpm tc` 查不出**（2026-11-13 实测）：二开 main 侧模块若在**模块顶层** `import { app } from 'electron'`（如 `zcode/pi-usage/store.ts` 用 `app.getPath('userData')` 取缓存路径），会把 electron 拖进 `backend-entry` 的 chunk，打包直接 `Build failed`（对应上游 v1.4.129-rc.1 守护进程事故）。修法：路径由宿主参数给（`resolveCacheFile: () => getXUsageFile(host.userDataPath)`，与上游 `claude-usage/store.ts` 同构）。同步后应扫一遍二开新增的 main 侧文件有没有 `from 'electron'` 落在会被打进 backend-entry 的模块图里。
8. **二开自己的打包/校验脚本不在 `tc` 覆盖范围**（2026-11-13 实测）：上游搬家后 `build-orca-s.mjs` 的 `./build-mac-local.mjs`、`verify-features.mjs` 里对 `agent-catalog.tsx` 的存在性检查，都会在打包第一步失败 ⇒ 同步后对 `config/scripts/*.mjs` 扫一遍相对 import/路径断言是否还存在。
9. **修补脚本自身会阻塞打包**：`verify-features` 第 6 项要求工作区干净，改了 `build-orca-s.mjs` / `verify-features.mjs` 后**必须先 commit 再跑打包**（否则报「工作目录干净 ❌」）。

**2026-09-26 一次通过的原因**：流程里已内置两个老坑的规避——打包前 `cd mobile && pnpm install`（本条 1）、同步第 1 步就 `git fetch upstream 'refs/tags/*:refs/tags/*'`（构建号基数 1.4.212 ≥ 远端最新，见 [[orca-build-version-base]]）。即：**把坑写进流程，比记住它更可靠**。

---

2026-09-23 打包 `1.4.208-local` 返工 2 次才成功，两个根因都是**上游合并后的新构建链路**带出来的：

1. **`mobile/` 是独立 workspace，根 `pnpm install` 不覆盖**：根 `pnpm-workspace.yaml` 显式排除 `mobile/`（它有自己的 workspace/lockfile）。上游把 `build:mobile-web` 改走 `build-mobile-web-app-bundle.mjs` 并挂在 `build:desktop` 链上、从 `mobile/` 解析依赖 ⇒ 打包前必须 `cd mobile && pnpm install`，否则 419 个 `Could not resolve "expo-router"/"react-native-web"` 挂掉打包。
2. **gitignored 的 `.DS_Store` 绕过「工作区干净」却撞死字节校验**：`mobile/{src,app}/.DS_Store` 在 git status 里不可见（verify-features 第 6 项只查 porcelain），但 `verify-mobile-web-app-bundle` 对 `.gitattributes` 钉 `eol=lf` 的树做 CRLF 扫描，二进制里 0x0D0x0A 被误报 `CRLF in mobile web source: .DS_Store`（exit 1）。源码树里 `find mobile/{src,app,web-entry} -name .DS_Store -delete` 即愈。

**连带坑——管道吃退出码**：`node build-orca-s.mjs --install | tail` 让 `$?` 变成 tail 的，首次打包实际失败却打印 `build_exit=0`；判成败只看后台任务通知的真实退出码，或日志末尾有没有 `[orca-s] pnpm failed` / `[orca-s] done.`。

**Why:** 前两条是新链路专属、下次同步打包必复发；第三条曾掩盖失败导致误判成功。

**How to apply:** 打包清单在 [[orca-dev-workflow]] #9/#11/#12；打包命令不经管道直接跑，或用 `set -o pipefail`。

关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]。
