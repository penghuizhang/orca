---
name: orca-browser-automation-mcp
description: 已实施——orca 内置 MCP Server 暴露浏览器标签页给外部 agent CLI
  (zcode/codex)，22 个工具，PR #16；生命周期集成 PR #17
metadata:
  node_type: memory
  type: project
  originSessionId: sess_da73a2ad-783e-40c3-81dd-8aacad332710
---

**【已实施并打包验证通过】**orca 内置 MCP Server，让外部 CLI（zcode/codex）通过 MCP 驱动浏览器标签页（读页面/点击/填表/输入/导航/截图/执行 JS）。PR #16（`feat/browser-automation-mcp → custom`），打包版本 `1.4.178-rc.2.local.1787726440796.e739852534cd`。

**架构**：`src/main/browser/mcp/`（7 模块 + 1 测试）→ 包装 `RuntimeBrowserCommands`（40+ 方法）→ `AgentBrowserBridge` → `agent-browser` 二进制 → CDP → webview。传输：`StreamableHTTPServerTransport`（`@modelcontextprotocol/sdk@1.30.0`），`127.0.0.1` 绑定 + Bearer Token + 默认关闭。22 个 MCP 工具：只读（tab_list/tab_current/snapshot/screenshot/evaluate）+ 交互（navigate/click/fill/type/select/hover/scroll/wait/back/reload/forward/dblclick/keypress/clear/select_all/check/focus）。

**配置使用（用户反馈：token 概念容易混淆）**：Settings → Browser → 开启「Browser Automation MCP 服务」→ 点「Copy MCP 配置」按钮（自动包含 URL + Token，用户无需手动处理 token）→ 粘贴到 zcode/codex 的 `~/.zcode/cli/config.json` 的 `mcpServers` 中。**用户不需要知道 token 是什么**——按钮已将 URL 和 token 一起打包为 JSON。

**打包踩坑**：① `ajv`/`ajv-formats`（MCP SDK JSON Schema 校验依赖）需加入 `config/electron-builder.config.cjs` 的 `extraResources` + `config/packaged-runtime-node-modules.cjs` 的 `PACKAGED_RUNTIME_PACKAGE_ROOTS`，否则 electron-builder `afterPack` 检查失败；② 测试文件 `vi.Mock` 类型在 tsc 下不可见，需改为 `import { type Mock } from 'vitest'` 显式导入；③ Settings UI 复制按钮用 `navigator.clipboard.writeText()` 在 Electron renderer 中失败，必须改用 preload 的 `window.api.ui.writeClipboardText()`（经 IPC 调 main 进程 clipboard 模块）。**通用教训：Electron renderer 中剪贴板操作应走 preload IPC（`window.api.ui.writeClipboardText`），不要直接用 `navigator.clipboard`**。

**Why:** 用户想用自己跑在 orca 终端里的 zcode/codex CLI 来控制另一个浏览器标签页，本质是「给现有浏览器自动化能力加一个标准 MCP 出口」。
**How to apply:** 涉及「外部 agent 操作 orca 浏览器」的需求直接复用 RuntimeBrowserCommands + MCP 适配层；注意打包时 MCP SDK 运行时依赖（ajv/ajv-formats）需加入 extraResources；配置文档需明确说明 token 由按钮自动处理。

设计文档：`docs/2026-08-26-浏览器自动化MCP服务设计方案.md`；日记忆：`.workbuddy/memory/2026-08-26.md`。

相关：[[orca-zcode-agent-feature]]、[[zcode-cli-2dev]]、[[orca-fork-2dev]]。
