#!/bin/bash

# FastAPI 后端服务快速设置脚本

set -e

echo "=========================================="
echo "FastAPI 样品管理后端服务 - 快速设置"
echo "=========================================="

# 检查 Python 版本
echo "检查 Python 版本..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.11"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "错误: 需要 Python $required_version 或更高版本，当前版本: $python_version"
    exit 1
fi
echo "✓ Python 版本: $python_version"

# 创建虚拟环境
echo ""
echo "创建 Python 虚拟环境..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✓ 虚拟环境创建成功"
else
    echo "✓ 虚拟环境已存在"
fi

# 激活虚拟环境
echo ""
echo "激活虚拟环境..."
source venv/bin/activate
echo "✓ 虚拟环境已激活"

# 安装依赖
echo ""
echo "安装 Python 依赖..."
pip install --upgrade pip
pip install -r requirements.txt
echo "✓ 依赖安装完成"

# 创建环境变量文件
echo ""
if [ ! -f ".env" ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    echo "✓ .env 文件创建成功"
    echo "⚠️  请编辑 .env 文件配置数据库连接和 JWT 密钥"
else
    echo "✓ .env 文件已存在"
fi

# 创建日志目录
echo ""
echo "创建日志目录..."
mkdir -p logs
echo "✓ 日志目录创建成功"

echo ""
echo "=========================================="
echo "设置完成！"
echo "=========================================="
echo ""
echo "下一步操作："
echo "1. 编辑 .env 文件配置数据库连接"
echo "2. 确保 PostgreSQL 数据库正在运行"
echo "3. 运行服务: uvicorn app.main:app --reload"
echo ""
echo "访问文档："
echo "- Swagger UI: http://localhost:8000/docs"
echo "- ReDoc: http://localhost:8000/redoc"
echo "- 健康检查: http://localhost:8000/health"
echo ""
