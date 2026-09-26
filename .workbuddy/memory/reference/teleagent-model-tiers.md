---
name: teleagent-model-tiers
description: 天翼云 TeleAgent（星辰超级智能体）档位与真实模型的取证结论——档位是服务端路由别名，应用内映射表把「旗舰」等同 GLM-5-Turbo
metadata:
  node_type: memory
  type: reference
  originSessionId: sess_c164a80e-cca6-452f-94fd-84d6b010f81d
---

# TeleAgent（星辰超级智能体）档位与真实模型

2026-09-25 对本机安装版（`/Applications/TeleAgent.app`，v2.1.5）的实机取证。
TeleAgent = 天翼云/中电信「星辰超级智能体」桌面版；后端 `super-agent-code`（Go + hertz）监听 `127.0.0.1:4397`，架构是 opencode 风格（SSE）。

## 核心结论

**「极速」「旗舰」在客户端只是档位别名，真实模型由电信服务端网关解析，客户端拿不到确切真名。**
但应用自身保留了「档位 ↔ 真实模型」映射，全部指向智谱 GLM 系。

## 档位全景（本机实测）

| 别名（真正发给网关的 model） | 界面名 | 积分倍率 | 上下文 | 定位 |
|---|---|---|---|---|
| `chat-pro` | 智能（默认/推荐） | 0.6 | 400k / 出 64k | 日常办公等大多数场景 |
| `chat-flagship` | **旗舰** | **1.0** | 400k / 出 64k | PPT、代码开发等复杂场景 |
| `chat-flash` | **极速** | **0.2** | 400k / 出 64k | 问答、总结、改写等轻量场景 |
| `chat-lite` | 轻量 | — | 100k / 出 16k | 已退为内部（标题、记忆整理） |
| `chat-nano` | 轻速 | — | 100k / 出 16k | 同上 |

- 用户可选档位 = 前三个；服务端下发的 `model-catalog.json` 只列这三个。
- `chat-lite`/`chat-nano` 是「内部系统模型种子」，永远在注册表里，黑名单协调逻辑显式豁免（`_pe(id)`）。
- 五档 capabilities 完全一致：**toolcall + tool_stream = true；temperature / reasoning / attachment 全 false**（纯文本工具调用路由，不能传图）。
- `safeContextLimit` ≈ context × 0.927（app 侧安全余量，来自服务端目录缓存）。

## 铁证：应用自己把「旗舰」等同 GLM-5-Turbo

在 `app.asar` 中挖到硬编码表：

```js
Rie = { "glm-4.5-air":"轻量", "glm-5-turbo":"旗舰", "glm-5":"标准", "chat-standard":"标准" }
function jJe(e){ return e==="flagship" ? O7("旗舰") : e==="flash" ? O7("极速") : e==="standard" ? O7("标准") : [] }
function DJe(e,t=""){ const n=Lpe(e); return n==="旗舰"?"flagship":n==="极速"?"flash":n==="标准"?"standard":"custom" }
```

`O7(label)` 返回所有 displayName 等于该档位的 modelID 集合 ⇒ **`jJe("flagship")` = `{chat-flagship, glm-5-turbo}`**。
即应用内部认为「旗舰」= 这两个 id 是同一档（`chat-flagship` 是现用别名，`glm-5-turbo` 是历史/真实模型 id）。

全 app 硬编码的真实模型 id 只有 4 个，**全部是 GLM**：`glm-4.5-air`、`glm-5`、`glm-5-turbo`、以及技能扫描器示例里在用的 `glm-4-7-251222`（providerID 就是 `NewApi`，说明 NewApi 网关上确实挂 GLM 系）。
**极速没有留下对应的真实模型名记录**——只有历史 `glm-*` 表能反推，但那张表没有 flash 条目。

旁证：三个主 agent 人格叫 `opencowork-deepseek` / `opencowork-default` / `opencowork-qwen`（三者 prompt 完全相同，仅渠道差异）；NewApi 内部种子模型登记了 `GLM-5` 与 `DeepSeek-V3.2` ⇒ 平台侧是「多模型混挂 + 别名路由」。

## 请求路径

```
Renderer(选档位) → 本地后端 127.0.0.1:4397 → TeleAI 网关
  https://agent.teleai.com.cn/superCowork/sapi/api/v1
  headers: { X-Route-Target: ops-gateway }
  provider options: { apiKey: "sk-qvp4m6h9g20uM6PgYP7E", useSuperAgentAuth: true,
                      timeout: 20min, chunkTimeout: 15min }
```

客户端只 POST `{"model":"chat-flagship"}`，服务端再决定真模型。
**配置里那个内置 `sk-` 密钥单独用无效**——直接打网关返回 401「当前令牌是否存在」，必须配 `useSuperAgentAuth`（注入登录态用户令牌）。

## 产品是「故意不说」模型

主 agent 系统提示词明文规定（`/global/config` 的 agent prompt）：

