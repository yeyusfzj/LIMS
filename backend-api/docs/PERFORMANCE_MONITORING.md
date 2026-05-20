# 性能监控服务使用指南

## 概述

性能监控服务提供全面的 API 和数据库性能监控功能，包括：

- API 请求性能指标记录
- 数据库查询性能指标记录
- 慢请求和慢查询检测
- 性能统计和分析
- 路径级别的性能统计

## 功能特性

### 1. 自动性能监控

- **慢请求检测**：自动检测响应时间超过 1000ms 的请求
- **慢查询检测**：自动检测执行时间超过 1000ms 的数据库查询
- **实时记录**：异步记录性能指标，不影响主业务逻辑
- **数据保留**：默认保留 24 小时的性能数据

### 2. 性能统计

- **API 统计**：总请求数、平均响应时间、P50/P95/P99 响应时间、慢请求数、错误率
- **数据库统计**：总查询数、平均查询时间、慢查询数
- **路径统计**：按路径和方法分组的详细性能统计
- **时间范围**：支持自定义时间范围的统计查询

### 3. 数据分析

- **百分位数分析**：P50、P95、P99 响应时间分析
- **错误率分析**：统计和分析错误请求
- **趋势分析**：通过时间范围对比分析性能趋势

## API 端点

### 1. 获取性能统计

```http
GET /api/v1/performance/statistics
```

**查询参数：**

- `startTime` (可选): 开始时间，ISO 8601 格式
- `endTime` (可选): 结束时间，ISO 8601 格式

**示例请求：**

```bash
curl -X GET "http://localhost:8000/api/v1/performance/statistics?startTime=2026-04-09T10:00:00Z&endTime=2026-04-09T11:00:00Z" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "apiStats": {
      "totalRequests": 1000,
      "averageDuration": 150.5,
      "p50Duration": 120.0,
      "p95Duration": 300.0,
      "p99Duration": 500.0,
      "slowRequestCount": 10,
      "errorRate": 0.02
    },
    "databaseStats": {
      "totalQueries": 500,
      "averageDuration": 50.0,
      "slowQueryCount": 5
    },
    "timeRange": {
      "start": "2026-04-09T10:00:00Z",
      "end": "2026-04-09T11:00:00Z"
    }
  }
}
```

### 2. 获取慢请求列表

```http
GET /api/v1/performance/slow-requests
```

**查询参数：**

- `limit` (可选): 返回的最大数量，默认 100，最大 1000

**示例请求：**

```bash
curl -X GET "http://localhost:8000/api/v1/performance/slow-requests?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "method": "POST",
      "path": "/api/v1/samples",
      "duration": 1500.0,
      "statusCode": 201,
      "userId": "user-123",
      "timestamp": "2026-04-09T10:30:00Z"
    }
  ],
  "total": 10
}
```

### 3. 获取慢查询列表

```http
GET /api/v1/performance/slow-queries
```

**查询参数：**

- `limit` (可选): 返回的最大数量，默认 100，最大 1000

**示例请求：**

```bash
curl -X GET "http://localhost:8000/api/v1/performance/slow-queries?limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "query": "SELECT * FROM samples JOIN results ON samples.id = results.sample_id WHERE...",
      "duration": 1200.0,
      "timestamp": "2026-04-09T10:30:00Z"
    }
  ],
  "total": 5
}
```

### 4. 获取路径性能统计

```http
GET /api/v1/performance/path-stats
```

**查询参数：**

- `limit` (可选): 返回的最大数量，默认 50，最大 100

**示例请求：**

```bash
curl -X GET "http://localhost:8000/api/v1/performance/path-stats?limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "path": "/api/v1/samples",
      "method": "GET",
      "requestCount": 1000,
      "averageDuration": 150.5,
      "minDuration": 50.0,
      "maxDuration": 500.0,
      "p50Duration": 120.0,
      "p95Duration": 300.0,
      "p99Duration": 450.0,
      "errorCount": 20,
      "errorRate": 0.02
    }
  ],
  "total": 10
}
```

