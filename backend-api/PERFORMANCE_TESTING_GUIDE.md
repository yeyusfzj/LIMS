# 性能测试执行指南

## 前置条件

在运行性能测试之前，请确保以下服务正在运行：

### 1. 启动 PostgreSQL 数据库

```bash
# 使用 Docker
docker run -d \
  --name postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=lab_db \
  -p 5432:5432 \
  postgres:14

# 或使用 docker-compose
docker-compose up -d postgres
```

### 2. 启动 Redis

```bash
# 使用 Docker
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:7

# 或使用 docker-compose
docker-compose up -d redis
```

### 3. 配置环境变量

创建 `.env` 文件：

```bash
# 数据库配置
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/lab_db

# Redis 配置
REDIS_URL=redis://localhost:6379/0

# JWT 配置
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# 服务配置
HOST=0.0.0.0
PORT=8001
DEBUG=False
```

### 4. 运行数据库迁移

```bash
cd fastapi-backend

# 安装依赖
pip install -r requirements.txt

# 运行迁移
alembic upgrade head

# 创建测试用户
python create_test_user.py
```

### 5. 启动 FastAPI 服务

#### 开发环境

```bash
cd fastapi-backend

# 使用 Uvicorn
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

#### 生产环境

```bash
cd fastapi-backend

# 使用 Gunicorn + Uvicorn Workers
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001 \
  --timeout 120 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log
```

## 运行性能测试

### 方法 1: 快速性能检查

适用于开发过程中的快速验证：

```bash
cd fastapi-backend

# 运行快速检查
python scripts/quick_performance_check.py
```

**预期输出**:
```
============================================================
FastAPI 快速性能检查
============================================================
目标服务: http://localhost:8001
数据库: localhost:5432/lab_db

============================================================
快速 API 响应时间测试
============================================================
端点: GET /health
  请求数: 50
  平均响应时间: 45.23 ms
  P95 响应时间: 78.45 ms ✅
  目标: < 200 ms

============================================================
快速数据库查询时间测试
============================================================
查询: SELECT COUNT(*) FROM "Sample"
  执行次数: 50
  平均查询时间: 12.34 ms
  P95 查询时间: 25.67 ms ✅
  目标: < 100 ms

============================================================
快速检查结果
============================================================
API 响应时间: ✅ 通过
数据库查询时间: ✅ 通过

--------------------------------------------------------------
总体结果: ✅ 通过
============================================================
```

### 方法 2: 完整性能验证

适用于正式的性能验证：

```bash
cd fastapi-backend

# 运行完整验证
python scripts/verify_performance_metrics.py
```

**预期输出**:
```
======================================================================
FastAPI 后端性能指标验证
======================================================================
测试时间: 2026-04-15 14:30:00
目标服务: http://localhost:8001
数据库: localhost:5432/lab_db
======================================================================

======================================================================
测试 1: API 响应时间验证
======================================================================
目标: P95 响应时间 < 200 ms
----------------------------------------------------------------------

测试端点: GET /health
  总请求数: 100
  成功: 100, 失败: 0
  平均响应时间: 45.23 ms
  P50 响应时间: 42.15 ms
  P95 响应时间: 78.45 ms ✅ 通过
  P99 响应时间: 95.32 ms

[... 更多端点测试结果 ...]

======================================================================
测试 2: 数据库查询时间验证
======================================================================
目标: P95 查询时间 < 100 ms
----------------------------------------------------------------------

[... 数据库查询测试结果 ...]

======================================================================
测试 3: 并发 QPS 验证
======================================================================
目标: 并发支持 ≥ 1000 QPS
----------------------------------------------------------------------

[... 并发测试结果 ...]

======================================================================
测试 4: 内存使用验证
======================================================================
目标: 内存使用 < 2048 MB
----------------------------------------------------------------------

[... 内存使用测试结果 ...]

======================================================================
性能指标验证总结
======================================================================
api_response_time: ✅ 通过
database_query_time: ✅ 通过
concurrent_qps: ✅ 通过
memory_usage: ✅ 通过

----------------------------------------------------------------------
最终结果: ✅ 所有测试通过
======================================================================

详细结果已保存到: performance_metrics_verification_results.json
```

### 方法 3: Locust 负载测试

适用于压力测试和长时间稳定性测试：

```bash
cd fastapi-backend

# 启动 Locust Web UI
locust -f locustfile.py --host=http://localhost:8001

# 访问 http://localhost:8089
# 设置用户数和增长率，开始测试
```

**Locust 配置建议**:
- 用户数: 100-1000
- 增长率: 10-50 users/second
- 测试时长: 5-30 分钟

## 验证服务状态

在运行性能测试之前，验证服务是否正常：

### 1. 检查健康状态

```bash
curl http://localhost:8001/health
```

**预期响应**:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-15T14:30:00",
  "version": "1.0.0"
}
```

