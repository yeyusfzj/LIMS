# Task 1.9 实施总结：实现健康检查和监控

## 任务概述

实现完整的健康检查和监控功能，包括基础健康检查、详细健康检查、就绪检查、存活检查、Prometheus 监控集成和性能监控服务。

## 实施内容

### 1. Redis 连接管理 (`app/core/redis.py`)

创建了 Redis 连接管理模块，提供：

- **异步 Redis 客户端**: 使用 `redis.asyncio` 实现异步连接
- **连接管理**: 单例模式管理全局 Redis 客户端
- **健康检查**: `check_redis_connection()` 函数检查 Redis 连接状态
- **优雅关闭**: `close_redis_connection()` 函数关闭连接

**关键特性**:
- 支持 REDIS_URL 或单独配置参数
- 自动测试连接
- 错误处理和日志记录
- 如果 Redis 未配置，返回 None（可选依赖）

### 2. 性能监控服务 (`app/services/performance_service.py`)

创建了完整的性能监控服务，提供：

#### 2.1 性能指标记录

- **API 请求指标**: 记录方法、路径、持续时间、状态码、用户 ID
- **数据库查询指标**: 记录查询语句、持续时间、模型、操作类型
- **慢请求记录**: 自动识别和记录超过阈值的请求（默认 1 秒）
- **慢查询记录**: 自动识别和记录超过阈值的查询（默认 1 秒）

#### 2.2 路径统计

- **请求计数**: 统计每个路径的请求数量
- **持续时间统计**: 记录最小、最大、平均持续时间
- **错误统计**: 统计错误请求数量和错误率
- **百分位数计算**: 支持 P50、P95、P99 百分位数

#### 2.3 数据存储

- **Redis 存储**: 使用 Redis 有序集合和哈希表存储性能数据
- **时间序列**: 按时间戳排序，支持时间范围查询
- **数据保留**: 自动清理过期数据（默认保留 24 小时）
- **数量限制**: 限制慢请求和慢查询记录数量（最多 1000 条）

#### 2.4 查询接口

- `get_slow_requests()`: 获取慢请求列表
- `get_slow_queries()`: 获取慢查询列表
- `get_performance_stats()`: 获取性能统计数据

### 3. 健康检查端点 (`app/api/v1/health.py`)

完善了健康检查路由，提供多个端点：

#### 3.1 基础健康检查 (`GET /api/v1/health`)

- **用途**: 快速检查服务是否运行
- **不检查依赖服务**: 轻量级检查
- **返回信息**:
  - 服务状态（healthy）
  - 时间戳
  - 运行时间（秒）
  - 运行环境
  - 内存使用情况（RSS、VMS、百分比）

#### 3.2 详细健康检查 (`GET /api/v1/health/detailed`)

- **用途**: 检查服务及所有依赖服务状态
- **检查项目**:
  - 数据库连接状态和响应时间
  - Redis 连接状态和响应时间
- **状态判断**:
  - `healthy`: 数据库和 Redis 都正常
  - `degraded`: 数据库正常但 Redis 不可用（返回 200）
  - `unhealthy`: 数据库不可用（返回 503）

#### 3.3 就绪检查 (`GET /api/v1/ready`)

- **用途**: Kubernetes 就绪探测
- **检查逻辑**: 数据库必须可用，Redis 可选
- **返回状态码**:
  - 200: 服务就绪
  - 503: 服务未就绪

#### 3.4 存活检查 (`GET /api/v1/live`)

- **用途**: Kubernetes 存活探测
- **检查逻辑**: 轻量级检查，只验证进程存活
- **返回**: 始终返回 200 和 alive 状态

#### 3.5 数据库健康检查 (`GET /api/v1/health/database`)

- **用途**: 单独检查数据库连接状态
- **返回**: 数据库连接状态和时间戳

#### 3.6 数据库查询测试 (`GET /api/v1/health/database/query`)

