# 数据库设置指南

本文档提供 PostgreSQL 和 Redis 的安装和配置说明。

## 方案一：使用 Docker（推荐）

### 1. 安装 Docker Desktop

访问 [Docker 官网](https://www.docker.com/products/docker-desktop/) 下载并安装 Docker Desktop。

### 2. 启动数据库服务

在项目根目录运行：

```bash
docker-compose up -d
```

这将启动：
- PostgreSQL 数据库（端口 5432）
- Redis 缓存（端口 6379）

### 3. 验证服务状态

```bash
docker-compose ps
```

### 4. 停止服务

```bash
docker-compose down
```

## 方案二：本地安装

### PostgreSQL 安装

#### Windows

1. 下载 PostgreSQL 安装程序：https://www.postgresql.org/download/windows/
2. 运行安装程序，设置密码（默认用户名：postgres）
3. 记住端口号（默认：5432）

#### macOS

使用 Homebrew：

```bash
brew install postgresql@15
brew services start postgresql@15
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### Redis 安装

#### Windows

1. 下载 Redis for Windows：https://github.com/microsoftarchive/redis/releases
2. 解压并运行 `redis-server.exe`

或使用 WSL2：

```bash
wsl --install
# 在 WSL 中
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

#### macOS

```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
```

## 配置连接

### 1. 创建数据库

连接到 PostgreSQL：

```bash
psql -U postgres
```

创建数据库：

```sql
CREATE DATABASE lims_dev;
\q
```

### 2. 配置 .env 文件

编辑 `backend-api/.env` 文件：

```env
# PostgreSQL 连接
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/lims_dev

# Redis 连接
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 如果设置了密码则填写
```

### 3. 运行数据库迁移

```bash
npm run prisma:migrate
```

## 验证连接

### 测试 PostgreSQL

```bash
psql -U postgres -d lims_dev -c "SELECT version();"
```

### 测试 Redis

```bash
redis-cli ping
# 应该返回: PONG
```

### 运行项目测试

```bash
npm run test:run
```

## 常见问题

### PostgreSQL 连接失败

1. 检查服务是否运行：
   - Windows: 服务管理器中查看 "postgresql" 服务
   - macOS/Linux: `sudo systemctl status postgresql`

2. 检查端口是否被占用：
   ```bash
   netstat -an | grep 5432
   ```

3. 检查防火墙设置

### Redis 连接失败

1. 检查服务是否运行：
   - Windows: 任务管理器中查看 redis-server
   - macOS/Linux: `sudo systemctl status redis`

2. 检查端口是否被占用：
   ```bash
   netstat -an | grep 6379
   ```

### 权限问题

如果遇到权限错误，确保：
- PostgreSQL 用户有足够的权限
- 数据库目录有正确的访问权限

## 生产环境建议

1. **使用强密码**：更改默认密码
2. **限制访问**：配置防火墙规则
3. **定期备份**：设置自动备份计划
4. **监控性能**：使用监控工具跟踪数据库性能
5. **使用连接池**：Prisma 已内置连接池管理

## 云服务选项

如果不想本地安装，可以使用云数据库服务：

### PostgreSQL
- [Supabase](https://supabase.com/) - 免费套餐
- [Neon](https://neon.tech/) - 免费套餐
- [Railway](https://railway.app/) - 免费套餐

### Redis
- [Upstash](https://upstash.com/) - 免费套餐
- [Redis Cloud](https://redis.com/cloud/) - 免费套餐

使用云服务时，只需将连接字符串复制到 `.env` 文件即可。
