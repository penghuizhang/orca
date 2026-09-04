---
name: orca-fork-2dev
description: 用户 fork stablyai/orca 做二开（GitHub: penghuizhang/orca），需与日更上游同步
metadata:
  type: project
---

# Orca Fork 二开项目

## 项目概况

- **Fork**：penghuizhang/orca（从 stablyai/orca fork）
- **本地路径**：`/Users/zhangpenghui/code/aistudy/2026/fork/orca`
- **协议**：MIT，Electron+TS 的 Agent 开发环境（ADE）
- **上游活跃度**：日更 66 commits，每日发版

## 分支结构

| 分支 | 用途 | PR 规则 |
|------|------|---------|
| upstream/main | 官方上游代码 | 不动 |
| main | 纯净分支，只接受上游同步的 merge | **禁止提 PR** |
| custom | 二开主干，所有功能汇入这里 | **唯一正确的 PR 合并目标** |
| feature/xxxx | 具体功能开发分支 | 开发完 → PR 合并到 **custom** |

**⚠️ 核心约束**：功能分支只能往 custom 提 PR，不能往 main、master、orca 分支提 PR。

## 已合并的二开功能

| 功能 | PR | 状态 |
|------|----|----|
| 日历功能一期 | #4 | ✅ 已合并 |
| zcode agent 类型 | #5 | ✅ 已合并 |
| custom.db 业务库 | #6 | ✅ 已合并 |
| 日历周概览+复制清单 | #8 | ✅ 已合并 |
| 浏览器自动化 MCP | #16, #17 | ✅ 已合并 |
| 日历清单历史周月查看 | #15 | ✅ 已合并 |
| 移除 Gitee 集成 | #18 | ✅ 已合并 |
| ZCode 使用统计独立面板 | #20 | ✅ 已合并 |
| Pi 智能体+用量统计 | — | ✅ 已合并 |

## 打包

- **appId**：com.penghuizhang.orca-s（与官方共存不覆盖）
- **一键打包**：`node config/scripts/build-orca-s.mjs [--install]`
- **只能从 custom 分支打包**（守卫 exit 1）
- **打包前必须**：确认 custom 包含所有功能分支 + rm -rf dist/

## 同步策略

```
官方更新 → main merge upstream → custom merge main → 重新打包
```

冲突面小（ui.ts/persistence/en-zh.json + electron-builder），手工合。

## 标准化脚本

| 脚本 | 用途 |
|------|------|
| sync-upstream.mjs | 自动同步 upstream → main → custom |
| verify-features.mjs | 打包前验证二开功能完整性 |
| orca-sync-and-build.mjs | 一键同步+打包 |
| build-orca-s.mjs | 打包脚本（已添加自动验证） |

## 重要教训

- **safeStorage 密钥绑定 bundleId**：orca 与 orca-s 数据不可直接复制
- **lint-staged 的 oxfmt --write 曾损坏 en.json**：提交大 JSON 后必须 json.load 验证
- **dead proxy 堵死外网**：Settings→高级网络设置→清空 Proxy URL
- **Cookie 格式**：必须带 auth= 前缀，裸单星 Fe26.2* 会被拒
- **nvm 交互 shell 必须 `nvm use 24.19`**：非交互 shell 用 PATH 注入
- **github 需代理**：`https_proxy=http://127.0.0.1:54687`

## 工程专属 Skill

`.agents/skills/orca-dev-workflow/`（.gitignore 忽略）
触发词："同步 orca"、"打包 orca"、"更新 orca"、"orca sync"、"orca build"
