---
name: teleagent-proxy
description: 工程 /Users/zhangpenghui/code/aistudy/2026/teleagent 是 TeleAgent 本地
  API 反向代理——协议与签名机制、凭据读取方式、401 自愈
metadata:
  node_type: memory
  type: reference
  originSessionId: sess_c164a80e-cca6-452f-94fd-84d6b010f81d
---

# TeleAgent 本地 API 反向代理（探索工程）

**位置**：`/Users/zhangpenghui/code/aistudy/2026/teleagent/`
**组成**：`README.md`（逆向探索成果）+ `teleagent-proxy.py`（约 290 行，自动签名的透传代理）
注意：这不是 orca 工程的一部分，是独立的探索工程，不要与 orca 目录混淆。

## 架构与端口

- **TeleAgent** = Electron 桌面应用（v2.1.5，`/Applications/TeleAgent.app`）
- 核心后端 **super-agent-code**（Go + Hertz）：`127.0.0.1:4397`（实际绑 `*:4397`，所有网卡）
- **im-service**（Node）：`127.0.0.1:17802`，提供 `authHeader` 等
- **scheduler daemon**（Node）：调度器
- 数据根：`~/.local/share/TeleAgent/`（含 `users/<owner>/teleagent.db`、`users/<owner>/log/super-agent-server-*.log`）
- 后端源码线索：`code.srdcloud.cn/AI-Cloud/super-agent-code`

## API 协议（opencode 风格，SSE）

```
/session  /session/{id}  /session/{id}/message  /session/{id}/abort
/global/config  /global/session/status  /global/event
/provider  /provider/auth  /provider/status  /permission
/skill  /skill/add  /mcp  /ready（唯一免认证）
```

## 本地认证机制（local_auth，防重放）

```
Authorization: Basic base64("<username>:<password>")
X-SA-Sign-Version: local-v1
X-SA-Timestamp: <毫秒时间戳>
X-SA-Nonce: <24 位 hex 随机数>
X-SA-Signature: base64url(HMAC-SHA256(session_key, msg))
msg = "local-v1\n<METHOD>\n<PATH含query>\n<TS>\n<NONCE>"
```

- 时间戳窗口校验 → `local_auth_timestamp_invalid`
- nonce 防重放 → `local_auth_replay_detected`
- 签名必须实时生成，抓包值不可复用

## 凭据来源（关键）

`session_key` / `username` / `password` 由 Electron 主进程**每次启动随机生成**，只注入 im-service 子进程环境变量（不落盘）：

```
SUPER_AGENT_OPENCODE_USERNAME=super-agent
SUPER_AGENT_OPENCODE_PASSWORD=<随机>
SUPER_AGENT_LOCAL_SESSION_KEY=<随机 32 字节 base64url>
```

读取方式：`sudo ps eww -p <im-service pid>`（需 root；本机免密 sudo 可用）。应用重启后凭据变化，代理按 PID 变化自动刷新。

**凭据缓存注意**：`~/.teleagent-proxy/creds.json` 里记的是当时的 im-service PID，**PID 变化即失效**，需回退 sudo 重读。

## 启动

```bash
# 确保 TeleAgent 正在运行
python3 teleagent-proxy.py --port 18089 --simulate-ui --persist-creds
curl http://127.0.0.1:18089/session
curl http://127.0.0.1:18089/global/config
```

- `--port`：默认 18089（本机 18080 已被别的代理占用）
- `--simulate-ui`：模拟 UI 请求头（UA / x-opencode-directory / sec-ch-*），降低被识别为第三方客户端的风险，**建议开**
- `--persist-creds`：凭据落 `~/.teleagent-proxy/creds.json`（0600），代理重启免 sudo；绑定 im-service PID，应用重启后自动失效重读
- 401 自愈：收到 401 自动绕过缓存强制重读凭据并重试一次

## 接入第三方工具

- 代理是**协议透传**（opencode 协议），支持 SSE 流式
- 支持 opencode 协议的工具：baseURL 指向 `http://127.0.0.1:18089`
- 只支持 OpenAI 兼容协议（`/v1/chat/completions`）的工具需再套一层协议转换，未实现

## 注意事项

- 只监听 127.0.0.1，**不要对外暴露**（凭据可完全调用本地 API）
- `creds.json` 是明文密钥（0600），勿共享/勿入 git
- `/usage/statistics` 是 **POST**（GET 返回 404）

关联：[[teleagent-model-tiers]]
