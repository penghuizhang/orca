---
name: orca-agent-id-collision-silent-duplicates
description: 二开与上游各自新增同名 agent id 时产生的 7 处无冲突标记静默重复；tsc 只抓 1 处；检测脚本与实测优先裁决方法
metadata:
  node_type: memory
  type: feedback
  originSessionId: sess_1b193932-101f-4849-a9b4-5120b995b8ff
---

# 同名 agent id 撞车 ⇒ 7 处零冲突标记的静默重复（2026-09-26 实测）

## 触发条件

上游和二开**各自新增了同名 id**。2026-09-26 的实例：上游 `90801e2deb feat(agents): add
first-class ZCode harness (#22464)` 新增 `zcode`（标注 `Z.ai zcode CLI`），二开 PR #5 早已
新增 `zcode`（标注 `kingsword09/zcode-cli`）——**同一个 CLI 的两个标注**（二进制都是 `zcode`，
数据都在 `~/.zcode/cli/db`）。

git 看到的是「两处不同位置的插入」⇒ **干净合并，零冲突标记**。

## 为什么 tsc 几乎抓不到

TypeScript 只拒绝**对象字面量**的重复键（TS1117）。**数组元素、联合类型成员、数组里对象的
重复 `id` 全部正常编译**。实测 7 处，tsc 只抓到 1 处：

| 文件 | 形态 | tsc | 运行时后果 |
|------|------|-----|-----------|
| `src/shared/tui-agent.ts` | 联合类型成员 | ❌ | 无（联合自动去重） |
| `src/shared/tui-agent-config.ts` | 对象字面量键 | ✅ | 后者静默覆盖前者 |
| `src/shared/tui-agent-display-names.ts` | 对象字面量键 | ✅ | 同上 |
| `src/shared/telemetry-property-schemas.ts` | 数组元素 | ❌ | 枚举多一项，靠测试炸 |
| `src/shared/tui-agent-selection.ts` | 数组元素 | ❌ | 自动兜底优先级出现死项 |
| `src/shared/agent-catalog.tsx` | 数组里两对象 `id` 同 | ❌ | **agent 选择器里 ZCode 出现两次** |
| `src/shared/skills-cli-agent-keys.ts` | 真冲突标记 | — | 见「实测优先」 |

**另有一类更隐蔽的**：上游搬走实现后取上游版，会**静默丢掉二开在新位置的值**（该文件本身可能
零冲突标记）。见 [[orca-merge-upstream-conflict-playbook]] 的「上移枚举补丁」。

## 检测（唯一可靠方式）

```bash
node .agents/skills/upstream-merge-safety/scripts/find-duplicate-ids.mjs --base <二开侧 ref>
```

- 必须**带 `--base` 做差集**：全树本身有约 119 处**合法**重复（Node `stdio` 的
  `['ignore','pipe','pipe']`、重复 argv flag、shell 片段数组）。不带基线 = 119 条噪音。
- **不能用正则**：`grep -oE "id: '...'" | sort | uniq -d` 把不同作用域复用同一 id 全报出来
  （实测 91 处误报）。脚本用 `oxc-parser` 走真实 AST，每个字面量各自成域。
- 基线里**不存在**的文件要跳过（上游新增文件，其内部重复已过上游 CI，不是本次合并引入的）。
- 本仓库 `typescript@7` 是 Go 原生版，`require('typescript')` **只有 `version`**，没有编译器
  API ⇒ 用 `oxc-parser`（oxlint 同源，已在 `node_modules`）。

### 写这类 AST 遍历脚本的坑

`for (…) if (…) visit(x)` 后面换行接 `else` ⇒ **else 挂到内层 if**（JS 悬垂 else），
非数组的单对象子节点**永远不会被访问**，脚本静默报「一切正常」。必须写大括号。

自检方式：拿**已知有重复的真实文件**跑一遍，确认能报出来。只在干净树上跑过一次不算验证过。

## 取舍：取上游那份

保留上游条目，理由是上游那份带**实测依据的注释**（`expectedProcess: 'zcode-cli'` 注明
ZCode 把 `process.title` 改成 `zcode-cli`，否则 dispatch 报 `no_agent_detected`），
而二开那份是早期未验证的简化值。7 处全部按此处理。

## 实测优先于上游结论

上游 `skills-cli-agent-keys.ts` 把 `zcode` 映射成 `'zcode'`；二开标 `null` 并注释
「skills CLI 的 `--agent` 命名空间没有 zcode，填错会 exit-1」。

裁决靠查本机实际安装的 CLI，不靠任何一方的注释：

```bash
grep -ri "zcode" /opt/homebrew/lib/node_modules/skills | head          # 无输出
grep -rlo "claude-code" /opt/homebrew/lib/node_modules/skills/dist       # 有输出（对照）
```

`skills` v1.4.6 全包没有 `zcode`、却有已知合法键 `claude-code` ⇒ **保留二开的 `null`**，
注释里记「上游称 'zcode'，本机 v1.4.6 实测无此键」。

> 注意：`skills add --agent <x> --list` **不校验** agent 键（合法键与瞎编的键输出完全相同、
> 退出码都是 0），拿它当探针会得出无效结论。要搜包本体。

## 产物

工程 skill `.agents/skills/upstream-merge-safety/`（SKILL.md + 两个脚本）。
关联 [[orca-merge-upstream-conflict-playbook]]、[[orca-shallow-clone-sync]]。
