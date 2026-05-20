# 权限、角色和用户管理 API 实现文档

## 概述

本文档描述了任务 1.6 的实现:权限、角色和用户管理 API。所有端点都已实现并集成到 FastAPI 后端服务中。

## 实现的功能

### 1. 权限管理 API

**路由文件**: `app/routers/permissions.py`  
**服务文件**: `app/services/permission_service.py`  
**Schema 文件**: `app/schemas/permission.py`

#### 端点列表

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| POST | `/api/permissions/` | 创建权限 | permission:create |
| GET | `/api/permissions/` | 获取权限列表 | permission:read |
| DELETE | `/api/permissions/{permission_id}` | 删除权限 | permission:delete |
| GET | `/api/permissions/me` | 获取当前用户权限 | 已认证 |
| GET | `/api/permissions/me/roles` | 获取当前用户角色 | 已认证 |

#### 功能特性

- ✅ 权限的创建、查询、删除
- ✅ 支持按资源和操作筛选
- ✅ 分页查询支持
- ✅ 获取当前用户的权限和角色
- ✅ 防止重复权限创建
- ✅ 统一的错误处理和响应格式

#### 请求示例

**创建权限**
```bash
POST /api/permissions/
Content-Type: application/json
Authorization: Bearer <token>

{
  "resource": "sample",
  "action": "create"
}
```

**查询权限列表**
```bash
GET /api/permissions/?page=1&pageSize=20&resource=sample
Authorization: Bearer <token>
```

**删除权限**
```bash
DELETE /api/permissions/{permission_id}
Authorization: Bearer <token>
```

### 2. 角色管理 API

**路由文件**: `app/routers/roles.py`  
**服务文件**: `app/services/role_service.py`  
**Schema 文件**: `app/schemas/role.py`

#### 端点列表

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| POST | `/api/roles/` | 创建角色 | role:create |
| GET | `/api/roles/` | 获取角色列表 | role:read |
| GET | `/api/roles/{role_id}` | 获取角色详情 | role:read |
| PUT | `/api/roles/{role_id}` | 更新角色 | role:update |
| DELETE | `/api/roles/{role_id}` | 删除角色 | role:delete |
| POST | `/api/roles/{role_id}/permissions` | 为角色分配权限 | role:update |
| DELETE | `/api/roles/{role_id}/permissions` | 从角色移除权限 | role:update |

#### 功能特性

- ✅ 角色的创建、查询、更新、删除
- ✅ 支持按名称筛选
- ✅ 分页查询支持
- ✅ 角色权限分配和移除
- ✅ 获取角色的权限列表
- ✅ 防止重复角色名称
- ✅ 级联加载角色权限

#### 请求示例

**创建角色**
```bash
POST /api/roles/
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "实验室技术员",
  "description": "负责样品检测和结果录入"
}
```

**更新角色**
```bash
PUT /api/roles/{role_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "高级技术员",
  "description": "负责复杂样品检测和审核"
}
```

**为角色分配权限**
```bash
POST /api/roles/{role_id}/permissions
Content-Type: application/json
Authorization: Bearer <token>

{
  "permissionIds": [
    "perm-id-1",
    "perm-id-2",
    "perm-id-3"
  ]
}
```

**从角色移除权限**
```bash
DELETE /api/roles/{role_id}/permissions
Content-Type: application/json
Authorization: Bearer <token>

{
  "permissionIds": [
    "perm-id-1"
  ]
}
```

### 3. 用户管理 API

**路由文件**: `app/routers/users.py`  
**服务文件**: `app/services/user_service.py`  
**Schema 文件**: `app/schemas/user.py`

#### 端点列表

| 方法 | 路径 | 描述 | 权限要求 |
|------|------|------|----------|
| POST | `/api/users/` | 创建用户 | user:create |
| GET | `/api/users/` | 获取用户列表 | user:read |
| GET | `/api/users/{user_id}` | 获取用户详情 | user:read |
| PUT | `/api/users/{user_id}` | 更新用户 | user:update |
| PATCH | `/api/users/{user_id}/status` | 更新用户状态 | user:update |
| POST | `/api/users/{user_id}/reset-password` | 重置用户密码 | user:update |
| DELETE | `/api/users/{user_id}` | 删除用户 | user:delete |
| POST | `/api/users/{user_id}/roles` | 为用户分配角色 | user:update |
| GET | `/api/users/{user_id}/roles` | 获取用户角色 | user:read |
| DELETE | `/api/users/{user_id}/roles` | 从用户移除角色 | user:update |

#### 功能特性

- ✅ 用户的创建、查询、更新、删除
- ✅ 支持多条件筛选(用户名、邮箱、姓名、部门、状态)
- ✅ 分页查询支持
- ✅ 用户角色分配和移除
- ✅ 获取用户的角色列表
- ✅ 用户状态管理(激活、停用、暂停)
- ✅ 密码重置功能
- ✅ 密码强度验证
- ✅ 防止重复用户名和邮箱
- ✅ 级联加载用户角色

