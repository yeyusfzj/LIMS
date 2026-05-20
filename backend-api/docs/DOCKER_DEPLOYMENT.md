# Docker 部署指南

本文档详细说明如何使用 Docker 部署 FastAPI 后端服务。

## 目录

- [Docker 镜像说明](#docker-镜像说明)
- [本地开发环境](#本地开发环境)
- [生产环境部署](#生产环境部署)
- [健康检查](#健康检查)
- [监控和日志](#监控和日志)
- [故障排查](#故障排查)

## Docker 镜像说明

### 多阶段构建

我们的 Dockerfile 使用多阶段构建来优化镜像大小和构建速度：

**阶段 1: 构建阶段 (builder)**
- 安装所有构建依赖
- 创建 Python 虚拟环境
- 安装 Python 包

**阶段 2: 运行阶段**
- 使用精简的基础镜像
- 只复制必要的运行时依赖
- 创建非 root 用户运行应用
- 配置健康检查

### 镜像优化特性

1. **体积优化**
   - 多阶段构建减少最终镜像大小
   - 使用 `.dockerignore` 排除不必要的文件
   - 清理 apt 缓存

2. **安全性**
   - 使用非 root 用户 (appuser)
   - 最小化安装的系统包
   - 定期更新基础镜像

3. **性能**
   - 利用 Docker 层缓存
   - 优化层顺序
   - 使用虚拟环境隔离依赖

## 本地开发环境

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+

### 快速启动

1. **克隆代码并进入目录**
```bash
cd fastapi-backend
```

2. **复制环境变量文件**
```bash
cp .env.example .env
```

3. **启动所有服务**
```bash
docker-compose up -d
```

4. **查看日志**
```bash
docker-compose logs -f fastapi-backend
```

5. **访问服务**
- API: http://localhost:8000
- API 文档: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- 健康检查: http://localhost:8000/health

### 开发模式特性

- 代码热重载（通过 volume 挂载）
- 详细的调试日志
- 单个 worker 进程
- 自动重启

### 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker-compose exec fastapi-backend bash

# 运行数据库迁移
docker-compose exec fastapi-backend alembic upgrade head

# 创建新的迁移
docker-compose exec fastapi-backend alembic revision --autogenerate -m "description"

# 重建镜像
docker-compose build --no-cache
```

## 生产环境部署

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 10GB 可用磁盘空间

### 部署步骤

#### 1. 准备环境变量

```bash
# 复制生产环境模板
cp .env.production .env.prod

# 编辑环境变量（重要！）
nano .env.prod
```

**必须修改的配置项：**

```bash
# 数据库密码
POSTGRES_PASSWORD=your_strong_password_here

# JWT 密钥（使用 openssl rand -hex 32 生成）
JWT_SECRET_KEY=your_strong_secret_key_here

# Redis 密码
REDIS_PASSWORD=your_redis_password_here

# CORS 允许的域名
CORS_ORIGINS=https://yourdomain.com
```

#### 2. 构建生产镜像

```bash
# 构建镜像
docker build -t fastapi-backend:1.0.0 -t fastapi-backend:latest .

# 验证镜像
docker images | grep fastapi-backend
```

#### 3. 启动生产服务

```bash
# 使用生产配置启动
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 查看服务状态
docker-compose -f docker-compose.prod.yml ps

# 查看日志
docker-compose -f docker-compose.prod.yml logs -f
```

#### 4. 运行数据库迁移

```bash
docker-compose -f docker-compose.prod.yml exec fastapi-backend alembic upgrade head
```

#### 5. 验证部署

```bash
# 检查健康状态
curl http://localhost:8000/health

# 检查详细健康状态
curl http://localhost:8000/health/detailed

# 测试 API
curl http://localhost:8000/api/v1/samples
```

### 使用 Nginx 反向代理（可选）

如果需要使用 Nginx 作为反向代理：

1. **准备 SSL 证书**
```bash
# 创建 SSL 目录
mkdir -p nginx/ssl

# 复制证书文件
cp /path/to/cert.pem nginx/ssl/
cp /path/to/key.pem nginx/ssl/
```

2. **启动包含 Nginx 的服务**
```bash
docker-compose -f docker-compose.prod.yml --profile with-nginx up -d
```

3. **访问服务**
- HTTP: http://yourdomain.com (自动重定向到 HTTPS)
- HTTPS: https://yourdomain.com

### 生产环境配置说明

#### 资源限制

```yaml
deploy:
  resources:
    limits:
      cpus: '2'        # 最多使用 2 个 CPU 核心
      memory: 2G       # 最多使用 2GB 内存
    reservations:
      cpus: '1'        # 保留 1 个 CPU 核心
      memory: 1G       # 保留 1GB 内存
```

#### 多 Worker 配置

生产环境使用 4 个 Uvicorn worker 进程：

```dockerfile
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

Worker 数量建议：
- 小型应用：2-4 workers
- 中型应用：4-8 workers
- 大型应用：8-16 workers
- 公式：`workers = (2 × CPU核心数) + 1`

#### 健康检查配置

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s      # 每 30 秒检查一次
  timeout: 10s       # 超时时间 10 秒
  retries: 3         # 失败 3 次后标记为不健康
  start_period: 40s  # 启动后 40 秒开始检查
```

## 健康检查

### 健康检查端点

1. **基础健康检查**
```bash
GET /health
```
返回：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

2. **详细健康检查**
```bash
GET /health/detailed
```
返回：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  },
  "version": "1.0.0"
}
```

3. **就绪检查**
```bash
GET /ready
```

4. **存活检查**
```bash
GET /live
```

### 监控健康状态

```bash
# 使用 Docker 检查容器健康状态
docker ps --filter "name=fastapi-backend"

# 查看健康检查日志
docker inspect --format='{{json .State.Health}}' fastapi-backend-prod | jq

# 持续监控
watch -n 5 'curl -s http://localhost:8000/health | jq'
```

## 监控和日志

### 日志管理

#### 查看日志

```bash
# 查看所有服务日志
docker-compose -f docker-compose.prod.yml logs

# 查看特定服务日志
docker-compose -f docker-compose.prod.yml logs fastapi-backend

# 实时跟踪日志
docker-compose -f docker-compose.prod.yml logs -f --tail=100

# 查看最近 1 小时的日志
docker-compose -f docker-compose.prod.yml logs --since 1h
```

#### 日志文件位置

- 应用日志：`./logs/app.log`
- Nginx 日志：`./logs/nginx/access.log` 和 `./logs/nginx/error.log`

#### 日志轮转

应用日志自动轮转配置：
- 最大文件大小：10MB
- 保留文件数：10
- 总大小限制：100MB

### Prometheus 监控

生产环境已集成 Prometheus 监控：

1. **访问指标端点**
```bash
curl http://localhost:8000/metrics
```

2. **常用指标**
- `http_requests_total`: HTTP 请求总数
- `http_request_duration_seconds`: 请求响应时间
- `http_requests_in_progress`: 正在处理的请求数
- `process_cpu_seconds_total`: CPU 使用时间
- `process_resident_memory_bytes`: 内存使用量

## 故障排查

### 常见问题

#### 1. 容器无法启动

**症状**：容器启动后立即退出

**排查步骤**：
```bash
# 查看容器日志
docker-compose -f docker-compose.prod.yml logs fastapi-backend

# 查看容器状态
docker-compose -f docker-compose.prod.yml ps

# 检查配置
docker-compose -f docker-compose.prod.yml config
```

**常见原因**：
- 环境变量配置错误
- 数据库连接失败
- 端口被占用

#### 2. 数据库连接失败

**症状**：应用日志显示数据库连接错误

**排查步骤**：
```bash
# 检查数据库容器状态
docker-compose -f docker-compose.prod.yml ps postgres

# 测试数据库连接
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d laboratory -c "SELECT 1"

# 查看数据库日志
docker-compose -f docker-compose.prod.yml logs postgres
```

**解决方案**：
- 确认 `DATABASE_URL` 配置正确
- 确认数据库容器已启动
- 检查数据库密码是否正确

#### 3. Redis 连接失败

**症状**：缓存功能不工作

**排查步骤**：
```bash
# 检查 Redis 容器状态
docker-compose -f docker-compose.prod.yml ps redis

# 测试 Redis 连接
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping

# 查看 Redis 日志
docker-compose -f docker-compose.prod.yml logs redis
```

#### 4. 内存不足

**症状**：容器被 OOM Killer 杀死

**排查步骤**：
```bash
# 查看容器资源使用
docker stats

# 查看系统日志
dmesg | grep -i "out of memory"
```

**解决方案**：
- 增加 Docker 内存限制
- 减少 worker 数量
- 优化应用内存使用

#### 5. 性能问题

**症状**：API 响应缓慢

**排查步骤**：
```bash
# 查看容器资源使用
docker stats fastapi-backend-prod

# 查看慢查询日志
docker-compose -f docker-compose.prod.yml exec fastapi-backend cat logs/app.log | grep "slow"

# 检查数据库性能
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d laboratory -c "SELECT * FROM pg_stat_activity"
```

**解决方案**：
- 增加 worker 数量
- 优化数据库查询
- 启用缓存
- 增加资源限制

### 紧急恢复

#### 快速回滚

```bash
# 停止当前版本
docker-compose -f docker-compose.prod.yml down

# 切换到之前的镜像版本
docker tag fastapi-backend:1.0.0-backup fastapi-backend:latest

# 重新启动
docker-compose -f docker-compose.prod.yml up -d
```

#### 数据备份

```bash
# 备份数据库
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres laboratory > backup.sql

# 备份 Redis 数据
docker-compose -f docker-compose.prod.yml exec redis redis-cli SAVE
docker cp redis-prod:/data/dump.rdb ./backup/redis-dump.rdb

# 备份应用数据
tar -czf backup-$(date +%Y%m%d).tar.gz logs/ exports/ uploads/
```

#### 数据恢复

```bash
# 恢复数据库
cat backup.sql | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U postgres laboratory

# 恢复 Redis 数据
docker cp ./backup/redis-dump.rdb redis-prod:/data/dump.rdb
docker-compose -f docker-compose.prod.yml restart redis
```

## 维护操作

### 更新应用

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 构建新镜像
docker build -t fastapi-backend:1.1.0 .

# 3. 标记为 latest
docker tag fastapi-backend:1.1.0 fastapi-backend:latest

# 4. 滚动更新（零停机）
docker-compose -f docker-compose.prod.yml up -d --no-deps --build fastapi-backend

# 5. 验证更新
curl http://localhost:8000/health
```

### 清理资源

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune

# 清理所有未使用的资源
docker system prune -a --volumes
```

### 定期维护

建议每周执行：

1. 检查日志文件大小
2. 清理旧的备份文件
3. 更新基础镜像
4. 检查安全更新
5. 验证备份可用性

## 安全建议

1. **定期更新**
   - 定期更新基础镜像
   - 及时应用安全补丁

2. **密钥管理**
   - 使用强随机密钥
   - 定期轮换密钥
   - 不要在代码中硬编码密钥

3. **网络安全**
   - 使用 HTTPS
   - 配置防火墙规则
   - 限制容器间通信

4. **访问控制**
   - 使用非 root 用户运行容器
   - 限制容器权限
   - 定期审查访问日志

5. **数据保护**
   - 定期备份数据
   - 加密敏感数据
   - 测试恢复流程

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [FastAPI 部署文档](https://fastapi.tiangolo.com/deployment/)
- [Uvicorn 部署指南](https://www.uvicorn.org/deployment/)
