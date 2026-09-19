---
name: orca-merge-upstream-conflict-playbook
description: 合并上游进 custom 时的冲突判定方法、8 个冲突文件具体解法、en.json 邻接冲突坑、以及「二开改动是否会被静默丢弃」的正确核对脚本
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_dead4223-aef7-431e-b767-23aaf6a5b024
---

# 合并上游 → custom 的冲突解法手册（2026-09-19 实测，1186 提交 / 8 冲突）

## 核心方法：先判「谁改了这个文件」，再决定取舍（禁止 --ours/--theirs 一把梭）

对每个冲突文件先做两侧相对合并基的差异，再按性质决定：

```bash
BASE=$(git merge-base HEAD refs/remotes/upstream/main)
git diff --stat $BASE <ours>  -- <file>     # 二开侧改了什么
git diff --stat $BASE <theirs> -- <file>    # 上游改了什么
```

判定规则：
- 上游**移动/抽取了实现**，二开侧改动已由新机制覆盖 → **取上游**
- 上游**整体删除文件** → 取上游（遗漏则 tsc 报错，能兜住）
- 上游属**新增项**、二开侧是**独立功能（挂起）** → 取上游 + 把二开的 1 行补进新位置（tsc 能兜住遗漏）
- 上游只是**改名/重构形态**、二开是**语义重构且被大量文件消费** → **取二开**
- 双方各**新增**内容 → **两边都保留（叠加）**

## 2026-09-19 的 8 个冲突落地解法

| 文件 | 处理 | 依据 |
|------|------|------|
| `pnpm-workspace.yaml` | 取上游 | 二开那条 `sherpa-onnx-darwin-x64@1.12.37` 豁免已过期（上游锁文件仍锁 1.12.37 并已删该豁免） |
| `src/main/runtime/rpc/methods/client-ui-schemas.ts` | 取上游 | 实现整体搬到 `src/shared/rpc-contract/client-ui-params.ts`，原文件只剩 re-export |
| `src/main/codex-accounts/runtime-home-settings-test-fixtures.ts` | 取上游 | 夹具抽成 `createCodexAccountSettings` + `createGlobalSettingsFixture`；二开必填字段 `visibleTaskProvidersDefaultedForGitee` 已由 `buildDefaultSettings` 提供 |
| `src/main/codex-accounts/service-test-harness.ts` | 取上游 | 同上 |
| `src/renderer/src/store/slices/usage-provider-slices.ts` | **取二开** | 二开工厂化重构（299→91 行，抽到 `usage-slice-factory.ts`）；上游仅把 `UsageShape` 改名 `UsageProviderTypes`、无新增 provider |
| `src/renderer/src/store/index.ts` | 叠加 | 保留二开 Pi/ZCode usage slice + 上游 `withDevelopmentStoreProbes` |
| `src/shared/global-settings-types.ts` | 叠加 | 上游 `aiVaultSearch` + 二开 `browserAutomationMcp` / `customDbPath` |
| `src/renderer/src/i18n/locales/en.json` | 双方全留 | 两处均为 JSON 对象同位置新增（邻接冲突） |

**上移枚举补丁（本次唯一的非同文件补丁）**：视图枚举 `TopLevelViewSchema` 随实现搬到 `src/shared/rpc-contract/client-ui-params.ts`，必须把二开的 `'calendar'` 补进新的 6 个视图值中。**教训**：上游搬走实现后，取上游版会静默丢掉二开在新位置的值（该文件本身可能无冲突标记），必须按「上游搬了哪个枚举/联合类型」主动补。

## en.json 邻接冲突的隐藏坑（本次卡住 3 轮）

两处冲突都是「JSON 对象同一位置双方各加键」，但**对象闭合括号在共享后缀里**：只删 3 行冲突标记会丢一个 `}`，表现为 `json.load` 报 `Expecting ',' delimiter` 且**行号指向文件末尾**（不是冲突处），极难定位。

正确做法：给先出现的那一方补 `},`（即 `"最后一条": "…"` → `"最后一条": "…"` + 换行 + `},`），顺带确认对象闭合括号没被吞。
**验证后必须逐键核对**（只 `json.load` 通过不够）——见下方脚本。

## ⚠️ 致命陷阱：`git show :2:file` 在提交后报错 → 静默拿到空串 → 脚本得出「全部丢失」的假结论

`json.loads('')` 抛异常，被 `continue` 吞掉后集合全空，输出「custom 新增键全部丢失」这种惊悚但完全错误的结果（**本次真的被误导了一轮**）。

- **索引 stage（`:1:`/`:2:`/`:3:`）只在 merge 未提交时存在**；提交后必须用**合并提交的父提交**：`<merge>^1` = 二开侧，`<merge>^2` = 上游侧。
- 更隐蔽的同类错误：**给集合变量重复赋值**（把上游集合赋给了 merged 变量）——会出现「merged 键数 == upstream 键数」这种自相矛盾的输出。
- **自查判据**：结果里若出现「100% 丢失」或「merged 与某一侧键数完全相同」，先怀疑脚本坏了，再看结论。

### 正确的键丢失核对脚本（三向对照，提交后可用）

```python
import json, subprocess
M = '<merge commit>'          # 或 HEAD
def keys(rev, p):
    t = subprocess.run(['git','show',f'{rev}:{p}'],capture_output=True,text=True).stdout
    def flat(d, pre=''):
        out = {}
        for k, v in d.items():
            kk = f'{pre}.{k}' if pre else k
            out.update(flat(v, kk) if isinstance(v, dict) else {kk: v})
        return out
    return flat(json.loads(t))
for loc in ['en','zh','es','fr','ja','ko']:
    p = f'src/renderer/src/i18n/locales/{loc}.json'
    kb = keys('<merge-base>', p); ko = keys(M+'^1', p); km = set(keys(M, p))
    added, lost = set(ko) - set(kb), (set(ko) - set(kb)) - km
    print(loc, '二开新增=', len(added), '丢失=', len(lost), '❌' if lost else '✓')
```

**判据**：`only_ours ∩ merged` 中扣除「上游主动删除的键」后，剩余必须为 0；只报「上游新增键丢失 = 0」**不能**证明二开键没丢。

## 合并操作注意

- **merge commit 用 `--no-verify`**：合并会暂存上万文件，lint-staged 会对全部上游文件跑 oxlint/oxfmt（重排版上游代码 + 极慢）。
- **合并前 `git merge-tree --write-tree --name-only custom refs/remotes/upstream/main` 预演**：本次预演 8 个 = 实际 8 个，零意外，可提前知道要准备什么。
- **合并前打 `backup/pre-sync-YYYYMMDD` tag 并推 origin**：出问题可一键回退。
- 本次结果：二开新增键零丢失（en 222 / zh 179 / es 45 / fr 0 / ja 45 / ko 45），上游新增键零丢失。

关联 [[orca-shallow-clone-sync]]、[[orca-dev-workflow]]、[[orca-fork-2dev]]。