#### 请求示例

**创建用户**
```bash
POST /api/users/
Content-Type: application/json
Authorization: Bearer <token>

{
  "username": "zhangsan",
  "password": "password123",
  "email": "zhangsan@example.com",
  "fullName": "张三",
  "department": "检测部",
  "position": "技术员",
  "phone": "13800138000"
}
```

**更新用户**
```bash
PUT /api/users/{user_id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "newemail@example.com",
  "department": "质量部",
  "position": "高级技术员"
}
```

**更新用户状态**
```bash
PATCH /api/users/{user_id}/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "INACTIVE"
}
```

**重置用户密码**
```bash
POST /api/users/{user_id}/reset-password
Content-Type: application/json
Authorization: Bearer <token>

{
  "newPassword": "newpassword123"
}
```

**为用户分配角色**
```bash
POST /api/users/{user_id}/roles
Content-Type: application/json
Authorization: Bearer <token>

{
  "roleIds": [
    "role-id-1",
    "role-id-2"
  ]
}
```

**从用户移除角色**
```bash
DELETE /api/users/{user_id}/roles
Content-Type: application/json
Authorization: Bearer <token>

{
  "roleIds": [
    "role-id-1"
  ]
}
```

## 响应格式

所有 API 端点都遵循统一的响应格式:

### 成功响应

```json
{
  "success": true,
  "data": {
    // 响应数据
  }
}
```

### 列表响应

```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

### 错误响应

```json
{
  "code": "ERROR_CODE",
  "message": "错误消息"
}
```

## 错误代码

| 状态码 | 错误代码 | 描述 |
|--------|----------|------|
| 400 | VALIDATION_ERROR | 数据验证失败 |
| 401 | UNAUTHORIZED | 未授权(令牌无效或过期) |
| 403 | FORBIDDEN | 权限不足 |
| 404 | NOT_FOUND | 资源不存在 |
| 404 | USER_NOT_FOUND | 用户不存在 |
| 404 | ROLE_NOT_FOUND | 角色不存在 |
| 404 | PERMISSION_NOT_FOUND | 权限不存在 |
| 409 | CONFLICT | 资源冲突(重复的用户名、邮箱、角色名等) |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

## 权限控制

所有端点都使用 `PermissionChecker` 依赖进行权限检查:

```python
@router.post("/")
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("user", "create"))
):
    # 创建用户逻辑
    pass
```

权限检查流程:
1. 从 JWT 令牌中提取用户信息
2. 从数据库加载用户的角色
3. 从数据库加载角色的权限
4. 检查用户是否有指定的权限
5. 如果没有权限,抛出 403 Forbidden 异常

## 数据模型

### Permission (权限)

```python
{
  "id": "uuid",
  "resource": "sample",
  "action": "create",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Role (角色)

```python
{
  "id": "uuid",
  "name": "实验室技术员",
  "description": "负责样品检测和结果录入",
  "permissions": [...],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### User (用户)

```python
{
  "id": "uuid",
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "fullName": "张三",
  "department": "检测部",
  "position": "技术员",
  "phone": "13800138000",
  "status": "ACTIVE",
  "roles": [...],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

## 与 Node.js 后端的兼容性

所有 API 端点都与 Node.js 后端保持一致:

- ✅ 相同的 API 路径
- ✅ 相同的请求参数格式
- ✅ 相同的响应数据格式
- ✅ 相同的 HTTP 状态码
- ✅ 相同的错误响应格式
- ✅ 相同的分页参数和响应格式
- ✅ 相同的日期时间格式(ISO 8601)

## 测试

### 手动测试

可以使用 Swagger UI 进行手动测试:

1. 启动 FastAPI 服务: `uvicorn app.main:app --reload`
2. 访问 Swagger UI: `http://localhost:8000/docs`
3. 使用登录端点获取 JWT 令牌
4. 点击 "Authorize" 按钮,输入令牌
5. 测试各个端点

### 自动化测试

可以编写集成测试来验证 API 功能:

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_permission():
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/permissions/",
            json={"resource": "sample", "action": "create"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 201
        assert response.json()["success"] == True
```

## 部署

所有路由已在 `app/main.py` 中注册:

```python
app.include_router(permissions.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(users.router, prefix="/api")
```

## 总结

任务 1.6 已完成,实现了以下功能:

- ✅ 权限管理 API (5 个端点)
- ✅ 角色管理 API (7 个端点)
- ✅ 用户管理 API (10 个端点)
- ✅ 权限检查中间件
- ✅ 统一的错误处理
- ✅ 完整的 CRUD 操作
- ✅ 角色权限分配
- ✅ 用户角色分配
- ✅ 与 Node.js 后端的 API 一致性

总计实现了 **22 个 API 端点**,所有端点都已集成到 FastAPI 后端服务中,并通过 `PermissionChecker` 进行权限控制。
