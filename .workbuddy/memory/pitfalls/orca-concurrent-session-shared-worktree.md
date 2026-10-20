---
name: orca-concurrent-session-shared-worktree
description: 多个 agent 会话共用同一个 git worktree 时会互相抹掉在途合并（reset/切分支）；2026-10-17 实测两轮冲突解决被清空
metadata:
  type: pitfall
---

**2026-10-17 实测**：做上游同步（3002 提交、21 处冲突）时，另一个会话在**同一 worktree** 上做同一件事，
`git reflog` 留下铁证：

```
14:10:43 reset: moving to HEAD                      ← 抹掉第一轮 21 处冲突解决（未提交）
14:40:58 checkout: sync/upstream-a87aa4ccdb → sync/upstream-88f27711fd
14:41:36 commit (merge): 2c7cc684a7                 ← 我的合并提交被带到对方新建的分支上
14:48:36 checkout: sync/upstream-88f27711fd → sync/upstream-05086a892e
```

后果：第一轮解完的 21 处冲突全部消失；第二轮提交后我的分支指针被切走；我 `git add -f .workbuddy`
还把**对方写的设计文档**卷进了我的合并提交；我自己的文档被对方抹掉。

## 判据（怎么发现自己被并发操作了）

```bash
git reflog --date=iso -5     # reset / checkout -b 不是自己做的 ⇒ 有并发会话
git rev-parse --abbrev-ref HEAD   # 分支名和上次不一样 ⇒ 被切走了
git branch --sort=-committerdate  # 出现陌生的 sync/upstream-<sha> 分支
git status --short | head         # 暂存区出现自己没 add 过的文件
```

## 对策

1. **合并解完立刻提交**（`--no-verify`）。已提交的合并再遇到 `reset` 也是 no-op；未提交的会整份消失。
   skill `orca-upstream-sync` 把「提交」排在门禁之前，正是这个道理——**不要带着未提交的合并去跑
   `pnpm install`/`pnpm tc`**（它们会触发安装与 postinstall，期间外部动作最容易撞上）。
2. 发现并发会话后：**停止改动索引与工作区**（提交/暂存/打包都会破坏对方在途合并），
   把成果保存成**分支**（ref 写操作不动工作区）后交还控制权：
   `git branch backup/<名字> <合并提交>`。
3. 想继续干活就换 **独立 worktree**（`git worktree add`），不要抢主工作区；打包尤其不能并发
   （两个 `build-orca-s.mjs --install` 会同时覆盖 `/Applications/orca-s.app`）。
4. 设计文档/记忆这类新增文件也可能被对方的 `git reset --hard` 抹掉 ⇒ 顺手 `cp` 一份到 `/tmp`。

## 边界

无法确定对方是不是「用户另开的会话」还是自动化任务时，**不要试图猜、也不要去杀进程**；
按上面第 2 条保存成果并如实报告即可。

关联 [[orca-upstream-sync-workflow-state]]、[[orca-shallow-clone-sync]]、[[orca-packaging-rework-20260923]]。
