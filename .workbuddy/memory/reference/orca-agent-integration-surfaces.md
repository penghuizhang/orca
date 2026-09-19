---
name: orca-agent-integration-surfaces
description: Orca 集成外部 AI CLI 智能体的机制与边界——注册表约 15 处、检测/启动在执行宿主本地、6 种注入模式均要求长驻进程、无
  one-shot 通道、MCP 只读 4 处配置
metadata:
  node_type: memory
  type: reference
  originSessionId: sess_d28d23a6-80e9-4727-8999-dd4edb17dbcd
---

# Orca 集成外部 AI 智能体的机制与边界（2026-09-13 核实）

## 判断「某工具能否直接注册为 Orca agent」三问（速查）

1. 它有没有**长驻交互 TUI**？没有 ⇒ 不能直接注册。
2. 它是**独立二进制**，还是**某宿主进程的客户端**？后者 ⇒ 依赖宿主常驻，换机/CI 不可用。
3. 检测/启动发生在**执行宿主本地**——它在该宿主 PATH 上吗？装在本地 app 包内的二进制在远端 SSH/WSL 天然检测不到。

三条任一不满足，就不是「直接注册」，需要自研 wrapper（或改用终端派单 / MCP）。

## 注册一个 TuiAgent 的必改面（约 15 处，tsc 完备性兜底）

核心 = `TuiAgent` 联合 + `TUI_AGENT_CONFIG` + 一批 `Record<TuiAgent,…>` 完备 map：

- shared：`src/shared/tui-agent.ts`、`tui-agent-config.ts`、`tui-agent-display-names.ts`、`agent-kind.ts`、`agent-type-label.ts`、`agent-name-token-match.ts`、`tui-agent-selection.ts`、`skills-cli-agent-keys.ts`、`telemetry-events.ts`、`agent-session-resume.ts`
- renderer：`src/renderer/src/lib/agent-status.ts`（`ICONABLE_AGENT_TYPES`）、`agent-catalog.tsx`、`agent-icon-glyphs.tsx`
- i18n **6 语言**：`src/renderer/src/i18n/locales/{en,zh,es,fr,ja,ko}.json`（此前一度以为只有 5 语言，实际仓库为 6）
- 自动派生、无需手改：`ALL_TUI_AGENTS`、`KNOWN_TUI_AGENT_DETECTION_COMMANDS`、`TUI_AGENT_CONFIG`

## 关键机制（file:line）

- **检测**：PATH 目录遍历 + `stat`/`access`，不 spawn 子进程（`src/main/ipc/command-path-resolver.ts:67`）；**支持绝对路径 detectCmd**（`src/shared/posix-command-path-lookup.ts:61`）。
- **启动**：main 进程用 node-pty 在 PTY 跑 `launchCmd`（`src/main/providers/local-pty-spawn.ts:21`）；**`launchCmd` 可为带参数的任意 shell 串**（如 `'orca claude-teams'`、`'hermes --tui'`）。
- **promptInjectionMode 6 种全部要求进程长驻**（`src/shared/tui-agent-startup.ts:40`）：argv / flag-prompt / flag-prompt-interactive / flag-interactive / hermes-query / stdin-after-start，差别只在提示词投递方式，不在进程寿命。
- **Orca 没有 one-shot agent 执行通道**：`src/shared/agent-headless-command.ts:18` 的 `isHeadlessOneShotAgentCommand` 仅用于「识别并从 agent 判定中排除」一次性命令（claude/trae 的 `--print`/`-p`、ante 的 `--prompt`、prime-agent 的 `--mode`），**不负责执行**。
- **远端**：检测/启动在执行宿主本地（`src/main/preflight/agent-detection.ts:143`、`src/relay/preflight-handler.ts:57`）⇒ 本地 app 包内的二进制在 SSH/WSL 远端不会出现。
- **MCP 来源**：只读 4 处配置 `src/shared/mcp-config.ts:45`（`.mcp.json`、`.cursor/mcp.json`、`.claude.json`、`.claude/mcp.json`），**Orca 不写入、无添加 UI** ⇒ MCP 路线注册要用户手改配置；in-repo MCP 先例 = `src/main/browser/mcp/`（22 工具、HTTP+Bearer、用户手动粘贴配置）。

关联 [[orca-zcode-agent-feature]]、[[orca-uni-agent-integration]]、[[orca-browser-automation-mcp]]。
