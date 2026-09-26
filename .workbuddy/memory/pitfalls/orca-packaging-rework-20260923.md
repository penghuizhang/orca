---
name: orca-packaging-rework-20260923
description: orca 打包前两条新清单——mobile/ 独立 workspace 须单独 pnpm install（419 resolve
  错）、源码树 .DS_Store 撞 buildId CRLF 校验；附管道退出码假成功坑
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_95f46680-c848-4e17-9bac-98fc3986c422
---

2026-09-23 打包 `1.4.208-local` 返工 2 次才成功，两个根因都是**上游合并后的新构建链路**带出来的：

1. **`mobile/` 是独立 workspace，根 `pnpm install` 不覆盖**：根 `pnpm-workspace.yaml` 显式排除 `mobile/`（它有自己的 workspace/lockfile）。上游把 `build:mobile-web` 改走 `build-mobile-web-app-bundle.mjs` 并挂在 `build:desktop` 链上、从 `mobile/` 解析依赖 ⇒ 打包前必须 `cd mobile && pnpm install`，否则 419 个 `Could not resolve "expo-router"/"react-native-web"` 挂掉打包。
2. **gitignored 的 `.DS_Store` 绕过「工作区干净」却撞死字节校验**：`mobile/{src,app}/.DS_Store` 在 git status 里不可见（verify-features 第 6 项只查 porcelain），但 `verify-mobile-web-app-bundle` 对 `.gitattributes` 钉 `eol=lf` 的树做 CRLF 扫描，二进制里 0x0D0x0A 被误报 `CRLF in mobile web source: .DS_Store`（exit 1）。源码树里 `find mobile/{src,app,web-entry} -name .DS_Store -delete` 即愈。

**连带坑——管道吃退出码**：`node build-orca-s.mjs --install | tail` 让 `$?` 变成 tail 的，首次打包实际失败却打印 `build_exit=0`；判成败只看后台任务通知的真实退出码，或日志末尾有没有 `[orca-s] pnpm failed` / `[orca-s] done.`。

**Why:** 前两条是新链路专属、下次同步打包必复发；第三条曾掩盖失败导致误判成功。

**How to apply:** 打包清单在 [[orca-dev-workflow]] #9/#11/#12；打包命令不经管道直接跑，或用 `set -o pipefail`。

关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]。
