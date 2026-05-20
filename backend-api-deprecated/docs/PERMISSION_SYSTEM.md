# 权限控制系统使用指南

## 概述

本系统实现了基于角色的访问控制(RBAC)和数据级权限过滤,确保用户只能访问和操作其有权限的资源。

## 核心概念

### 1. 权限 (Permission)

权限由资源类型和操作类型组成:

- **资源类型 (resource)**: 如 `sample`、`workflow`、`report`、`user` 等
- **操作类型 (action)**: 如 `create`、`read`、`update`、`delete`、`approve` 等

示例:
- `sample:read` - 读取样品
- `sample:create` - 创建样品
- `workflow:update` - 更新工作流
- `*:read` - 读取所有资源(通配符)
- `sample:*` - 对样品的所有操作(通配符)

### 2. 角色 (Role)

角色是权限的集合,用户通过角色获得权限。

常见角色示例:
- **系统管理员**: 拥有所有权限 (`*:*`)
- **实验室主管**: 拥有样品、工作流、报告的完整权限
- **检测员**: 拥有样品读取、结果录入权限
- **审核员**: 拥有审核相关权限
- **报告员**: 拥有报告生成和分发权限

### 3. 数据权限范围 (Data Scope)

- **ALL**: 可以访问所有数据(管理员)
- **DEPARTMENT**: 可以访问本部门的数据(部门主管)
- **OWN**: 只能访问自己创建的数据(普通用户)

## API 使用

### 1. 获取当前用户权限

```http
GET /api/permissions/me
Authorization: Bearer <access_token>
```

响应:
```json
{
  "success": true,
  "data": [
    { "resource": "sample", "action": "read" },
    { "resource": "sample", "action": "create" },
    { "resource": "workflow", "action": "read" }
  ]
}
```

### 2. 获取当前用户角色

```http
GET /api/permissions/me/roles
Authorization: Bearer <access_token>
```

响应:
```json
{
  "success": true,
  "data": ["检测员", "质量员"]
}
```

### 3. 创建权限 (需要 permission:create 权限)

```http
POST /api/permissions
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "resource": "sample",
  "action": "delete"
}
```

### 4. 创建角色 (需要 role:create 权限)

```http
POST /api/permissions/roles
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "质量主管",
  "description": "负责质量审核和判定"
}
```

### 5. 为角色分配权限 (需要 role:update 权限)

```http
POST /api/permissions/roles/assign-permission
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "roleId": "role-uuid",
  "permissionId": "permission-uuid"
}
```

### 6. 为用户分配角色 (需要 user:update 权限)

```http
POST /api/permissions/users/assign-role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "roleId": "role-uuid"
}
```

## 代码中使用权限中间件

### 1. 基本权限检查

```typescript
import { requirePermission } from '../middleware/permissionMiddleware'

// 需要 sample:create 权限
router.post('/samples', 
  authenticate,
  requirePermission('sample', 'create'),
  sampleController.createSample
)

// 需要 sample:delete 权限
router.delete('/samples/:id',
  authenticate,
  requirePermission('sample', 'delete'),
  sampleController.deleteSample
)
```

### 2. 角色检查

```typescript
import { requireRole } from '../middleware/permissionMiddleware'

// 只允许管理员访问
router.get('/admin/settings',
  authenticate,
  requireRole('系统管理员'),
  adminController.getSettings
)

// 允许管理员或部门主管访问
router.get('/department/stats',
  authenticate,
  requireRole('系统管理员', '部门主管'),
  statsController.getDepartmentStats
)
```

### 3. 多权限检查

```typescript
import { requireAllPermissions, requireAnyPermission } from '../middleware/permissionMiddleware'

// 需要同时拥有多个权限
router.post('/samples/:id/release',
  authenticate,
  requireAllPermissions([
    { resource: 'sample', action: 'update' },
    { resource: 'sample', action: 'release' }
  ]),
  sampleController.releaseSample
)

// 拥有任一权限即可
router.get('/reports',
  authenticate,
  requireAnyPermission([
    { resource: 'report', action: 'read' },
    { resource: 'report', action: 'generate' }
  ]),
  reportController.listReports
)
```

## 数据级权限过滤

### 1. 在服务层使用数据过滤

