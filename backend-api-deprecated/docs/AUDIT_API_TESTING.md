# 审核 API 测试指南

本文档提供审核模块 API 的测试示例和使用说明。

## API 端点

### 1. 提交样品审核

**端点**: `POST /api/audits`

**权限**: `audit:create`

**请求体**:
```json
{
  "sampleId": "sample-uuid",
  "auditConfig": {
    "levels": [
      {
        "level": 1,
        "name": "初审",
        "auditorIds": ["user-uuid-1"]
      },
      {
        "level": 2,
        "name": "复审",
        "auditorIds": ["user-uuid-2"]
      },
      {
        "level": 3,
        "name": "终审",
        "auditorIds": ["user-uuid-3"]
      }
    ]
  }
}
```

**响应**:
```json
{
  "message": "提交审核成功",
  "data": [
    {
      "id": "task-uuid-1",
      "sampleId": "sample-uuid",
      "level": 1,
      "auditorId": "user-uuid-1",
      "status": "PENDING",
      "submittedAt": "2024-01-01T00:00:00.000Z",
      "sample": {
        "barcode": "SAMPLE-001",
        "sampleNumber": "2024-001",
        "sampleName": "水样",
        "clientName": "测试客户"
      }
    },
    {
      "id": "task-uuid-2",
      "sampleId": "sample-uuid",
      "level": 2,
      "auditorId": "user-uuid-2",
      "status": "PENDING",
      "submittedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. 查询审核任务列表

**端点**: `GET /api/audits`

**权限**: `audit:read`

**查询参数**:
- `sampleId`: 样品 ID（可选）
- `auditorId`: 审核人员 ID（可选）
- `status`: 审核状态（可选）：PENDING, IN_PROGRESS, APPROVED, REJECTED
- `level`: 审核级别（可选）
- `page`: 页码（可选，默认 1）
- `pageSize`: 每页数量（可选，默认 20）

**示例请求**:
```bash
GET /api/audits?auditorId=user-uuid&status=PENDING&page=1&pageSize=10
```

**响应**:
```json
{
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "task-uuid",
        "sampleId": "sample-uuid",
        "level": 1,
        "auditorId": "user-uuid",
        "status": "PENDING",
        "submittedAt": "2024-01-01T00:00:00.000Z",
        "sample": {
          "barcode": "SAMPLE-001",
          "sampleNumber": "2024-001",
          "sampleName": "水样",
          "clientName": "测试客户"
        }
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3. 获取审核任务详情

**端点**: `GET /api/audits/:id`

**权限**: `audit:read`

**响应**:
```json
{
  "message": "查询成功",
  "data": {
    "id": "task-uuid",
    "sampleId": "sample-uuid",
    "level": 1,
    "auditorId": "user-uuid",
    "status": "PENDING",
    "submittedAt": "2024-01-01T00:00:00.000Z",
    "sample": {
      "barcode": "SAMPLE-001",
      "sampleNumber": "2024-001",
      "sampleName": "水样",
      "clientName": "测试客户"
    }
  }
}
```

### 4. 执行审核

**端点**: `POST /api/audits/:id/review`

**权限**: `audit:approve`

**请求体**:
```json
{
  "decision": "APPROVE",
  "comments": "审核通过，数据准确"
}
```

**决策类型**:
- `APPROVE`: 审核通过
- `REJECT`: 审核拒绝
- `RETURN`: 审核退回

**响应**:
```json
{
  "message": "审核完成",
  "data": {
    "taskId": "task-uuid",
    "sampleId": "sample-uuid",
    "level": 1,
    "decision": "APPROVE",
    "nextLevel": 2,
    "isComplete": false,
    "message": "审核通过，已进入第 2 级审核"
  }
}
```

### 5. 审核任务转交

**端点**: `POST /api/audits/:id/reassign`

**权限**: `audit:update`

**请求体**:
```json
{
  "toAuditorId": "new-auditor-uuid",
  "reason": "工作调整，转交给其他审核员"
}
```

**响应**:
```json
{
  "message": "审核任务转交成功",
  "data": {
    "id": "task-uuid",
    "sampleId": "sample-uuid",
    "level": 1,
    "auditorId": "new-auditor-uuid",
    "status": "PENDING",
    "comments": "任务转交：工作调整，转交给其他审核员",
    "submittedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 审核流程说明

### 多级审核流程

1. **提交审核**: 样品检测完成后，提交审核并创建多级审核任务
2. **顺序审核**: 必须按级别顺序审核，前一级通过后才能进入下一级
3. **审核决策**:
   - **通过 (APPROVE)**: 进入下一级审核，如果是最后一级则完成审核
   - **拒绝 (REJECT)**: 终止整个审核流程，样品退回到检测完成状态
   - **退回 (RETURN)**: 退回到检测阶段，需要重新检测

### 审核状态流转

```
样品状态: TESTING_COMPLETE → IN_AUDIT → AUDIT_COMPLETE
                                    ↓
                              (拒绝/退回)
                                    ↓
                            TESTING_COMPLETE/IN_TESTING
```

### 审核任务状态

- `PENDING`: 待审核
- `IN_PROGRESS`: 审核中
- `APPROVED`: 已通过
- `REJECTED`: 已拒绝

## 测试场景

### 场景 1: 完整的三级审核流程

1. 创建样品并完成检测
2. 提交三级审核
3. 第一级审核员审核通过
4. 第二级审核员审核通过
5. 第三级审核员审核通过
6. 样品状态变为 AUDIT_COMPLETE

### 场景 2: 审核拒绝

1. 创建样品并完成检测
2. 提交审核
3. 第一级审核员审核拒绝
4. 所有审核任务终止
5. 样品状态退回到 TESTING_COMPLETE

### 场景 3: 审核退回

1. 创建样品并完成检测
2. 提交审核
3. 第一级审核员审核退回
4. 样品状态变为 IN_TESTING
5. 需要重新检测

### 场景 4: 审核任务转交

1. 审核员 A 收到审核任务
2. 审核员 A 因故无法审核，转交给审核员 B
3. 审核员 B 继续完成审核

## 错误处理

### 常见错误

1. **样品不存在**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "样品不存在"
  }
}
```

2. **样品状态不正确**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "样品状态不正确，只有检测完成的样品才能提交审核"
  }
}
```

3. **已有审核任务**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "该样品已有进行中的审核任务"
  }
}
```

