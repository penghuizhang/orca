#!/bin/bash
# 设置 ZCode 记忆系统软链接
# 用途：让 ZCode 自动读取 .workbuddy/memory/ 下的记忆文件
# 使用：bash .workbuddy/scripts/setup-memory-symlinks.sh

set -e

# 配置
PROJECT_ROOT="/Users/zhangpenghui/code/aistudy/2026/fork/orca"
ZCODE_MEMORY_DIR="$HOME/.zcode/cli/memories/projects/orca-bdee74a86b8d6002/memory"

# 检查目录
if [ ! -d "$PROJECT_ROOT/.workbuddy/memory" ]; then
    echo "❌ 错误：.workbuddy/memory/ 目录不存在"
    exit 1
fi

# 创建 ZCode 记忆目录（如果不存在）
mkdir -p "$ZCODE_MEMORY_DIR"

# 清理旧文件（保留软链接）
echo "清理 ZCode 系统目录..."
cd "$ZCODE_MEMORY_DIR"
find . -maxdepth 1 -type f -delete 2>/dev/null || true
find . -maxdepth 1 -type l -delete 2>/dev/null || true

# 创建软链接
echo "创建软链接..."
ln -sf "$PROJECT_ROOT/.workbuddy/memory/MEMORY.md" MEMORY.md
ln -sf "$PROJECT_ROOT/.workbuddy/memory/daily" daily
ln -sf "$PROJECT_ROOT/.workbuddy/memory/active" active
ln -sf "$PROJECT_ROOT/.workbuddy/memory/pitfalls" pitfalls
ln -sf "$PROJECT_ROOT/.workbuddy/memory/reference" reference

# 验证
echo ""
echo "✅ 软链接创建完成："
ls -la "$ZCODE_MEMORY_DIR"

echo ""
echo "验证读取..."
if cat "$ZCODE_MEMORY_DIR/MEMORY.md" > /dev/null 2>&1; then
    echo "✅ MEMORY.md 读取正常"
else
    echo "❌ MEMORY.md 读取失败"
    exit 1
fi

echo ""
echo "🎉 设置完成！ZCode 现在可以自动读取 .workbuddy/memory/ 下的记忆文件。"
