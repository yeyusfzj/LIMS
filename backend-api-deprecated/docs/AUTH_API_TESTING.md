# 认证 API 测试指南

本文档提供认证 API 的测试示例和使用说明。

## 前置条件

1. 确保数据库已启动并运行迁移
2. 运行种子脚本创建测试用户：`npm run prisma:seed`
3. 启动 API 服务器：`npm run dev`

## 测试账号

- **管理员账号**: `admin` / `Admin@123456`
- **测试账号**: `testuser` / `User@123456`

## API 端点测试

### 1. 用户登录

**请求**
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin@123456"
}
```

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "系统管理员",
      "roles": ["admin"]
    }
  }
}
```

**失败响应 (401)**
```json
{
  "error": {
    "code": "AUTH_FAILED",
    "message": "用户名或密码错误"
  }
}
```

### 2. 刷新令牌

**请求**
```bash
POST http://localhost:3000/api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": "uuid",
      "username": "admin",
      "email": "admin@example.com",
      "fullName": "系统管理员",
      "roles": ["admin"]
    }
  }
}
```

### 3. 获取当前用户信息

**请求**
```bash
GET http://localhost:3000/api/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应 (200)**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@example.com",
    "fullName": "系统管理员",
    "department": "IT部门",
    "position": "系统管理员",
    "phone": null,
    "status": "ACTIVE",
    "roles": ["admin"]
  }
}
```

**未授权响应 (401)**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "缺少认证令牌"
  }
}
```

### 4. 用户登出

**请求**
```bash
POST http://localhost:3000/api/auth/logout
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**成功响应 (200)**
```json
{
  "success": true,
  "message": "登出成功"
}
```

## 使用 cURL 测试

### 登录
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123456"}'
```

### 获取用户信息
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 刷新令牌
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"YOUR_REFRESH_TOKEN"}'
```

### 登出
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 错误码说明

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| VALIDATION_ERROR | 400 | 请求参数验证失败 |
| AUTH_FAILED | 401 | 认证失败（用户名密码错误、令牌无效等） |
| UNAUTHORIZED | 401 | 未授权（缺少令牌） |
| TOKEN_REFRESH_FAILED | 401 | 令牌刷新失败 |
| USER_NOT_FOUND | 404 | 用户不存在 |
| LOGOUT_FAILED | 500 | 登出失败 |
| RATE_LIMIT_EXCEEDED | 429 | 请求频率超限 |

## 安全特性

1. **密码哈希**: 使用 bcrypt 算法，成本因子为 12
2. **JWT 令牌**: 
   - 访问令牌有效期：15分钟
   - 刷新令牌有效期：7天
3. **令牌轮换**: 刷新令牌时生成新的令牌对
4. **令牌黑名单**: 登出时将令牌加入黑名单
5. **速率限制**: 登录接口 15分钟内最多 5 次尝试
6. **用户状态检查**: 只有 ACTIVE 状态的用户可以登录

## 注意事项

1. 所有受保护的 API 端点都需要在请求头中携带 `Authorization: Bearer <token>`
2. 访问令牌过期后需要使用刷新令牌获取新的访问令牌
3. 登出后刷新令牌将被撤销，无法再次使用
4. 生产环境中请使用 HTTPS 协议保护令牌传输安全
