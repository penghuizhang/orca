---
name: orca-shallow-clone-sync
description: orca 仓库是浅克隆——git fetch 与 tag 列表都会静默不更新（分支引用 + tag 两类假同步）、main 与上游无共同祖先无法合并；同步前必须强拉 + 核日期，且第二次起走增量流程
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_dead4223-aef7-431e-b767-23aaf6a5b024
---

# orca 浅克隆下的上游同步（2026-09-19 实测）

本机 orca 仓库是**浅克隆**：`git rev-parse --is-shallow-repository` = true，`.git/shallow` 10 条 graft（2026-08-15 ~ 09-03）；本地历史 custom 561 / main 456 提交，而远端上游 1233+。

## 坑 1：`git fetch upstream` 静默不更新引用（最危险的假同步）

首次执行 `git fetch upstream --tags`：**退出码 0、零输出**，本地 `refs/remotes/upstream/main` 仍停在 `01d7228b7e`（2026-09-04）。但 `git ls-remote upstream main` 显示远端实际已到 `b8f3b1ec00` —— 中间隔了 15 天的上游提交，**没有任何报错**。

**同一现象也发生在 tag 上**（当天二次踩到）：本地 tag 最高只到 `v1.4.197`，而远端发布 tag 已到 `v1.4.206` ⇒ 直接导致本地构建号基数算错（详见 [[orca-build-version-base]]）。**分支引用和 tag 都要单独核**。

取完还要复核「拉到的到底是不是最新」：本次 `git fetch upstream main --depth=1` 拿到的 `7080eb0604` 在几分钟内就被 `e2afb5eef9` 取代（上游日更极快）。

**修法**：显式 refspec 强拉，并核对日期：

```bash
git fetch upstream 'refs/heads/*:refs/remotes/upstream/*' --force
git log -1 --format='%h %ci %s' refs/remotes/upstream/main                # 必须核日期
git ls-remote upstream main                                                # 对照远端真实 tip
git ls-remote --tags upstream | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | tail -3   # tag 也要核
git rev-list --count custom..refs/remotes/upstream/main                     # 确认落后多少
```

**判据**：fetch 退出码 0 不代表同步成功；「有没有更新」只看 reflog/ref 指向与日期。

## 坑 2：main 分支无法合并上游（标准三步流程失效）

`git merge-base main upstream/main` **返回空**（无共同祖先，graft 切断了历史）→ 在 main 上 `git merge upstream/main` 报 `fatal: refusing to merge unrelated histories`。
而 `custom` 与上游有正常合并基 ⇒ **直接 `custom merge upstream/main` 可行**。

- 想恢复「upstream → main → custom」三步流程，必须先 `git fetch upstream --unshallow`（全量历史下载，带宽成本高，需用户拍板）。
- 附带事实：main 早已不是「纯净分支」——PR #19 曾把 custom 合入 main；当前 main 是 custom 的祖先（custom 领先 105 提交）。

**Why:** 这两条会让「同步」变成假动作（以为同步了其实没动）或直接卡死流程；2026-09-19 若不核对日期就会漏掉 1186 个上游提交。

## 坑 3：标准化脚本在浅克隆下直接失效

`config/scripts/sync-upstream.mjs` 与 `orca-sync-and-build.mjs` **写死了 `upstream → main → custom` 三步**，`git checkout main && git merge upstream/main` 会因无共同祖先直接失败 ⇒ 浅克隆未修复前不要用这两个脚本（本次全程手工同步）。**遗留待拍板**：是否把脚本改成直接 `custom merge upstream/main`。

## 可用流程：首次大同步 vs 增量追平（2026-09-19 两轮实测）

**先判断量级**：差上千个提交走「大同步」，只差几十个走「增量追平」——后者只跑简化版，不必重复整套动作（本次第二轮只 6 个提交、1 个冲突）。

```bash
# 通用前置
git fetch upstream 'refs/heads/*:refs/remotes/upstream/*' --force
git log -1 --format='%h %ci %s' refs/remotes/upstream/main                      # 核日期
git rev-list --count <上次已合并的 tip>..refs/remotes/upstream/main              # 差多少
git merge-tree --write-tree --name-only HEAD refs/remotes/upstream/main | head -20   # 预演冲突
git tag -f backup/pre-sync-$(date +%Y%m%d) custom && git push origin custom      # 仅大同步需要
git merge refs/remotes/upstream/main --no-edit
```

合并后统一走：`git status --porcelain` 清干净 → `pnpm install`（**必查新提交是否动了锁依赖**：`git diff --stat <旧tip> <新tip> -- pnpm-lock.yaml package.json pnpm-workspace.yaml`；本次第二批 6 提交带了 +81 行锁文件）→ `pnpm tc` → `verify-features` → `build-orca-s --install`。冲突解决见 [[orca-merge-upstream-conflict-playbook]]。

push 全部走 SSH 成功（`d2e17c0335 → 140117ca17 → 358e1d6309 → 117aa48006 → f9a3df7afa`），**未触发「邮箱未验证」拦截，无需 https_proxy**。

**How to apply:** 同步 orca 前先跑核对命令（分支 + tag 两样都核，否则会「假同步」）；合并前预演冲突；第二次起按增量流程走。关联 [[orca-dev-workflow]]、[[orca-fork-2dev]]、[[orca-merge-upstream-conflict-playbook]]、[[orca-build-version-base]]。
