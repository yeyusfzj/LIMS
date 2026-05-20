#!/bin/bash

echo "🚀 实验室管理系统后端 API - 初始化脚本"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm"
    exit 1
fi

echo "✅ npm 版本: $(npm --version)"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi

echo "✅ 依赖安装成功"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo ""
    echo "📝 创建 .env 文件..."
    cp .env.example .env
    echo "✅ .env 文件已创建，请根据需要修改配置"
else
    echo "✅ .env 文件已存在"
fi

# 启动 Docker 服务
echo ""
echo "🐳 启动 Docker 服务 (PostgreSQL + Redis)..."
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker 服务启动成功"
        echo "   - PostgreSQL: localhost:5432"
        echo "   - Redis: localhost:6379"
        
        # 等待数据库启动
        echo ""
        echo "⏳ 等待数据库启动..."
        sleep 5
    else
        echo "⚠️  Docker 服务启动失败，请手动启动 PostgreSQL 和 Redis"
    fi
else
    echo "⚠️  未找到 Docker，请手动启动 PostgreSQL 和 Redis"
fi

# 生成 Prisma 客户端
echo ""
echo "🔧 生成 Prisma 客户端..."
npm run prisma:generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma 客户端生成失败"
    exit 1
fi

echo "✅ Prisma 客户端生成成功"

# 运行数据库迁移
echo ""
echo "🗄️  运行数据库迁移..."
npm run prisma:migrate

if [ $? -ne 0 ]; then
    echo "⚠️  数据库迁移失败，请检查数据库连接"
else
    echo "✅ 数据库迁移成功"
fi

echo ""
echo "=========================================="
echo "✨ 初始化完成！"
echo ""
echo "📚 下一步操作："
echo "   1. 检查并修改 .env 文件中的配置"
echo "   2. 运行 'npm run dev' 启动开发服务器"
echo "   3. 访问 http://localhost:3000/health 检查服务状态"
echo ""
echo "🧪 运行测试："
echo "   npm test"
echo ""
echo "=========================================="
