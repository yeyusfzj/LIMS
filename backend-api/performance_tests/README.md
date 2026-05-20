# 性能测试文档

## 概述

本目录包含 FastAPI 后端的性能测试脚本和配置文件。使用 Locust 进行负载测试和性能分析。

## 测试目标

- **API 响应时间**: P95 < 200ms
- **数据库查询时间**: P95 < 100ms
- **并发支持**: ≥ 1000 QPS
- **内存使用**: < 2GB (单进程)

## 安装依赖

```bash
pip install locust
```

## 运行测试

### 1. 基础性能测试

测试所有 API 端点的基本性能:

```bash
cd fastapi-backend
locust -f locustfile.py --host=http://localhost:8000
```

然后访问 http://localhost:8089 打开 Locust Web UI。

### 2. 无头模式运行

直接运行测试而不使用 Web UI:

```bash
# 100 用户，每秒增加 10 个用户，运行 5 分钟
locust -f locustfile.py --host=http://localhost:8000 \
    --users 100 --spawn-rate 10 --run-time 5m --headless

# 1000 QPS 压力测试
locust -f locustfile.py --host=http://localhost:8000 \
    --users 1000 --spawn-rate 50 --run-time 10m --headless
```

### 3. 特定场景测试

#### 认证 API 测试
```bash
locust -f locustfile.py --host=http://localhost:8000 \
    AuthenticationUser --users 50 --spawn-rate 5 --run-time 3m --headless
```

#### 样品管理 API 测试
```bash
locust -f locustfile.py --host=http://localhost:8000 \
    SampleManagementUser --users 100 --spawn-rate 10 --run-time 5m --headless
```

#### 缓存性能测试
```bash
locust -f locustfile.py --host=http://localhost:8000 \
    CachePerformanceUser --users 200 --spawn-rate 20 --run-time 5m --headless
```

#### 数据库查询性能测试
```bash
locust -f locustfile.py --host=http://localhost:8000 \
    DatabaseQueryUser --users 100 --spawn-rate 10 --run-time 5m --headless
```

### 4. 生成测试报告

```bash
locust -f locustfile.py --host=http://localhost:8000 \
    --users 500 --spawn-rate 25 --run-time 10m --headless \
    --html=performance_tests/reports/report_$(date +%Y%m%d_%H%M%S).html \
    --csv=performance_tests/reports/results_$(date +%Y%m%d_%H%M%S)
```

## 测试场景

### 1. 认证场景
- 用户登录
- 令牌刷新
- 获取当前用户信息

### 2. 样品管理场景
- 查询样品列表（分页）
- 获取样品详情
- 创建样品
- 更新样品

### 3. 工作流管理场景
- 查询工作流模板列表
- 获取工作流模板详情
- 查询任务列表
- 获取任务详情

### 4. 检测结果场景
- 查询检测结果列表
- 获取检测结果详情
- 创建检测结果

### 5. 审核管理场景
- 查询审核任务列表
- 获取审核统计

### 6. 报告管理场景
- 查询报告列表
- 获取报告详情
- 查询报告模板列表

### 7. 统计分析场景
- 获取综合统计
- 获取工作量统计
- 获取质量统计

### 8. 缓存性能场景
- 重复查询相同数据（测试缓存命中率）

### 9. 数据库查询场景
- 复杂关联查询
- 分页查询

## 性能指标

### 关键指标

1. **响应时间**
   - 平均响应时间 (Average)
   - 中位数响应时间 (Median)
   - 95 百分位响应时间 (P95)
   - 99 百分位响应时间 (P99)

2. **吞吐量**
   - 每秒请求数 (RPS/QPS)
   - 每分钟请求数 (RPM)

3. **错误率**
   - 失败请求数
   - 失败率百分比

4. **并发性能**
   - 最大并发用户数
   - 并发用户下的响应时间

### 监控指标

在测试期间，同时监控以下系统指标：

1. **CPU 使用率**
2. **内存使用率**
3. **数据库连接数**
4. **Redis 连接数**
5. **网络 I/O**
6. **磁盘 I/O**

## 性能优化建议

### 1. 数据库优化
- 添加索引
- 优化查询语句
- 使用连接池
- 实现查询缓存

### 2. 缓存优化
- 使用 Redis 缓存热点数据
- 实现缓存预热
- 设置合理的缓存过期时间

### 3. 代码优化
- 使用异步操作
- 减少数据库查询次数
- 批量操作
- 懒加载和预加载

### 4. 架构优化
- 使用负载均衡
- 水平扩展
- 读写分离
- 微服务拆分

## 测试数据准备

在运行性能测试前，需要准备足够的测试数据：

```bash
# 运行数据准备脚本
python performance_tests/prepare_test_data.py
```

这将创建：
- 1000 个样品记录
- 500 个工作流模板
- 2000 个任务
- 5000 个检测结果
- 1000 个审核任务
- 500 个报告

## 故障排查

### 常见问题

1. **连接被拒绝**
   - 确保 FastAPI 服务正在运行
   - 检查端口是否正确

2. **认证失败**
   - 确保测试用户存在
   - 检查用户名和密码

3. **数据库连接错误**
   - 确保 PostgreSQL 正在运行
   - 检查数据库连接配置

4. **内存不足**
   - 减少并发用户数
   - 增加系统内存

## 持续集成

可以将性能测试集成到 CI/CD 流程中：

```yaml
# .github/workflows/performance-test.yml
name: Performance Test

on:
  schedule:
    - cron: '0 2 * * *'  # 每天凌晨 2 点运行
  workflow_dispatch:

jobs:
  performance-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install locust
      - name: Start services
        run: docker-compose up -d
      - name: Run performance tests
        run: |
          locust -f locustfile.py --host=http://localhost:8000 \
            --users 100 --spawn-rate 10 --run-time 5m --headless \
            --html=report.html
      - name: Upload report
        uses: actions/upload-artifact@v2
        with:
          name: performance-report
          path: report.html
```

## 参考资料

- [Locust 官方文档](https://docs.locust.io/)
- [FastAPI 性能优化指南](https://fastapi.tiangolo.com/deployment/concepts/)
- [PostgreSQL 性能调优](https://wiki.postgresql.org/wiki/Performance_Optimization)
