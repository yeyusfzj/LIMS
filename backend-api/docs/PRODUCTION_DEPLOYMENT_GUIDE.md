# 生产环境部署完整指南

本文档提供 FastAPI 后端服务生产环境部署的完整指南,包括部署准备、配置、监控、告警和应急响应。

## 目录

- [部署前准备](#部署前准备)
- [生产环境配置](#生产环境配置)
- [部署流程](#部署流程)
- [监控和告警](#监控和告警)
- [应急响应](#应急响应)
- [灰度发布](#灰度发布)
- [性能调优](#性能调优)

## 部署前准备

### 1. 环境检查清单

#### 硬件资源

- [ ] CPU: 至少 4 核心
- [ ] 内存: 至少 8GB RAM
- [ ] 磁盘: 至少 100GB SSD
- [ ] 网络: 稳定的网络连接,带宽 ≥ 100Mbps

#### 软件依赖

- [ ] Docker 20.10+ 已安装
- [ ] Docker Compose 2.0+ 已安装
- [ ] PostgreSQL 14+ (如果外部数据库)
- [ ] Redis 7+ (如果外部 Redis)
- [ ] Nginx (如果使用反向代理)

#### 网络配置

- [ ] 防火墙规则已配置
- [ ] 端口 8000 (API) 已开放
- [ ] 端口 5432 (PostgreSQL) 已配置访问控制
- [ ] 端口 6379 (Redis) 已配置访问控制
- [ ] SSL 证书已准备(如果使用 HTTPS)

#### 安全配置

- [ ] JWT 密钥已生成(与 Node.js 后端相同)
- [ ] 数据库密码已设置(强密码)
- [ ] Redis 密码已设置
- [ ] 备份加密密钥已生成
- [ ] 所有敏感配置已加密存储

### 2. 配置文件准备

#### 创建生产环境配置

```bash
# 复制模板文件
cp .env.production.template .env.production

# 编辑配置文件
vim .env.production
```

#### 必需配置项

```bash
# 数据库配置 (必须与 Node.js 后端相同)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/laboratory
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<强密码>
POSTGRES_DB=laboratory
POSTGRES_HOST=<数据库主机>
POSTGRES_PORT=5432

# JWT 配置 (必须与 Node.js 后端相同)
JWT_SECRET_KEY=<与 Node.js 后端相同的密钥>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Redis 配置
REDIS_URL=redis://:password@host:6379/0
REDIS_HOST=<Redis 主机>
REDIS_PORT=6379
REDIS_PASSWORD=<Redis 密码>

# 应用配置
APP_NAME=Laboratory Management System
APP_VERSION=1.0.0
DEBUG=false
LOG_LEVEL=INFO
ENVIRONMENT=production

# CORS 配置 (生产域名)
CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# 安全配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
LOGIN_RATE_LIMIT_PER_MINUTE=5
```

### 3. 数据库准备

#### 数据库迁移检查

```bash
# 检查迁移状态
cd backend-api
npx prisma migrate status

# 如果有待执行的迁移
npx prisma migrate deploy
```

#### 数据库备份

```bash
# 创建部署前备份
pg_dump -h <host> -U <user> -d laboratory > pre_deployment_backup_$(date +%Y%m%d).sql

# 验证备份文件
ls -lh pre_deployment_backup_*.sql
```

### 4. 代码准备

#### 代码审查

- [ ] 所有代码已通过 Code Review
- [ ] 所有测试已通过
- [ ] 代码覆盖率达标 (≥80%)
- [ ] 性能测试已通过
- [ ] 安全扫描已通过

#### 版本标记

```bash
# 创建发布标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## 生产环境配置

### 1. Docker Compose 生产配置

`docker-compose.prod.yml` 关键配置:

```yaml
services:
  fastapi-backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: fastapi-backend-prod
    restart: unless-stopped
    
    # 资源限制
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
    
    # 健康检查
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    
    # 日志配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 2. Nginx 反向代理配置

创建 `nginx/nginx.conf`:

```nginx
upstream fastapi_backend {
    least_conn;
    server fastapi-backend:8000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    # SSL 证书
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # 日志
    access_log /var/log/nginx/api_access.log;
    error_log /var/log/nginx/api_error.log;
    
    # 限流
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
    
    # API 代理
    location /api/ {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲配置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # 健康检查
    location /health {
        proxy_pass http://fastapi_backend/health;
        access_log off;
    }
}
```

### 3. 监控配置

#### Prometheus 配置

创建 `prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    environment: 'prod'

# 告警规则
rule_files:
  - 'alerts.yml'

# 抓取配置
scrape_configs:
  - job_name: 'fastapi-backend'
    static_configs:
      - targets: ['fastapi-backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

# Alertmanager 配置
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

#### 告警规则

创建 `prometheus/alerts.yml`:

```yaml
groups:
  - name: fastapi_alerts
    interval: 30s
    rules:
      # 服务可用性告警
      - alert: ServiceDown
        expr: up{job="fastapi-backend"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "FastAPI 服务不可用"
          description: "FastAPI 后端服务已停止响应超过 1 分钟"
      
      # 高错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高错误率检测"
          description: "5xx 错误率超过 5%"
      
      # 响应时间告警
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "响应时间过长"
          description: "P95 响应时间超过 1 秒"
      
      # 数据库连接告警
      - alert: DatabaseConnectionIssue
        expr: database_connections_active / database_connections_max > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "数据库连接池接近饱和"
          description: "数据库连接使用率超过 80%"
      
      # 内存使用告警
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes{name="fastapi-backend-prod"} / container_spec_memory_limit_bytes{name="fastapi-backend-prod"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "内存使用率过高"
          description: "内存使用率超过 90%"
      
      # CPU 使用告警
      - alert: HighCPUUsage
        expr: rate(container_cpu_usage_seconds_total{name="fastapi-backend-prod"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CPU 使用率过高"
          description: "CPU 使用率超过 80%"
      
      # 磁盘空间告警
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "磁盘空间不足"
          description: "可用磁盘空间低于 10%"

  - name: database_alerts
    interval: 30s
    rules:
      # 数据库连接失败
      - alert: DatabaseDown
        expr: up{job="postgres"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "数据库不可用"
          description: "PostgreSQL 数据库连接失败"
      
      # 慢查询告警
      - alert: SlowQueries
        expr: rate(pg_stat_statements_mean_time_seconds[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "检测到慢查询"
          description: "平均查询时间超过 1 秒"

  - name: redis_alerts
    interval: 30s
    rules:
      # Redis 连接失败
      - alert: RedisDown
        expr: up{job="redis"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis 不可用"
          description: "Redis 服务连接失败"
      
      # Redis 内存使用
      - alert: RedisHighMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis 内存使用率过高"
          description: "Redis 内存使用率超过 90%"
```

#### Alertmanager 配置

创建 `alertmanager/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.yourdomain.com:587'
  smtp_from: 'alerts@yourdomain.com'
  smtp_auth_username: 'alerts@yourdomain.com'
  smtp_auth_password: '<SMTP密码>'
  smtp_require_tls: true

# 路由配置
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  
  routes:
    # 严重告警立即发送
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
    
    # 警告告警
    - match:
        severity: warning
      receiver: 'warning'

# 接收器配置
receivers:
  - name: 'default'
    email_configs:
      - to: 'ops@yourdomain.com'
        headers:
          Subject: '[监控告警] {{ .GroupLabels.alertname }}'
  
  - name: 'critical'
    email_configs:
      - to: 'ops@yourdomain.com,admin@yourdomain.com'
        headers:
          Subject: '[严重告警] {{ .GroupLabels.alertname }}'
    webhook_configs:
      - url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        send_resolved: true
  
  - name: 'warning'
    email_configs:
      - to: 'ops@yourdomain.com'
        headers:
          Subject: '[警告] {{ .GroupLabels.alertname }}'

# 抑制规则
inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'cluster', 'service']
```

## 部署流程

### 1. 自动化部署脚本

使用提供的部署脚本:

```bash
# 执行生产环境部署
./scripts/deploy-production.sh

# 带选项的部署
./scripts/deploy-production.sh --skip-checks --skip-backup
```

### 2. 手动部署步骤

如果需要手动部署:

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 备份数据库
./scripts/backup-database.sh

# 3. 构建镜像
docker-compose -f docker-compose.prod.yml build --no-cache

# 4. 停止旧服务
docker-compose -f docker-compose.prod.yml down

# 5. 启动新服务
docker-compose -f docker-compose.prod.yml up -d

# 6. 健康检查
curl http://localhost:8000/health

# 7. 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. 部署验证

#### 健康检查

```bash
# 基础健康检查
curl http://localhost:8000/health

# 详细健康检查
curl http://localhost:8000/health/detailed

# 就绪检查
curl http://localhost:8000/ready

# 存活检查
curl http://localhost:8000/live
```

#### 功能验证

```bash
# 测试认证
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# 测试 API
curl http://localhost:8000/api/v1/samples \
  -H "Authorization: Bearer <token>"

# 测试数据库连接
docker-compose -f docker-compose.prod.yml exec fastapi-backend \
  python -c "from app.core.database import engine; import asyncio; asyncio.run(engine.connect())"
```

## 监控和告警

### 1. 监控指标

#### 应用指标

- **请求指标**
  - 请求总数
  - 请求成功率
  - 请求响应时间 (P50, P95, P99)
  - 错误率 (4xx, 5xx)

- **性能指标**
  - CPU 使用率
  - 内存使用率
  - 磁盘 I/O
  - 网络流量

- **业务指标**
  - 活跃用户数
  - API 调用量
  - 数据库查询数
  - 缓存命中率

#### 数据库指标

- 连接数
- 查询响应时间
- 慢查询数量
- 锁等待时间
- 表大小

#### Redis 指标

- 内存使用
- 命中率
- 连接数
- 操作延迟

### 2. 日志管理

#### 日志级别

生产环境日志级别配置:

```bash
LOG_LEVEL=INFO
LOG_LEVEL_ROOT=INFO
LOG_LEVEL_APP=INFO
LOG_LEVEL_SQLALCHEMY=WARNING
LOG_LEVEL_UVICORN=INFO
```

#### 日志聚合

使用 Loki 进行日志聚合:

```yaml
# docker-compose.monitoring.yml
services:
  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
  
  promtail:
    image: grafana/promtail:latest
    volumes:
      - ./logs:/var/log
      - ./loki/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

### 3. 可视化仪表板

#### Grafana 配置

访问 Grafana: `http://localhost:3000`

默认凭据:
- 用户名: admin
- 密码: admin

导入预配置的仪表板:
- FastAPI 应用监控
- PostgreSQL 监控
- Redis 监控
- 系统资源监控

## 应急响应

### 1. 故障响应流程

#### 服务不可用

```bash
# 1. 检查服务状态
docker-compose -f docker-compose.prod.yml ps

# 2. 查看日志
docker-compose -f docker-compose.prod.yml logs --tail=100 fastapi-backend

# 3. 检查健康状态
curl http://localhost:8000/health/detailed

# 4. 重启服务
docker-compose -f docker-compose.prod.yml restart fastapi-backend

# 5. 如果问题持续,执行回滚
./scripts/rollback-production.sh
```

#### 数据库连接失败

```bash
# 1. 检查数据库状态
docker-compose -f docker-compose.prod.yml ps postgres

# 2. 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT 1"

# 3. 检查连接池
docker-compose -f docker-compose.prod.yml logs fastapi-backend | grep "pool"

# 4. 重启数据库
docker-compose -f docker-compose.prod.yml restart postgres
```

#### 性能下降

```bash
# 1. 检查资源使用
docker stats fastapi-backend-prod

# 2. 检查慢查询
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
  "

# 3. 清理缓存
docker-compose -f docker-compose.prod.yml exec redis redis-cli FLUSHDB

# 4. 增加资源限制
# 编辑 docker-compose.prod.yml 增加 CPU 和内存限制
docker-compose -f docker-compose.prod.yml up -d
```

### 2. 回滚流程

#### 快速回滚

```bash
# 执行自动回滚
./scripts/rollback-production.sh

# 选择特定备份回滚
./scripts/rollback-production.sh --backup-file backups/backup_20260419.sql
```

#### 手动回滚

```bash
# 1. 停止服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复数据库
docker-compose -f docker-compose.prod.yml up -d postgres
docker exec -i postgres-prod psql -U postgres laboratory < backup.sql

# 3. 切换到旧版本
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml build

# 4. 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

### 3. 数据恢复

#### 从备份恢复

```bash
# 列出可用备份
ls -lh backups/

# 恢复特定备份
docker exec -i postgres-prod psql -U postgres laboratory < backups/backup_20260419.sql

# 验证数据
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d laboratory -c "SELECT COUNT(*) FROM samples"
```

## 灰度发布

### 1. 灰度发布策略

#### 按百分比发布

使用 Nginx 配置流量分配:

```nginx
upstream fastapi_v1 {
    server fastapi-backend-v1:8000;
}

upstream fastapi_v2 {
    server fastapi-backend-v2:8000;
}

split_clients "${remote_addr}" $backend {
    90%     fastapi_v1;  # 90% 流量到旧版本
    *       fastapi_v2;  # 10% 流量到新版本
}

server {
    location /api/ {
        proxy_pass http://$backend;
    }
}
```

#### 按用户发布

```nginx
map $http_x_user_id $backend {
    ~^(1|2|3|4|5)$  fastapi_v2;  # 特定用户到新版本
    default         fastapi_v1;   # 其他用户到旧版本
}
```

### 2. 金丝雀发布

```bash
# 1. 部署新版本到单独容器
docker-compose -f docker-compose.canary.yml up -d

# 2. 配置少量流量到新版本
# 编辑 Nginx 配置

# 3. 监控新版本指标
# 查看 Grafana 仪表板

# 4. 逐步增加流量
# 10% -> 25% -> 50% -> 100%

# 5. 完全切换后删除旧版本
docker-compose -f docker-compose.prod.yml down
```

## 性能调优

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_samples_barcode ON samples(barcode);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_created_at ON samples(created_at);

-- 分析表
ANALYZE samples;

-- 清理
VACUUM ANALYZE;
```

### 2. 缓存优化

```bash
# 增加 Redis 内存
# 编辑 docker-compose.prod.yml
redis:
  command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### 3. 应用优化

```bash
# 增加 Worker 数量
UVICORN_WORKERS=8

# 增加连接池
DB_POOL_SIZE=30
DB_MAX_OVERFLOW=20

# 启用缓存
CACHE_ENABLED=true
CACHE_TTL=600
```

## 安全加固

### 1. 网络安全

```bash
# 配置防火墙
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 5432/tcp  # 仅允许内部访问
sudo ufw deny 6379/tcp  # 仅允许内部访问
sudo ufw enable
```

### 2. 容器安全

```yaml
# docker-compose.prod.yml
services:
  fastapi-backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
```

### 3. 定期更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新 Docker 镜像
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## 维护计划

### 日常维护

- [ ] 检查服务健康状态
- [ ] 查看错误日志
- [ ] 监控资源使用
- [ ] 检查告警

### 每周维护

- [ ] 数据库备份验证
- [ ] 清理旧日志文件
- [ ] 检查磁盘空间
- [ ] 更新依赖包

### 每月维护

- [ ] 性能测试
- [ ] 安全扫描
- [ ] 数据库优化
- [ ] 容量规划评估

## 联系信息

- **运维团队**: ops@yourdomain.com
- **技术支持**: support@yourdomain.com
- **紧急联系**: +86-xxx-xxxx-xxxx

## 附录

### A. 常用命令

```bash
# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f fastapi-backend

# 重启服务
docker-compose -f docker-compose.prod.yml restart fastapi-backend

# 进入容器
docker-compose -f docker-compose.prod.yml exec fastapi-backend bash

# 查看资源使用
docker stats fastapi-backend-prod

# 备份数据库
./scripts/backup-database.sh

# 恢复数据库
./scripts/restore-database.sh <backup-file>
```

### B. 故障排查检查清单

- [ ] 服务是否运行
- [ ] 健康检查是否通过
- [ ] 数据库连接是否正常
- [ ] Redis 连接是否正常
- [ ] 日志中是否有错误
- [ ] 资源使用是否正常
- [ ] 网络连接是否正常
- [ ] 配置文件是否正确

### C. 性能基准

- API 响应时间 P95: < 200ms
- API 响应时间 P99: < 500ms
- 数据库查询时间 P95: < 100ms
- 并发支持: ≥ 1000 QPS
- 错误率: < 0.1%
- 可用性: ≥ 99.9%
