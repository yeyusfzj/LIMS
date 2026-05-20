# 样品放行控制功能指南

## 概述

样品放行控制功能确保只有满足所有前置条件的样品才能被放行。该功能实现了严格的验证机制、事务处理和幂等性检查。

## 功能特性

### 1. 放行前置条件验证

系统会自动验证以下条件：

- ✅ 样品状态必须为"审核完成"（AUDIT_COMPLETE）
- ✅ 所有审核任务必须通过（APPROVED）
- ✅ 必须有质量判定结果
- ✅ 质量判定结果必须为"合格"（QUALIFIED）
- ✅ 样品不能已经放行（防止重复放行）

### 2. 单个样品放行

**API 端点：** `POST /api/samples/:id/release`

**权限要求：** `sample:release`

**请求示例：**
```bash
curl -X POST http://localhost:3000/api/samples/{sampleId}/release \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json"
```

**成功响应：**
```json
{
  "message": "样品放行成功",
  "data": {
    "sampleId": "uuid",
    "barcode": "SAMPLE-001",
    "sampleNumber": "SN-001",
    "releasedAt": "2024-01-07T10:30:00.000Z",
    "releasedBy": "user-uuid",
    "message": "样品放行成功"
  }
}
```

**错误响应：**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "样品放行条件不满足：样品审核未完成；样品未进行质量判定"
  }
}
```

### 3. 批量样品放行

**API 端点：** `POST /api/samples/batch-release`

**权限要求：** `sample:release`

**请求示例：**
```bash
curl -X POST http://localhost:3000/api/samples/batch-release \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "sampleIds": ["uuid1", "uuid2", "uuid3"]
  }'
```

**成功响应：**
```json
{
  "message": "批量放行完成",
  "data": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "results": [
      {
        "sampleId": "uuid1",
        "success": true,
        "barcode": "SAMPLE-001",
        "sampleNumber": "SN-001",
        "releasedAt": "2024-01-07T10:30:00.000Z"
      },
      {
        "sampleId": "uuid2",
        "success": true,
        "barcode": "SAMPLE-002",
        "sampleNumber": "SN-002",
        "releasedAt": "2024-01-07T10:30:00.000Z"
      },
      {
        "sampleId": "uuid3",
        "success": false,
        "error": "放行条件不满足：样品审核未完成"
      }
    ]
  }
}
```

### 4. 放行幂等性检查

系统会自动检测已放行的样品，防止重复放行：

- 已放行的样品状态为 `RELEASED`
- 重复放行请求会返回错误：`样品已放行，不能重复放行`
- 确保数据一致性和审计追踪的准确性

### 5. 放行信息记录

每次成功放行都会记录：

- **放行时间**（`releasedAt`）：精确到毫秒的时间戳
- **放行人员**（`releasedBy`）：执行放行操作的用户 ID
- **样品状态**：自动更新为 `RELEASED`

## 业务流程

```
样品检测完成
    ↓
提交审核
    ↓
多级审核通过
    ↓
质量判定（合格）
    ↓
验证放行条件 ← 自动验证
    ↓
样品放行 ← 需要权限
    ↓
