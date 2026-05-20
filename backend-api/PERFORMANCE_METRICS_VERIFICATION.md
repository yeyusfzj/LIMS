# 性能指标验证文档

## 概述

本文档描述了 FastAPI 后端性能指标验证的流程和结果。根据需求 11.1, 11.2, 11.10，系统需要满足以下性能指标：

1. **API 响应时间**: P95 < 200ms
2. **数据库查询时间**: P95 < 100ms
3. **并发支持**: ≥ 1000 QPS
4. **内存使用**: < 2GB (单进程)

## 测试环境要求

### 硬件要求
- CPU: 4 核心或以上
- 内存: 8GB 或以上
- 磁盘: SSD 推荐

### 软件要求
- Python 3.11+
- PostgreSQL 14+
- Redis 7+
- FastAPI 后端服务运行中

### Python 依赖
```bash
pip install httpx psutil sqlalchemy asyncpg
```

## 运行性能验证

### 1. 启动 FastAPI 服务

确保 FastAPI 服务正在运行：

```bash
cd fastapi-backend

# 使用 Uvicorn 启动（开发环境）
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# 或使用 Gunicorn + Uvicorn Workers（生产环境）
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001 \
  --timeout 120
```

### 2. 运行性能验证脚本

```bash
cd fastapi-backend

# 使用默认配置
python scripts/verify_performance_metrics.py

# 或指定自定义配置
TEST_BASE_URL=http://localhost:8001 \
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lab_db \
python scripts/verify_performance_metrics.py
```

### 3. 查看测试结果

测试完成后，会生成以下输出：

1. **控制台输出**: 实时显示测试进度和结果
2. **JSON 报告**: `performance_metrics_verification_results.json`

## 测试详情

### 测试 1: API 响应时间验证

**目标**: P95 响应时间 < 200ms

**测试端点**:
- `GET /health` - 健康检查
- `GET /api/v1/auth/me` - 获取当前用户
- `GET /api/v1/samples` - 查询样品列表
- `GET /api/v1/workflows` - 查询工作流模板
- `GET /api/v1/tasks` - 查询任务列表

**测试方法**:
- 每个端点发送 100 个请求
- 预热 10 个请求
- 计算 P50, P95, P99 响应时间
- 验证 P95 是否 < 200ms

**通过标准**: 所有端点的 P95 响应时间都 < 200ms

### 测试 2: 数据库查询时间验证

**目标**: P95 查询时间 < 100ms

**测试查询**:
1. **简单查询**: `SELECT COUNT(*) FROM "Sample"`
2. **带条件查询**: `SELECT * FROM "Sample" WHERE status = 'REGISTERED' LIMIT 20`
3. **关联查询**: 样品与结果的关联查询
4. **聚合查询**: 按状态分组统计

**测试方法**:
- 每个查询执行 100 次
- 预热 5 次
- 计算 P50, P95, P99 查询时间
- 验证 P95 是否 < 100ms

**通过标准**: 所有查询的 P95 查询时间都 < 100ms

### 测试 3: 并发 QPS 验证

**目标**: 并发支持 ≥ 1000 QPS

**测试方法**:
- 测试不同并发级别: 100, 200, 500, 1000
- 每个级别持续 10 秒
- 计算实际 QPS
- 记录成功率和 P95 响应时间

**通过标准**: 至少一个并发级别达到 1000 QPS

### 测试 4: 内存使用验证

**目标**: 内存使用 < 2GB (单进程)

**测试方法**:
- 获取当前进程的 RSS (常驻内存)
- 获取当前进程的 VMS (虚拟内存)
- 获取系统内存使用情况

**通过标准**: RSS < 2048 MB

## 性能优化建议

如果测试未通过，可以尝试以下优化措施：

### 1. API 响应时间优化

**问题**: P95 响应时间 > 200ms

**优化措施**:
- 增加数据库连接池大小
- 启用 Redis 缓存
- 优化中间件链
- 使用 HTTP keep-alive
- 减少不必要的数据库查询

