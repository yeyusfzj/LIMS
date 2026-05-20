#!/bin/bash

# 性能测试运行脚本
# 运行各种性能测试场景并生成报告

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
HOST="http://localhost:8000"
REPORT_DIR="performance_tests/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# 创建报告目录
mkdir -p $REPORT_DIR

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}FastAPI 后端性能测试${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 检查服务是否运行
echo -e "${YELLOW}检查 FastAPI 服务...${NC}"
if curl -s -o /dev/null -w "%{http_code}" $HOST/health | grep -q "200"; then
    echo -e "${GREEN}✓ FastAPI 服务正在运行${NC}"
else
    echo -e "${RED}✗ FastAPI 服务未运行，请先启动服务${NC}"
    exit 1
fi

echo ""

# 1. 基础性能测试 (100 用户, 5 分钟)
echo -e "${YELLOW}1. 运行基础性能测试 (100 用户, 5 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=$REPORT_DIR/basic_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/basic_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 基础性能测试完成${NC}"
echo ""

# 2. 高并发测试 (500 用户, 10 分钟)
echo -e "${YELLOW}2. 运行高并发测试 (500 用户, 10 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    --users 500 --spawn-rate 25 --run-time 10m --headless \
    --html=$REPORT_DIR/high_concurrency_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/high_concurrency_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 高并发测试完成${NC}"
echo ""

# 3. 1000 QPS 压力测试 (1000 用户, 10 分钟)
echo -e "${YELLOW}3. 运行 1000 QPS 压力测试 (1000 用户, 10 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    --users 1000 --spawn-rate 50 --run-time 10m --headless \
    --html=$REPORT_DIR/stress_test_1000qps_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/stress_test_1000qps_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 1000 QPS 压力测试完成${NC}"
echo ""

# 4. 缓存性能测试 (200 用户, 5 分钟)
echo -e "${YELLOW}4. 运行缓存性能测试 (200 用户, 5 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    CachePerformanceUser \
    --users 200 --spawn-rate 20 --run-time 5m --headless \
    --html=$REPORT_DIR/cache_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/cache_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 缓存性能测试完成${NC}"
echo ""

# 5. 数据库查询性能测试 (100 用户, 5 分钟)
echo -e "${YELLOW}5. 运行数据库查询性能测试 (100 用户, 5 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    DatabaseQueryUser \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=$REPORT_DIR/database_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/database_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 数据库查询性能测试完成${NC}"
echo ""

# 6. 样品管理 API 测试 (150 用户, 5 分钟)
echo -e "${YELLOW}6. 运行样品管理 API 测试 (150 用户, 5 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    SampleManagementUser \
    --users 150 --spawn-rate 15 --run-time 5m --headless \
    --html=$REPORT_DIR/sample_api_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/sample_api_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 样品管理 API 测试完成${NC}"
echo ""

# 7. 统计分析 API 测试 (100 用户, 5 分钟)
echo -e "${YELLOW}7. 运行统计分析 API 测试 (100 用户, 5 分钟)...${NC}"
locust -f locustfile.py --host=$HOST \
    StatisticsAnalysisUser \
    --users 100 --spawn-rate 10 --run-time 5m --headless \
    --html=$REPORT_DIR/statistics_api_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/statistics_api_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 统计分析 API 测试完成${NC}"
echo ""

# 8. 稳定性测试 (300 用户, 30 分钟)
echo -e "${YELLOW}8. 运行稳定性测试 (300 用户, 30 分钟)...${NC}"
echo -e "${YELLOW}   这将需要较长时间，请耐心等待...${NC}"
locust -f locustfile.py --host=$HOST \
    --users 300 --spawn-rate 15 --run-time 30m --headless \
    --html=$REPORT_DIR/stability_test_${TIMESTAMP}.html \
    --csv=$REPORT_DIR/stability_test_${TIMESTAMP} \
    --loglevel INFO

echo -e "${GREEN}✓ 稳定性测试完成${NC}"
echo ""

# 生成汇总报告
echo -e "${YELLOW}生成测试汇总报告...${NC}"
python performance_tests/generate_summary_report.py $REPORT_DIR $TIMESTAMP

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}所有性能测试完成!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "测试报告保存在: ${YELLOW}$REPORT_DIR${NC}"
echo ""
echo "报告文件:"
ls -lh $REPORT_DIR/*${TIMESTAMP}*
echo ""