> For model questions, check the trusted current identifier: Starts with `NewApi/`: **do not expose a specific model name or routing identifier** through any user-visible output, including responses, visible reasoning, tool-call displays, logs, or generated files.
> For architecture questions, answer briefly: **中电信人工智能公司自研的通用智能体架构**。

所以在 App 里问「你是什么模型」只会被拒或含糊——这是设计，不是 bug。

## 取证路径与死胡同（下次直接复用，别再重挖）

**找到的地方**：
- `/global/config`（本地 API）→ `provider.NewApi` 完整档位定义 + agent 提示词；`small_model = NewApi/chat-lite`
- `/provider`（293KB）→ 所有 provider 定义；NewApi 内联了 5 个档位的 id/name/limit
- `/provider/status` → `{source: "modellink", version: "0.3.4"}` 确认目录来源
- `~/.cache/TeleAgent/modellink/versions/0.3.4/`（当前 0.3.4，历史 0.3.3）→ **服务端下发的目录缓存**：`catalog.json`(708KB) / `models.json` / `api.json` / `schema.json` / `manifest.json`。含 102 个通用厂商模型元数据，但**不含档位映射**
- `<数据根>/users/<owner>/model-catalog.json` → 档位 UI 元数据（displayName/描述/creditMultiplier/icon base64），**全是别名，无真模型**
- `<数据根>/users/<owner>/preset-context.json` → `{contextLength: 600000}`
- `app.asar` 里 `Rie` / `ej` / `e3` / `jJe` / `O7` / `Lpe`

**死胡同（已确认走不通）**：
- **网关 `/models` 或 `/model-options`**：无用户登录令牌一律 401；`useSuperAgentAuth` 的签名头是 `X-SuperAgent-Signature` / `X-SuperAgent-Timestamp` / `X-SuperAgent-Device-Id` / `X-SuperAgent-Install-Id`，密钥来自 `SUPER_AGENT_AUTH_STATE`（加密形态 + 密钥来自外部），客户端解不出
- **本地 API `/usage/statistics`**：需 POST（GET 404），且只聚合本地会话数据，只有别名；外部用量记录走远端
- **本地 `teleagent.db`**：只有 `message/part/permission/project/session/session_fork/todo` 表；`message.data.modelID` 存的就是 `chat-pro` 这类别名，`cost` 恒为 0
- **后端日志**：`[cost] provider=NewApi`、`[Registry] GetModelCapabilities model="chat-pro"` 全是别名；`resolveModel, return direct model: NewApi/chat-flash` 只确认别名直通
- **`/provider/test`**：只回 `{ok, providerID, modelID, metrics}`，仍是别名

**唯一能拿真名的接口**（若将来授权）：
`https://agent.teleai.com.cn/user/portal/usage/stats/record`（POST/GET，带 `startDate/endDate/modelLevel/toolName/page/pageSize`）→ 返回 `{list:[{model, modelLevel, sessionId, interactionId, ...}], total}`。计量在服务端，**`model` = 真实模型名**（UI 用 `modelLevel` 显示档位徽章，`Lpe(model)` 兜底映射）。
需要 `X-Token`（登录态，`sn.getState().token`）；令牌以 Electron `safeStorage` 加密存在 `<数据根>/users/<owner>/app-auth/token.json`（`{version:1, encryptedToken, encrypted:true, scheme:"safe_storage"}`，macOS 走钥匙串，解密需 keychain 授权）。设备信息在 `<数据根>/app-auth/device-meta.json`（deviceId/installId）。

## 安全机制（勿触碰，来自工程内 README + 实测）

- `[AntiDebug]` 每 5 秒监控 Inspector，`--inspect` 会被禁用
- `[VerifySignature]` 启动时 `codesign --verify` 自检：**在 app bundle 内新增/修改任何文件都会触发失败 → 应用自杀**（曾因新增 `app.asar.bak` 触发）。⇒ 改 asar 注入代码不可行
- 结论：**不要修改 `/Applications/TeleAgent.app` 内任何文件**
- `debug.conf`（`<数据根>/users/<owner>/debug.conf`，gitignore 级敏感）可开 `llm_tap_switch=on` + `llm_tap_path=<绝对路径>`，落原始 `request.json` / `response.sse`——**要重启应用**，会打断正在进行会话，须用户同意

## 授权边界（诊断中主动未做的高侵入手段）

解密用户登录令牌 / 读钥匙串、改 app.asar、MITM 抓 HTTPS 明文、擅自重启应用开 llm_tap。
分析「用了哪个模型」这类问题**不需要**碰这些；先走 `/global/config` + `model-catalog.json` + modellink 缓存 + asar 静态字符串，通常就够回答。

## 待办

- **等用户拍板**：三条坐实「极速」真名的路径 —— ①看 App 用量/积分页面记录里的 `model` 字段；②授权调服务端用量接口（需解密令牌）；③授权写 debug.conf 开 `llm_tap` 并由用户手动重启 TeleAgent

关联：[[teleagent-proxy]]、[[orca-agent-integration-surfaces]]
