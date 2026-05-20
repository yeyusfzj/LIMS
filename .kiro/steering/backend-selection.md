---
inclusion: auto
---

# 后端选择规则

## 默认后端

**除非用户特别说明，所有后端相关的问题、修复、改正和开发工作统一使用 FastAPI 后端。**

## 项目后端配置

### 当前使用：FastAPI 后端 ✅

- **项目路径**：`fastapi-backend/`
- **技术栈**：Python + FastAPI + SQLAlchemy + PostgreSQL
- **运行端口**：8000
- **API 基础路径**：`http://localhost:8000/api/v1`
- **数据库**：PostgreSQL
- **ORM**：SQLAlchemy (异步)
- **认证方式**：JWT (JSON Web Token)

#### 默认账号信息

**重要说明**：FastAPI 后端与 Node.js 后端共享同一个 PostgreSQL 数据库 (`lims_dev`),因此使用相同的用户数据。

根据实际测试验证：

- **管理员账号**：
  - 用户名：`admin`
  - 密码：`Admin@123456` ✅ **（已验证可用）**
  - 角色：系统管理员

- **测试账号**：
  - 用户名：`testuser`
  - 密码：`User@123456`
  - 角色：普通用户 + 实验室技术员

#### 关键文件位置

- 主应用入口：`fastapi-backend/app/main.py`
- 数据库模型：`fastapi-backend/app/models/`
- API 路由：`fastapi-backend/app/api/v1/` 和 `fastapi-backend/app/routers/`
- 服务层：`fastapi-backend/app/services/`
- 数据库初始化：`fastapi-backend/scripts/create_auth_tables.py`
- 环境配置：`fastapi-backend/.env`
- 数据库迁移：`fastapi-backend/alembic/`

### 备用后端：Node.js 后端（不使用）

- **项目路径**：`backend-api/`
- **技术栈**：Node.js + TypeScript + Express + Prisma + PostgreSQL
- **运行端口**：3000
- **状态**：未使用，仅作为参考实现
- **默认密码**：`Admin@123456`（与 FastAPI 不同）

## 前端配置

### 开发环境

文件：`vue-project/.env.development`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

前端已配置连接到 FastAPI 后端（端口 8000）。

### 生产环境

文件：`vue-project/.env.production`

```env
VITE_API_BASE_URL=/api
```

## 工作规则

### 1. 后端问题诊断

当遇到后端相关问题时：

1. **首先检查 FastAPI 后端**（端口 8000）
2. 检查 `fastapi-backend/` 目录下的代码
3. 查看 FastAPI 后端的日志和错误信息
4. 参考 FastAPI 后端的文档和测试文件

### 2. 后端代码修改

所有后端代码修改应该在 `fastapi-backend/` 目录下进行：

- API 端点修改：`fastapi-backend/app/api/v1/` 或 `fastapi-backend/app/routers/`
- 业务逻辑修改：`fastapi-backend/app/services/`
- 数据模型修改：`fastapi-backend/app/models/`
- 数据库迁移：使用 Alembic 创建迁移文件

### 3. 数据库操作

FastAPI 后端使用 SQLAlchemy + Alembic：

```bash
# 创建迁移
cd fastapi-backend
alembic revision --autogenerate -m "描述"

# 执行迁移
alembic upgrade head

# 初始化数据
python scripts/create_auth_tables.py
```

### 4. 测试和验证

- 单元测试：`fastapi-backend/tests/unit/`
- 集成测试：`fastapi-backend/tests/integration/`
- API 测试：使用 FastAPI 的 `/docs` 端点（Swagger UI）

### 5. 启动和调试

```bash
# 启动 FastAPI 后端
cd fastapi-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 查看 API 文档
# 浏览器访问：http://localhost:8000/docs
```

## 特殊情况

### 如果用户明确指定使用 Node.js 后端

只有在用户**明确说明**要使用 Node.js 后端（backend-api）时，才切换到该后端：

- 修改前端配置：`vue-project/.env.development` 改为 `http://localhost:3000/api/v1`
- 使用 Node.js 后端的默认密码：`Admin@123456`
- 在 `backend-api/` 目录下进行修改

### 如果需要对比两个后端

在需要对比或迁移功能时，可以参考两个后端的实现：

- FastAPI 实现：`fastapi-backend/`
- Node.js 实现：`backend-api/`

## 常见问题

### Q: 登录 401 错误

**A**: 检查以下几点：

1. 确认使用正确的密码：`Admin@123456`（不是 `admin123`）
2. 确认 FastAPI 后端正在运行（端口 8000）
3. 确认数据库连接正常
4. FastAPI 后端与 Node.js 后端共享同一个数据库 `lims_dev`

### Q: 数据库连接错误

**A**: 检查 FastAPI 后端的数据库配置：

1. 查看 `fastapi-backend/.env` 文件
2. 确认 PostgreSQL 服务正在运行
3. 确认数据库连接字符串正确

### Q: API 端点 404 错误

**A**: 检查路由注册：

1. 查看 `fastapi-backend/app/main.py` 中的路由注册
2. 确认 API 路径前缀正确（`/api/v1`）
3. 使用 `/docs` 端点查看所有可用的 API

## 总结

**默认规则：除非特别说明，所有后端工作都在 FastAPI 后端（`fastapi-backend/`，端口 8000）上进行。**

这个规则适用于：
- Bug 修复
- 功能开发
- API 修改
- 数据库操作
- 性能优化
- 安全加固
- 测试编写
- 文档更新

只有在用户明确要求使用 Node.js 后端时，才切换到 `backend-api/` 目录。
