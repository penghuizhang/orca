---
name: upstream-merge-safety
description: >-
  合并上游 stablyai/orca 进 custom 分支时的正确性保障：静默重复检测、i18n 语言包语义合并、
  冲突取舍判定、合并后门禁清单。触发词："合并上游"、"同步上游"、"同步 orca"、"upstream merge"、
  "冲突怎么解"、"合并安全"、"同步后要验什么"、"merge upstream"
invocable: true
---

# 上游合并正确性保障

`orca-dev-workflow` 管**流程**（强拉、切分支、打包、预检）。本 skill 管**正确性**：
合并之后怎么证明二开的东西既没丢、也没和上游打架。

> 2026-09-26 实测基线：合并 131 个上游提交，表面 11 个冲突，实际藏了 **7 处无冲突标记的静默重复**，
> `tsc` 只抓到 1 处。本 skill 的存在就是为了把那 6 处变成可自动检出。

## 何时用

- 合并上游进 custom（无论用哪种方式）
- 往 custom 合入任何新增了 agent id / 注册表项的分支
- 合并后 `pnpm tc` 过了但不确定二开功能是否完好

## 核心风险：两侧新增同一个 id ⇒ 无冲突标记的静默重复

上游和二开会**各自新增同名 agent**。2026-09-26 上游提交 `90801e2deb feat(agents): add
first-class ZCode harness (#22464)` 加了 `zcode`（标注 Z.ai `zcode` CLI），而二开 PR #5 早
就加过 `zcode`（标注 kingsword09/zcode-cli）。git 看到的是「两处不同位置的插入」，**干净合并，
零冲突标记**。

TypeScript 只拒绝**对象字面量**里的重复键（TS1117）。**数组元素、联合类型成员、目录里的
重复 `id` 全部正常编译**。实测 7 处分布：

| 文件 | 形态 | tsc 是否报错 | 运行时后果 |
|------|------|------------|-----------|
| `src/shared/tui-agent.ts` | 联合类型成员重复 | ❌ 不报 | 无（联合去重） |
| `src/shared/tui-agent-config.ts` | 对象字面量键重复 | ✅ TS1117 | **后者静默覆盖前者** |
| `src/shared/tui-agent-display-names.ts` | 对象字面量键重复 | ✅ TS1117 | 同上 |
| `src/shared/telemetry-property-schemas.ts` | 数组元素重复 | ❌ 不报 | 枚举多一项，测试才炸 |
| `src/shared/tui-agent-selection.ts` | 数组元素重复 | ❌ 不报 | 自动兜底优先级里出现死项 |
| `src/shared/skills-cli-agent-keys.ts` | 对象字面量键（真冲突） | — | 见下「实测优先」 |
| `src/renderer/src/lib/agent-catalog.tsx` | 数组里两个对象 `id` 相同 | ❌ 不报 | **agent 选择器里 ZCode 出现两次** |

### 检测

```bash
# 合并后必跑：对比二开侧基线，只报这次合并新引入的重复
node .workbuddy/skills/upstream-merge-safety/scripts/find-duplicate-ids.mjs --base <二开侧 ref>
```

`--head <ref>` 可检查已提交的合并而不看工作区。`--all` 列出全树重复（噪音大，仅调试用）。

**不要用正则扫**：`grep -oE "id: '...'" | sort | uniq -d` 会把不同作用域复用同一个 id 全部报出来
（实测 91 处误报）。脚本用 `oxc-parser` 走真实 AST，每个字面量各自成域，报出的都是真重复。
全树本身有约 119 处**合法**重复（Node `stdio` 的 `['ignore','pipe','pipe']`、重复 argv flag、
shell 片段数组），所以默认必须带 `--base` 做差集才有意义。

## i18n 语言包：必须按键语义合并，不能「两边都留」

语言包是同步里最大的冲突面（2026-09-26：6 个文件 22 个冲突块）。两种错法：

1. **闭合括号被吞**——对象的 `}` 在共享后缀里，两边直接拼会少一个 `}`，报
   `Expecting ',' delimiter` 且**行号指向文件末尾**，极难定位。
2. **重复 JSON 键**——两侧常常新增**同名同值**的键（fork 把 `zcode_label` 放数组末尾，
   上游放在 `muse_label` 旁边）。`json.load` 静默接受后者，UI 里就渲染两次。

用脚本按键做三向合并（fork / upstream / merge-base）：

```bash
# 必须在 merge commit 之前跑：:1:/:2:/:3: 索引 stage 只在未提交时存在
python3 .workbuddy/skills/upstream-merge-safety/scripts/merge-locales.py
```

- 格式零扰动：仓库语言包与 `json.dumps(obj, indent=2, ensure_ascii=False) + "\n"` 字节一致，
  整体重写后的 diff 只含新增键。
- 两侧都改且值不同的键会打印出来交人工判定（脚本 exit 1），其余按键并集。
- 跑完仍要用 `verify:localization-catalog` 复核——它查的是 en/目标语言的**占位符一致性**，
  合并本身不保证这个。

## 冲突取舍：先判「谁改了这个文件」

