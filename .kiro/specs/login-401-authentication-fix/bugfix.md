# Bugfix Requirements Document

## Introduction

本文档描述了登录认证401错误的修复需求。当用户使用前端页面显示的默认账号密码尝试登录时，系统返回401 Unauthorized错误，提示"用户名或密码错误"，导致用户无法正常登录系统。

**根本原因**：前端连接的是 **FastAPI 后端**（端口 8000），默认管理员密码是 `admin123`。

该bug影响了系统的基本认证功能，阻止了合法用户访问系统，需要立即修复。

## 当前后端配置

### 启用的后端：FastAPI 后端

- **后端类型**：FastAPI (Python)
- **运行端口**：8000
- **API 基础路径**：`http://localhost:8000/api/v1`
- **前端配置**：`.env.development` 中配置为 `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- **数据库**：与 Node.js 后端共享同一个 PostgreSQL 数据库 `lims_dev`

### 默认账号信息

**重要发现**：FastAPI 后端与 Node.js 后端共享同一个数据库,因此使用相同的用户数据和密码。

根据实际测试验证：

1. **管理员账号**：
   - 用户名：`admin`
   - 密码：`Admin@123456` ✅ **（已验证）**
   - 角色：系统管理员

2. **测试账号**：
   - 用户名：`testuser`
   - 密码：`User@123456`
   - 角色：普通用户

## 问题详情

### 错误日志
```
POST http://localhost:8000/api/v1/auth/login 401 (Unauthorized)
错误消息: 用户名或密码错误
```

### 密码验证

前端登录页面（`vue-project/src/views/Login.vue`）显示的默认密码提示应该与实际密码一致：
- **正确密码**：`Admin@123456`

**重要说明**：FastAPI 后端与 Node.js 后端共享同一个 PostgreSQL 数据库 (`lims_dev`),因此使用相同的用户数据。数据库中的管理员密码是 `Admin@123456`,而不是 FastAPI 初始化脚本中的 `admin123`。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 用户使用正确的admin账号和密码发送POST请求到 `/api/v1/auth/login` THEN 系统返回401 Unauthorized错误，提示"用户名或密码错误"

1.2 WHEN 前端发送登录请求到 `http://localhost:8000/api/v1/auth/login` THEN 后端API无法正确验证用户凭据并拒绝访问

1.3 WHEN 用户尝试登录时 THEN 系统无法建立认证会话，用户无法访问系统功能

### Expected Behavior (Correct)

2.1 WHEN 用户使用正确的admin账号和密码发送POST请求到 `/api/v1/auth/login` THEN 系统SHALL成功验证凭据并返回200状态码和认证token

2.2 WHEN 前端发送登录请求到正确的API端点 THEN 后端API SHALL正确接收请求、验证凭据并返回认证信息（accessToken、refreshToken、用户信息）

2.3 WHEN 用户使用正确的凭据登录时 THEN 系统SHALL建立认证会话，允许用户访问系统功能

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 用户使用错误的用户名或密码尝试登录 THEN 系统SHALL CONTINUE TO返回401错误，提示"用户名或密码错误"

3.2 WHEN 用户账户状态为INACTIVE或LOCKED THEN 系统SHALL CONTINUE TO拒绝登录并返回相应的错误消息

3.3 WHEN 用户登录请求缺少必需字段（username或password） THEN 系统SHALL CONTINUE TO返回400验证错误

3.4 WHEN 用户登录成功后 THEN 系统SHALL CONTINUE TO更新用户的最后登录时间

3.5 WHEN 用户登录成功后 THEN 系统SHALL CONTINUE TO将refreshToken存储到Redis中用于令牌管理

3.6 WHEN 用户触发登录限流（429错误） THEN 系统SHALL CONTINUE TO返回限流错误和等待时间信息

## 解决方案

### 问题根本原因

FastAPI 后端与 Node.js 后端**共享同一个 PostgreSQL 数据库** (`lims_dev`),因此使用相同的用户数据。

- 数据库配置：`fastapi-backend/.env` 中 `DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/lims_dev`
- 实际密码：`Admin@123456`（来自 Node.js 后端的数据库种子数据）
- 前端提示：需要更新为 `Admin@123456`

### 实施步骤

1. **更新前端登录页面提示**
   - 文件：`vue-project/src/views/Login.vue`
   - 修改内容：将默认密码提示改为 `Admin@123456`

### 修改内容

前端登录页面（`vue-project/src/views/Login.vue`）：

```html
<!-- 修改前 -->
<p>默认账号：admin / admin123</p>

<!-- 修改后 -->
<p>默认账号：admin / Admin@123456</p>
```

## 测试验证

### 测试步骤
1. 打开前端登录页面 `http://localhost:5173/login`
2. 确认页面显示正确的默认密码提示：`admin / Admin@123456`
3. 使用默认账号密码登录：
   - 用户名：`admin`
   - 密码：`Admin@123456`
4. 验证登录成功并跳转到首页

### 预期结果
- ✅ 登录页面显示正确的默认密码
- ✅ 使用 `admin / Admin@123456` 登录成功
- ✅ 返回 200 状态码
- ✅ 收到包含 accessToken 和 user 信息的响应
- ✅ 自动跳转到系统首页
- ✅ 用户信息正确显示在界面上

### 实际测试结果

已通过 Node.js 脚本验证登录成功：

```
测试登录: admin / Admin@123456
✓ 登录成功!
状态码: 200
用户信息: {
  id: '73aaaa86-961e-4333-8edf-3dc48dfec25c',
  username: 'admin',
  email: 'admin@example.com',
  fullName: '系统管理员',
  roles: [ 'admin' ]
}
Token: 已获取
```

### 其他测试账号
根据数据库中的实际数据：
- 用户名：`testuser`
- 密码：`User@123456`
- 角色：普通用户 + 实验室技术员

## 影响范围

### 修改的文件
- `vue-project/src/views/Login.vue` - 确认默认密码提示正确

### 不受影响的功能
- 后端认证逻辑
- 密码验证机制
- Token 生成和管理
- 用户权限系统
- 其他登录相关功能（限流、记住我等）

## 备注

### 关于两个后端

项目中存在两个后端实现：

1. **backend-api** (Node.js/TypeScript + Express)
   - 端口：3000
   - 默认密码：`Admin@123456`
   - 状态：未使用

2. **fastapi-backend** (Python + FastAPI) ✅ **当前使用**
   - 端口：8000
   - 默认密码：`admin123`
   - 状态：正在运行

前端当前配置连接到 FastAPI 后端（端口 8000）。

### 密码管理建议

如果将来需要修改默认密码，请确保同时更新以下位置：
1. `fastapi-backend/scripts/create_auth_tables.py` - 数据库初始化脚本中的密码
2. `vue-project/src/views/Login.vue` - 前端登录页面的提示信息
