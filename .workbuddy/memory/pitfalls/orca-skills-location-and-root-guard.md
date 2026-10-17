---
name: orca-skills-location-and-root-guard
description: 工程 skill 放哪：可 / 调用必须在 .agents/skills/（本地不提交），团队共享放 .workbuddy/skills/；root directory guard 禁新增根级目录
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_1b193932-101f-4849-a9b4-5120b995b8ff
---

# 工程 skill 的位置：入口与脚本必须分离（2026-09-26 实测）

## 约束

1. **能被 `/` 调用的 skill 必须在 `.agents/skills/`**。该目录被 agent 自动加载——本仓库的
   `orca-dev-workflow`、`memory-docs-workflow` 都在那儿，且 frontmatter 写 `invocable: true`。
2. **`.agents/` 被 `.gitignore:172` 忽略，且从未被跟踪**。想 `git add -f` 让团队共享会撞死门禁。
3. **`pr.yml` 的 `root directory guard` 禁止新增根级目录/文件**：

   ```
   ::error title=Root-level additions blocked::New root-level files or folders bloat the GitHub landing page.
   Blocked entries: .agents
   ```

   本地复现：`node .github/scripts/check-root-directory-entries.mjs origin/custom HEAD`

## 解法：入口与脚本分离

| 位置 | 放什么 | 提交 |
|------|--------|------|
| `.agents/skills/<slug>/SKILL.md` | **可 `/` 调用的主流程入口** | ❌ 本地 |
| `.workbuddy/skills/<slug>/` | 正确性判据 + 可复用脚本 | ✅ 团队共享 |

入口文档按路径引用 `.workbuddy/` 里的脚本，**代码只有一份**。

> 2026-09-26 踩过一次：先把 skill 建在 `.agents/skills/upstream-merge-safety` 又复制到
> `.workbuddy/skills/` 同样的内容，两份必然各自漂移 ⇒ 删掉 `.agents/` 那份副本。
> 教训：入口是文档、不是同一份内容的第二个家。

## AGENTS.md 与 CI 矛盾

AGENTS.md 的「Team Knowledge in Repo (Shared by Commit)」写着
「可复用流程 / SOP → `.agents/skills/<slug>/SKILL.md`（本仓库已提交）」——
但实际上 `.agents/` 从未被跟踪，且 CI 门禁禁止新增根级目录。**门禁是硬约束**，
团队共享的 skill 放 `.workbuddy/skills/`。这两处说法矛盾，建议团队改一处（AGENTS.md 或门禁）。

## 三 skill 分工（2026-09-26 定）

- `/orca-upstream-sync`（`.agents/`）— 同步上游 + 提 PR 主流程，11 步
- `upstream-merge-safety`（`.workbuddy/`）— 静默重复检测脚本 + i18n 按键合并脚本 + 取舍表
- `/orca-dev-workflow`（`.agents/`）— 打包 + 安装 + 验证 + preflight（同步职责已划走，触发词错开）

拆分的理由：主流程需要大量命令和判断，塞进原本已 300+ 行、且 `sync-and-build` 脚本在浅克隆下
本就跑不动的 `orca-dev-workflow`，既跑不动也不利维护。职责不重叠、代码不重复。

## 用户偏好

2026-09-26 用户明确要求「将我们的这个流程创建成一个 skill，后续我直接使用这个 skill 技能」——
即**多步可重复流程要沉淀成可 `/` 调用的工程 skill，而不只是写一份文档**。

关联 [[orca-agent-id-collision-silent-duplicates]]、[[orca-dev-workflow]]、[[orca-packaging-rework-20260923]]。
