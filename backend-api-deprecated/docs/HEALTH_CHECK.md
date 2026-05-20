# 健康检查端点文档

## 概述

健康检查端点用于监控系统的运行状态和依赖服务的可用性。这些端点通常被负载均衡器、容器编排系统（如 Kubernetes）和监控工具使用。

## 端点说明

### 1. 健康检查端点 - `/health`

**用途**: 返回服务的基本健康状态，不检查依赖服务。

**HTTP 方法**: GET

**认证**: 不需要

**响应状态码**:
- `200 OK`: 服务正常运行

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "memory": {
    "rss": 52428800,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1048576
  }
}
```

**字段说明**:
- `status`: 健康状态，始终为 "healthy"
- `timestamp`: 检查时间戳（ISO 8601 格式）
- `uptime`: 服务运行时间（秒）
- `environment`: 运行环境（development/production）
- `memory`: 内存使用情况
  - `rss`: 常驻集大小（字节）
  - `heapTotal`: 堆总大小（字节）
  - `heapUsed`: 已使用堆大小（字节）
  - `external`: 外部内存使用（字节）

**使用场景**:
- 快速检查服务是否在运行
- 负载均衡器的基本健康检查
- 监控服务的运行时间和内存使用

---

### 2. 就绪检查端点 - `/ready`

**用途**: 检查服务及其所有依赖服务（数据库、Redis）是否就绪，可以接收流量。

**HTTP 方法**: GET

**认证**: 不需要

**响应状态码**:
- `200 OK`: 服务及所有依赖服务就绪
- `503 Service Unavailable`: 服务或依赖服务未就绪

**响应示例（就绪）**:
```json
{
  "status": "ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 15
    },
    "redis": {
      "status": "ok",
      "responseTime": 5
    }
  }
}
```

**响应示例（未就绪）**:
```json
{
  "status": "not_ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "responseTime": 12
    },
    "redis": {
      "status": "error",
      "message": "Connection refused",
      "responseTime": 3
    }
  }
}
```

**字段说明**:
- `status`: 就绪状态（"ready" 或 "not_ready"）
- `timestamp`: 检查时间戳（ISO 8601 格式）
- `checks`: 各依赖服务的检查结果
  - `database`: 数据库连接检查
    - `status`: 状态（"ok" 或 "error"）
    - `responseTime`: 响应时间（毫秒）
    - `message`: 错误消息（仅在 status 为 "error" 时）
  - `redis`: Redis 连接检查
    - `status`: 状态（"ok" 或 "error"）
    - `responseTime`: 响应时间（毫秒）
    - `message`: 错误消息（仅在 status 为 "error" 时）

**使用场景**:
- Kubernetes 就绪探针（Readiness Probe）
- 负载均衡器决定是否将流量路由到该实例
- 部署过程中验证服务是否完全启动
- 监控依赖服务的可用性

---

## 使用示例

### cURL 命令

```bash
# 健康检查
curl http://localhost:3000/health

# 就绪检查
curl http://localhost:3000/ready
```

### Kubernetes 配置

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: lims-api
spec:
  containers:
  - name: api
    image: lims-api:latest
    ports:
    - containerPort: 3000
    # 存活探针 - 使用健康检查端点
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
    # 就绪探针 - 使用就绪检查端点
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 3
```

### Docker Compose 配置

```yaml
version: '3.8'

services:
  api:
    image: lims-api:latest
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
```

---

## 性能特性

### 健康检查端点 (`/health`)
- **响应时间**: < 100ms
- **资源消耗**: 极低（仅读取进程信息）
- **推荐检查频率**: 每 10-30 秒

### 就绪检查端点 (`/ready`)
- **响应时间**: < 500ms
- **资源消耗**: 低（执行简单的数据库和 Redis 查询）
- **推荐检查频率**: 每 5-10 秒

---

## 监控集成

### Prometheus 监控

可以使用 Prometheus 的 `blackbox_exporter` 监控健康检查端点：

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'lims-api-health'
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
        - http://lims-api:3000/health
        - http://lims-api:3000/ready
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox-exporter:9115
```

### 告警规则

```yaml
# alerts.yml
groups:
  - name: lims-api
    rules:
      - alert: ServiceDown
        expr: probe_success{job="lims-api-health", instance=~".*health"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "LIMS API 服务不可用"
          description: "健康检查失败超过 1 分钟"
      
      - alert: ServiceNotReady
        expr: probe_success{job="lims-api-health", instance=~".*ready"} == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "LIMS API 服务未就绪"
          description: "就绪检查失败超过 2 分钟，可能是依赖服务不可用"
```

---

## 故障排查

### 健康检查失败

如果 `/health` 端点返回错误或无响应：

1. 检查服务进程是否运行
2. 检查端口 3000 是否被占用
3. 查看应用日志中的错误信息
4. 检查系统资源（CPU、内存）是否耗尽

### 就绪检查失败

如果 `/ready` 端点返回 503 状态码：

1. 检查响应中的 `checks` 字段，确定哪个依赖服务失败
2. **数据库检查失败**:
   - 验证数据库服务是否运行
   - 检查数据库连接配置（DATABASE_URL）
   - 查看数据库日志
   - 测试网络连接：`telnet <db-host> 5432`
3. **Redis 检查失败**:
   - 验证 Redis 服务是否运行
   - 检查 Redis 连接配置（REDIS_HOST、REDIS_PORT）
   - 查看 Redis 日志
   - 测试连接：`redis-cli -h <redis-host> -p 6379 ping`

---

## 最佳实践

1. **区分使用场景**:
   - 使用 `/health` 作为存活探针（Liveness Probe）
   - 使用 `/ready` 作为就绪探针（Readiness Probe）

2. **设置合理的超时和重试**:
   - 健康检查：超时 5 秒，失败 3 次后重启
   - 就绪检查：超时 3 秒，失败 3 次后停止路由流量

3. **避免过于频繁的检查**:
   - 过于频繁的检查会增加系统负载
   - 推荐间隔：健康检查 10-30 秒，就绪检查 5-10 秒

4. **监控检查响应时间**:
   - 如果响应时间持续增加，可能表示系统负载过高
   - 设置告警阈值（如 > 1 秒）

5. **日志记录**:
   - 健康检查失败时会自动记录到日志
   - 定期审查日志以发现潜在问题

---

## 相关文档

- [Kubernetes 健康检查](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Docker 健康检查](https://docs.docker.com/engine/reference/builder/#healthcheck)
- [API 文档](./API_DOCUMENTATION.md)
- [部署指南](./DEPLOYMENT.md)
