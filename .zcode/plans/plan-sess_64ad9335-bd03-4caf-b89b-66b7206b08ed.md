## 实施计划

### Phase 1：创建全局技能

1. 创建 `~/.agents/skills/memory-zcode-symlink/` 目录结构
2. 编写 SKILL.md
3. 编写核心脚本：
   - `setup-symlinks.sh`：软链接整个目录
   - `batch-migrate.sh`：批量迁移
   - `sync-new-items.sh`：同步新增内容（可选）

### Phase 2：更新现有技能

1. 更新 `memory-docs-workflow` 技能，添加软链接管理说明
2. 在 AGENTS.md 中添加相关说明

### Phase 3：测试和文档

1. 测试单个工程的软链接创建
2. 测试批量迁移
3. 更新日记忆

### 关键实现

使用方案 A：软链接整个 `.workbuddy/memory/` 目录到 ZCode 系统目录，新增任何内容都自动生效，无需同步脚本。