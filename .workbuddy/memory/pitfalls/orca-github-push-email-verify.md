---
name: orca-github-push-email-verify
description: GitHub 推送被 penghuizhang 账号「邮箱未验证」账户级拦截（403 You must verify your
  email address）——所有 push 被拒，与代理/提交作者/noreply 无关；附 git 凭证与 gh token 技术坑
metadata:
  node_type: memory
  type: memory
  originSessionId: sess_f3c3162b-9d30-4524-ac91-b5f9d6ca99b4
---

# GitHub 推送被账户未验证邮箱拦截（orca fork 提 PR 的硬性 blocker）

- **现象（2026-08-26）**：`git push` 到 `penghuizhang/orca` 被 GitHub 直接拒，HTTP **403 + `remote: You must verify your email address.`**——这不是 GitHub 宕机，是**账户级策略**：推送账号必须至少有一个已验证邮箱，否则所有 push 全拒。
- **【坑】与代理 / 提交作者邮箱 / noreply 都无关**：本机代理 `http://127.0.0.1:54687` 是通的（请求已打到 GitHub 并返回该错）；即使把提交作者改成 GitHub noreply 地址（`<id>+<login>@users.noreply.github.com`）仍被同一 403 拦截——因为拦截判的是**账号**是否有验证邮箱，不是单条 commit 作者。
- **根因**：账号 `penghuizhang`（id=17181083）绑定的邮箱 `1360315221@qq.com` 处于**未验证**状态。
- **Why / How to apply**：本 fork 每次 `git push` / 建 PR 都会撞这个墙，直到用户在 github.com → Settings → Emails 验证一个邮箱（或加新邮箱验证）。验证完成后**无需改任何代码 / 作者**，直接重推即可。用户容易误判为「GitHub 挂了」——先确认是不是这个 403，再让用户去验证邮箱。
- **git 凭证技术坑（顺带记录）**：
  - `gh` 的 OAuth token（`gho_...`）**不能直接当 git https 凭证**：`git -c http.extraHeader="Authorization: Bearer <gho>"` 推 → `invalid credentials`；`gh auth setup-git` 会把 gh 配成凭证助手，但仍绕不过上面的邮箱拦截。
  - 本机 `git config credential.helper=osxkeychain`，当前 keychain **无** github.com 条目（push 会 `unable to get password from user`）；需 PAT 或 `gh auth setup-git`。
  - `gh` token 缺 `user` scope → `gh api user/emails` 返回 404；要查已验证邮箱需先 `gh auth refresh -s user`。
  - 推 GitHub 仍须走代理：`git -c http.proxy=http://127.0.0.1:54687 push`。
