---
name: orca-uni-agent-integration
description: uni-agent（HBuilderX 内置智能体）集成 Orca 结论——非独立 CLI，是 HBuilderX 本地 socket
  客户端 + 一次性命令，需自研 PTY 壳才能当 TuiAgent；设计文档待评审
metadata:
  node_type: memory
  type: reference
  originSessionId: sess_d28d23a6-80e9-4727-8999-dd4edb17dbcd
---

# uni-agent 集成 Orca（2026-09-13 调研，设计文档待评审）

设计文档（canonical）：`.workbuddy/docs/zcode/2026-09-13-uni-agent集成方案与可行性分析.md`
摘要指针（满足 doc-workflow hook）：`docs/2026-09-13-uni-agent集成方案.md`

## 结论

能集成，但**不能像 zcode 那样直接注册 TuiAgent**，需自研 **PTY 桥接薄壳（wrapper）** 把一次性 CLI 包装成长驻交互会话。用户直觉「uni-agent 类似 zcode」只对一半：它确是 AI 编码智能体，但架构不同。

## 决定性实测证据

- `cli uni-agent` 不带 `--prompt` 直接报「参数 prompt 值不能为空」并退出 ⇒ **无交互式 TUI**，是一次性命令。
- **`cli` 是 HBuilderX 进程的本地 socket 客户端，非独立 runtime**：`strings cli` 命中 `RPC::LocalSocketClient`/`QLocalSocket::*`；HBuilderX 主进程监听 `127.0.0.1:9500`。
- 模型/密钥/权限为 HBuilderX 全局配置：`settings.json`（`modelSelection=customKey`、`permissionAutoAllow=true`）、`api-keys.json`（6 个 `UNI_AGENT_*`）。
- 会话续接靠 `--continue true` **跨进程**（`project-cli-sessions.json` 记 `lastSessionId`），**无 `--resume`**。
- `--project` 须为 HBuilderX 中已打开的项目名或绝对路径。

## 推荐路线

- **Phase 1（零 orca 代码）**：终端派单，验证 5 个假设——HBuilderX GUI 依赖、写操作是否卡人工确认、并发安全、`--output-format stream` 分帧、多行 prompt。
- **Phase 2（目标）**：写 `uni-agent` 交互壳 + 注册 TuiAgent（`promptInjectionMode: 'stdin-after-start'`，约 15 文件）。
- **R3（可选二期）**：MCP 薄壳 `uni_agent_ask(prompt, project?, continue?)`，让 Orca 内 claude/zcode 外包 uni-app x 任务。

## 限制

依赖 HBuilderX 在**本地**运行 ⇒ 远端 SSH/WSL 工作区不可用；默认**不开 `--yolo`**（会无监督改文件）；模型配置全局共享，无法按工作区隔离。

关联 [[orca-agent-integration-surfaces]]、[[orca-zcode-agent-feature]]。
