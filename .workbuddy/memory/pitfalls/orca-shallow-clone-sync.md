---
name: orca-shallow-clone-sync
description: orca 仓库是浅克隆——git fetch 会静默不更新引用、main 与上游无共同祖先无法合并；同步前必须强拉 + 核日期
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_dead4223-aef7-431e-b767-23aaf6a5b024
---

# orca 浅克隆下的上游同步（2026-09-19 实测）

本机 orca 仓库是**浅克隆**：`git rev-parse --is-shallow-repository` = true，`.git/shallow` 10 条 graft（2026-08-15 ~ 09-03）；本地历史 custom 561 / main 456 提交，而远端上游 1233+。

## 坑 1：`git fetch upstream` 静默不更新引用（最危险的假同步）

首次执行 `git fetch upstream --tags`：**退出码 0、零输出**，本地 `refs/remotes/upstream/main` 仍停在 `01d7228b7e`（2026-09-04）。但 `git ls-remote upstream main` 显示远端实际已到 `b8f3b1ec00` —— 中间隔了 15 天的上游提交，**没有任何报错**。

**修法**：显式 refspec 强拉，并核对日期：

```bash
git fetch upstream 'refs/heads/*:refs/remotes/upstream/*' --force
git log -1 --format='%h %ci %s' refs/remotes/upstream/main   # 必须核日期
git ls-remote upstream main                                   # 对照远端真实 tip
git rev-list --count custom..refs/remotes/upstream/main        # 确认落后多少
```

**判据**：fetch 退出码 0 不代表同步成功；「有没有更新」只看 reflog/ref 指向与日期。

## 坑 2：main 分支无法合并上游（标准三步流程失效）

`git merge-base main upstream/main` **返回空**（无共同祖先，graft 切断了历史）→ 在 main 上 `git merge upstream/main` 报 `fatal: refusing to merge unrelated histories`。
而 `custom` 与上游有正常合并基 ⇒ **直接 `custom merge upstream/main` 可行**。

- 想恢复「upstream → main → custom」三步流程，必须先 `git fetch upstream --unshallow`（全量历史下载，带宽成本高，需用户拍板）。
- 附带事实：main 早已不是「纯净分支」——PR #19 曾把 custom 合入 main；当前 main 是 custom 的祖先（custom 领先 105 提交）。

**Why:** 这两条会让「同步」变成假动作（以为同步了其实没动）或直接卡死流程；2026-09-19 若不核对日期就会漏掉 1186 个上游提交。

## 坑 3：标准化脚本在浅克隆下直接失效

`config/scripts/sync-upstream.mjs` 与 `orca-sync-and-build.mjs` **写死了 `upstream → main → custom` 三步**，第 4 步 `git checkout main && git merge upstream/main` 会因无共同祖先直接失败 ⇒ 浅克隆未修复前不要用这两个脚本（本次全程手工同步）。

## 可用的标准动作序列（2026-09-19 实战验证）

```bash
git fetch upstream 'refs/heads/*:refs/remotes/upstream/*' --force
git log -1 --format='%h %ci %s' refs/remotes/upstream/main     # 核日期
git merge-tree --write-tree --name-only custom refs/remotes/upstream/main | head -20
git tag -f backup/pre-sync-$(date +%Y%m%d) custom && git push origin custom
git merge refs/remotes/upstream/main --no-edit
# 冲突解决见 [[orca-merge-upstream-conflict-playbook]]
pnpm install && pnpm tc && node config/scripts/verify-features.mjs
node config/scripts/build-orca-s.mjs --install
```

两次 push 成功（d2e17c0335 → 140117ca17 → 358e1d6309），**SSH 推送未触发「邮箱未验证」拦截**，无需 https_proxy。

**How to apply:** 同步 orca 前先跑上文核对命令；合并前预演冲突 + 打 backup tag 并推 origin。关联 [[orca-dev-workflow]]、[[orca-fork-2dev]]、[[orca-merge-upstream-conflict-playbook]]。
