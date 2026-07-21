#!/bin/bash
# Galgame Toolkit 一键启动脚本 (Linux/Mac)
# 功能：安装依赖 -> 初始化数据库 -> 启动开发服务

set -e

echo "========================================"
echo "  Galgame Toolkit 一键启动"
echo "========================================"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js，请先安装 Node.js 18+ 版本"
    exit 1
fi

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "[错误] Node.js 版本过低 ($NODE_VERSION)，需要 18+ 版本"
    exit 1
fi

echo "[1/5] 检查环境配置..."
if [ ! -f .env ]; then
    echo "[提示] 未找到 .env 文件，从模板复制..."
    cp .env.example .env
    echo "[提示] .env 已创建，请根据需要修改配置（特别是 JWT_SECRET）"
fi

echo "[2/5] 安装依赖..."
npm install

echo "[3/5] 创建数据目录..."
mkdir -p data/uploads/images
mkdir -p data/uploads/audio
mkdir -p data/uploads/projects
mkdir -p data/exports

echo "[4/5] 初始化数据库..."
npm run db:generate
npm run db:push
npm run db:seed

echo "[5/5] 启动开发服务..."
echo "========================================"
echo "  服务启动成功！"
echo "  访问地址: http://localhost:3000"
echo "========================================"
npm run dev
