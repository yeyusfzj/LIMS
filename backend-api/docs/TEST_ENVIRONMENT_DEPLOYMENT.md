# 测试环境部署指南

本文档提供 FastAPI 后端测试环境的详细部署指南。

## 目录

- [前置条件](#前置条件)
- [快速部署](#快速部署)
- [详细步骤](#详细步骤)
- [验证部署](#验证部署)
- [常见问题](#常见问题)
- [维护操作](#维护操作)

## 前置条件

### 系统要求

- **操作系统**: Linux, macOS, 或 Windows 10/11
- **Docker**: 20.10+ 或更高版本
- **Docker Compose**: 2.0+ 或更高版本
- **内存**: 至少 4GB 可用内存
- **磁盘**: 至少 10GB 可用空间

### 依赖服务

FastAPI 后端需要以下服务正在运行：

1. **PostgreSQL 数据库** (端口 5432)
   - 与 Node.js 后端共享同一个数据库
   - 数据库名称: `laboratory`
   - 用户名: `postgres`
   - 密码: 根据实际环境配置

2. **Redis** (端口 6379) - 可选
   - 用于缓存和限流
   - 如果不可用，服务仍可正常运行

### 检查依赖服务

```bash
# 检查 PostgreSQL 是否运行
psql -h localhost -U postgres -d laboratory -c "SELECT 1"

# 检查 Redis 是否运行（可选）
redis-cli ping
```

## 快速部署

### Linux/macOS

```bash
# 1. 进入 FastAPI 后端目录
cd fastapi-backend

# 2. 确保脚本有执行权限
chmod +x scripts/deploy-test.sh

# 3. 运行部署脚本
./scripts/deploy-test.sh
```

### Windows (PowerShell)

```powershell
# 1. 进入 FastAPI 后端目录
cd fastapi-backend

# 2. 运行部署脚本
.\scripts\deploy-test.ps1
```

部署脚本会自动执行以下操作：
- ✅ 检查系统要求
- ✅ 验证环境变量配置
- ✅ 检查数据库和 Redis 连接
- ✅ 构建 Docker 镜像
- ✅ 启动服务
- ✅ 等待服务就绪
- ✅ 验证健康状态
- ✅ 显示服务信息

## 详细步骤

如果需要手动部署或自定义配置，请按照以下步骤操作。

### 1. 配置环境变量

```bash
# 复制测试环境配置文件
cp .env.test .env.test.local

# 编辑配置文件
nano .env.test.local
```

**关键配置项**:

```bash
# 数据库连接（必须与 Node.js 后端相同）
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory

# JWT 密钥（必须与 Node.js 后端相同）
JWT_SECRET_KEY=your-secret-key-change-in-production

# Redis 连接（可选）
REDIS_URL=redis://localhost:6379/0

# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080
```

### 2. 构建 Docker 镜像

```bash
# 使用 Docker Compose 构建
docker-compose -f docker-compose.test.yml build

# 或使用 Docker 直接构建
docker build -t fastapi-backend-test:latest .
```

### 3. 启动服务

```bash
# 使用 Docker Compose 启动
docker-compose -f docker-compose.test.yml up -d

# 查看启动日志
docker-compose -f docker-compose.test.yml logs -f
```

### 4. 等待服务就绪

服务启动需要 30-60 秒，可以通过以下方式检查：

```bash
# 检查容器状态
docker-compose -f docker-compose.test.yml ps

# 检查健康状态
curl http://localhost:8001/health
```

预期响应：

```json
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "timestamp": "2026-04-11T10:30:00Z"
}
```

## 验证部署

### 自动验证

使用提供的验证脚本自动检查所有功能：

```bash
# 安装依赖（如果需要）
pip install httpx colorama

# 运行验证脚本
python scripts/verify-deployment.py
```

验证脚本会检查：
- ✅ 健康检查端点
- ✅ OpenAPI 文档
- ✅ 主要 API 端点
- ✅ 数据库连接
- ✅ Redis 连接
- ✅ CORS 配置
- ✅ 限流配置

### 手动验证

#### 1. 验证健康检查

```bash
curl http://localhost:8001/health
```

#### 2. 验证 API 文档

在浏览器中访问：
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

#### 3. 验证 API 端点

```bash
# 测试样品列表端点（需要认证）
curl http://localhost:8001/api/v1/samples

# 预期返回 401 Unauthorized（正常，因为未提供令牌）
```

#### 4. 验证数据库连接

```bash
# 查看详细健康状态
curl http://localhost:8001/health/detailed
```

#### 5. 测试登录功能

```bash
# 登录获取令牌
curl -X POST http://localhost:8001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

## 常见问题

### 问题 1: 服务无法启动

**症状**: 容器启动后立即退出

**解决方案**:

```bash
# 查看容器日志
docker-compose -f docker-compose.test.yml logs

# 检查环境变量
docker-compose -f docker-compose.test.yml config

# 检查端口占用
netstat -an | grep 8001
```

### 问题 2: 数据库连接失败

**症状**: 日志显示 "could not connect to database"

**解决方案**:

```bash
# 1. 检查 PostgreSQL 是否运行
docker ps | grep postgres
# 或
systemctl status postgresql

# 2. 检查数据库连接配置
cat .env.test | grep DATABASE_URL

# 3. 测试数据库连接
psql -h localhost -U postgres -d laboratory -c "SELECT 1"

# 4. 检查防火墙规则
sudo ufw status
```

### 问题 3: Redis 连接失败

**症状**: 日志显示 "could not connect to redis"

**解决方案**:

Redis 是可选服务，如果不可用，服务仍可正常运行。如果需要 Redis：

```bash
# 1. 检查 Redis 是否运行
docker ps | grep redis
# 或
systemctl status redis

# 2. 测试 Redis 连接
redis-cli ping

# 3. 启动 Redis（如果未运行）
docker run -d -p 6379:6379 redis:7-alpine
```

### 问题 4: 端口冲突

**症状**: "port is already allocated"

**解决方案**:

```bash
# 1. 查看端口占用
netstat -an | grep 8001
# 或
lsof -i :8001

# 2. 停止占用端口的进程
kill -9 <PID>

# 3. 或修改 docker-compose.test.yml 使用不同端口
# 将 "8001:8000" 改为 "8002:8000"
```

### 问题 5: JWT 认证失败

**症状**: 所有请求返回 401 Unauthorized

**解决方案**:

```bash
# 1. 检查 JWT 密钥配置
cat .env.test | grep JWT_SECRET_KEY

# 2. 确保与 Node.js 后端使用相同的密钥
cat ../backend-api/.env | grep JWT_SECRET_KEY

# 3. 重启服务使配置生效
docker-compose -f docker-compose.test.yml restart
```

### 问题 6: 内存不足

**症状**: 容器频繁重启或 OOM killed

**解决方案**:

```bash
# 1. 检查内存使用
docker stats

# 2. 增加 Docker 内存限制
# 编辑 docker-compose.test.yml，添加：
services:
  fastapi-backend-test:
    mem_limit: 2g
    memswap_limit: 2g

# 3. 减少 worker 数量
# 编辑 .env.test:
WORKERS=1
```

## 维护操作

### 查看日志

```bash
# 实时查看日志
docker-compose -f docker-compose.test.yml logs -f

# 查看最近 100 行日志
docker-compose -f docker-compose.test.yml logs --tail=100

# 查看特定服务的日志
docker-compose -f docker-compose.test.yml logs fastapi-backend-test
```

### 重启服务

```bash
# 重启所有服务
docker-compose -f docker-compose.test.yml restart

# 重启特定服务
docker-compose -f docker-compose.test.yml restart fastapi-backend-test
```

### 停止服务

```bash
# 停止服务（保留容器）
docker-compose -f docker-compose.test.yml stop

# 停止并删除容器
docker-compose -f docker-compose.test.yml down

# 停止并删除容器、网络和卷
docker-compose -f docker-compose.test.yml down -v
```

### 更新服务

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建镜像
docker-compose -f docker-compose.test.yml build

# 3. 重启服务
docker-compose -f docker-compose.test.yml up -d
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
docker system prune -a
```

### 备份和恢复

#### 备份数据库

```bash
# 使用 pg_dump 备份
docker exec -t postgres pg_dump -U postgres laboratory > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用 Docker Compose
docker-compose -f docker-compose.test.yml exec postgres pg_dump -U postgres laboratory > backup.sql
```

#### 恢复数据库

```bash
# 从备份恢复
docker exec -i postgres psql -U postgres laboratory < backup.sql

# 或使用 Docker Compose
docker-compose -f docker-compose.test.yml exec -T postgres psql -U postgres laboratory < backup.sql
```

### 监控服务

#### 查看资源使用

```bash
# 查看容器资源使用
docker stats fastapi-backend-test

# 查看详细信息
docker inspect fastapi-backend-test
```

#### 查看性能指标

```bash
# 访问 Prometheus 指标端点
curl http://localhost:8001/metrics
```

#### 查看健康状态

```bash
# 基本健康检查
curl http://localhost:8001/health

# 详细健康检查
curl http://localhost:8001/health/detailed
```

## 环境切换

### 从测试环境切换到生产环境

```bash
# 1. 停止测试环境
docker-compose -f docker-compose.test.yml down

# 2. 使用生产配置
cp .env.production .env.prod

# 3. 编辑生产配置
nano .env.prod

# 4. 启动生产环境
docker-compose -f docker-compose.prod.yml up -d
```

### 同时运行多个环境

测试环境和开发环境可以同时运行，因为它们使用不同的端口：

- 开发环境: http://localhost:8000
- 测试环境: http://localhost:8001

```bash
# 启动开发环境
docker-compose up -d

# 启动测试环境
docker-compose -f docker-compose.test.yml up -d
```

## 性能调优

### 优化 Worker 数量

```bash
# 编辑 .env.test
WORKERS=4  # 推荐设置为 CPU 核心数
```

### 优化数据库连接池

```bash
# 编辑 .env.test
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=10
```

### 启用缓存

```bash
# 编辑 .env.test
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=300
```

## 安全建议

1. **使用强密码**: 确保数据库和 Redis 使用强密码
2. **限制访问**: 使用防火墙限制对数据库和 Redis 的访问
3. **定期更新**: 定期更新 Docker 镜像和依赖包
4. **监控日志**: 定期检查日志，发现异常行为
5. **备份数据**: 定期备份数据库

## 联系支持

如有问题或需要帮助，请联系：

- **技术支持**: support@example.com
- **文档**: https://docs.example.com
- **问题跟踪**: https://github.com/example/fastapi-backend/issues

## 附录

### 环境变量完整列表

参考 `.env.test` 文件获取完整的环境变量列表和说明。

### Docker Compose 配置说明

参考 `docker-compose.test.yml` 文件获取完整的 Docker Compose 配置。

### API 端点列表

访问 http://localhost:8001/docs 查看完整的 API 端点列表和文档。
