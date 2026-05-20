# 部署指南

本文档提供 FastAPI 样品管理后端服务的部署指南，包括 Docker 部署、环境配置、数据库迁移和监控配置。

## 目录

- [系统要求](#系统要求)
- [环境变量配置](#环境变量配置)
- [Docker 部署](#docker-部署)
- [数据库迁移](#数据库迁移)
- [健康检查](#健康检查)
- [监控配置](#监控配置)
- [故障排查](#故障排查)

## 系统要求

### 最低配置

- **CPU**: 2 核
- **内存**: 4 GB RAM
- **磁盘**: 20 GB 可用空间
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+) 或 macOS

### 推荐配置

- **CPU**: 4 核或更多
- **内存**: 8 GB RAM 或更多
- **磁盘**: 50 GB SSD
- **操作系统**: Linux (Ubuntu 22.04 LTS)

### 软件依赖

- **Docker**: 20.10+ 或更高版本
- **Docker Compose**: 2.0+ 或更高版本
- **PostgreSQL**: 14+ (如果不使用 Docker)
- **Python**: 3.11+ (如果不使用 Docker)

## 环境变量配置

### 创建环境变量文件

复制示例文件并根据实际环境修改：

```bash
cp .env.example .env
```

### 必需的环境变量

```bash
# 应用配置
APP_NAME=FastAPI Sample Management Service
APP_VERSION=1.0.0
APP_ENV=production  # development, staging, production
DEBUG=false
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL

# 服务器配置
HOST=0.0.0.0
PORT=8000
WORKERS=4  # 推荐设置为 CPU 核心数

# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/laboratory_db
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30
DB_POOL_RECYCLE=3600

# JWT 认证配置
JWT_SECRET_KEY=your-secret-key-here  # 必须与 Node.js 后端相同
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
CORS_ALLOW_CREDENTIALS=true
CORS_ALLOW_METHODS=GET,POST,PUT,PATCH,DELETE,OPTIONS
CORS_ALLOW_HEADERS=*

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_BURST=10

# Redis 配置 (可选，用于缓存和限流)
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false

# 日志配置
LOG_FILE_PATH=logs/app.log
LOG_MAX_BYTES=10485760  # 10MB
LOG_BACKUP_COUNT=5
LOG_FORMAT=json  # json 或 text
```

### 安全注意事项

1. **JWT 密钥**: 必须与 Node.js 后端使用相同的密钥
2. **数据库密码**: 使用强密码，不要使用默认密码
3. **环境变量文件**: 不要将 `.env` 文件提交到版本控制系统
4. **CORS 配置**: 生产环境中只允许信任的域名

## Docker 部署

### 方式一：使用 Docker Compose（推荐）

#### 1. 准备配置文件

确保 `.env` 文件已正确配置。

#### 2. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f fastapi-backend

# 查看服务状态
docker-compose ps
```

#### 3. 停止服务

```bash
# 停止服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器、网络和卷
docker-compose down -v
```

#### 4. 更新服务

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

### 方式二：使用 Docker 单独部署

#### 1. 构建镜像

```bash
docker build -t fastapi-sample-management:latest .
```

#### 2. 运行容器

```bash
docker run -d \
  --name fastapi-backend \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  fastapi-sample-management:latest
```

#### 3. 查看日志

```bash
docker logs -f fastapi-backend
```

#### 4. 停止和删除容器

```bash
docker stop fastapi-backend
docker rm fastapi-backend
```

### Docker Compose 配置说明

`docker-compose.yml` 文件包含以下服务：

```yaml
services:
  fastapi-backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET_KEY=${JWT_SECRET_KEY}
    depends_on:
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  postgres:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 数据库迁移

### 使用 Prisma 迁移（推荐）

由于 FastAPI 服务与 Node.js 后端共享数据库，建议使用 Node.js 后端的 Prisma 进行数据库迁移。

#### 1. 在 Node.js 后端执行迁移

```bash
cd backend-api
npx prisma migrate deploy
```

#### 2. 验证数据库连接

```bash
# 在 FastAPI 服务中测试数据库连接
docker-compose exec fastapi-backend python -c "
from app.core.database import engine
import asyncio

async def test_connection():
    async with engine.begin() as conn:
        result = await conn.execute('SELECT 1')
        print('Database connection successful!')

asyncio.run(test_connection())
"
```

### 手动执行 SQL 迁移

如果需要手动执行 SQL 迁移：

```bash
# 连接到 PostgreSQL
docker-compose exec postgres psql -U <username> -d <database>

# 执行 SQL 脚本
\i /path/to/migration.sql
```

### 数据库备份和恢复

#### 备份数据库

```bash
# 使用 Docker Compose
docker-compose exec postgres pg_dump -U <username> <database> > backup.sql

# 或使用 pg_dump
pg_dump -h localhost -U <username> -d <database> -F c -f backup.dump
```

#### 恢复数据库

```bash
# 从 SQL 文件恢复
docker-compose exec -T postgres psql -U <username> -d <database> < backup.sql

# 从 dump 文件恢复
pg_restore -h localhost -U <username> -d <database> backup.dump
```

## 健康检查

### 健康检查端点

FastAPI 服务提供健康检查端点用于监控服务状态：

```bash
# 基本健康检查
curl http://localhost:8000/health

# 响应示例
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-11T10:30:00Z"
}
```

### 配置负载均衡器健康检查

#### Nginx 配置示例

```nginx
upstream fastapi_backend {
    server localhost:8000 max_fails=3 fail_timeout=30s;
    
    # 健康检查
    check interval=10000 rise=2 fall=3 timeout=5000 type=http;
    check_http_send "GET /health HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx http_3xx;
}

server {
    listen 80;
    server_name api.example.com;

    location /api/samples {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### HAProxy 配置示例

```haproxy
backend fastapi_backend
    mode http
    balance roundrobin
    option httpchk GET /health
    http-check expect status 200
    server fastapi1 localhost:8000 check inter 10s fall 3 rise 2
```

### Docker 健康检查

Docker Compose 配置中已包含健康检查：

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

查看健康状态：

```bash
docker-compose ps
```

## 监控配置

### 日志监控

#### 查看实时日志

```bash
# Docker Compose
docker-compose logs -f fastapi-backend

# Docker
docker logs -f fastapi-backend

# 查看最近 100 行日志
docker-compose logs --tail=100 fastapi-backend
```

#### 日志文件位置

容器内日志文件：`/app/logs/app.log`

挂载到主机（如果配置了卷）：

```yaml
volumes:
  - ./logs:/app/logs
```

#### 日志格式

JSON 格式日志示例：

```json
{
  "timestamp": "2026-04-11T10:30:00.123Z",
  "level": "INFO",
  "logger": "app.services.sample_service",
  "message": "Sample created successfully",
  "request_id": "abc123",
  "user_id": "user-001",
  "sample_id": "sample-001"
}
```

### Prometheus 指标（可选）

如果启用了 Prometheus 指标，可以通过以下端点访问：

```bash
curl http://localhost:8000/metrics
```

#### Prometheus 配置示例

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'fastapi-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 性能监控

#### 监控关键指标

1. **请求响应时间**: 通过日志中的 `response_time` 字段
2. **错误率**: 监控 4xx 和 5xx 状态码
3. **数据库连接池**: 监控连接池使用情况
4. **内存使用**: 使用 Docker stats 监控

```bash
# 查看容器资源使用
docker stats fastapi-backend

# 查看详细信息
docker-compose exec fastapi-backend ps aux
```

## 故障排查

### 常见问题

#### 1. 服务无法启动

**症状**: 容器启动后立即退出

**排查步骤**:

```bash
# 查看容器日志
docker-compose logs fastapi-backend

# 检查环境变量
docker-compose exec fastapi-backend env | grep DATABASE_URL

# 测试数据库连接
docker-compose exec fastapi-backend python -c "
from app.core.database import engine
import asyncio
asyncio.run(engine.connect())
"
```

**常见原因**:
- 数据库连接失败
- 环境变量配置错误
- 端口被占用

#### 2. 数据库连接失败

**症状**: 日志显示 "could not connect to server"

**排查步骤**:

```bash
# 检查 PostgreSQL 是否运行
docker-compose ps postgres

# 测试数据库连接
docker-compose exec postgres psql -U <username> -d <database> -c "SELECT 1"

# 检查网络连接
docker-compose exec fastapi-backend ping postgres
```

**解决方案**:
- 确保 PostgreSQL 服务正在运行
- 检查 `DATABASE_URL` 配置
- 确保数据库用户有正确的权限

#### 3. JWT 认证失败

**症状**: 所有请求返回 401 Unauthorized

**排查步骤**:

```bash
# 检查 JWT 密钥配置
docker-compose exec fastapi-backend env | grep JWT_SECRET_KEY

# 测试 JWT 解码
docker-compose exec fastapi-backend python -c "
from app.core.security import decode_token
token = 'your-test-token'
print(decode_token(token))
"
```

**解决方案**:
- 确保 `JWT_SECRET_KEY` 与 Node.js 后端相同
- 检查令牌格式和过期时间
- 验证 `JWT_ALGORITHM` 配置

#### 4. 性能问题

**症状**: 响应时间过长

**排查步骤**:

```bash
# 查看数据库连接池状态
docker-compose logs fastapi-backend | grep "pool"

# 查看慢查询
docker-compose exec postgres psql -U <username> -d <database> -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# 监控资源使用
docker stats fastapi-backend
```

**优化建议**:
- 增加数据库连接池大小
- 添加数据库索引
- 启用 Redis 缓存
- 增加 worker 数量

#### 5. 内存泄漏

**症状**: 内存使用持续增长

**排查步骤**:

```bash
# 监控内存使用
docker stats fastapi-backend

# 查看 Python 内存分析
docker-compose exec fastapi-backend python -m memory_profiler app/main.py
```

**解决方案**:
- 检查是否有未关闭的数据库连接
- 检查是否有循环引用
- 定期重启服务（临时方案）

### 日志级别调整

临时调整日志级别以获取更多调试信息：

```bash
# 修改 .env 文件
LOG_LEVEL=DEBUG

# 重启服务
docker-compose restart fastapi-backend
```

### 紧急回滚

如果新版本出现问题，快速回滚到上一个版本：

```bash
# 停止当前服务
docker-compose down

# 切换到上一个版本
git checkout <previous-commit>

# 重新构建和启动
docker-compose up -d --build
```

## 生产环境最佳实践

### 1. 使用反向代理

在生产环境中，建议在 FastAPI 服务前使用 Nginx 或 HAProxy 作为反向代理：

- 处理 SSL/TLS 终止
- 负载均衡
- 静态文件服务
- 请求限流

### 2. 配置 HTTPS

```nginx
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /api/samples {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. 数据库优化

- 定期执行 `VACUUM` 和 `ANALYZE`
- 监控慢查询并添加索引
- 配置合适的连接池大小
- 定期备份数据库

### 4. 监控和告警

- 配置 Prometheus + Grafana 监控
- 设置关键指标告警（错误率、响应时间、资源使用）
- 配置日志聚合（ELK Stack 或 Loki）

### 5. 安全加固

- 使用强密码和密钥
- 定期更新依赖包
- 限制数据库访问权限
- 启用防火墙规则
- 定期安全审计

### 6. 备份策略

- 每日自动备份数据库
- 保留至少 7 天的备份
- 定期测试恢复流程
- 异地备份

## 扩展和高可用

### 水平扩展

使用 Docker Compose 扩展服务实例：

```bash
# 扩展到 3 个实例
docker-compose up -d --scale fastapi-backend=3

# 配置负载均衡器分发请求
```

### 高可用配置

1. **数据库主从复制**: 配置 PostgreSQL 主从复制
2. **Redis 集群**: 使用 Redis Sentinel 或 Cluster
3. **多区域部署**: 在多个数据中心部署服务
4. **自动故障转移**: 配置健康检查和自动重启

## 联系和支持

如有问题或需要支持，请联系：

- **技术支持**: support@example.com
- **文档**: https://docs.example.com
- **问题跟踪**: https://github.com/example/fastapi-backend/issues
