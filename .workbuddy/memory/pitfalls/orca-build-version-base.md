---
name: orca-build-version-base
description: orca 本地构建号基数 = max(package.json 版本, 本地最高 vX.Y.Z tag)；上游 main 的 package.json 长期停在旧版本（如 1.4.197），tag 才是发版真相
metadata:
  node_type: memory
  type: feedback
---

# orca 本地构建号为什么「看起来是旧版本」（2026-09-19 实测）

## 机制（读 `config/scripts/build-mac-local.mjs` 得到）

```js
getLocalBuildIdentity() → version = createLocalBuildVersion(
  resolveVersionBase(packageJson.version), Date.now(), commit)
```

`resolveVersionBase(packageVersion, listTags)` = **max(package.json 的版本, 本地最高纯 `vX.Y.Z` tag)**，只认 `/^\d+\.\d+\.\d+$/`（`-rc.N` 会被跳过），且 tag **必须存在于本地**。

## 两个反直觉事实

1. **上游 `main` 的 package.json 长期落后于发版号**：2026-09-19 实测 `upstream/main` 的 package.json = `1.4.197`，而远端发布 tag 已到 **`v1.4.206`**（`release: v1.4.206` 提交 **不在 main 历史里**，发版是 release 分支/tag 上的动作：见 `.github/workflows/release-cut.yml` 里的 `commit_message="release: v$VERSION"`）。
   ⇒ 拿「main 的 package.json」判断新鲜度是**错的**，要看发布 tag。
2. **tag 列表会像分支引用一样静默过期**（浅克隆下更甚，见 [[orca-shallow-clone-sync]]）：本地 tag 停在 `v1.4.197` 时，`resolveVersionBase` 就取 `1.4.197`，于是**代码是最新的、版本号却看着像旧的**。本次打包出 `1.4.197-local.*` 就是这个原因——不是代码没同步。

## 处理方式

```bash
# 取 tag 前先看远端真相（不下载对象）
git ls-remote --tags upstream | sed 's|.*refs/tags/||' | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -3
# 补齐缺失 tag（浅克隆下普通 --tags 可能静默不生效；指定 refspec 更稳）
git fetch upstream refs/tags/v1.4.206:refs/tags/v1.4.206
git tag --list 'v[0-9]*.[0-9]*.[0-9]*' | sort -V | tail -3   # 确认最高 tag 已到位
# 验证构建号基数（不需打包即可确认）
node --input-type=module -e "
import { resolveVersionBase } from './config/scripts/build-mac-local.mjs'
console.log(resolveVersionBase(JSON.parse(require('node:fs').readFileSync('package.json','utf8')).version))"
# 然后重建才会带上新版本号（版本号在打包时烘焙进 Info.plist）
node config/scripts/build-orca-s.mjs --install
```

**判据**：`resolveVersionBase` 的输出应当 ≥ 远端最新发布 tag；否则说明本地 tag 过期。

**Why:** 2026-09-19 用户发现装出来的包还是 `1.4.197-local.*`，实际代码已是最新——根因是本地 tag 停在 v1.4.197，而机制取 max(tag, package.json)。

**How to apply:** 每次同步后、打包前跑一次 `resolveVersionBase` 核对；同步时把取 tag 与取分支一起做（`git ls-remote --tags` 先核）。注意 tag 补齐**不必补全**——只补最高那个即可满足版本基数（本次只补到 v1.4.206，v1.4.198~205 仍缺，不影响）。关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]。