**禁止 `--ours`/`--theirs` 一把梭。** 对每个冲突文件：

```bash
BASE=$(git merge-base HEAD upstream/main)
git diff --stat $BASE HEAD      -- <file>   # 二开侧改了什么
git diff --stat $BASE upstream/main -- <file>  # 上游改了什么
```

| 情形 | 取舍 |
|------|------|
| 双方各**新增**并列项（不同 token） | **并集叠加**（例：`main.css` 里二开 `--status-merged` + 上游 `--status-warning`） |
| 双方**顺序**不同、内容相同 | 取上游排序（少 diff） |
| 双方新增**枚举成员/注册项** | **并集**，多行书写便于后续再加 |
| 上游搬走实现 | 取上游，**再把二开的值补进新位置**（最易静默丢失的一类） |
| 上游是语义重构、二开被大量文件消费 | 取二开 |
| 纯顺序差异 + 语义分歧 | 拆开看，见下面 zcode 那条 |

## 实测优先于上游结论

上游写死一个值不等于它对。2026-09-26 的实例：上游 `skills-cli-agent-keys.ts` 把 `zcode`
映射成 `'zcode'`，而二开标了 `null` 并附注释说「skills CLI 的 `--agent` 命名空间没有 zcode，
填错会 exit-1」。

裁决方式——查本机实际安装的 CLI，而不是相信任何一方的注释：

```bash
# skills CLI 全包搜 zcode；同时搜一个已知合法键做对照
grep -ri "zcode" /opt/homebrew/lib/node_modules/skills | head
grep -rlo "claude-code" /opt/homebrew/lib/node_modules/skills/dist | head
```

结果：`skills` v1.4.6 全包**没有** `zcode` 字符串，却有已知键 `claude-code` ⇒ 保留二开的
`null`，并在注释里记下「上游称 'zcode'，本机 v1.4.6 实测无此键」。

> 通用判据：`[官]` < `[证]` < `[测]`，冲突时**以本机实测为准**，官方结论记为「官方称…（版本 X）」。

## 合并后门禁清单

```bash
pnpm tc                                    # 硬门禁：零冲突 ≠ 集成完成
node .workbuddy/skills/upstream-merge-safety/scripts/find-duplicate-ids.mjs --base HEAD^1
for s in verify:localization-catalog verify:localization-runtime-catalog \
           verify:localization-extraction verify:localization-coverage; do
  pnpm run $s || break
done
```

这四项本地化 + tc 就是 `pr.yml` 的真门禁（**不跑** native）。

`pnpm tc` 过了之后**还要**做的，因为 tsc 覆盖不到：

- 重复 id 检测（上面）
- 抽查二开功能自己的测试：`pnpm test src/main/usage src/renderer/src/components/stats`
- 逐键核对语言包没丢（脚本见 `.workbuddy/memory/pitfalls/orca-merge-upstream-conflict-playbook.md`）

### 合并 commit 用 `--no-verify`

合并会暂存上万文件，lint-staged 会对**全部上游文件**跑 oxlint/oxfmt（重排上游代码 + 极慢）。

### 改完冲突文件后单独跑 lint 矩阵

`check:code-quality:changed` 的基线是 `origin/main`，合完上游变更集上万文件、报几千条存量噪音，
**不可用**。改成对自己改过的文件跑 5 套配置：

```bash
FILES="src/shared/tui-agent-config.ts src/renderer/src/lib/agent-catalog.tsx"  # 改成实际列表
f=(${=FILES})                     # zsh 不对未加引号的变量分词，必须 ${=var}
for cfg in "NONE" \
           "--config config/oxlint-code-quality-native-plugins.json" \
           "--type-aware --config config/oxlint-code-quality-type-aware.json" \
           "--config config/oxlint-react-doctor.json" \
           "--config config/oxlint-design-system.json"; do
  c=(${=cfg}); [ "$c[1]" = "NONE" ] && c=()
  npx oxlint "${c[@]}" "${f[@]}" --deny-warnings || break
done
npx oxfmt --check "${f[@]}"
```

> `for cfg in $var` 在 zsh 里**不分词**，整串会当成一个参数传给 oxlint，报出莫名其妙的 FAIL。

## 收尾

- 合并前打回退锚点：`git tag -f backup/pre-sync-$(date +%Y%m%d) custom && git push origin custom`
- 合并结果记进 `.workbuddy/memory/pitfalls/`，索引更新 `.workbuddy/memory/MEMORY.md`
- 复盘时**必问**：这次两侧有没有各自新增同名 id？语言包有没有同名同值键？
  这两个问题 2026-09-26 各埋了 6 处和一片重复键。

## 关联

- 流程编排（强拉/切分支/打包/预检）：`orca-dev-workflow`
- 冲突逐案手册（2026-09-19 的 8 个冲突 + 键丢失核对脚本）：
  `.workbuddy/memory/pitfalls/orca-merge-upstream-conflict-playbook.md`
- 浅克隆静默不更新：`.workbuddy/memory/pitfalls/orca-shallow-clone-sync.md`
- PR 门禁地图：`.workbuddy/memory/pitfalls/orca-pr-first-run-gate-map.md`
