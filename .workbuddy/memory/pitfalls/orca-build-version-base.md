---
name: orca-build-version-base
description: orca 本地构建号基数 = max(package.json 版本, 本地最高 vX.Y.Z tag)；上游 main 的 package.json 长期停在旧版本（如 1.4.197），发布 tag 才是发版真相；本地 tag 过期 ⇒「代码最新但版本号看着旧」
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_dead4223-aef7-431e-b767-23aaf6a5b024
---

# orca 本地构建号为什么「看起来是旧版本」（2026-09-19 用户反馈后实测）

## 机制（读 `config/scripts/build-mac-local.mjs` 得到）

```js
getLocalBuildIdentity() → version = createLocalBuildVersion(
  resolveVersionBase(packageJson.version), Date.now(), commit)
```

`resolveVersionBase(packageVersion, listTags)` = **max(package.json 的版本, 本地最高纯 `vX.Y.Z` tag)**，只认 `/^\d+\.\d+\.\d+$/`（`-rc.N` 会被跳过），且 tag **必须存在于本地**。

## 两个反直觉事实

1. **上游 `main` 的 package.json 长期落后于发版号**：2026-09-19 实测 `upstream/main` 的 package.json = `1.4.197`，而远端发布 tag 已到 **`v1.4.206`**（`release: v1.4.206` 提交 **不在 main 历史里**，发版是 release 分支/tag 上的动作：`.github/workflows/release-cut.yml` 里有 `commit_message="release: v$VERSION"`）。
   ⇒ 用「main 的 package.json」判断新鲜度是**错的**，要看发布 tag。
2. **tag 列表会像分支引用一样静默过期**（浅克隆下更甚，见 [[orca-shallow-clone-sync]]）：本地 tag 停在 `v1.4.197` 时 `resolveVersionBase` 就取 `1.4.197`，于是**代码最新、版本号却看着像旧的**。本次先打包出 `1.4.197-local.*` 就是这个原因——不是代码没同步。

## 处理方式

```bash
# 取 tag 前先看远端真相（不下载对象）
git ls-remote --tags upstream | sed 's|.*refs/tags/||' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -3
# 补齐缺失 tag（浅克隆下普通 --tags 可能静默不生效；指定 refspec 更稳）
git fetch upstream refs/tags/v1.4.206:refs/tags/v1.4.206
git tag --list 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -3        # 确认最高 tag 已到位
# 验证构建号基数（不需打包即可确认）
node --input-type=module -e "
import { resolveVersionBase } from './config/scripts/build-mac-local.mjs'
console.log(resolveVersionBase(JSON.parse(require('node:fs').readFileSync('package.json','utf8')).version))"
# 然后重建（版本号在打包时烘焙进 Info.plist，不重建不会变）
node config/scripts/build-orca-s.mjs --install
```

**判据**：`resolveVersionBase` 的输出应 ≥ 远端最新发布 tag；否则本地 tag 过期。

**Why:** 2026-09-19 用户发现装出来的包还是 `1.4.197-local.*`，实际代码已是最新——根因是本地 tag 停在 v1.4.197 而机制取 max(tag, package.json)。补 tag 后装出 `1.4.206-local.1789785189109.117aa480069c`。

**How to apply:** 每次同步后、打包前跑一次 `resolveVersionBase` 核对；同步时把取 tag 与取分支一起做（`git ls-remote --tags` 先核）。tag 补齐**不必补全**——只补最高那个即可满足基数（本次只补到 v1.4.206，v1.4.198~205 仍缺，不影响）。

**决策：package.json 保持上游值不动**（不加本地版本行）——否则每次同步都在版本行产生冲突；代价是每次打包前必须核对一次。

关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]。