**配置示例**:
```python
# app/core/database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=50,        # 增加连接池
    max_overflow=50,     # 增加溢出连接
    pool_pre_ping=True,
    pool_recycle=3600,
)
```

### 2. 数据库查询时间优化

**问题**: P95 查询时间 > 100ms

**优化措施**:
- 添加数据库索引
- 优化查询语句
- 使用查询缓存
- 避免 N+1 查询问题
- 使用 `selectinload` 预加载关联数据

**索引示例**:
```sql
-- 为常用查询字段添加索引
CREATE INDEX idx_sample_status ON "Sample"(status);
CREATE INDEX idx_sample_created_at ON "Sample"("createdAt");
CREATE INDEX idx_result_sample_id ON "Result"("sampleId");
```

### 3. 并发 QPS 优化

**问题**: QPS < 1000

**优化措施**:
- 使用 Gunicorn 多进程部署
- 增加 worker 数量
- 优化异步处理
- 使用负载均衡
- 启用 HTTP/2

**部署示例**:
```bash
# 使用 4 个 worker
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001
```

### 4. 内存使用优化

**问题**: 内存使用 > 2GB

**优化措施**:
- 减少连接池大小
- 清理未使用的缓存
- 优化数据结构
- 使用生成器代替列表
- 定期清理日志文件

## 性能监控

### 使用 Prometheus + Grafana

启动监控服务：

```bash
cd fastapi-backend
docker-compose -f docker-compose.monitoring.yml up -d
```

访问监控面板：
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

### 关键指标

1. **API 响应时间**:
   - `http_request_duration_seconds`
   - 按端点和状态码分组

2. **数据库查询时间**:
   - `db_query_duration_seconds`
   - 按查询类型分组

3. **QPS**:
   - `http_requests_total`
   - 计算每秒请求数

4. **内存使用**:
   - `process_resident_memory_bytes`
   - `process_virtual_memory_bytes`

## 故障排查

### 问题 1: 连接超时

**症状**: 测试过程中出现大量连接超时

**原因**:
- 数据库连接池不足
- 服务器负载过高
- 网络延迟

**解决方案**:
```bash
# 增加数据库连接池
export DB_POOL_SIZE=50
export DB_MAX_OVERFLOW=50

# 重启服务
```

### 问题 2: 内存不足

**症状**: 测试过程中内存使用持续增长

**原因**:
- 内存泄漏
- 缓存过大
- 连接未正确关闭

**解决方案**:
```python
# 确保正确关闭连接
async with AsyncSession(engine) as session:
    # 执行操作
    pass  # 自动关闭

# 限制缓存大小
cache.set_max_size(1000)
```

### 问题 3: 数据库查询慢

**症状**: 数据库查询时间 > 100ms

**原因**:
- 缺少索引
- 查询语句不优化
- 数据量过大

**解决方案**:
```sql
-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM "Sample" WHERE status = 'REGISTERED';

-- 添加索引
CREATE INDEX idx_sample_status ON "Sample"(status);

-- 使用分页
SELECT * FROM "Sample" LIMIT 20 OFFSET 0;
```

## 持续集成

### GitHub Actions 配置

在 CI/CD 流程中自动运行性能测试：

```yaml
# .github/workflows/performance-test.yml
name: Performance Test

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  performance-test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
      
      - name: Run performance tests
        run: |
          python scripts/verify_performance_metrics.py
      
      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: performance_metrics_verification_results.json
```

## 参考资料

- [FastAPI 性能优化指南](https://fastapi.tiangolo.com/deployment/concepts/)
- [SQLAlchemy 异步性能](https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html)
- [PostgreSQL 性能调优](https://www.postgresql.org/docs/current/performance-tips.html)
- [Locust 负载测试](https://docs.locust.io/)

## 更新日志

### 2026-04-15
- 创建性能指标验证脚本
- 添加 4 个核心性能测试
- 生成 JSON 格式测试报告

## 联系方式

如有问题或建议，请联系开发团队。