## 编程接口

### 1. 记录 API 性能指标

```python
from app.services.performance_service import performance_service

# 记录 API 请求性能
await performance_service.record_api_metric(
    method="GET",
    path="/api/v1/samples",
    duration=150.5,  # 毫秒
    status_code=200,
    user_id="user-123"  # 可选
)
```

### 2. 记录数据库性能指标

```python
import time
from app.services.performance_service import performance_service

# 记录数据库查询性能
start_time = time.time()
result = await db.execute(query)
duration = (time.time() - start_time) * 1000  # 转换为毫秒

await performance_service.record_database_metric(
    query=str(query),
    duration=duration,
    model="Sample",  # 可选
    operation="select"  # 可选
)
```

### 3. 获取性能统计

```python
from datetime import datetime, timedelta
from app.services.performance_service import performance_service

# 获取最近 1 小时的性能统计
stats = await performance_service.get_performance_stats()

# 获取指定时间范围的性能统计
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=2)
stats = await performance_service.get_performance_stats(start_time, end_time)

print(f"总请求数: {stats['apiStats']['totalRequests']}")
print(f"平均响应时间: {stats['apiStats']['averageDuration']:.2f}ms")
print(f"P95 响应时间: {stats['apiStats']['p95Duration']:.2f}ms")
```

### 4. 获取慢请求列表

```python
from app.services.performance_service import performance_service

# 获取最近的 50 个慢请求
slow_requests = await performance_service.get_slow_requests(limit=50)

for request in slow_requests:
    print(f"{request['method']} {request['path']} - {request['duration']}ms")
```

### 5. 获取路径统计

```python
from app.services.performance_service import performance_service

# 获取最热门的 20 个路径的性能统计
path_stats = await performance_service.get_path_stats(limit=20)

for stat in path_stats:
    print(f"{stat['method']} {stat['path']}")
    print(f"  请求数: {stat['requestCount']}")
    print(f"  平均响应时间: {stat['averageDuration']:.2f}ms")
    print(f"  P95 响应时间: {stat['p95Duration']:.2f}ms")
    print(f"  错误率: {stat['errorRate']:.2%}")
```

## 中间件集成

### 自动记录 API 性能

可以在中间件中自动记录所有 API 请求的性能：

```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
from app.services.performance_service import performance_service

class PerformanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 记录开始时间
        start_time = time.time()
        
        # 处理请求
        response = await call_next(request)
        
        # 计算持续时间
        duration = (time.time() - start_time) * 1000  # 毫秒
        
        # 记录性能指标
        await performance_service.record_api_metric(
            method=request.method,
            path=request.url.path,
            duration=duration,
            status_code=response.status_code,
            user_id=getattr(request.state, "user_id", None)
        )
        
        return response

# 在应用中添加中间件
app.add_middleware(PerformanceMiddleware)
```

## 配置选项

性能监控服务支持以下配置选项：

```python
from app.services.performance_service import performance_service

# 慢请求阈值（毫秒）
performance_service.slow_request_threshold = 1000

# 慢查询阈值（毫秒）
performance_service.slow_query_threshold = 1000

# 数据保留时间（小时）
performance_service.data_retention_hours = 24
```

## 数据存储

性能监控数据存储在 Redis 中，使用以下键结构：

- `performance:api:metrics` - API 指标（有序集合）
- `performance:db:metrics` - 数据库指标（有序集合）
- `performance:slow:requests` - 慢请求（有序集合）
- `performance:slow:queries` - 慢查询（有序集合）
- `performance:path:stats:{method}:{path}` - 路径统计（Hash）
- `performance:path:stats:{method}:{path}:durations` - 持续时间（有序集合）

## 性能考虑

### 1. 异步记录

所有性能指标记录都是异步的，不会阻塞主请求处理流程。

### 2. 数据限制

- 慢请求和慢查询最多保留 1000 条记录
- 路径持续时间记录最多保留 1000 条
- 性能数据默认保留 24 小时

### 3. 错误处理

