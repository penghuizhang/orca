# orca-s 打包修复与默认 arm64-only 影响说明（2026-08-16）

> 类型：影响说明（小修复+约定变更，无功能代码改动）。背景：用户合并 PR #6（orca-custom.db）后要求拉码并打包，打包连续失败两次，随后拍板「默认只打 arm64」。

## 一、变更内容

### 1. `config/scripts/build-orca-s.mjs`（提交 d24ab9450、e0db94560、d94affcc2）

- **env 合并顺序修复**：`run()` 原为 `spawnSync(..., {env, ...options})`，electron-builder 调用传入的 `options.env`（`{...process.env, ORCA_*}`，含 shell 原始 PATH）整体覆盖了注入的 nvm Node 24.19 PATH。改为 `{...optionEnv, ...env}`，注入 PATH 后置生效。
- **国内镜像默认值**：未设置 `ELECTRON_MIRROR` / `ELECTRON_BUILDER_BINARIES_MIRROR` 时注入 `https://npmmirror.com/mirrors/electron/` 与 `.../electron-builder-binaries/`（用户可覆盖）。
- **单架构传参**：electron-builder 的 env 增加 `ORCA_MAC_TARGET_ARCHS: archName`（默认 `arm64`，`--x64` 时为 `x64`）。

### 2. `config/electron-builder.config.cjs`（提交 d94affcc2）

- `mac.target` 的 `arch: ['x64','arm64']` 写死列表改为 `macTargetArchs`（由 `ORCA_MAC_TARGET_ARCHS` 驱动，默认 `'x64,arm64'`，与上游行为完全一致，上游 CI 不受影响）。

## 二、根因与影响面

| 现象 | 根因 | 影响 |
|---|---|---|
| 打包失败 1：`Packaged main bundle has bare runtime imports without copied node_modules: node:sqlite` | electron-builder 实际跑在 shell 默认 Node **v22.22.3**（`~/.local/bin/node`），其 `builtinModules` 无 sqlite（v24.19.0 才有且以 `'node:sqlite'` 带前缀形式存在）→ 校验器把 bundle 内联的 `require("node:sqlite")`（上游 session-scanner）误判为外部包 | 仅打包脚本，无运行时影响；修后校验通过 |
| 打包失败 2：`connect ETIMEDOUT 20.205.243.166:443` | electron-builder 从 GitHub（Azure CDN）下载 Electron 超时；本机直连不稳 | 仅构建期网络；改走 npmmirror 后下载正常 |
| 双架构耗时/多余 x64 切片 | `mac.target` 写死 `arch:['x64','arm64']`，CLI `--arm64` 压不住 | 默认单架构 arm64，产物与耗时减半；`--x64` 仍可用 |
| 安装后双击无界面 | **非应用问题**：adhoc 签名未公证，Gatekeeper 拒 LaunchServices 启动（`spctl --assess` rejected）；`codesign --verify` 通过、无崩溃报告、命令行直接跑二进制正常 | 打开方式改为右键打开或 `open /Applications/orca-s.app`；`--install` 已自动清 quarantine |

## 三、验证

- 修复后完整打包 **exit 0**（双架构）：typecheck 三套绿、daemon/plugin/skills-cli 校验 OK、签名完成、arm64/x64 DMG+zip 产出。
- 运行验证：`open /Applications/orca-s.app` 后主进程+renderer+daemon 全绿，daemon 日志确认版本为最新 PR #6 构建（`...e0db94560bce`）。
- 注意：x64 切片构建时有 `sherpa-onnx-darwin-x64 file source doesn't exist` 警告（本机仅装 arm64 语音依赖）——默认 arm64-only 后不再涉及。

## 四、约束核对

- 【约束】SQL 变更归档：本次无 SQL 变更 ✓
- 【约束】不影响上游：config 默认行为与上游一致（env 未设=双架构）✓
- 【约束】改动收敛 custom：3 个脚本/配置提交均在 custom 本地，未推送 ✓
- 【约束】设计先行：小修复，本说明文档即影响说明，用户已确认方向（国内镜像、arm64-only）✓

## 五、相关产物

- 日记忆：`.workbuddy/memory/2026-08-16.md`（「拉取 PR #6 合并 + 打包修坑 ×2 + 默认 arm64-only」「打包后界面打不开排查」两节）
- 索引：`.workbuddy/memory/MEMORY.md`（新增 orca-s 打包约定条目）
