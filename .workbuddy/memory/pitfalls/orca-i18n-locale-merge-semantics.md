---
name: orca-i18n-locale-merge-semantics
description: 上游同步时 i18n 语言包三向合并的正确删除语义、merge-locales.py 的缺口、glossary/CLDR 复数/CSS 值误伤与陈旧键清账手法
metadata:
  type: memory
  source: zcode-auto
  date: 2026-11-25
---

# i18n 语言包合并的正确语义（2026-11-25 实测）

## 一、merge-locales.py 有两个语义缺口（本轮暴露并修掉）

脚本（`.workbuddy/skills/upstream-merge-safety/scripts/merge-locales.py`）原逻辑：

```python
for k, v in ours.items():
    if k in theirs: out[k] = merge(...)
    else: out[k] = v        # ← 上游删除的键被保留 = 陈旧键的来源
```

**正确语义**（三向 delete）：

- `k in theirs` → 递归合并
- `k not in theirs` 且 `k in base` → **上游删除，跟随删除**
- `k not in theirs` 且 `k not in base` → **fork 新增，保留**

不修这处，每轮同步都会把「上游已删除的键」留成陈旧条目，越积越多（上轮 3378、本轮清理前 3368+）。

另两个坑：

1. **`base` 别传错**：本轮我先误把 `base` 设成 ours（`ddd4572`），结果「所有 theirs 没有的键」都被当成上游删除，一次删掉 3.3k 二开键（calendar 文案全丢，catalog 立刻报 keys missing）。base 必须是**上一轮同步时的上游基线**（本轮 `b0c0377664a`）。
2. **脚本打印的冲突只有键名、不带嵌套路径**：`conflicts.append(f'{path} :: {key}')` 的 `path` 是文件路径。人工判定时要自己用 `find_key` 递归定位真实位置（本轮 `computersConsent` 实际在 `sessionHistory.settings.computersConsent`，`chatTitle` 在 `accounts.antigravity.chatTitle`；改在顶层会多出无效顶层键）。

## 二、陈旧键清账（存量债的正确战场）

`pnpm run verify:localization-extraction` 的 `unreferenced`（named nowhere in source）就是陈旧键清单：

- 判定三态：上游有引用 → 不能删；`base` 有 → 上游已删，跟随删；**base 无 + 上游无 + 源码无引用 → 二开 auto-translation 历史产物，删**。
- 脚本只打印前 20 条：临时把 `printKeys` 的 `keys.slice(0, 20)` 改成全量、跑完 `git checkout` 恢复，即可拿到完整清单（3369 条）。
- 删除范围：`src/renderer/src/i18n/locales/*.json` **全部语言**（含该键的）+ `config/scripts/locale-*-overrides.*`，然后 `pnpm run sync:localization-runtime-catalog` 重生成 runtime 目录。
- 清理后 extraction 输出应为 `0 named nowhere in source`、`0 inline defaults differ`。

## 三、glossary（术语表）校验的两个坑

1. **不要无脑替换**：`collectGlossaryViolations` 报的 `found → rendering` 直接全局替换会**打穿代码/CSS 值**。本轮把一条 feature-wall 的 CSS 字符串里 `.ravs-sc-commit-area` 替换成了 `.ravs-sc-커밋-area`，catalog 立刻升级成「repair-locale-catalog would rewrite these translated terms back to English」。正确判定顺序：**上游该语言有同键 → 取上游值；否则删键（回落英文）；最后才考虑术语替换**，且值含 `{`/`;`/`[a-z-]` 样式特征的一律跳过。
2. **语言文件的合法键 ≠ en 的子集**：CLDR 复数变体（es 有 `_many`，en 只有 `_one/_other`）是合法的。用「en 权威」盲目 prune 会删掉 `_many`，catalog 立刻报 `missing CLDR plural forms that runtimes no longer fill`。清理 extra 时必须保留 `_zero/_one/_two/_few/_many/_other` 后缀键。

## 四、顺序建议（本轮验证的最小闭环）

```
三向重建（正确 base）→ 双改键取上游/保留二开 → 删 extra（保复数后缀）
→ glossary 修正（上游优先/删除兜底）→ 清 unreferenced → sync:localization-runtime-catalog
→ verify:localization-catalog / runtime-catalog / extraction / coverage 四项全绿
```

> AI生成