性能记录失败不会影响主业务逻辑，所有错误都会被捕获并记录到日志。

### 4. 内存优化

- 使用 Redis 有序集合实现高效的时间范围查询
- 使用 Redis Hash 存储路径统计，减少内存占用
- 自动清理过期数据，防止内存溢出

## 监控和告警

### 1. 慢请求监控

当检测到慢请求时，会自动记录警告日志：

```
WARNING: Slow API request detected: POST /api/v1/samples - 1500ms
```

### 2. 慢查询监控

当检测到慢查询时，会自动记录警告日志：

```
WARNING: Slow database query detected: SELECT * FROM samples... - 1200ms
```

### 3. 集成告警系统

可以集成第三方告警系统（如 Prometheus、Grafana）来实现实时告警：

```python
from app.services.performance_service import performance_service

# 定期检查性能指标
async def check_performance():
    stats = await performance_service.get_performance_stats()
    
    # 检查错误率
    if stats['apiStats']['errorRate'] > 0.05:  # 5%
        # 发送告警
        send_alert("API 错误率过高")
    
    # 检查慢请求数
    if stats['apiStats']['slowRequestCount'] > 100:
        # 发送告警
        send_alert("慢请求数量过多")
```

## 最佳实践

### 1. 合理设置阈值

根据业务需求和系统性能，合理设置慢请求和慢查询的阈值：

```python
# 对于高性能要求的 API，可以降低阈值
performance_service.slow_request_threshold = 500  # 500ms

# 对于复杂查询，可以提高阈值
performance_service.slow_query_threshold = 2000  # 2000ms
```

### 2. 定期分析性能数据

定期分析性能数据，识别性能瓶颈：

```python
# 获取最近 24 小时的性能统计
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=24)
stats = await performance_service.get_performance_stats(start_time, end_time)

# 分析慢请求
slow_requests = await performance_service.get_slow_requests(limit=100)

# 分析路径性能
path_stats = await performance_service.get_path_stats(limit=50)
```

### 3. 优化慢请求和慢查询

根据监控数据，优化慢请求和慢查询：

- 添加数据库索引
- 优化查询语句
- 使用缓存
- 实现分页
- 异步处理耗时操作

### 4. 监控趋势变化

通过对比不同时间段的性能数据，监控性能趋势：

```python
# 获取今天的性能统计
today_end = datetime.utcnow()
today_start = today_end - timedelta(hours=24)
today_stats = await performance_service.get_performance_stats(today_start, today_end)

# 获取昨天的性能统计
yesterday_end = today_start
yesterday_start = yesterday_end - timedelta(hours=24)
yesterday_stats = await performance_service.get_performance_stats(yesterday_start, yesterday_end)

# 对比分析
print(f"今天平均响应时间: {today_stats['apiStats']['averageDuration']:.2f}ms")
print(f"昨天平均响应时间: {yesterday_stats['apiStats']['averageDuration']:.2f}ms")
```

## 故障排查

### 1. Redis 连接失败

如果 Redis 连接失败，性能监控功能会自动降级，不会影响主业务：

```python
# 检查 Redis 连接
from app.core.redis import check_redis_connection

redis_connected = await check_redis_connection()
if not redis_connected:
    print("Redis 连接失败，性能监控功能不可用")
```

### 2. 性能数据丢失

如果性能数据丢失，可能是因为：

- Redis 重启导致数据丢失
- 数据过期被自动清理
- Redis 内存不足

解决方案：

- 配置 Redis 持久化（AOF 或 RDB）
- 增加 Redis 内存
- 调整数据保留时间

### 3. 性能监控影响性能

如果性能监控本身影响系统性能，可以：

- 降低记录频率（采样）
- 增加 Redis 性能
- 使用 Redis Pipeline 批量写入

## 总结

性能监控服务提供了全面的性能监控和分析功能，帮助您：

- 实时监控 API 和数据库性能
- 快速识别性能瓶颈
- 分析性能趋势
- 优化系统性能

通过合理使用性能监控服务，可以显著提升系统的可观测性和可维护性。