### 2. 检查数据库连接

```bash
curl http://localhost:8001/health/detailed
```

**预期响应**:
```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-04-15T14:30:00"
}
```

### 3. 测试认证

```bash
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'
```

**预期响应**:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "bearer"
}
```

## 故障排查

### 问题 1: 连接被拒绝

**症状**:
```
ConnectionRefusedError: [Errno 111] Connection refused
```

**解决方案**:
1. 检查 FastAPI 服务是否运行
2. 检查端口是否正确 (默认 8001)
3. 检查防火墙设置

```bash
# 检查服务是否运行
ps aux | grep uvicorn

# 检查端口是否监听
netstat -tlnp | grep 8001

# 或使用 lsof
lsof -i :8001
```

### 问题 2: 数据库连接失败

**症状**:
```
sqlalchemy.exc.OperationalError: could not connect to server
```

**解决方案**:
1. 检查 PostgreSQL 是否运行
2. 检查数据库连接字符串
3. 检查数据库权限

```bash
# 检查 PostgreSQL 状态
docker ps | grep postgres

# 测试数据库连接
psql -h localhost -U postgres -d lab_db

# 检查数据库日志
docker logs postgres
```

### 问题 3: 认证失败

**症状**:
```
401 Unauthorized
```

**解决方案**:
1. 检查用户是否存在
2. 检查密码是否正确
3. 检查 JWT 配置

```bash
# 创建测试用户
python create_test_user.py

# 检查用户
psql -h localhost -U postgres -d lab_db -c "SELECT * FROM \"User\" WHERE username='admin';"
```

### 问题 4: 性能测试超时

**症状**:
```
httpx.ReadTimeout: timed out
```

**解决方案**:
1. 增加超时时间
2. 检查服务器负载
3. 优化数据库查询

```bash
# 检查系统负载
top
htop

# 检查数据库慢查询
psql -h localhost -U postgres -d lab_db -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

## 性能基线

根据测试环境的不同，性能指标会有所差异。以下是参考基线：

### 开发环境 (单进程)

| 指标 | 目标 | 典型值 |
|------|------|--------|
| API 响应时间 (P95) | < 200ms | 50-150ms |
| 数据库查询时间 (P95) | < 100ms | 10-50ms |
| 并发 QPS | ≥ 1000 | 500-1500 |
| 内存使用 | < 2GB | 300-800MB |

### 生产环境 (4 workers)

| 指标 | 目标 | 典型值 |
|------|------|--------|
| API 响应时间 (P95) | < 200ms | 30-100ms |
| 数据库查询时间 (P95) | < 100ms | 5-30ms |
| 并发 QPS | ≥ 1000 | 2000-5000 |
| 内存使用 | < 2GB/进程 | 400-1000MB/进程 |

## 性能优化建议

如果性能测试未达标，参考以下优化建议：

### 1. 数据库优化

```sql
-- 添加索引
CREATE INDEX idx_sample_status ON "Sample"(status);
CREATE INDEX idx_sample_created_at ON "Sample"("createdAt");
CREATE INDEX idx_result_sample_id ON "Result"("sampleId");

-- 分析查询计划
EXPLAIN ANALYZE SELECT * FROM "Sample" WHERE status = 'REGISTERED';

-- 更新统计信息
ANALYZE;
```

### 2. 连接池优化

```python
# app/core/database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=50,          # 增加连接池大小
    max_overflow=50,       # 增加溢出连接
    pool_pre_ping=True,    # 连接前检查
    pool_recycle=3600,     # 连接回收时间
)
```

### 3. 缓存优化

```python
# 启用 Redis 缓存
from app.core.cache import cache

@cache.cached(expire=300)  # 缓存 5 分钟
async def get_statistics():
    # 复杂的统计查询
    pass
```

### 4. 部署优化

```bash
# 使用多进程
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8001

# 使用 Nginx 反向代理
# 启用 HTTP/2 和 gzip 压缩
```

## 持续监控

### 启动监控服务

```bash
cd fastapi-backend

# 启动 Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d

# 访问
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin/admin)
```

### 配置告警

在 Grafana 中配置性能告警：

1. **API 响应时间告警**: P95 > 200ms
2. **数据库查询时间告警**: P95 > 100ms
3. **QPS 告警**: QPS < 1000
4. **内存使用告警**: RSS > 2GB

## 总结

按照本指南的步骤，您可以：

1. ✅ 正确启动所有必需的服务
2. ✅ 运行快速性能检查
3. ✅ 运行完整性能验证
4. ✅ 使用 Locust 进行负载测试
5. ✅ 排查常见问题
6. ✅ 优化性能指标
7. ✅ 建立持续监控

如有问题，请参考故障排查部分或联系开发团队。
