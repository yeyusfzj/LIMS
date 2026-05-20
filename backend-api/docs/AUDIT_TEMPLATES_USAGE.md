# 审核模板和工作流配置使用指南

## 概述

审核模板和工作流配置功能允许您管理审核意见模板和审核流程配置，以标准化审核流程并提高审核效率。

## 功能特性

### 审核意见模板

- **快速填写审核意见**: 使用预定义的模板快速填写审核意见
- **模板分类**: 支持多种模板类型（通过、需修改、拒绝、其他）
- **默认模板**: 可设置默认模板，提高使用效率
- **使用统计**: 自动统计模板使用次数

### 审核流程配置

- **多级审核**: 支持配置多级审核流程（初审、复审、终审等）
- **样品类型适配**: 为不同样品类型配置不同的审核流程
- **自动分配**: 支持自动分配审核任务给审核人员
- **并行审核**: 支持同一级别的并行审核

## API 端点

### 审核意见模板

#### 1. 获取模板列表

```http
GET /api/v1/audits/templates
```

**查询参数**:
- `type` (可选): 模板类型筛选 (APPROVED, NEED_REVISION, REJECTED, OTHER)
- `isDefault` (可选): 是否为默认模板 (true, false)

**响应示例**:
```json
{
  "message": "获取审核意见模板列表成功",
  "data": [
    {
      "id": "uuid",
      "name": "标准通过模板",
      "type": "APPROVED",
      "content": "经审核，该样品检测结果符合标准要求，审核通过。",
      "usageCount": 10,
      "isDefault": true,
      "createdBy": "admin",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. 获取单个模板

```http
GET /api/v1/audits/templates/{template_id}
```

#### 3. 创建模板

```http
POST /api/v1/audits/templates
```

**请求体**:
```json
{
  "name": "标准通过模板",
  "type": "APPROVED",
  "content": "经审核，该样品检测结果符合标准要求，审核通过。",
  "isDefault": true
}
```

**字段说明**:
- `name` (必需): 模板名称，必须唯一
- `type` (必需): 模板类型
  - `APPROVED`: 审核通过
  - `NEED_REVISION`: 需要修改
  - `REJECTED`: 审核拒绝
  - `OTHER`: 其他
- `content` (必需): 模板内容
- `isDefault` (可选): 是否为默认模板，默认为 false

#### 4. 更新模板

```http
PUT /api/v1/audits/templates/{template_id}
```

**请求体**:
```json
{
  "name": "更新后的模板名称",
  "content": "更新后的模板内容",
  "isDefault": false
}
```

**注意**: 所有字段都是可选的，只需提供要更新的字段。

#### 5. 删除模板

```http
DELETE /api/v1/audits/templates/{template_id}
```

**注意**: 只能删除未被使用的模板（usageCount = 0）。

### 审核流程配置

#### 1. 获取配置列表

```http
GET /api/v1/audits/workflow-configs
```

**查询参数**:
- `status` (可选): 配置状态筛选 (ACTIVE, INACTIVE)
- `sampleType` (可选): 样品类型筛选

**响应示例**:
```json
{
  "message": "获取审核流程配置列表成功",
  "data": [
    {
      "id": "uuid",
      "name": "标准三级审核流程",
      "sampleTypes": ["食品", "药品", "化妆品"],
      "levels": [
        {
          "order": 1,
          "name": "初审",
          "role": "初审员",
          "required": true,
          "autoAssign": true
        },
        {
          "order": 2,
          "name": "复审",
          "role": "复审员",
          "required": true,
          "autoAssign": true
        },
        {
          "order": 3,
          "name": "终审",
          "role": "终审员",
          "required": true,
          "autoAssign": false
        }
      ],
      "parallelAudit": false,
      "status": "ACTIVE",
      "createdBy": "admin",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 2. 获取单个配置

```http
GET /api/v1/audits/workflow-configs/{config_id}
```

#### 3. 创建配置

```http
POST /api/v1/audits/workflow-configs
```

**请求体**:
```json
{
  "name": "标准三级审核流程",
  "sampleTypes": ["食品", "药品", "化妆品"],
  "levels": [
    {
      "order": 1,
      "name": "初审",
      "role": "初审员",
      "required": true,
      "autoAssign": true
    },
    {
      "order": 2,
      "name": "复审",
      "role": "复审员",
      "required": true,
      "autoAssign": true
    },
    {
      "order": 3,
      "name": "终审",
      "role": "终审员",
      "required": true,
      "autoAssign": false
    }
  ],
  "parallelAudit": false
}
```

**字段说明**:
- `name` (必需): 配置名称，必须唯一
- `sampleTypes` (必需): 适用的样品类型数组
- `levels` (必需): 审核级别配置数组
  - `order` (必需): 级别顺序，从 1 开始，必须连续
  - `name` (必需): 级别名称
  - `role` (必需): 审核角色
  - `required` (必需): 是否必需
  - `autoAssign` (必需): 是否自动分配
- `parallelAudit` (可选): 是否支持并行审核，默认为 false

**验证规则**:
- 配置名称必须唯一
- 审核级别不能为空
- order 字段必须从 1 开始且连续
- order 字段必须唯一
- 每个级别必须包含所有必需字段

#### 4. 更新配置

```http
PUT /api/v1/audits/workflow-configs/{config_id}
```

**请求体**:
```json
{
  "parallelAudit": true,
  "status": "ACTIVE"
}
```

**注意**: 所有字段都是可选的，只需提供要更新的字段。

#### 5. 删除配置

```http
DELETE /api/v1/audits/workflow-configs/{config_id}
```

**注意**: 只能删除状态为 INACTIVE 的配置。

## 使用场景

### 场景 1: 创建标准审核意见模板

```bash
# 创建审核通过模板
curl -X POST http://localhost:8000/api/v1/audits/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "标准通过模板",
    "type": "APPROVED",
    "content": "经审核，该样品检测结果符合标准要求，审核通过。",
    "isDefault": true
  }'

# 创建需要修改模板
curl -X POST http://localhost:8000/api/v1/audits/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "需要修改模板",
    "type": "NEED_REVISION",
    "content": "经审核，该样品检测结果存在以下问题，需要修改后重新提交：\n1. \n2. ",
    "isDefault": false
  }'

# 创建审核拒绝模板
curl -X POST http://localhost:8000/api/v1/audits/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "标准拒绝模板",
    "type": "REJECTED",
    "content": "经审核，该样品检测结果不符合标准要求，审核拒绝。",
    "isDefault": false
  }'
```

### 场景 2: 配置不同样品类型的审核流程

```bash
# 食品类样品 - 三级审核
curl -X POST http://localhost:8000/api/v1/audits/workflow-configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "食品三级审核流程",
    "sampleTypes": ["食品"],
    "levels": [
      {
        "order": 1,
        "name": "初审",
        "role": "初审员",
        "required": true,
        "autoAssign": true
      },
      {
        "order": 2,
        "name": "复审",
        "role": "复审员",
        "required": true,
        "autoAssign": true
      },
      {
        "order": 3,
        "name": "终审",
        "role": "终审员",
        "required": true,
        "autoAssign": false
      }
    ],
    "parallelAudit": false
  }'

# 药品类样品 - 四级审核
curl -X POST http://localhost:8000/api/v1/audits/workflow-configs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "药品四级审核流程",
    "sampleTypes": ["药品"],
    "levels": [
      {
        "order": 1,
        "name": "初审",
        "role": "初审员",
        "required": true,
        "autoAssign": true
      },
      {
        "order": 2,
        "name": "复审",
        "role": "复审员",
        "required": true,
        "autoAssign": true
      },
      {
        "order": 3,
        "name": "三审",
        "role": "三审员",
        "required": true,
        "autoAssign": true
      },
      {
        "order": 4,
        "name": "终审",
        "role": "终审员",
        "required": true,
        "autoAssign": false
      }
    ],
    "parallelAudit": false
  }'
```

### 场景 3: 查询和筛选

```bash
# 获取所有审核通过类型的模板
curl -X GET "http://localhost:8000/api/v1/audits/templates?type=APPROVED" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取所有默认模板
curl -X GET "http://localhost:8000/api/v1/audits/templates?isDefault=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取食品类样品的审核流程配置
curl -X GET "http://localhost:8000/api/v1/audits/workflow-configs?sampleType=食品" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取所有激活状态的审核流程配置
curl -X GET "http://localhost:8000/api/v1/audits/workflow-configs?status=ACTIVE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 最佳实践

### 审核意见模板

1. **创建常用模板**: 为常见的审核场景创建模板，提高审核效率
2. **设置默认模板**: 为每种类型设置一个默认模板
3. **定期更新**: 根据实际使用情况定期更新模板内容
4. **清理无用模板**: 定期清理未使用的模板

### 审核流程配置

1. **按样品类型配置**: 为不同样品类型配置适合的审核流程
2. **合理设置级别**: 根据样品重要性和风险等级设置审核级别
3. **启用自动分配**: 对于常规审核任务，启用自动分配提高效率
4. **测试后激活**: 创建新配置后，先测试再激活

## 错误处理

### 常见错误

1. **模板名称重复**
   - 错误码: `CONFLICT`
   - 解决方法: 使用唯一的模板名称

2. **删除已使用的模板**
   - 错误码: `VALIDATION_ERROR`
   - 解决方法: 只能删除未使用的模板

3. **审核级别配置错误**
   - 错误码: `VALIDATION_ERROR`
   - 解决方法: 确保 order 字段从 1 开始且连续

4. **删除激活状态的配置**
   - 错误码: `VALIDATION_ERROR`
   - 解决方法: 先将配置状态改为 INACTIVE，再删除

## 权限要求

- **查看**: 需要 `audit:read` 权限
- **创建**: 需要 `audit:create` 权限
- **更新**: 需要 `audit:update` 权限
- **删除**: 需要 `audit:delete` 权限

## 相关文档

- [审核管理 API 文档](./AUDIT_API.md)
- [审核流程指南](./AUDIT_WORKFLOW_GUIDE.md)
- [任务 5.11 实现总结](./TASK_5.11_AUDIT_TEMPLATES_SUMMARY.md)
