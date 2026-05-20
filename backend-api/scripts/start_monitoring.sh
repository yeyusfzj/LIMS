#!/bin/bash
# 监控系统启动脚本

set -e

echo "========================================="
echo "启动监控和日志系统"
echo "========================================="
echo ""

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "错误: Docker 未运行，请先启动 Docker"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "错误: Docker Compose 未安装"
    exit 1
fi

# 创建必要的目录
echo "创建必要的目录..."
mkdir -p logs
mkdir -p prometheus/alerts
mkdir -p grafana/dashboards
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p loki

# 检查配置文件是否存在
echo "检查配置文件..."
required_files=(
    "docker-compose.monitoring.yml"
    "prometheus/prometheus.yml"
    "prometheus/alertmanager.yml"
    "loki/loki-config.yml"
    "loki/promtail-config.yml"
    "grafana/provisioning/datasources/datasources.yml"
    "grafana/provisioning/dashboards/dashboards.yml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "错误: 配置文件 $file 不存在"
        exit 1
    fi
done

echo "所有配置文件检查通过"
echo ""

# 创建 Docker 网络（如果不存在）
echo "创建 Docker 网络..."
docker network create lab-network 2>/dev/null || echo "网络 lab-network 已存在"
echo ""

# 启动监控服务
echo "启动监控服务..."
docker-compose -f docker-compose.monitoring.yml up -d

echo ""
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo ""
echo "检查服务状态..."
docker-compose -f docker-compose.monitoring.yml ps

echo ""
echo "========================================="
echo "监控系统启动完成！"
echo "========================================="
echo ""
echo "访问以下 URL:"
echo "  - Prometheus:    http://localhost:9090"
echo "  - Grafana:       http://localhost:3000 (admin/admin)"
echo "  - Alertmanager:  http://localhost:9093"
echo "  - Loki:          http://localhost:3100"
echo ""
echo "运行测试:"
echo "  python scripts/test_monitoring.py"
echo "  python scripts/test_logging.py"
echo ""
echo "查看日志:"
echo "  docker-compose -f docker-compose.monitoring.yml logs -f"
echo ""
echo "停止服务:"
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
