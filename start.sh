#!/bin/bash
# 星之匣 一键启动脚本 (Linux/Mac)
# 功能：环境检查 -> 依赖安装 -> 数据库初始化 -> 模式选择启动

set -e

echo "========================================"
echo "  星之匣 StellarChest — 启动器"
echo "  $(pwd)"
echo "========================================"

# --- 检查 Node.js ---
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 22+"
    exit 1
fi
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[错误] Node.js 版本过低 (v$NODE_VERSION)，需要 18+"
    exit 1
fi

# --- .env ---
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "[INFO] 从模板创建 .env"
        cp .env.example .env
    else
        echo "[ERROR] .env.example 不存在"
        exit 1
    fi
fi

# --- 依赖 ---
if [ ! -d node_modules ]; then
    echo "[INFO] 安装依赖..."
    npm install
else
    echo "[INFO] 依赖已就绪"
fi

# --- 数据目录 ---
mkdir -p data/uploads/{images,audio,projects} data/exports

# --- 数据库 ---
if [ ! -f data/galgame_toolkit.db ]; then
    echo "[INFO] 初始化数据库..."
    npm run db:generate
    npm run db:push
    npm run db:seed
else
    echo "[INFO] 数据库已就绪"
    npm run db:push -- --accept-data-loss 2>/dev/null || true
fi

# --- 模式选择 ---
echo ""
echo "  请选择启动模式："
echo ""
echo "    [1] 开发模式 (next dev)"
echo "        - 带热更新，改代码自动刷新"
echo "        - 适合开发调试"
echo ""
echo "    [2] 生产模式 (next build + next start)  [默认]"
echo "        - 先构建再启动，性能最好"
echo "        - 适合部署 / 日常使用"
echo ""
echo "    [3] 只构建生产（next build）"
echo "        - 只构建不启动"
echo ""
echo "========================================"
read -p "请输入选项 [1/2/3]（直接回车默认 2）: " choice
choice=${choice:-2}

case $choice in
    1)
        echo ""
        echo "========================================"
        echo "  http://localhost:3000"
        echo "  模式: DEVELOPMENT (next dev)"
        echo "========================================"
        npm run dev
        ;;
    3)
        echo ""
        echo "========================================"
        echo "  [只构建模式] 执行 next build..."
        echo "========================================"
        npm run build
        echo ""
        echo "✅ 构建完成！可用 npm run start 启动"
        ;;
    2|*)
        echo ""
        echo "========================================"
        echo "  [生产模式] 检查构建产物..."
        echo "========================================"
        if [ ! -f .next/BUILD_ID ]; then
            echo "[INFO] 未检测到构建产物，执行 next build..."
            npm run build
        else
            echo "[INFO] 已有构建产物 (.next/BUILD_ID 存在)"
        fi
        echo ""
        echo "========================================"
        echo "  http://localhost:3000"
        echo "  模式: PRODUCTION (next start)"
        echo "========================================"
        npm run start
        ;;
esac
