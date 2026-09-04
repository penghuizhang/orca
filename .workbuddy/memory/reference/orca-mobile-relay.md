---
name: orca-mobile-relay
description: orca 移动端架构探索 + 自建服务器中转三路径
metadata:
  type: project
---

# Orca 移动端探索与自建中转

## 移动端是什么

- `mobile/` = React Native(Expo) 配套 App（包名 com.stably.orca.mobile）
- 功能=远程遥控桌面（终端/worktree/任务 PR 看板/代码审阅/浏览器/语音转写）
- **手机不存业务数据，全部经 RPC 从桌面拉取**
- 配对=桌面 Settings→Mobile 生成 QR（`orca://pair?code=` base64url JSON）

## 三路径对比

| 路径 | 方案 | 代码改动 | 推荐 |
|------|------|----------|------|
| A | frp 透明隧道（本地+云服务器） | 零代码 | ✅ 已实施 |
| B | 自研兼容官方 Relay | 大工程 | ❌ |
| C | 服务器复刻 RPC 服务端 | 中等工程 | ❌ |

## frp 隧道（路径 A，已实施 2026-08-17）

- 端口 8095（port_registry 分配）
- 云服务器：120.26.183.77（Rocky10，SSH root 免密）
- 云端：frps 0.68 systemd 常驻，防火墙开 7000+8095
- 本地：/opt/homebrew/etc/frp/frpc.toml + brew services start frpc 常驻
- 隧道：127.0.0.1:6768(orca-s) → 云8095
- 待用户：阿里云安全组开 8095/7000 + Settings→Mobile 自定义 ws://120.26.183.77:8095

## 设计文档

`.workbuddy/docs/mobile/2026-08-16-移动端探索与自建中转方案.md`
`.workbuddy/docs/mobile/2026-08-17-frp云中转配置方案.md`
