# 权限、角色和用户管理 API 示例

本文档提供了所有 RBAC API 端点的详细使用示例。

## 前置条件

1. 启动 FastAPI 服务:
```bash
cd fastapi-backend
uvicorn app.main:app --reload
```

2. 获取 JWT 令牌:
```bash
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

响应:
```json
{
  "message": "登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600
  }
}
```

3. 在后续请求中使用令牌:
```
Authorization: Bearer <accessToken>
```

## 权限管理 API

### 1. 创建权限

```bash
POST http://localhost:8000/api/permissions/
Content-Type: application/json
Authorization: Bearer <token>

{
  "resource": "sample",
  "action": "create"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "resource": "sample",
    "action": "create",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. 获取权限列表

```bash
GET http://localhost:8000/api/permissions/?page=1&pageSize=20
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "resource": "sample",
        "action": "create",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3. 按资源筛选权限

```bash
GET http://localhost:8000/api/permissions/?resource=sample
Authorization: Bearer <token>
```

### 4. 按操作筛选权限

```bash
GET http://localhost:8000/api/permissions/?action=create
Authorization: Bearer <token>
```

### 5. 删除权限

```bash
DELETE http://localhost:8000/api/permissions/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "message": "权限删除成功"
}
```

### 6. 获取当前用户权限

```bash
GET http://localhost:8000/api/permissions/me
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "resource": "sample",
      "action": "create",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 7. 获取当前用户角色

```bash
GET http://localhost:8000/api/permissions/me/roles
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "id": "role-id-1",
      "name": "管理员",
      "description": "系统管理员",
      "permissions": [...],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## 角色管理 API

### 1. 创建角色

```bash
POST http://localhost:8000/api/roles/
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "实验室技术员",
  "description": "负责样品检测和结果录入"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "role-id-1",
    "name": "实验室技术员",
    "description": "负责样品检测和结果录入",
    "permissions": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. 获取角色列表

