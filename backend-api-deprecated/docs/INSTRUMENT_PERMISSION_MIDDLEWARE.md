# 仪器管理权限中间件使用指南

## 概述

仪器管理权限中间件 (`instrumentPermissionMiddleware.ts`) 为仪器管理模块提供了基于角色的访问控制(RBAC)功能。该中间件与现有的权限系统集成，确保只有具有适当权限的用户才能访问仪器管理相关的API端点。

## 权限定义

### 仪器管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| instrument:create | instrument | create | 创建新仪器 |
| instrument:read | instrument | read | 查看仪器信息 |
| instrument:update | instrument | update | 更新仪器信息 |
| instrument:delete | instrument | delete | 删除仪器 |

### 流转管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| transfer:create | transfer | create | 创建流转申请 |
| transfer:read | transfer | read | 查看流转记录 |
| transfer:confirm | transfer | confirm | 确认流转 |
| transfer:reject | transfer | reject | 拒绝流转 |

### 维护管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| maintenance:create | maintenance | create | 添加维护记录 |
| maintenance:read | maintenance | read | 查看维护记录 |
| maintenance:update | maintenance | update | 更新维护记录 |
| maintenance:delete | maintenance | delete | 删除维护记录 |

### 校准管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| calibration:create | calibration | create | 添加校准记录 |
| calibration:read | calibration | read | 查看校准记录 |
| calibration:update | calibration | update | 更新校准记录 |
| calibration:delete | calibration | delete | 删除校准记录 |

### 报废管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| disposal:create | disposal | create | 创建报废申请 |
| disposal:read | disposal | read | 查看报废申请 |
| disposal:approve | disposal | approve | 审批报废申请 |

### 文档管理权限

| 权限代码 | 资源 | 操作 | 描述 |
|---------|------|------|------|
| document:create | document | create | 上传文档 |
| document:read | document | read | 查看和下载文档 |
| document:delete | document | delete | 删除文档 |

## 使用方法

### 1. 基本权限检查

使用 `checkInstrumentPermission` 函数创建权限检查中间件：

```typescript
import { checkInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'
import { authMiddleware } from '../middleware/authMiddleware'

// 在路由中使用
router.post(
  '/instruments',
  authMiddleware,  // 先进行身份认证
  checkInstrumentPermission('instrument', 'create'),  // 再检查权限
  instrumentController.createInstrument
)
```

### 2. 使用便捷函数

为了提高代码可读性，可以使用预定义的便捷函数：

```typescript
import { requireInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'
import { authMiddleware } from '../middleware/authMiddleware'

// 仪器管理路由
router.post(
  '/instruments',
  authMiddleware,
  requireInstrumentPermission.createInstrument(),
  instrumentController.createInstrument
)

router.get(
  '/instruments',
  authMiddleware,
  requireInstrumentPermission.readInstrument(),
  instrumentController.getInstruments
)

router.put(
  '/instruments/:id',
  authMiddleware,
  requireInstrumentPermission.updateInstrument(),
  instrumentController.updateInstrument
)

router.delete(
  '/instruments/:id',
  authMiddleware,
  requireInstrumentPermission.deleteInstrument(),
  instrumentController.deleteInstrument
)

// 流转管理路由
router.post(
  '/instruments/:id/transfers',
  authMiddleware,
  requireInstrumentPermission.createTransfer(),
  instrumentController.createTransfer
)

router.put(
  '/transfers/:id/confirm',
  authMiddleware,
  requireInstrumentPermission.confirmTransfer(),
  instrumentController.confirmTransfer
)

// 维护管理路由
router.post(
  '/instruments/:id/maintenance',
  authMiddleware,
  requireInstrumentPermission.createMaintenance(),
  instrumentController.createMaintenance
)

// 校准管理路由
router.post(
  '/instruments/:id/calibration',
  authMiddleware,
  requireInstrumentPermission.createCalibration(),
  instrumentController.createCalibration
)

// 报废管理路由
router.post(
  '/instruments/:id/disposal',
  authMiddleware,
  requireInstrumentPermission.createDisposal(),
  instrumentController.createDisposal
)

router.put(
  '/disposals/:id/approve',
  authMiddleware,
  requireInstrumentPermission.approveDisposal(),
  instrumentController.approveDisposal
)

// 文档管理路由
router.post(
  '/instruments/:id/documents',
  authMiddleware,
  requireInstrumentPermission.createDocument(),
  instrumentController.uploadDocument
)

router.delete(
  '/documents/:id',
  authMiddleware,
  requireInstrumentPermission.deleteDocument(),
  instrumentController.deleteDocument
)
```