- **用途**: 测试数据库会话管理
- **操作**: 执行简单查询（SELECT 1, NOW()）
- **返回**: 查询结果和执行状态

### 4. 性能监控端点 (`app/routers/performance.py`)

创建了性能监控 API 路由：

#### 4.1 性能统计 (`GET /api/v1/performance/statistics`)

- **参数**: `hours` - 统计时间范围（1-24 小时）
- **返回**:
  - API 统计：总请求数、平均响应时间、P50/P95/P99、慢请求数、错误率
  - 数据库统计：总查询数、平均查询时间、慢查询数
  - 时间范围

#### 4.2 慢请求列表 (`GET /api/v1/performance/slow-requests`)

- **参数**: `limit` - 返回数量（1-1000）
- **返回**: 最近的慢请求记录列表

#### 4.3 慢查询列表 (`GET /api/v1/performance/slow-queries`)

- **参数**: `limit` - 返回数量（1-1000）
- **返回**: 最近的慢查询记录列表

### 5. Prometheus 监控集成

在 `app/main.py` 中集成了 Prometheus 监控：

#### 5.1 Instrumentator 配置

- **状态码分组**: 自动分组 HTTP 状态码
- **路径模板化**: 忽略未模板化的路径
- **进行中请求**: 监控正在处理的请求数量
- **排除端点**: 排除 /metrics、/health、/ready、/live
- **环境变量控制**: 通过 ENABLE_METRICS 环境变量控制

#### 5.2 Metrics 端点

- **路径**: `/metrics`
- **格式**: Prometheus 标准格式
- **不包含在 OpenAPI 文档中**: `include_in_schema=False`

#### 5.3 自动收集的指标

- HTTP 请求总数（按方法、路径、状态码）
- HTTP 请求持续时间（直方图）
- 进行中的 HTTP 请求数量
- 应用信息（版本、环境等）

### 6. 应用生命周期管理

更新了 `lifespan` 函数：

- **启动时**: 检查数据库连接
- **关闭时**: 
  - 关闭数据库连接
  - 关闭 Redis 连接（新增）

### 7. 依赖包更新

在 `requirements.txt` 中添加了新的依赖：

```
prometheus-client==0.19.0
prometheus-fastapi-instrumentator==6.1.0
psutil==5.9.6
```

- **prometheus-client**: Prometheus Python 客户端
- **prometheus-fastapi-instrumentator**: FastAPI Prometheus 集成
- **psutil**: 系统和进程工具（用于获取内存和运行时间信息）

## API 端点总览

### 健康检查端点

| 端点 | 方法 | 用途 | 状态码 |
|------|------|------|--------|
| `/api/v1/health` | GET | 基础健康检查 | 200 |
| `/api/v1/health/detailed` | GET | 详细健康检查 | 200/503 |
| `/api/v1/ready` | GET | 就绪检查 | 200/503 |
| `/api/v1/live` | GET | 存活检查 | 200 |
| `/api/v1/health/database` | GET | 数据库健康检查 | 200 |
| `/api/v1/health/database/query` | GET | 数据库查询测试 | 200 |

### 性能监控端点

| 端点 | 方法 | 用途 | 认证 |
|------|------|------|------|
| `/api/v1/performance/statistics` | GET | 性能统计 | 需要 |
| `/api/v1/performance/slow-requests` | GET | 慢请求列表 | 需要 |
| `/api/v1/performance/slow-queries` | GET | 慢查询列表 | 需要 |

### Prometheus 端点

| 端点 | 方法 | 用途 | 格式 |
|------|------|------|------|
| `/metrics` | GET | Prometheus 指标 | Prometheus |

## 与 Node.js 后端的一致性

### 1. 健康检查端点

✅ **完全一致**:
- `/health` - 基础健康检查
- `/ready` - 就绪检查

✅ **功能增强**:
- `/health/detailed` - 详细健康检查（对应 Node.js 的 `/ready`）
- `/live` - 存活检查（新增）

