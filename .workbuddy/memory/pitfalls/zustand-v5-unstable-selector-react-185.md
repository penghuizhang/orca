---
name: zustand-v5-unstable-selector-react-185
description: zustand v5 下 selector 返回新对象会触发 React「Maximum update depth exceeded」(minified #185) 整片子树被错误边界兜底；打包版必崩、dev 只告警
metadata:
  node_type: memory
  type: memory
---

# zustand v5 selector 引用不稳定 ⇒ React #185（打包版整片 UI 被边界兜底）

- **现象（2026-09-12，1.4.197 打包版）**：底部状态栏被 `RecoverableRenderErrorBoundary` 替换成「状态栏出现错误。／重试状态栏以重新挂载其控件。」；崩溃记录里 `error_message = Minified React error #185（Maximum update depth exceeded）`、`boundary_id = overlay.status-bar`。
- **根因**：`useWorktreeRuntimeTarget`（上游 #17048 新增）在 selector 内构造对象：

  ```ts
  useAppStore((state) => runtimeTargetForExecutionHostId(getExecutionHostIdForWorktree(state, worktreeId)))
  ```

  `runtimeTargetForExecutionHostId()` 每次返回新字面量对象；实装 `zustand@5.0.14` 的 `useStore` 用**裸 `React.useSyncExternalStore`**（v5 移除了 v4 的 `useSyncExternalStoreWithSelector` 记忆化层）⇒ `getSnapshot()` 永不与已渲染值相等 ⇒ 无限强制重渲染 ⇒ nested update 计数超 `REACT_NESTED_UPDATE_LIMIT = 50` ⇒ #185。
- **【坑】只在打包版崩、dev 只告警**：dev 构建下 React 只打印 `The result of getSnapshot should be cached to avoid an infinite loop` 警告，不会抛 #185。**验收必须在打包安装版做**，否则会误判「没问题」。
- **【坑】#185 的 `component_stack` / `boundary_id` 是旁观者**：nested-update 计数器是模块级全局的，谁下一个 setState 就抛到谁身上（崩溃记录里 `attribution: unreliable`）。别按 boundary_id 聚类这些崩溃，要去找「哪个 selector/dep 引用不稳定」。
- **正确写法**（上游修复 `5412276776fb`）：先选**原始值**，派生对象放 selector 之外：

  ```ts
  const executionHostId = useAppStore((state) => getExecutionHostIdForWorktree(state, worktreeId))
  return useMemo(() => runtimeTargetForExecutionHostId(executionHostId), [executionHostId])
  ```

  或对象/数组输出走 `useShallow`（仓库内已有 92 处正确示范，可当巡检基线）。
- **How to apply**：看到「打包版某片 UI 被边界兜底 + 记录里是 #185」，先 `rg` 该子树用到的 store hook，检查 selector 是否返回新对象/新数组；写新 selector 时「原始值直接选、结构体必 useShallow 或 useMemo 派生」。
- **定位手法（可复用）**：`~/Library/Application Support/<productName>/crash-reports.json`（本 fork productName = `orca-s`）已含 boundary_id / error_message / component_stack，是打包版渲染期崩溃最快的一手证据；反查上游引入点/修复点用 `curl --proxy http://127.0.0.1:54687 https://api.github.com/repos/stablyai/orca/commits?path=<file>`。

- **修复状态（2026-09-12 已修复并验收）**：custom 分支 `2c4e15b625e8`（cherry-pick 上游 `5412276776fb`），打包版 `1.4.197-local.1789177404321.2c4e15b625e8` 实测正常。验证手法：安装版加 `--remote-debugging-port=9333` 启动 → 连 CDP 断言无 `role="alert"` 兜底、端口控件在位（`端口，5 工作区 ports`），并 `Page.captureScreenshot` 截图确认。

关联：[[orca-fork-2dev]]（上游同步风险）、分析文档 `.workbuddy/docs/reference/2026-09-12-状态栏报错根因分析与修复建议.md`
