#!/bin/bash
# 监控系统停止脚本

set -e

echo "========================================="
echo "停止监控和日志系统"
echo "========================================="
echo ""

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 停止监控服务
echo "停止监控服务..."
docker-compose -f docker-compose.monitoring.yml down

echo ""
echo "========================================="
echo "监控系统已停止"
echo "========================================="
echo ""
echo "如需删除数据卷，运行:"
echo "  docker-compose -f docker-compose.monitoring.yml down -v"
echo ""