### 3. 多权限检查（需要满足所有权限）

使用 `requireAllInstrumentPermissions` 函数要求用户同时具有多个权限：

```typescript
import { requireAllInstrumentPermissions } from '../middleware/instrumentPermissionMiddleware'

// 需要同时具有读取和更新权限
router.put(
  '/instruments/:id/advanced-update',
  authMiddleware,
  requireAllInstrumentPermissions([
    { resource: 'instrument', action: 'read' },
    { resource: 'instrument', action: 'update' }
  ]),
  instrumentController.advancedUpdate
)
```

### 4. 多权限检查（满足任一权限即可）

使用 `requireAnyInstrumentPermission` 函数允许用户具有任一权限即可访问：

```typescript
import { requireAnyInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

// 具有创建或更新权限的用户都可以访问
router.post(
  '/instruments/batch-operation',
  authMiddleware,
  requireAnyInstrumentPermission([
    { resource: 'instrument', action: 'create' },
    { resource: 'instrument', action: 'update' }
  ]),
  instrumentController.batchOperation
)
```

### 5. 使用权限常量

为了避免硬编码字符串，可以使用预定义的权限常量：

```typescript
import { InstrumentPermissions, checkInstrumentPermission } from '../middleware/instrumentPermissionMiddleware'

router.post(
  '/instruments',
  authMiddleware,
  checkInstrumentPermission(
    InstrumentPermissions.INSTRUMENT_CREATE.resource,
    InstrumentPermissions.INSTRUMENT_CREATE.action
  ),
  instrumentController.createInstrument
)
```

## 错误响应

### 401 未认证

当用户未登录或token无效时：

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "未认证,请先登录"
  }
}
```

### 403 权限不足

当用户没有所需权限时：

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "您没有权限执行此操作",
    "details": {
      "required": "instrument:create",
      "current": ["普通用户"]
    }
  }
}
```

### 500 服务器错误

当权限检查过程中发生错误时：

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "权限验证失败"
  }
}
```

## 角色权限配置建议

### 设备管理员

拥有所有仪器管理权限：

- instrument:create, instrument:read, instrument:update, instrument:delete
- transfer:create, transfer:read, transfer:confirm, transfer:reject
- maintenance:create, maintenance:read, maintenance:update, maintenance:delete
- calibration:create, calibration:read, calibration:update, calibration:delete
- disposal:create, disposal:read, disposal:approve
- document:create, document:read, document:delete

### 质量管理员

主要负责校准和维护记录的查看：

- instrument:read
- calibration:create, calibration:read, calibration:update, calibration:delete
- maintenance:read

### 部门负责人

可以管理本部门的仪器流转：

- instrument:read
- transfer:create, transfer:read, transfer:confirm, transfer:reject
- maintenance:read
- calibration:read

### 普通用户

只能查看仪器信息和发起流转申请：

- instrument:read
- transfer:create, transfer:read

## 权限配置示例

### 在数据库中创建权限

```typescript
import { permissionService } from '../services/permissionService'

// 创建仪器管理权限
await permissionService.createPermission('instrument', 'create')
await permissionService.createPermission('instrument', 'read')
await permissionService.createPermission('instrument', 'update')
await permissionService.createPermission('instrument', 'delete')

