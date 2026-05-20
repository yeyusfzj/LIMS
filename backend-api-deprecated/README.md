# 实验室管理系统后端 API

基于 Node.js + Express.js + TypeScript + Prisma + PostgreSQL + Redis 的实验室管理系统后端服务。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **语言**: TypeScript
- **ORM**: Prisma
- **数据库**: PostgreSQL
- **缓存**: Redis
- **日志**: Winston
- **测试**: Vitest + fast-check

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并配置相应的环境变量：

```bash
cp .env.example .env
```

### 3. 启动数据库服务

确保 PostgreSQL 和 Redis 服务已启动。

使用 Docker Compose（推荐）：

```bash
docker-compose up -d
```

### 4. 初始化数据库

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

## 可用脚本

- `npm run dev` - 启动开发服务器（热重载）
- `npm run build` - 构建生产版本
- `npm start` - 启动生产服务器
- `npm test` - 运行测试（监视模式）
- `npm run test:run` - 运行测试（单次）
- `npm run prisma:generate` - 生成 Prisma 客户端
- `npm run prisma:migrate` - 运行数据库迁移
- `npm run prisma:studio` - 打开 Prisma Studio

## 项目结构

```
backend-api/
├── src/
│   ├── config/          # 配置文件
│   │   ├── env.ts       # 环境变量配置
│   │   ├── logger.ts    # 日志配置
│   │   ├── database.ts  # 数据库配置
│   │   └── redis.ts     # Redis 配置
│   ├── middleware/      # 中间件
│   │   ├── errorHandler.ts    # 错误处理
│   │   └── requestLogger.ts   # 请求日志
│   ├── app.ts          # Express 应用配置
│   └── main.ts         # 应用入口
├── prisma/
│   └── schema.prisma   # Prisma 数据模型
├── logs/               # 日志文件
├── .env                # 环境变量
├── .env.example        # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## API 端点

### 健康检查

- `GET /health` - 服务健康检查

## 开发指南

### 日志级别

系统支持以下日志级别（通过 `LOG_LEVEL` 环境变量配置）：

- `error` - 仅错误日志
- `warn` - 警告和错误
- `info` - 信息、警告和错误（默认）
- `debug` - 所有日志（开发环境推荐）

### 错误处理

系统使用统一的错误响应格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/endpoint",
    "requestId": "uuid"
  }
}
```

### 数据库迁移

创建新的迁移：

```bash
npx prisma migrate dev --name migration_name
```

应用迁移到生产环境：

```bash
npx prisma migrate deploy
```

## 部署

### Docker 部署

构建镜像：

```bash
docker build -t laboratory-backend-api .
```

运行容器：

```bash
docker run -p 3000:3000 --env-file .env laboratory-backend-api
```

### 环境变量

生产环境必需的环境变量：

- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL 连接字符串
- `REDIS_HOST` - Redis 主机地址
- `JWT_SECRET` - JWT 密钥（必须更改）

## 许可证

MIT
