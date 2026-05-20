# 监控和日志配置指南

本文档描述了 FastAPI 后端的监控和日志系统配置，包括 Prometheus、Grafana、Loki 和 Alertmanager。

## 目录

- [概述](#概述)
- [架构](#架构)
- [组件说明](#组件说明)
- [快速开始](#快速开始)
- [Prometheus 配置](#prometheus-配置)
- [Grafana 配置](#grafana-配置)
- [Loki 配置](#loki-配置)
- [Alertmanager 配置](#alertmanager-配置)
- [告警规则](#告警规则)
- [日志管理](#日志管理)
- [测试和验证](#测试和验证)
- [故障排查](#故障排查)

## 概述

监控和日志系统提供以下功能：

- **指标收集**: 使用 Prometheus 收集应用、数据库、Redis 和系统指标
- **可视化**: 使用 Grafana 创建仪表板展示监控数据
- **日志聚合**: 使用 Loki 聚合和查询应用日志
- **告警管理**: 使用 Alertmanager 管理和路由告警通知
- **自动化**: 所有配置通过 Docker Compose 自动部署

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      监控和日志架构                          │
└─────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  FastAPI App │────▶│  Prometheus  │────▶│   Grafana    │
│   /metrics   │     │   (指标存储)  │     │  (可视化)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │                      │
                            │                      │
                            ▼                      ▼
                     ┌──────────────┐     ┌──────────────┐
                     │ Alertmanager │     │     Loki     │
                     │  (告警管理)   │     │  (日志聚合)   │
                     └──────────────┘     └──────────────┘
                            │                      ▲
                            │                      │
                            ▼                      │
                     ┌──────────────┐     ┌──────────────┐
                     │  Email/SMS   │     │   Promtail   │
                     │   (通知)      │     │  (日志收集)   │
                     └──────────────┘     └──────────────┘
                                                   ▲
                                                   │
                                          ┌────────┴────────┐
                                          │   应用日志文件   │
                                          └─────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Postgres   │────▶│   Postgres   │     │     Node     │
│   Exporter   │     │   Exporter   │     │   Exporter   │
└──────────────┘     └──────────────┘     └──────────────┘
        │                    │                     │
        └────────────────────┴─────────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Prometheus  │
                     └──────────────┘
```

## 组件说明

### Prometheus

- **端口**: 9090
- **功能**: 时序数据库，收集和存储指标
- **配置文件**: `prometheus/prometheus.yml`
- **数据保留**: 30 天
- **抓取间隔**: 15 秒

### Grafana

- **端口**: 3000
- **功能**: 可视化仪表板
- **默认凭据**: admin/admin
- **数据源**: Prometheus, Loki
- **仪表板**: 自动加载预配置的仪表板

### Loki

- **端口**: 3100
- **功能**: 日志聚合和查询
- **配置文件**: `loki/loki-config.yml`
- **日志保留**: 30 天
- **存储**: 本地文件系统

### Promtail

- **端口**: 9080
- **功能**: 日志收集代理
- **配置文件**: `loki/promtail-config.yml`
- **监控目录**: `/app/logs`, `/var/log`

### Alertmanager

- **端口**: 9093
- **功能**: 告警管理和路由
- **配置文件**: `prometheus/alertmanager.yml`
- **通知方式**: Email, Webhook

### Exporters

- **Node Exporter** (9100): 系统指标
- **Postgres Exporter** (9187): PostgreSQL 指标
- **Redis Exporter** (9121): Redis 指标

## 快速开始

### 1. 启动监控服务

```bash
# 启动所有监控服务
docker-compose -f docker-compose.monitoring.yml up -d

# 查看服务状态
docker-compose -f docker-compose.monitoring.yml ps

# 查看日志
docker-compose -f docker-compose.monitoring.yml logs -f
```

### 2. 访问 Web 界面

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3000 (admin/admin)
- **Alertmanager**: http://localhost:9093
- **Loki**: http://localhost:3100

### 3. 验证配置

```bash
# 运行监控测试
python scripts/test_monitoring.py

# 运行日志测试
python scripts/test_logging.py
```

## Prometheus 配置

### 抓取配置

Prometheus 配置了以下抓取目标：

```yaml
scrape_configs:
  # FastAPI 应用
  - job_name: 'fastapi-backend'
    static_configs:
      - targets: ['fastapi-backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  # PostgreSQL
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  # Redis
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  # 系统指标
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
```

### 查询示例

```promql
# API 请求速率
sum(rate(http_requests_total[5m]))

# P95 响应时间
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# 错误率
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))

# 数据库连接数
pg_stat_database_numbackends{datname="laboratory"}

# Redis 内存使用率
(redis_memory_used_bytes / redis_memory_max_bytes) * 100
```

## Grafana 配置

### 预配置仪表板

系统包含以下预配置仪表板：

1. **FastAPI 应用概览** (`fastapi-overview`)
   - 请求速率 (QPS)
   - P95 响应时间
   - 错误率
   - 服务状态
   - 请求速率（按方法）
   - 响应时间分布
   - HTTP 状态码分布
   - 数据库连接数

2. **数据库监控** (`database-monitoring`)
   - 活跃连接数
   - 平均查询时间
   - 死锁数
   - 数据库状态
   - 连接数趋势
   - 事务速率
   - 数据库大小
   - 缓存命中率

3. **系统资源监控** (`system-resources`)
   - CPU 使用率
   - 内存使用率
   - 磁盘使用率
   - 系统负载
   - CPU 使用率详情
   - 内存使用详情
   - 网络流量
   - 磁盘 I/O

### 访问仪表板

1. 访问 http://localhost:3000
2. 使用默认凭据登录: admin/admin
3. 导航到 "Dashboards" → "Laboratory System"
4. 选择要查看的仪表板

### 自定义仪表板

可以通过以下方式自定义仪表板：

1. 在 Grafana UI 中创建新仪表板
2. 导出仪表板 JSON
3. 保存到 `grafana/dashboards/` 目录
4. 重启 Grafana 服务

## Loki 配置

### 日志收集

Promtail 配置了以下日志源：

- **FastAPI 应用日志**: `/app/logs/*.log`
- **Nginx 访问日志**: `/var/log/nginx/access.log`
- **Nginx 错误日志**: `/var/log/nginx/error.log`
- **PostgreSQL 日志**: `/var/lib/postgresql/data/log/*.log`
- **Redis 日志**: `/var/log/redis/*.log`
- **系统日志**: `/var/log/syslog`

### 日志查询

在 Grafana 的 Explore 界面中使用 LogQL 查询日志：

```logql
# 查询所有 FastAPI 日志
{job="fastapi-backend"}

# 查询错误日志
{job="fastapi-backend", level="ERROR"}

# 搜索包含特定文本的日志
{job="fastapi-backend"} |= "database"

# 查询特定时间范围的日志
{job="fastapi-backend"} |= "error" [5m]

# 使用正则表达式过滤
{job="fastapi-backend"} |~ "error|exception"

# 统计日志数量
sum(count_over_time({job="fastapi-backend"}[5m]))
```

### 日志标签

日志包含以下标签：

- `job`: 日志来源（如 fastapi-backend）
- `level`: 日志级别（DEBUG, INFO, WARNING, ERROR, CRITICAL）
- `logger`: 日志记录器名称
- `module`: 模块名称
- `app`: 应用名称

## Alertmanager 配置

### 告警路由

Alertmanager 配置了以下路由规则：

- **严重告警**: 立即发送给管理员
- **数据库告警**: 发送给 DBA 团队
- **API 告警**: 发送给 API 团队
- **系统告警**: 发送给运维团队

### 通知配置

需要配置 SMTP 服务器以发送邮件通知：

```yaml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alertmanager@example.com'
  smtp_auth_username: 'alertmanager@example.com'
  smtp_auth_password: 'your-password'
  smtp_require_tls: true
```

### Webhook 集成

可以配置 Webhook 将告警发送到其他系统：

```yaml
receivers:
  - name: 'webhook'
    webhook_configs:
      - url: 'http://your-webhook-service:8080/alerts'
        send_resolved: true
```

## 告警规则

系统配置了以下告警规则：

### API 告警

- **HighAPIResponseTime**: API P95 响应时间超过 1 秒
- **HighAPIErrorRate**: API 5xx 错误率超过 5%
- **LowAPIRequestRate**: API 请求量异常低
- **HighAPIRequestRate**: API 请求量超过 1000 QPS
- **SlowEndpoint**: 特定端点响应时间超过 2 秒

### 数据库告警

- **HighDatabaseConnections**: 数据库连接数超过 80
- **DatabaseConnectionPoolExhausted**: 连接池使用率超过 90%
- **SlowDatabaseQueries**: 平均查询时间超过 1 秒
- **DatabaseDeadlocks**: 检测到数据库死锁
- **DatabaseDiskSpaceLow**: 数据库磁盘使用率超过 80%
- **DatabaseDown**: 数据库不可用

### Redis 告警

- **RedisDown**: Redis 不可用
- **HighRedisMemoryUsage**: Redis 内存使用率超过 85%
- **HighRedisConnections**: Redis 连接数超过 1000
- **SlowRedisCommands**: Redis 命令执行缓慢
- **HighRedisEvictionRate**: Redis 键过期率异常
- **RedisPersistenceFailure**: Redis 持久化失败

### 系统告警

- **HighCPUUsage**: CPU 使用率超过 80%
- **HighMemoryUsage**: 内存使用率超过 85%
- **HighDiskUsage**: 磁盘使用率超过 85%
- **HighDiskIO**: 磁盘 I/O 使用率超过 80%
- **HighNetworkTraffic**: 网络接收流量超过 100MB/s
- **HighSystemLoad**: 系统负载超过 CPU 核心数的 2 倍

## 日志管理

### 日志级别

应用使用以下日志级别：

- **DEBUG**: 详细的调试信息
- **INFO**: 一般信息
- **WARNING**: 警告信息
- **ERROR**: 错误信息
- **CRITICAL**: 严重错误

### 日志格式

应用日志使用 JSON 格式：

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": "INFO",
  "logger": "app.main",
  "message": "Application started",
  "module": "main",
  "function": "startup",
  "line": 42,
  "request_id": "abc123",
  "user_id": "user123"
}
```

### 日志轮转

日志文件自动轮转：

- **最大文件大小**: 100MB
- **保留文件数**: 10
- **压缩**: 是

### 日志查看

```bash
# 查看应用日志
tail -f logs/app.log

# 查看错误日志
tail -f logs/error.log

# 使用 Loki 查询日志
# 访问 Grafana Explore 界面
```

## 测试和验证

### 监控测试

运行监控测试脚本：

```bash
python scripts/test_monitoring.py
```

测试内容：

- Prometheus 健康检查
- Prometheus 目标状态
- Prometheus 指标查询
- Grafana 健康检查
- Grafana 数据源配置
- Loki 健康检查
- Loki 标签查询
- Alertmanager 健康检查
- Alertmanager 配置检查
- FastAPI 指标端点

### 日志测试

运行日志测试脚本：

```bash
python scripts/test_logging.py
```

测试内容：

- 生成测试日志
- 查询日志标签
- 按 job 查询日志
- 按级别查询日志
- 日志搜索功能

### 手动验证

1. **验证 Prometheus 指标收集**:
   - 访问 http://localhost:9090
   - 执行查询: `up{job="fastapi-backend"}`
   - 应该返回值为 1

2. **验证 Grafana 仪表板**:
   - 访问 http://localhost:3000
   - 查看预配置的仪表板
   - 确认数据正常显示

3. **验证 Loki 日志收集**:
   - 在 Grafana 中打开 Explore
   - 选择 Loki 数据源
   - 查询: `{job="fastapi-backend"}`
   - 应该看到应用日志

4. **验证告警规则**:
   - 访问 http://localhost:9090/alerts
   - 查看所有告警规则
   - 确认规则已加载

## 故障排查

### Prometheus 无法抓取指标

**问题**: Prometheus 显示目标为 down

**解决方案**:
1. 检查 FastAPI 应用是否运行: `docker ps`
2. 检查 /metrics 端点: `curl http://localhost:8000/metrics`
3. 检查网络连接: `docker network inspect lab-network`
4. 查看 Prometheus 日志: `docker logs prometheus`

### Grafana 无法连接数据源

**问题**: Grafana 显示数据源错误

**解决方案**:
1. 检查 Prometheus 是否运行: `docker ps | grep prometheus`
2. 测试连接: `curl http://prometheus:9090/api/v1/query?query=up`
3. 检查数据源配置: Grafana → Configuration → Data Sources
4. 查看 Grafana 日志: `docker logs grafana`

### Loki 无法收集日志

**问题**: Loki 中没有日志

**解决方案**:
1. 检查 Promtail 是否运行: `docker ps | grep promtail`
2. 检查日志文件权限: `ls -la logs/`
3. 查看 Promtail 日志: `docker logs promtail`
4. 验证 Loki 配置: `curl http://localhost:3100/ready`

### 告警未发送

**问题**: 触发告警但未收到通知

**解决方案**:
1. 检查 Alertmanager 状态: `curl http://localhost:9093/-/healthy`
2. 查看活跃告警: http://localhost:9093/#/alerts
3. 检查 SMTP 配置: `prometheus/alertmanager.yml`
4. 查看 Alertmanager 日志: `docker logs alertmanager`

### 磁盘空间不足

**问题**: 监控数据占用大量磁盘空间

**解决方案**:
1. 调整数据保留时间:
   ```yaml
   # prometheus.yml
   storage.tsdb.retention.time: 15d  # 从 30d 减少到 15d
   ```

2. 清理旧数据:
   ```bash
   docker-compose -f docker-compose.monitoring.yml down
   docker volume rm prometheus-data loki-data
   docker-compose -f docker-compose.monitoring.yml up -d
   ```

3. 配置日志轮转:
   ```yaml
   # loki-config.yml
   limits_config:
     retention_period: 15d  # 从 30d 减少到 15d
   ```

## 最佳实践

1. **定期检查监控系统**:
   - 每天查看 Grafana 仪表板
   - 每周检查告警规则
   - 每月审查监控配置

2. **优化查询性能**:
   - 使用合适的时间范围
   - 避免过于复杂的查询
   - 使用记录规则预计算常用指标

3. **管理存储空间**:
   - 定期清理旧数据
   - 监控磁盘使用率
   - 配置合适的保留时间

4. **保护监控系统**:
   - 修改默认密码
   - 配置访问控制
   - 使用 HTTPS

5. **备份配置**:
   - 定期备份 Grafana 仪表板
   - 备份 Prometheus 配置
   - 备份告警规则

## 相关文档

- [Prometheus 官方文档](https://prometheus.io/docs/)
- [Grafana 官方文档](https://grafana.com/docs/)
- [Loki 官方文档](https://grafana.com/docs/loki/)
- [Alertmanager 官方文档](https://prometheus.io/docs/alerting/latest/alertmanager/)

## 支持

如有问题，请联系：

- 技术支持: support@example.com
- 运维团队: ops@example.com