4. **无权限审核**
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "您没有权限审核此任务"
  }
}
```

5. **跳级审核**
```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "前一级审核尚未通过，无法进行当前级别审核"
  }
}
```

## 使用 curl 测试

### 1. 提交审核

```bash
curl -X POST http://localhost:3000/api/audits \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sampleId": "sample-uuid",
    "auditConfig": {
      "levels": [
        {"level": 1, "name": "初审", "auditorIds": ["user-uuid-1"]},
        {"level": 2, "name": "复审", "auditorIds": ["user-uuid-2"]}
      ]
    }
  }'
```

### 2. 查询我的审核任务

```bash
curl -X GET "http://localhost:3000/api/audits?auditorId=user-uuid&status=PENDING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 执行审核

```bash
curl -X POST http://localhost:3000/api/audits/task-uuid/review \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "decision": "APPROVE",
    "comments": "审核通过"
  }'
```

### 4. 转交审核任务

```bash
curl -X POST http://localhost:3000/api/audits/task-uuid/reassign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "toAuditorId": "new-auditor-uuid",
    "reason": "工作调整"
  }'
```

## 注意事项

1. **审核顺序**: 必须严格按照级别顺序审核，不能跳级
2. **权限控制**: 只有被分配的审核人员才能审核对应的任务
3. **状态一致性**: 审核操作会自动更新样品状态和相关任务状态
4. **事务保证**: 所有审核操作都在数据库事务中执行，确保数据一致性
5. **审计追踪**: 所有审核操作都会记录到审计日志中

## 最佳实践

1. **配置审核级别**: 根据实验室实际情况配置合适的审核级别（通常 2-3 级）
2. **分配审核人员**: 为每个级别指定具有相应资质的审核人员
3. **及时审核**: 审核人员应及时处理待审核任务，避免积压
4. **详细备注**: 审核时应填写详细的审核意见，特别是拒绝或退回时
5. **任务转交**: 如无法及时审核，应及时转交给其他审核人员
