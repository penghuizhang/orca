---
name: orca-fetch-proxy-insteadof-trap
description: 本机全局 gitconfig 的 url.git@github.com:.insteadOf 会把 HTTPS URL 改写回 SSH，导致 http.proxy 完全失效、fetch 锁死在 25KB/s；用带端口形式 https://github.com:443/ 绕开，实测快 90 倍
metadata:
  node_type: memory
  type: feedback
date: 2026-10-20
---

# fetch 挂死的真凶：insteadOf 把 HTTPS 悄悄改写回 SSH（2026-10-20 实测）

## 症状

`git fetch upstream main` 跑满 500 秒被 timeout 杀掉；`--progress` 显示 `Receiving objects: 25.00 KiB/s` 龟速。
先按老经验怀疑「浅克隆 + 全量 `refs/heads/*`」，但**只拉 main 也一样慢**，说明不是对象数量问题。

## 根因（两步定位）

1. 本机有代理且很快：`curl -x http://127.0.0.1:54687 … codeload.github.com` = **2.4 MB/s**，直连只有 **26 KB/s**（≈90×）。
2. 但给 git 加 `-c http.proxy=http://127.0.0.1:54687` 后**速度一点没变**，且 `GIT_CURL_VERBOSE=1` **零输出** —— 说明 git 压根没走 HTTP。

查配置即真相：

```bash
git config --get-regexp 'url\.'
# url.git@github.com:.insteadof https://github.com/
```

全局 `insteadOf` 把 `https://github.com/...` **前缀改写回 `git@github.com:...`（SSH）**，于是：

- `http.proxy`（HTTP 代理）对 SSH 无效 ⇒ 代理白配
- SSH 直连 GitHub 被限速/挂死 ⇒ 25 KB/s 龟速甚至 40 秒零输出

## 修法（不改全局配置，只在单次命令上覆盖）

用**带端口的形式**让 URL 不匹配 `https://github.com/` 前缀 ⇒ 绕开 insteadOf：

```bash
# 拉取（main 定向 + tag）
git -c http.proxy=http://127.0.0.1:54687 -c credential.helper= \
    fetch https://github.com:443/stablyai/orca.git \
          main:refs/remotes/upstream/main --tags --progress
# 实测 140~250 KiB/s，18274 objects / ~22 MiB 顺利拉完

# 推送（凭据用 gh 的 token 放进 URL）
TOKEN=$(gh auth token)
git -c credential.helper= -c http.proxy=http://127.0.0.1:54687 \
    push "https://x-access-token:${TOKEN}@github.com:443/penghuizhang/orca.git" custom
```

## 附带的两个坑

1. **`gh auth git-credential` 作为 helper 失效**：单独跑
   `printf 'protocol=https\nhost=github.com\n\n' | gh auth git-credential get` 正常返回用户名/口令，
   但 git 调用它时直接 `fatal: unable to get password from user`（`GIT_TRACE` 可见 git 确实调了它）。
   未查明原因；**改用 `gh auth token` 拼进 URL** 一次成功。
2. **不要全量拉 `refs/heads/*`**：上游有 7982 个分支（全量包 248,953 objects 会卡死/超时）。
   定向 `main:refs/remotes/upstream/main` 只需增量包。
   另注：tag 拉取能顺带把 main 大部分对象带下来（2026-10-17 经验），所以 tag 值得一起拉。

## 判据与自检

- **fetch 退出码 0 ≠ 同步成功**；只看 `git log -1 upstream/main` 的日期 + `git ls-remote upstream refs/heads/main` 对照。
- 想确认 git 到底走没走代理：`GIT_CURL_VERBOSE=1` **零输出** = 没走 HTTP（被改写成 SSH 了）。
- 上游日更极快：本轮 10 分钟窗口内 main 从 `cf94325f` → `a18b44bfc0` → `bfc436be60` 动了三次，
  「拉到的不是最新」是常态，按拉取时刻固化目标 sha 即可。

**How to apply:** 本机所有 orca 的 GitHub 网络操作（fetch/push/ls-remote）一律用
`https://github.com:443/...` + `http.proxy=http://127.0.0.1:54687`；看到 25KB/s 级别的龟速先查 `git config --get-regexp 'url\.'`。
关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]、[[orca-merge-integration-gap-typecheck]]。
