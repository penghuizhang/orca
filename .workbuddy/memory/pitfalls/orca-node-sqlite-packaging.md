---
name: orca-node-sqlite-packaging
description: node:sqlite 不在 Node 22 builtinModules 列表中，打包验证脚本会误判为外部依赖导致 build:mac 失败
metadata:
  node_type: memory
  type: feedback
  source: zcode-auto
  originSessionId: sess_17c34b5e-acfd-48d7-93f0-2ea929edd79d
---

# node:sqlite 打包验证失败

**触发条件**：使用 `node:sqlite` 模块（orca-custom.db 功能，PR #6）后执行 `pnpm build:mac`。

**现象**：
```
Packaged main bundle has bare runtime imports without copied node_modules: node:sqlite
```

**根因**：`config/packaged-runtime-node-modules.cjs` 的 `verifyPackagedMainRuntimeDeps` 函数扫描打包后 JS 中的 `require('node:sqlite')`，发现 `node_modules/node:sqlite` 不存在就报错。但 `node:sqlite` 是 Node 22 的实验性内置模块，不需要复制到 `node_modules`——问题在于 `builtinModules` 列表不包含 `sqlite`。

**修复**：在 `config/packaged-runtime-node-modules.cjs` 的 `NODE_BUILTINS` Set 中手动添加：
```js
'node:sqlite',
'node:sqlite/sync'
```

**How to apply**：Node.js 升级后检查 `builtinModules` 是否已包含 `sqlite`，如已包含则可删除手动添加的条目。

> 2026-09-21 实施修复，打包验证通过（arm64 + x64 双架构）。