```typescript
import { dataPermissionService } from '../services/dataPermissionService'

// 查询样品列表时应用数据权限过滤
async listSamples(userId: string, filters: any) {
  // 应用数据权限过滤
  const where = await dataPermissionService.applySampleDataFilter(
    userId,
    filters
  )
  
  // 使用过滤后的条件查询
  const samples = await prisma.sample.findMany({
    where
  })
  
  return samples
}
```

### 2. 检查单个资源访问权限

```typescript
import { dataPermissionService } from '../services/dataPermissionService'

// 在更新样品前检查访问权限
async updateSample(userId: string, sampleId: string, data: any) {
  // 检查是否有权限访问该样品
  const canAccess = await dataPermissionService.canAccessSample(
    userId,
    sampleId
  )
  
  if (!canAccess) {
    throw new Error('您没有权限访问该样品')
  }
  
  // 执行更新操作
  const sample = await prisma.sample.update({
    where: { id: sampleId },
    data
  })
  
  return sample
}
```

### 3. 获取用户数据权限范围

```typescript
import { dataPermissionService, DataScope } from '../services/dataPermissionService'

async getSampleStats(userId: string) {
  const scope = await dataPermissionService.getUserDataScope(userId, 'sample')
  
  switch (scope) {
    case DataScope.ALL:
      // 统计所有样品
      return await this.getAllSamplesStats()
    
    case DataScope.DEPARTMENT:
      // 统计部门样品
      return await this.getDepartmentSamplesStats(userId)
    
    case DataScope.OWN:
      // 统计个人样品
      return await this.getOwnSamplesStats(userId)
  }
}
```

## 权限设计最佳实践

### 1. 最小权限原则

为用户分配完成工作所需的最小权限集合,避免过度授权。

### 2. 使用角色而非直接分配权限

通过角色管理权限,便于批量管理和权限变更。

### 3. 定期审查权限

定期检查用户权限,及时回收不再需要的权限。

### 4. 记录权限变更

所有权限变更操作都会记录到审计日志中,便于追溯。

### 5. 分离职责

关键操作需要多个权限,实现职责分离:
- 样品创建和样品放行分离
- 报告生成和报告签名分离
- 用户管理和权限管理分离

## 常见权限配置示例

### 检测员角色

```typescript
const permissions = [
  { resource: 'sample', action: 'read' },
  { resource: 'sample', action: 'update' },
  { resource: 'result', action: 'create' },
  { resource: 'result', action: 'read' },
  { resource: 'task', action: 'read' },
  { resource: 'task', action: 'update' }
]
```

### 审核员角色

```typescript
const permissions = [
  { resource: 'sample', action: 'read' },
  { resource: 'result', action: 'read' },
  { resource: 'audit', action: 'create' },
  { resource: 'audit', action: 'update' },
  { resource: 'judgment', action: 'create' }
]
```

### 报告员角色

```typescript
const permissions = [
  { resource: 'sample', action: 'read' },
  { resource: 'result', action: 'read' },
  { resource: 'report', action: 'create' },
  { resource: 'report', action: 'read' },
  { resource: 'report', action: 'generate' },
  { resource: 'report', action: 'distribute' }
]
```

### 实验室主管角色

```typescript
const permissions = [
  { resource: 'sample', action: '*' },
  { resource: 'workflow', action: '*' },
  { resource: 'task', action: '*' },
  { resource: 'result', action: '*' },
  { resource: 'audit', action: '*' },
  { resource: 'report', action: '*' }
]
```

## 错误处理

### 401 未认证

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未认证,请先登录"
  }
}
```

### 403 权限不足

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "您没有权限执行此操作",
    "details": {
      "required": "sample:delete",
      "current": ["检测员"]
    }
  }
}
```

## 安全注意事项

1. **始终在服务端验证权限**: 不要依赖前端的权限检查
2. **使用中间件保护路由**: 确保所有需要权限的路由都添加了权限中间件
3. **数据级权限过滤**: 查询数据时始终应用数据权限过滤
4. **记录权限拒绝事件**: 所有权限拒绝都会记录到日志中
5. **定期审计**: 定期检查审计日志,发现异常访问模式

## 测试

运行权限系统测试:

```bash
npm test -- permissionService.test.ts
npm test -- dataPermissionService.test.ts
```

## 相关文档

- [认证系统文档](./AUTH_API_TESTING.md)
- [审计日志文档](./AUDIT_LOG.md)
- [API 文档](./API_DOCUMENTATION.md)
