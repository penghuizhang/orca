# 添加 ox-alpha-free 模型配置 + 强制思考模型使用问题（排查记录）

- 日期：2026-08-21
- 任务：在 opencode（zcode CLI）增加 `ox-alpha-free` 模型配置，并排查「切到该模型后用不了」的问题。

## 1. 配置改动（已完成、正确）

文件：`~/.zcode/cli/config.json`

在 `provider.opencode-go.models` 下新增（最初用户口述为 `x-preview-f-free`，实际正确名为 `ox-alpha-free`）：

```json
"ox-alpha-free": {
  "name": "OX Alpha Free"
}
```

## 2. 「切到 ox-alpha-free 用不了」根因

查 `~/.zcode/cli/log/zcode-2026-08-21.jsonl` 得到真实错误，非 API Key 问题：

```
[1210] This model always engages in thinking and cannot be disabled; please use low, high, or max
```

- `ox-alpha-free` 是**强制思考（reasoning）模型**：必须开启 thinking，且思考档位只能是 `low` / `high` / `max`。
- zcode CLI 默认以 `thoughtLevel: disabled` 发起请求（见日志 `"thoughtLevel":"disabled"`），被网关拒绝。
- 经实测（用 config.json 里真实 apiKey 直接打 `/v1/chat/completions`，含流式），`ox-alpha-free` 在网关侧**完全正常**——只要不传「禁用思考」即可。所以模型配置本身没问题。

## 3. 修复方法（无需再改 config.json）

思考档位是**会话级**设置，config 无对应字段（config.example.json 无 per-model reasoning 字段）。在 TUI 里把推理强度从 disabled 改成 low/high/max 即可：

- 输入框为空时按 **`Tab`** → 打开「reasoning effort」选择器 → 选 `low`（或 `high`/`max`）；
- 或直接在对话框输入命令：**`/effort low`**。

改完后再向 ox-alpha-free 发消息即可正常工作。

## 4. 次要告警（非故障主因）

日志还有一条 `session.model_selection.persist_failed` / `FOREIGN KEY constraint failed`（modelId=ox-alpha-free）。
原因：该模型未登记进 CLI 内部 SQLite 模型目录表，导致「选择持久化」写入失败。**不影响实际请求**（请求已成功到达网关，才会有上面的 [1210] 错误），仅表现为选择可能不跨重启保留。如介意，需让 CLI 刷新模型目录（或属已知小瑕疵），非阻塞。

## 验证

- config.json 合法 JSON；`ox-alpha-free` 已写入、`x-preview-f-free` 已移除。
- 网关 `/v1/models` 确认 `ox-alpha-free` 在列（共 28 个）。
- 真实 apiKey 打 `/v1/chat/completions` 对 `ox-alpha-free` 返回正常（非流式 + 流式均成功）。

## 回滚

删除该 JSON 条目即可，无其它副作用。