```bash
GET http://localhost:8000/api/roles/?page=1&pageSize=20
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "role-id-1",
        "name": "实验室技术员",
        "description": "负责样品检测和结果录入",
        "permissions": [],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3. 按名称筛选角色

```bash
GET http://localhost:8000/api/roles/?name=技术员
Authorization: Bearer <token>
```

### 4. 获取角色详情

```bash
GET http://localhost:8000/api/roles/role-id-1
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "role-id-1",
    "name": "实验室技术员",
    "description": "负责样品检测和结果录入",
    "permissions": [
      {
        "id": "perm-id-1",
        "resource": "sample",
        "action": "create",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 5. 更新角色

```bash
PUT http://localhost:8000/api/roles/role-id-1
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "高级技术员",
  "description": "负责复杂样品检测和审核"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "role-id-1",
    "name": "高级技术员",
    "description": "负责复杂样品检测和审核",
    "permissions": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 6. 删除角色

```bash
DELETE http://localhost:8000/api/roles/role-id-1
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "message": "角色删除成功"
}
```

### 7. 为角色分配权限

```bash
POST http://localhost:8000/api/roles/role-id-1/permissions
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

响应:
```json
{
  "success": true,
  "data": {
    "id": "role-id-1",
    "name": "实验室技术员",
    "description": "负责样品检测和结果录入",
    "permissions": [
      {
        "id": "perm-id-1",
        "resource": "sample",
        "action": "create",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "perm-id-2",
        "resource": "sample",
        "action": "read",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "perm-id-3",
        "resource": "sample",
        "action": "update",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 8. 从角色移除权限

```bash
DELETE http://localhost:8000/api/roles/role-id-1/permissions
Content-Type: application/json
Authorization: Bearer <token>

{
  "permissionIds": [
    "perm-id-1"
  ]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "role-id-1",
    "name": "实验室技术员",
    "description": "负责样品检测和结果录入",
    "permissions": [
      {
        "id": "perm-id-2",
        "resource": "sample",
        "action": "read",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "perm-id-3",
        "resource": "sample",
        "action": "update",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

## 用户管理 API

### 1. 创建用户

```bash
POST http://localhost:8000/api/users/
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

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "fullName": "张三",
    "department": "检测部",
    "position": "技术员",
    "phone": "13800138000",
    "status": "ACTIVE",
    "roles": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 2. 获取用户列表

```bash
GET http://localhost:8000/api/users/?page=1&pageSize=20
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-id-1",
        "username": "zhangsan",
        "email": "zhangsan@example.com",
        "fullName": "张三",
        "department": "检测部",
        "position": "技术员",
        "phone": "13800138000",
        "status": "ACTIVE",
        "roles": [],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 20
  }
}
```

### 3. 多条件筛选用户

```bash
# 按用户名筛选
GET http://localhost:8000/api/users/?username=zhang
Authorization: Bearer <token>

# 按邮箱筛选
GET http://localhost:8000/api/users/?email=example.com
Authorization: Bearer <token>

# 按姓名筛选
GET http://localhost:8000/api/users/?fullName=张
Authorization: Bearer <token>

# 按部门筛选
GET http://localhost:8000/api/users/?department=检测部
Authorization: Bearer <token>

# 按状态筛选
GET http://localhost:8000/api/users/?status=ACTIVE
Authorization: Bearer <token>

# 组合筛选
GET http://localhost:8000/api/users/?department=检测部&status=ACTIVE
Authorization: Bearer <token>
```

### 4. 获取用户详情

```bash
GET http://localhost:8000/api/users/user-id-1
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "fullName": "张三",
    "department": "检测部",
    "position": "技术员",
    "phone": "13800138000",
    "status": "ACTIVE",
    "roles": [
      {
        "id": "role-id-1",
        "name": "实验室技术员",
        "description": "负责样品检测和结果录入",
        "permissions": [...],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 5. 更新用户

```bash
PUT http://localhost:8000/api/users/user-id-1
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "newemail@example.com",
  "fullName": "张三丰",
  "department": "质量部",
  "position": "高级技术员",
  "phone": "13900139000"
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "newemail@example.com",
    "fullName": "张三丰",
    "department": "质量部",
    "position": "高级技术员",
    "phone": "13900139000",
    "status": "ACTIVE",
    "roles": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 6. 更新用户状态

```bash
PATCH http://localhost:8000/api/users/user-id-1/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "INACTIVE"
}
```

可用状态:
- `ACTIVE`: 激活
- `INACTIVE`: 停用
- `SUSPENDED`: 暂停

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "fullName": "张三",
    "department": "检测部",
    "position": "技术员",
    "phone": "13800138000",
    "status": "INACTIVE",
    "roles": [],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 7. 重置用户密码

```bash
POST http://localhost:8000/api/users/user-id-1/reset-password
Content-Type: application/json
Authorization: Bearer <token>

{
  "newPassword": "newpassword123"
}
```

响应:
```json
{
  "success": true,
  "message": "密码重置成功"
}
```

### 8. 删除用户

```bash
DELETE http://localhost:8000/api/users/user-id-1
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "message": "用户删除成功"
}
```

### 9. 为用户分配角色

```bash
POST http://localhost:8000/api/users/user-id-1/roles
Content-Type: application/json
Authorization: Bearer <token>

{
  "roleIds": [
    "role-id-1",
    "role-id-2"
  ]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "fullName": "张三",
    "department": "检测部",
    "position": "技术员",
    "phone": "13800138000",
    "status": "ACTIVE",
    "roles": [
      {
        "id": "role-id-1",
        "name": "实验室技术员",
        "description": "负责样品检测和结果录入",
        "permissions": [...],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      },
      {
        "id": "role-id-2",
        "name": "质量审核员",
        "description": "负责质量审核",
        "permissions": [...],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 10. 获取用户角色

```bash
GET http://localhost:8000/api/users/user-id-1/roles
Authorization: Bearer <token>
```

响应:
```json
{
  "success": true,
  "data": [
    {
      "id": "role-id-1",
      "name": "实验室技术员",
      "description": "负责样品检测和结果录入",
      "permissions": [...],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 11. 从用户移除角色

```bash
DELETE http://localhost:8000/api/users/user-id-1/roles
Content-Type: application/json
Authorization: Bearer <token>

{
  "roleIds": [
    "role-id-1"
  ]
}
```

响应:
```json
{
  "success": true,
  "data": {
    "id": "user-id-1",
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "fullName": "张三",
    "department": "检测部",
    "position": "技术员",
    "phone": "13800138000",
    "status": "ACTIVE",
    "roles": [
      {
        "id": "role-id-2",
        "name": "质量审核员",
        "description": "负责质量审核",
        "permissions": [...],
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

## 完整工作流示例

### 场景: 创建一个新用户并分配权限

```bash
# 1. 创建权限
POST http://localhost:8000/api/permissions/
{
  "resource": "sample",
  "action": "create"
}
# 获取权限ID: perm-id-1

POST http://localhost:8000/api/permissions/
{
  "resource": "sample",
  "action": "read"
}
# 获取权限ID: perm-id-2

# 2. 创建角色
POST http://localhost:8000/api/roles/
{
  "name": "样品管理员",
  "description": "负责样品管理"
}
# 获取角色ID: role-id-1

# 3. 为角色分配权限
POST http://localhost:8000/api/roles/role-id-1/permissions
{
  "permissionIds": ["perm-id-1", "perm-id-2"]
}

# 4. 创建用户
POST http://localhost:8000/api/users/
{
  "username": "lisi",
  "password": "password123",
  "email": "lisi@example.com",
  "fullName": "李四",
  "department": "样品部",
  "position": "管理员"
}
# 获取用户ID: user-id-1

# 5. 为用户分配角色
POST http://localhost:8000/api/users/user-id-1/roles
{
  "roleIds": ["role-id-1"]
}

# 6. 验证用户权限
GET http://localhost:8000/api/users/user-id-1
# 查看用户的角色和权限

# 7. 用户登录
POST http://localhost:8000/api/v1/auth/login
{
  "username": "lisi",
  "password": "password123"
}
# 获取令牌

# 8. 使用新用户的令牌访问受保护的资源
GET http://localhost:8000/api/v1/samples/
Authorization: Bearer <lisi-token>
```

## 错误处理示例

### 1. 创建重复的权限

```bash
POST http://localhost:8000/api/permissions/
{
  "resource": "sample",
  "action": "create"
}
```

响应 (409 Conflict):
```json
{
  "code": "CONFLICT",
  "message": "权限已存在: sample:create"
}
```

### 2. 更新不存在的角色

```bash
PUT http://localhost:8000/api/roles/invalid-id
{
  "name": "新角色名"
}
```

响应 (404 Not Found):
```json
{
  "code": "ROLE_NOT_FOUND",
  "message": "角色不存在"
}
```

### 3. 创建重复的用户名

```bash
POST http://localhost:8000/api/users/
{
  "username": "admin",
  "password": "password123",
  "email": "admin@example.com",
  "fullName": "管理员"
}
```

响应 (409 Conflict):
```json
{
  "code": "CONFLICT",
  "message": "用户名已存在: admin"
}
```

### 4. 密码强度不足

```bash
POST http://localhost:8000/api/users/
{
  "username": "test",
  "password": "123",
  "email": "test@example.com",
  "fullName": "测试"
}
```

响应 (400 Bad Request):
```json
{
  "code": "VALIDATION_ERROR",
  "message": "密码长度至少为 6 个字符"
}
```

### 5. 权限不足

```bash
DELETE http://localhost:8000/api/users/user-id-1
Authorization: Bearer <non-admin-token>
```

响应 (403 Forbidden):
```json
{
  "code": "FORBIDDEN",
  "message": "您没有权限执行此操作: user:delete"
}
```

## 使用 curl 测试

```bash
# 登录获取令牌
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | jq -r '.data.accessToken')

# 创建权限
curl -X POST http://localhost:8000/api/permissions/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"resource":"sample","action":"create"}'

# 获取权限列表
curl -X GET http://localhost:8000/api/permissions/ \
  -H "Authorization: Bearer $TOKEN"

# 创建角色
curl -X POST http://localhost:8000/api/roles/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"测试角色","description":"测试用"}'

# 创建用户
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username":"testuser",
    "password":"password123",
    "email":"test@example.com",
    "fullName":"测试用户"
  }'
```

## 使用 Python requests 测试

```python
import requests

# 基础 URL
BASE_URL = "http://localhost:8000"

# 登录获取令牌
response = requests.post(
    f"{BASE_URL}/api/v1/auth/login",
    json={"username": "admin", "password": "admin123"}
)
token = response.json()["data"]["accessToken"]

# 设置请求头
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 创建权限
response = requests.post(
    f"{BASE_URL}/api/permissions/",
    json={"resource": "sample", "action": "create"},
    headers=headers
)
print(response.json())

# 获取权限列表
response = requests.get(
    f"{BASE_URL}/api/permissions/",
    headers=headers
)
print(response.json())

# 创建角色
response = requests.post(
    f"{BASE_URL}/api/roles/",
    json={"name": "测试角色", "description": "测试用"},
    headers=headers
)
print(response.json())

# 创建用户
response = requests.post(
    f"{BASE_URL}/api/users/",
    json={
        "username": "testuser",
        "password": "password123",
        "email": "test@example.com",
        "fullName": "测试用户"
    },
    headers=headers
)
print(response.json())
```

## 总结

本文档提供了所有 RBAC API 端点的详细使用示例,包括:

- ✅ 权限管理的 5 个端点
- ✅ 角色管理的 7 个端点
- ✅ 用户管理的 10 个端点
- ✅ 完整的工作流示例
- ✅ 错误处理示例
- ✅ curl 和 Python 测试示例

所有示例都可以直接使用,只需替换相应的 ID 和令牌即可。