状态更新为已放行
```

## 事务处理

### 单个样品放行
- 验证条件和更新状态在同一事务中完成
- 确保原子性：要么全部成功，要么全部失败

### 批量样品放行
- 首先验证所有样品的放行条件
- 只放行满足条件的样品
- 使用 Prisma 事务确保批量操作的原子性
- 部分失败不影响其他样品的放行

## 错误处理

### HTTP 状态码

- **200 OK**：放行成功
- **401 Unauthorized**：未授权（未登录或令牌无效）
- **403 Forbidden**：无权限执行放行操作
- **404 Not Found**：样品不存在
- **422 Unprocessable Entity**：业务规则违反（放行条件不满足）
- **500 Internal Server Error**：服务器内部错误

### 错误码

- `UNAUTHORIZED`：未授权
- `PERMISSION_DENIED`：权限不足
- `NOT_FOUND`：资源不存在
- `BUSINESS_RULE_VIOLATION`：业务规则违反
- `VALIDATION_ERROR`：请求参数验证失败
- `INTERNAL_ERROR`：内部错误

## 测试覆盖

实现了完整的单元测试，覆盖以下场景：

1. ✅ 放行前置条件验证（5个测试）
   - 拒绝审核未完成的样品
   - 拒绝没有质量判定的样品
   - 拒绝质量判定不合格的样品
   - 拒绝存在未通过审核任务的样品
   - 通过所有条件都满足的样品

2. ✅ 单个样品放行（2个测试）
   - 成功放行满足条件的样品
   - 拒绝不满足条件的样品放行

3. ✅ 放行幂等性检查（1个测试）
   - 拒绝重复放行已放行的样品

4. ✅ 批量样品放行（3个测试）
   - 成功批量放行所有满足条件的样品
   - 部分失败不影响其他样品
   - 返回详细的批量放行结果

5. ✅ 放行信息记录（1个测试）
   - 正确记录放行时间和人员

**测试结果：** 12/12 通过 ✅

## 安全考虑

1. **权限控制**：所有放行操作都需要 `sample:release` 权限
2. **身份验证**：必须通过 JWT 令牌认证
3. **审计日志**：所有放行操作都会记录到审计日志
4. **数据完整性**：使用数据库事务确保数据一致性
5. **幂等性保护**：防止重复放行导致的数据问题

## 性能优化

1. **批量验证**：批量放行时并行验证所有样品条件
2. **事务优化**：只对满足条件的样品执行数据库更新
3. **索引支持**：样品状态字段有索引，查询性能优秀
4. **错误快速返回**：验证失败立即返回，不执行后续操作

## 使用示例

### 场景1：单个样品放行

```typescript
// 前端代码示例
async function releaseSample(sampleId: string) {
  try {
    const response = await fetch(`/api/samples/${sampleId}/release`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('放行成功:', result.data)
      // 更新UI，显示放行信息
    } else {
      console.error('放行失败:', result.error.message)
      // 显示错误信息给用户
    }
  } catch (error) {
    console.error('请求失败:', error)
  }
}
```

### 场景2：批量样品放行

```typescript
// 前端代码示例
async function batchReleaseSamples(sampleIds: string[]) {
  try {
    const response = await fetch('/api/samples/batch-release', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sampleIds })
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log(`批量放行完成: ${result.data.successful}/${result.data.total} 成功`)
      
      // 显示详细结果
      result.data.results.forEach(r => {
        if (r.success) {
          console.log(`✓ ${r.sampleNumber} 放行成功`)
        } else {
          console.log(`✗ ${r.sampleId} 放行失败: ${r.error}`)
        }
      })
    }
  } catch (error) {
    console.error('批量放行失败:', error)
  }
}
```

## 相关文档

- [审核流程指南](./AUDIT_API_TESTING.md)
- [质量判定系统](../src/services/judgmentService.ts)
- [样品管理API](../src/controllers/sampleController.ts)
- [权限系统](./PERMISSION_SYSTEM.md)

## 维护说明

### 添加新的放行条件

如果需要添加新的放行前置条件，请修改 `auditService.validateReleaseConditions` 方法：

```typescript
// 在 backend-api/src/services/auditService.ts 中
async validateReleaseConditions(sampleId: string) {
  const violations: string[] = []
  
  // ... 现有验证逻辑 ...
  
  // 添加新的验证条件
  if (/* 新条件不满足 */) {
    violations.push('新条件的错误消息')
  }
  
  return { canRelease: violations.length === 0, violations }
}
```

### 修改放行权限

如果需要修改放行操作的权限要求，请更新路由配置：

```typescript
// 在 backend-api/src/routes/sampleRoutes.ts 中
router.post(
  '/:id/release',
  requirePermission('sample', 'release'), // 修改这里的权限
  sampleController.releaseSample
)
```

## 常见问题

**Q: 为什么样品无法放行？**

A: 请检查以下条件：
1. 样品状态是否为"审核完成"
2. 所有审核任务是否都已通过
3. 是否有质量判定结果
4. 质量判定结果是否为"合格"
5. 样品是否已经放行过

**Q: 批量放行时部分样品失败怎么办？**

A: 批量放行采用部分成功策略，满足条件的样品会成功放行，不满足条件的样品会在结果中标记失败原因。您可以根据失败原因修正问题后重新放行失败的样品。

**Q: 如何撤销已放行的样品？**

A: 当前版本不支持撤销放行操作。如果需要此功能，请联系系统管理员或开发团队。

**Q: 放行操作是否可以回滚？**

A: 单个样品放行使用数据库事务，如果操作失败会自动回滚。批量放行时，每个样品的放行操作是独立的，失败的样品不会影响成功的样品。

## 更新日志

### v1.0.0 (2024-01-07)
- ✅ 实现放行前置条件验证
- ✅ 实现单个样品放行
- ✅ 实现批量放行（事务处理）
- ✅ 实现放行幂等性检查
- ✅ 完成12个单元测试
- ✅ 添加API端点和路由配置
- ✅ 实现完整的错误处理和日志记录
