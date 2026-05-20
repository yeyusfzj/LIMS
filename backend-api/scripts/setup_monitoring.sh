#!/bin/bash

# 监控和日志系统部署脚本
# 用于快速部署 Prometheus、Grafana、Loki 等监控组件

set -e

echo "========================================="
echo "Laboratory System - 监控和日志系统部署"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 和 Docker Compose
echo -e "${YELLOW}检查依赖...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker 和 Docker Compose 已安装${NC}"
echo ""

# 创建必要的目录
echo -e "${YELLOW}创建目录结构...${NC}"
mkdir -p logs
mkdir -p prometheus/alerts
mkdir -p loki
mkdir -p grafana/provisioning/datasources
mkdir -p grafana/provisioning/dashboards
mkdir -p grafana/dashboards

echo -e "${GREEN}✓ 目录创建完成${NC}"
echo ""

# 创建 Docker 网络（如果不存在）
echo -e "${YELLOW}创建 Docker 网络...${NC}"
if ! docker network inspect lab-network &> /dev/null; then
    docker network create lab-network
    echo -e "${GREEN}✓ Docker 网络创建完成${NC}"
else
    echo -e "${GREEN}✓ Docker 网络已存在${NC}"
fi
echo ""

# 启动监控服务
echo -e "${YELLOW}启动监控服务...${NC}"
docker-compose -f docker-compose.monitoring.yml up -d

echo -e "${GREEN}✓ 监控服务启动完成${NC}"
echo ""

# 等待服务就绪
echo -e "${YELLOW}等待服务就绪...${NC}"
sleep 10

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
echo ""

# Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Prometheus 运行正常 (http://localhost:9090)${NC}"
else
    echo -e "${RED}✗ Prometheus 未就绪${NC}"
fi

# Alertmanager
if curl -s http://localhost:9093/-/healthy > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Alertmanager 运行正常 (http://localhost:9093)${NC}"
else
    echo -e "${RED}✗ Alertmanager 未就绪${NC}"
fi

# Grafana
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Grafana 运行正常 (http://localhost:3000)${NC}"
    echo -e "  默认用户名: admin"
    echo -e "  默认密码: admin"
else
    echo -e "${RED}✗ Grafana 未就绪${NC}"
fi

# Loki
if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Loki 运行正常 (http://localhost:3100)${NC}"
else
    echo -e "${RED}✗ Loki 未就绪${NC}"
fi

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}监控和日志系统部署完成！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "访问地址："
echo "  - Prometheus: http://localhost:9090"
echo "  - Alertmanager: http://localhost:9093"
echo "  - Grafana: http://localhost:3000 (admin/admin)"
echo "  - Loki: http://localhost:3100"
echo ""
echo "查看日志："
echo "  docker-compose -f docker-compose.monitoring.yml logs -f [service]"
echo ""
echo "停止服务："
echo "  docker-compose -f docker-compose.monitoring.yml down"
echo ""