### 2. 响应格式

✅ **一致的响应结构**:
```json
{
  "status": "healthy/ready/alive",
  "timestamp": "ISO 8601 格式",
  "checks": {
    "database": { "status": "ok/error", "responseTime": 15 },
    "redis": { "status": "ok/error", "responseTime": 5 }
  }
}
```

### 3. 性能监控

✅ **功能对等**:
- 慢请求记录和查询
- 慢查询记录和查询
- 性能统计数据
- Redis 存储

✅ **相同的阈值**:
- 慢请求阈值：1000ms
- 慢查询阈值：1000ms
- 数据保留时间：24 小时

## 配置说明

### 环境变量

在 `.env` 文件中配置：

```env
# Redis 配置（可选）
REDIS_URL=redis://localhost:6379/0
# 或者使用单独的配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Prometheus 监控（可选）
ENABLE_METRICS=true
```

### Redis 可选性

- Redis 是**可选依赖**
- 如果未配置 Redis，性能监控功能将不可用
- 健康检查会标记 Redis 为 "not configured"
- 服务仍然可以正常运行

## 使用示例

### 1. 基础健康检查

```bash
curl http://localhost:8000/api/v1/health
```

响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000000",
  "uptime": 3600.5,
  "environment": "development",
  "memory": {
    "rss": 52428800,
    "vms": 104857600,
    "percent": 2.5
  }
}
```

### 2. 详细健康检查

```bash
curl http://localhost:8000/api/v1/health/detailed
```

响应：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000000",
  "checks": {
    "database": {
      "status": "ok",
      "message": "Connected",
      "response_time": 15.5
    },
    "redis": {
      "status": "ok",
      "message": "Connected",
      "response_time": 5.2
    }
  }
}
```

### 3. 就绪检查

```bash
curl http://localhost:8000/api/v1/ready
```

### 4. 存活检查

```bash
curl http://localhost:8000/api/v1/live
```

### 5. 性能统计

```bash
curl http://localhost:8000/api/v1/performance/statistics?hours=1 \
  -H "Authorization: Bearer <token>"
```

### 6. Prometheus 指标

```bash
curl http://localhost:8000/metrics
```

## Kubernetes 部署配置

### Liveness Probe（存活探测）

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/live
    port: 8000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

### Readiness Probe（就绪探测）

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/ready
    port: 8000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Prometheus 监控

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8000"
  prometheus.io/path: "/metrics"
```

## 监控指标说明

### Prometheus 自动收集的指标

1. **http_requests_total**: HTTP 请求总数
   - 标签：method, path_template, status

2. **http_request_duration_seconds**: HTTP 请求持续时间
   - 类型：Histogram
   - 标签：method, path_template

3. **http_requests_inprogress**: 进行中的 HTTP 请求数
   - 类型：Gauge
   - 标签：method, path_template

4. **fastapi_app_info**: 应用信息
   - 标签：app_name, version

### 性能监控服务收集的指标

1. **API 性能指标**:
   - 总请求数
   - 平均响应时间
   - P50/P95/P99 响应时间
   - 慢请求数量
   - 错误率

2. **数据库性能指标**:
   - 总查询数
   - 平均查询时间
   - 慢查询数量

## 测试建议

### 1. 健康检查测试

```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "uptime" in data
    assert "memory" in data

@pytest.mark.asyncio
async def test_detailed_health_check(client: AsyncClient):
    response = await client.get("/api/v1/health/detailed")
    assert response.status_code in [200, 503]
    data = response.json()
    assert "checks" in data
    assert "database" in data["checks"]
    assert "redis" in data["checks"]

@pytest.mark.asyncio
async def test_readiness_check(client: AsyncClient):
    response = await client.get("/api/v1/ready")
    assert response.status_code in [200, 503]
    data = response.json()
    assert data["status"] in ["ready", "not_ready"]

