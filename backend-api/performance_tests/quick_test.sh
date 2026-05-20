#!/bin/bash

# 快速性能测试脚本
# 用于开发环境的快速性能验证

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 配置
HOST="http://localhost:8000"
REPORT_DIR="performance_tests/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p $REPORT_DIR

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FastAPI 快速性能测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查服务
echo -e "${YELLOW}检查 FastAPI 服务...${NC}"
if curl -s -o /dev/null -w "%{http_code}" $HOST/health | grep -q "200"; then
    echo -e "${GREEN}✓ FastAPI 服务正在运行${NC}"
else
    echo -e "${RED}✗ FastAPI 服务未运行${NC}"
    exit 1
fi

echo ""

# 快速测试 (50 用户, 2 分钟)
echo -e "${YELLOW}运行快速性能测试 (50 用户, 2 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    --users 50 --spawn-rate 5 --run-time 2m --headless \
    --html=$REPORT_DIR/quick_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/quick_test_${TIMESTAMP} \
    --loglevel WARNING

echo ""
echo -e "${GREEN}✓ 快速性能测试完成${NC}"
echo -e "报告: ${YELLOW}$REPORT_DIR/quick_test_${TIMESTAMP}.html${NC}"
echo ""
