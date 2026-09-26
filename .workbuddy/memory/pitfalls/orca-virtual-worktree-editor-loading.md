---
name: orca-virtual-worktree-editor-loading
description: 虚拟 worktree ID（如 NOTES_WORKTREE_ID）必须在 3 处 special-case 标记为
  local-only，否则 EditorPanel 走远程 host 连接导致文件加载失败
metadata:
  node_type: memory
  type: feedback
  source: zcode-auto
  originSessionId: sess_17c34b5e-acfd-48d7-93f0-2ea929edd79d
---

# 虚拟 worktree EditorPanel 加载失败

**触发条件**：新增 TopLevelView + 虚拟 worktree ID（如 `NOTES_WORKTREE_ID = 'global-notes'`），未在以下 3 处做 local-only special-case。

**现象**：笔记可创建（文件落盘），但编辑器显示「无法加载文件：Connecting to the remote host... retrying once the workspace is ready.」——核心编辑路径断裂。

**根因链路**：
1. `connection-owner-resolution.ts:getConnectionIdFromState` — 对未知 worktree 返回 `undefined`（非 `null`）
2. `editor-file-operation-owner.ts:captureEditorFileOperationProvenance` — 未知 worktree 走 unresolved 路径，抛 `OWNER_CHANGED_MESSAGE`
3. `editor-file-operation-owner.ts:resolveCurrentEditorRoute` — 同上
4. `useEditorPanelFileContentLoader` — `isWorktreeConnectionResolved` 返回 `false` → 抛 `WORKTREE_OWNER_NOT_READY_ERROR`

**必须改的 3 处**（与 `FLOATING_TERMINAL_WORKTREE_ID` 同位置）：

| # | 文件 | 改动 |
|---|---|---|
| 1 | `src/renderer/src/lib/connection-owner-resolution.ts:60` | 条件改为 `isLocalOnlyVirtualWorktree(worktreeId)` |
| 2 | `src/renderer/src/lib/editor-file-operation-owner.ts:51,56` | `captureEditorFileOperationProvenance` 两处条件 |
| 3 | `src/renderer/src/lib/editor-file-operation-owner.ts:105` | `resolveCurrentEditorRoute` 条件 |

**修复方式**：在 `src/shared/constants.ts` 新增 `isLocalOnlyVirtualWorktree(id)` 谓词，将 `FLOATING_TERMINAL_WORKTREE_ID` 和 `NOTES_WORKTREE_ID` 统一处理。

**How to apply**：新增任何带虚拟 worktree ID 的 TopLevelView 时，同步更新 `isLocalOnlyVirtualWorktree()` 谓词。

> 2026-09-21 实施修复，4 文件 5 处改动，pnpm dev 冒烟验证编辑器加载成功。