@pytest.mark.asyncio
async def test_liveness_check(client: AsyncClient):
    response = await client.get("/api/v1/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"
```

### 2. 性能监控测试

```python
@pytest.mark.asyncio
async def test_performance_statistics(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/performance/statistics?hours=1",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "api_stats" in data["data"]
    assert "database_stats" in data["data"]

@pytest.mark.asyncio
async def test_slow_requests(client: AsyncClient, auth_headers):
    response = await client.get(
        "/api/v1/performance/slow-requests?limit=10",
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
```

### 3. Prometheus 指标测试

```python
@pytest.mark.asyncio
async def test_metrics_endpoint(client: AsyncClient):
    response = await client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
```

## 注意事项

1. **Redis 依赖**: 
   - Redis 是可选的，如果未配置，性能监控功能将不可用
   - 建议在生产环境配置 Redis 以启用完整的性能监控

2. **性能影响**:
   - Prometheus 监控对性能影响很小
   - 性能监控服务使用异步操作，不会阻塞请求

3. **数据保留**:
   - 性能数据默认保留 24 小时
   - 可以通过修改 `PerformanceService` 的配置调整

4. **安全性**:
   - `/metrics` 端点不需要认证（Prometheus 抓取）
   - 性能监控 API 需要认证
   - 建议在生产环境使用网络策略限制 `/metrics` 访问

5. **监控最佳实践**:
   - 使用 Grafana 可视化 Prometheus 指标
   - 设置告警规则监控关键指标
   - 定期检查慢请求和慢查询

## 下一步

1. **安装依赖包**:
   ```bash
   pip install -r requirements.txt
   ```

2. **配置 Redis**（可选）:
   - 在 `.env` 文件中配置 Redis 连接信息

3. **启动服务**:
   ```bash
   uvicorn app.main:app --reload
   ```

4. **验证功能**:
   - 访问 `/api/v1/health` 检查基础健康
   - 访问 `/api/v1/health/detailed` 检查详细健康
   - 访问 `/metrics` 查看 Prometheus 指标
   - 访问 `/docs` 查看 API 文档

5. **集成 Grafana**（可选）:
   - 配置 Prometheus 数据源
   - 导入 FastAPI 监控仪表板
   - 创建自定义告警规则

## 完成状态

✅ **已完成**:
- Redis 连接管理
- 性能监控服务
- 健康检查端点（基础、详细、就绪、存活）
- Prometheus 监控集成
- 性能监控 API
- 应用生命周期管理
- 依赖包更新
- 文档编写

⏭️ **下一个任务**: Task 1.10 - 编写健康检查和监控的测试

## 满足的需求

本任务满足以下需求：

- ✅ **需求 8.1**: 提供基础健康检查端点
- ✅ **需求 8.2**: 提供详细健康检查端点（数据库、Redis 连接状态）
- ✅ **需求 8.3**: 标记依赖服务状态
- ✅ **需求 8.4**: 实现就绪检查端点
- ✅ **需求 8.5**: 实现存活检查端点
- ✅ **需求 11.10**: 提供性能监控指标
- ✅ **需求 13.8**: 记录性能指标
- ✅ **需求 13.9**: 提供监控端点
- ✅ **需求 13.10**: 支持集成第三方监控系统（Prometheus）

## 总结

Task 1.9 成功实现了完整的健康检查和监控功能，包括：

1. **完善的健康检查系统**: 提供多层次的健康检查端点，满足不同场景需求
2. **Prometheus 监控集成**: 自动收集和暴露标准 Prometheus 指标
3. **性能监控服务**: 记录和分析 API 和数据库性能数据
4. **与 Node.js 后端一致**: API 端点和响应格式与 Node.js 后端保持一致
5. **生产就绪**: 支持 Kubernetes 探测和 Prometheus 监控

所有实现都遵循 FastAPI 最佳实践，使用异步操作，具有良好的错误处理和日志记录。
