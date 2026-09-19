---
name: orca-electron-builder-mirror
description: electron-builder 打包时忽略 .npmrc electron_mirror，需设 ELECTRON_MIRROR 环境变量才能走国内镜像
metadata:
  node_type: memory
  type: feedback
  source: zcode-auto
  originSessionId: sess_d8990d91-6906-45d0-b034-315c25c03f5a
---

## electron-builder 国内镜像必须用环境变量（2026-09-11 实测）

electron-builder 在 macOS 打包阶段会从 GitHub (20.205.243.166:443) 下载 Electron 二进制文件。国内网络下直接超时（`ETIMEDOUT 20.205.243.166:443`）。

**根因**：`.npmrc` 里的 `electron_mirror=https://registry.npmmirror.com/-/binary/electron/` 只对 npm/pnpm 生效，**electron-builder 完全忽略它**。

**解决方案**：打包命令前加环境变量：

```bash
ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/" pnpm run build:mac
```

**症状**：构建在 `packaging` 阶段卡住后报 `connect ETIMEDOUT 20.205.243.166:443`。

**Why:** 国内网络直连 GitHub 不稳定，electron-builder 的下载器不读 .npmrc。

**How to apply:** 每次打包 macOS 时，确保设置 `ELECTRON_MIRROR` 环境变量。关联 [[orca-dev-workflow]] 打包流程。