// 创建流转管理权限
await permissionService.createPermission('transfer', 'create')
await permissionService.createPermission('transfer', 'read')
await permissionService.createPermission('transfer', 'confirm')
await permissionService.createPermission('transfer', 'reject')

// 创建维护管理权限
await permissionService.createPermission('maintenance', 'create')
await permissionService.createPermission('maintenance', 'read')
await permissionService.createPermission('maintenance', 'update')
await permissionService.createPermission('maintenance', 'delete')

// 创建校准管理权限
await permissionService.createPermission('calibration', 'create')
await permissionService.createPermission('calibration', 'read')
await permissionService.createPermission('calibration', 'update')
await permissionService.createPermission('calibration', 'delete')

// 创建报废管理权限
await permissionService.createPermission('disposal', 'create')
await permissionService.createPermission('disposal', 'read')
await permissionService.createPermission('disposal', 'approve')

// 创建文档管理权限
await permissionService.createPermission('document', 'create')
await permissionService.createPermission('document', 'read')
await permissionService.createPermission('document', 'delete')
```

### 为角色分配权限

```typescript
// 获取角色和权限ID
const deviceManagerRole = await prisma.role.findUnique({
  where: { name: '设备管理员' }
})

const instrumentCreatePermission = await prisma.permission.findFirst({
  where: { resource: 'instrument', action: 'create' }
})

// 分配权限给角色
await permissionService.assignPermissionToRole(
  deviceManagerRole.id,
  instrumentCreatePermission.id
)
```

## 测试

权限中间件包含完整的单元测试，覆盖以下场景：

1. 未认证用户访问（返回401）
2. 用户没有所需权限（返回403）
3. 用户具有所需权限（允许访问）
4. 权限检查过程中发生错误（返回500）
5. 多权限检查（所有权限）
6. 多权限检查（任一权限）
7. 便捷函数的正确性
8. 权限常量的正确性

运行测试：

```bash
npm test -- instrumentPermissionMiddleware.test.ts
```

## 日志记录

权限中间件会记录以下事件：

### 权限拒绝事件（警告级别）

```typescript
logger.warn('Instrument permission denied', {
  userId: 'user-123',
  username: 'testuser',
  resource: 'instrument',
  action: 'create',
  path: '/api/instruments',
  method: 'POST'
})
```

### 权限检查错误（错误级别）

```typescript
logger.error('Instrument permission check middleware error:', error)
```

## 最佳实践

1. **始终在权限检查前进行身份认证**
   ```typescript
   router.post('/instruments',
     authMiddleware,  // 先认证
     requireInstrumentPermission.createInstrument(),  // 再授权
     controller.create
   )
   ```

2. **使用便捷函数提高代码可读性**
   ```typescript
   // 推荐
   requireInstrumentPermission.createInstrument()
   
   // 不推荐
   checkInstrumentPermission('instrument', 'create')
   ```

3. **合理设计角色权限**
   - 遵循最小权限原则
   - 根据实际业务需求分配权限
   - 定期审查和更新权限配置

4. **记录权限变更**
   - 在审计日志中记录权限的分配和撤销
   - 追踪权限相关的操作

5. **测试权限控制**
   - 为每个受保护的端点编写权限测试
   - 测试不同角色的访问权限
   - 测试边界情况和错误处理

## 与现有系统集成

仪器管理权限中间件完全兼容现有的权限系统：

- 使用相同的 `permissionService` 进行权限检查
- 遵循相同的错误响应格式
- 使用相同的日志记录机制
- 支持相同的RBAC模型

## 相关文档

- [权限系统文档](./PERMISSION_SYSTEM.md)
- [仪器管理API文档](./INSTRUMENT_API.md)
- [认证中间件文档](./AUTH_MIDDLEWARE.md)

## 总结

仪器管理权限中间件提供了完整的权限控制功能，确保仪器管理模块的安全性。通过合理配置角色和权限，可以实现细粒度的访问控制，满足不同用户的需求。
