# 快速开始指南

本指南帮助您快速启动实验室管理系统后端 API。

## 前置要求

- Node.js 18 或更高版本
- PostgreSQL 数据库
- Redis 缓存服务

## 安装步骤

### 1. 安装依赖

```bash
cd backend-api
npm install
```

### 2. 配置环境变量

复制环境变量示例文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接：

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/lims_dev
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-change-in-production
```

### 3. 设置数据库

如果还没有安装 PostgreSQL 和 Redis，请参考 [数据库设置指南](./DATABASE_SETUP.md)。

生成 Prisma 客户端：

```bash
npm run prisma:generate
```

运行数据库迁移：

```bash
npm run prisma:migrate
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

### 5. 验证服务

访问健康检查端点：

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1.234,
  "environment": "development"
}
```

## 运行测试

运行所有测试：

```bash
npm test
```

运行测试（单次）：

```bash
npm run test:run
```

## 项目结构

```
backend-api/
├── src/
│   ├── config/          # 配置文件
│   │   ├── env.ts       # 环境变量
│   │   ├── logger.ts    # 日志配置
│   │   ├── database.ts  # 数据库连接
│   │   └── redis.ts     # Redis 连接
│   ├── middleware/      # 中间件
│   │   ├── errorHandler.ts    # 错误处理
│   │   └── requestLogger.ts   # 请求日志
│   ├── __tests__/       # 测试文件
│   ├── app.ts          # Express 应用
│   └── main.ts         # 入口文件
├── prisma/
│   └── schema.prisma   # 数据模型
├── logs/               # 日志文件
├── .env                # 环境变量
└── package.json
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（热重载） |
| `npm run build` | 构建生产版本 |
| `npm start` | 启动生产服务器 |
| `npm test` | 运行测试（监视模式） |
| `npm run test:run` | 运行测试（单次） |
| `npm run prisma:generate` | 生成 Prisma 客户端 |
| `npm run prisma:migrate` | 运行数据库迁移 |
| `npm run prisma:studio` | 打开 Prisma Studio |

## 开发工具

### Prisma Studio

Prisma Studio 是一个可视化数据库管理工具：

```bash
npm run prisma:studio
```

访问 `http://localhost:5555` 查看和编辑数据。

### 日志查看

日志文件位于 `logs/` 目录：

- `error.log` - 错误日志
- `combined.log` - 所有日志

实时查看日志：

```bash
# Windows PowerShell
Get-Content logs/combined.log -Wait -Tail 50

# Linux/macOS
tail -f logs/combined.log
```

## 下一步

1. 查看 [API 文档](./API_DOCUMENTATION.md)（待创建）
2. 了解 [数据库模型](../prisma/schema.prisma)
3. 阅读 [开发指南](./DEVELOPMENT_GUIDE.md)（待创建）

## 故障排除

### 端口被占用

如果 3000 端口被占用，修改 `.env` 文件中的 `PORT` 变量：

```env
PORT=3001
```

### 数据库连接失败

1. 确认 PostgreSQL 服务正在运行
2. 检查 `.env` 中的 `DATABASE_URL` 是否正确
3. 尝试手动连接数据库：
   ```bash
   psql -U postgres -d lims_dev
   ```

### Redis 连接失败

1. 确认 Redis 服务正在运行
2. 检查 `.env` 中的 Redis 配置
3. 测试 Redis 连接：
   ```bash
   redis-cli ping
   ```

### 依赖安装失败

清除缓存并重新安装：

```bash
rm -rf node_modules package-lock.json
npm install
```

## 获取帮助

如果遇到问题：

1. 查看日志文件 `logs/error.log`
2. 检查环境变量配置
3. 参考 [数据库设置指南](./DATABASE_SETUP.md)
4. 查看项目 README.md
