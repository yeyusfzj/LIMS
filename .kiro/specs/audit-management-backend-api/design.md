# 审核管理后端 API Bugfix 设计文档

## Overview

本 bugfix 旨在实现审核管理架构重构后缺失的后端 API 端点，包括审核意见模板管理、审核流程配置管理和审核历史记录查询功能。通过扩展现有的数据模型、服务层和控制器层，确保前端能够正常调用这些接口，完成审核管理的完整功能闭环。

修复策略采用最小化侵入原则，在现有 AuditService 和 AuditController 基础上扩展新功能，避免影响现有审核核心业务逻辑。

## Glossary

- **Bug_Condition (C)**: 前端调用审核模板、流程配置或历史记录相关 API 时返回 404 错误的条件
- **Property (P)**: API 端点应正确响应并返回相应的数据或状态码
- **Preservation**: 现有审核任务提交、执行、转交、放行等核心功能必须保持不变
- **AuditCommentTemplate**: 审核意见模板，用于快速填充常用审核意见
- **AuditWorkflowConfig**: 审核流程配置，定义多级审核的级别、角色和规则
- **AuditHistory**: 审核历史记录，记录审核任务的所有变更和操作
- **AuditService**: 位于 `backend-api/src/services/auditService.ts` 的审核服务类
- **AuditController**: 位于 `backend-api/src/controllers/auditController.ts` 的审核控制器类

## Bug Details

### Bug Condition

该 bug 在前端调用审核管理重构后新增的 API 端点时触发。后端尚未实现这些端点的路由、控制器方法和服务层逻辑，导致所有相关请求返回 404 错误。

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type HttpRequest
  OUTPUT: boolean
  
  RETURN request.path IN [
    '/api/audit/templates',
    '/api/audit/templates/:id',
    '/api/audit/workflow-configs',
    '/api/audit/workflow-configs/:id',
    '/api/audit/tasks/:id/history'
  ]
  AND request.method IN ['GET', 'POST', 'PUT', 'DELETE']
  AND response.statusCode == 404
END FUNCTION
```

### Examples


- **示例 1**: 前端调用 `GET /api/audit/templates` 获取模板列表，期望返回 200 和模板数组，实际返回 404
- **示例 2**: 前端调用 `POST /api/audit/templates` 创建新模板，期望返回 201 和创建的模板对象，实际返回 404
- **示例 3**: 前端调用 `GET /api/audit/workflow-configs` 获取流程配置，期望返回 200 和配置数组，实际返回 404
- **示例 4**: 前端调用 `GET /api/audit/tasks/abc123/history` 获取历史记录，期望返回 200 和历史记录数组，实际返回 404
- **边界情况**: 前端调用现有的 `GET /api/audits` 端点，应继续正常返回 200 和审核任务列表

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- 现有审核任务的提交、执行、转交功能必须继续正常工作
- 样品放行的前置条件验证和业务逻辑必须保持不变
- 审核统计信息的计算和返回必须保持准确
- 数据库中已存在的审核任务、样品和审核记录的完整性必须保持

**Scope:**
所有不涉及新增 API 端点（模板、流程配置、历史记录）的请求应完全不受此修复影响。这包括：
- 现有审核任务 CRUD 操作（GET /api/audits, POST /api/audits, etc.）
- 审核决策执行（POST /api/audits/:id/review）
- 审核任务转交（POST /api/audits/:id/reassign）
- 样品放行（POST /api/samples/:id/release, POST /api/samples/batch-release）
- 审核统计（GET /api/audits/statistics）

## Hypothesized Root Cause

基于 bug 描述和代码分析，最可能的原因是：

1. **缺失数据模型**: Prisma schema 中未定义 AuditCommentTemplate、AuditWorkflowConfig 和 AuditHistory 模型
   - 需要在 `backend-api/prisma/schema.prisma` 中添加这些模型定义
   - 需要创建数据库迁移脚本

2. **缺失服务层方法**: AuditService 类中未实现模板、流程配置和历史记录的 CRUD 方法
   - 需要在 `backend-api/src/services/auditService.ts` 中添加相应方法

3. **缺失控制器方法**: AuditController 类中未实现对应的 HTTP 请求处理方法
   - 需要在 `backend-api/src/controllers/auditController.ts` 中添加路由处理方法

4. **缺失路由注册**: 路由配置中未注册新的 API 端点
   - 需要在路由文件中添加新端点的路由映射

## Correctness Properties

Property 1: Bug Condition - API 端点正确响应

_For any_ HTTP 请求，当请求路径为审核模板、流程配置或历史记录相关端点时，后端 SHALL 返回正确的 HTTP 状态码（200/201）和相应的 JSON 数据，而不是 404 错误。

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - 现有审核功能不受影响

_For any_ HTTP 请求，当请求路径为现有审核任务相关端点（非新增的模板、流程配置、历史记录端点）时，后端 SHALL 产生与修复前完全相同的响应，保持现有审核任务提交、执行、转交、放行等核心功能的正确性。

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

假设我们的根因分析正确，需要进行以下修改：


#### 1. 数据模型设计

**File**: `backend-api/prisma/schema.prisma`

**Specific Changes**:

1.1 **添加 AuditCommentTemplate 模型**:
   - 字段：id (String, UUID), name (String), type (Enum), content (String), usageCount (Int), isDefault (Boolean), createdBy (String), createdAt (DateTime), updatedAt (DateTime)
   - 索引：type, isDefault, createdBy
   - 用于存储审核意见模板，支持按类型分类和默认模板标记

1.2 **添加 AuditWorkflowConfig 模型**:
   - 字段：id (String, UUID), name (String), sampleTypes (String[]), levels (Json), parallelAudit (Boolean), status (Enum), createdBy (String), createdAt (DateTime), updatedAt (DateTime)
   - 索引：status, createdBy
   - levels 字段存储 JSON 格式的审核级别配置数组
   - 用于定义不同样品类型的审核流程配置

1.3 **添加 AuditHistory 模型**:
   - 字段：id (String, UUID), taskId (String), action (String), changes (Json), performedBy (String), performedAt (DateTime)
   - 关系：taskId 关联到 AuditTask 模型
   - 索引：taskId, performedAt, performedBy
   - 用于记录审核任务的所有变更历史

1.4 **添加枚举类型**:
   - CommentTemplateType: APPROVED, NEED_REVISION, REJECTED, OTHER
   - WorkflowConfigStatus: ACTIVE, INACTIVE

1.5 **创建数据库迁移**:
   - 运行 `npx prisma migrate dev --name add_audit_management_models` 创建迁移脚本

#### 2. 服务层设计

**File**: `backend-api/src/services/auditService.ts`

**Specific Changes**:

2.1 **审核意见模板管理方法**:
   - `async listTemplates(query?: { type?: string, isDefault?: boolean }): Promise<AuditCommentTemplate[]>` - 获取模板列表，支持按类型和默认状态筛选
   - `async getTemplateById(id: string): Promise<AuditCommentTemplate>` - 获取单个模板详情
   - `async createTemplate(dto: CreateTemplateDto): Promise<AuditCommentTemplate>` - 创建新模板
   - `async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<AuditCommentTemplate>` - 更新模板
   - `async deleteTemplate(id: string): Promise<void>` - 删除模板（检查是否被使用）
   - `async incrementTemplateUsage(id: string): Promise<void>` - 增加模板使用次数

2.2 **审核流程配置管理方法**:
   - `async listWorkflowConfigs(query?: { status?: string, sampleType?: string }): Promise<AuditWorkflowConfig[]>` - 获取流程配置列表
   - `async getWorkflowConfigById(id: string): Promise<AuditWorkflowConfig>` - 获取单个配置详情
   - `async createWorkflowConfig(dto: CreateWorkflowConfigDto): Promise<AuditWorkflowConfig>` - 创建新配置
   - `async updateWorkflowConfig(id: string, dto: UpdateWorkflowConfigDto): Promise<AuditWorkflowConfig>` - 更新配置
   - `async deleteWorkflowConfig(id: string): Promise<void>` - 删除配置（检查是否被使用）
   - `async activateWorkflowConfig(id: string): Promise<AuditWorkflowConfig>` - 激活配置
   - `async deactivateWorkflowConfig(id: string): Promise<AuditWorkflowConfig>` - 停用配置

2.3 **审核历史记录方法**:
   - `async getAuditHistory(taskId: string): Promise<AuditHistory[]>` - 获取指定任务的历史记录
   - `async recordAuditAction(dto: RecordAuditActionDto): Promise<AuditHistory>` - 记录审核操作（内部方法）
   - 修改现有的 `performAudit` 方法，在执行审核时自动记录历史

2.4 **数据验证逻辑**:
   - 模板名称唯一性验证
   - 流程配置的 levels 数组格式验证（必须包含 order, name, role 等字段）
   - 删除前检查是否有关联数据

#### 3. 控制器层设计

**File**: `backend-api/src/controllers/auditController.ts`

**Specific Changes**:

3.1 **审核意见模板路由处理**:
   - `async listTemplates(req, res, next)` - GET /api/audit/templates
   - `async getTemplate(req, res, next)` - GET /api/audit/templates/:id
   - `async createTemplate(req, res, next)` - POST /api/audit/templates
   - `async updateTemplate(req, res, next)` - PUT /api/audit/templates/:id
   - `async deleteTemplate(req, res, next)` - DELETE /api/audit/templates/:id

3.2 **审核流程配置路由处理**:
   - `async listWorkflowConfigs(req, res, next)` - GET /api/audit/workflow-configs
   - `async getWorkflowConfig(req, res, next)` - GET /api/audit/workflow-configs/:id
   - `async createWorkflowConfig(req, res, next)` - POST /api/audit/workflow-configs
   - `async updateWorkflowConfig(req, res, next)` - PUT /api/audit/workflow-configs/:id
   - `async deleteWorkflowConfig(req, res, next)` - DELETE /api/audit/workflow-configs/:id

3.3 **审核历史记录路由处理**:
   - `async getAuditHistory(req, res, next)` - GET /api/audit/tasks/:id/history

3.4 **错误处理**:
   - 统一使用 try-catch 包裹，通过 next(error) 传递错误
   - 返回标准化的错误响应格式

#### 4. 路由注册

**File**: `backend-api/src/routes/index.ts` 或创建新的 `backend-api/src/routes/auditRoutes.ts`

**Specific Changes**:

4.1 **注册审核模板路由**:
   ```typescript
   router.get('/api/audit/templates', auditController.listTemplates)
   router.get('/api/audit/templates/:id', auditController.getTemplate)
   router.post('/api/audit/templates', auditController.createTemplate)
   router.put('/api/audit/templates/:id', auditController.updateTemplate)
   router.delete('/api/audit/templates/:id', auditController.deleteTemplate)
   ```

4.2 **注册审核流程配置路由**:
   ```typescript
   router.get('/api/audit/workflow-configs', auditController.listWorkflowConfigs)
   router.get('/api/audit/workflow-configs/:id', auditController.getWorkflowConfig)
   router.post('/api/audit/workflow-configs', auditController.createWorkflowConfig)
   router.put('/api/audit/workflow-configs/:id', auditController.updateWorkflowConfig)
   router.delete('/api/audit/workflow-configs/:id', auditController.deleteWorkflowConfig)
   ```

4.3 **注册审核历史记录路由**:
   ```typescript
   router.get('/api/audit/tasks/:id/history', auditController.getAuditHistory)
   ```

4.4 **添加权限中间件**:
   - 所有路由应添加认证中间件（authMiddleware）
   - 写操作（POST, PUT, DELETE）应添加权限检查中间件

#### 5. 类型定义

**File**: `backend-api/src/types/audit.ts`

**Specific Changes**:

5.1 **添加模板相关类型**:
   ```typescript
   export interface CreateTemplateDto {
     name: string
     type: CommentTemplateType
     content: string
     isDefault?: boolean
   }
   
   export interface UpdateTemplateDto {
     name?: string
     type?: CommentTemplateType
     content?: string
     isDefault?: boolean
   }
   ```

5.2 **添加流程配置相关类型**:
   ```typescript
   export interface AuditLevel {
     order: number
     name: string
     role: string
     required: boolean
     autoAssign: boolean
   }
   
   export interface CreateWorkflowConfigDto {
     name: string
     sampleTypes: string[]
     levels: AuditLevel[]
     parallelAudit: boolean
   }
   
   export interface UpdateWorkflowConfigDto {
     name?: string
     sampleTypes?: string[]
     levels?: AuditLevel[]
     parallelAudit?: boolean
     status?: WorkflowConfigStatus
   }
   ```

5.3 **添加历史记录相关类型**:
   ```typescript
   export interface RecordAuditActionDto {
     taskId: string
     action: string
     changes: Record<string, any>
     performedBy: string
   }
   ```

#### 6. 验证器设计

**File**: 创建新文件 `backend-api/src/validators/auditValidator.ts`

**Specific Changes**:

6.1 **模板数据验证**:
   - 验证 name 非空且长度在 1-100 之间
   - 验证 type 为有效的枚举值
   - 验证 content 非空且长度在 1-2000 之间
   - 验证 isDefault 为布尔值

6.2 **流程配置数据验证**:
   - 验证 name 非空且长度在 1-100 之间
   - 验证 sampleTypes 为非空数组
   - 验证 levels 数组格式正确，每个元素包含必需字段
   - 验证 levels 的 order 字段唯一且连续
   - 验证 parallelAudit 为布尔值

## Testing Strategy

### Validation Approach

测试策略遵循两阶段方法：首先在未修复的代码上运行探索性测试以确认 bug 存在，然后验证修复后的代码正确实现了预期行为并保持了现有功能。


### Exploratory Bug Condition Checking

**Goal**: 在实现修复前，通过测试确认 bug 存在。验证当前代码在调用新 API 端点时确实返回 404 错误。

**Test Plan**: 编写集成测试，模拟前端调用新增的 API 端点，在未修复的代码上运行以观察 404 错误。

**Test Cases**:
1. **模板 API 404 测试**: 调用 GET /api/audit/templates，验证返回 404（未修复代码将失败）
2. **流程配置 API 404 测试**: 调用 GET /api/audit/workflow-configs，验证返回 404（未修复代码将失败）
3. **历史记录 API 404 测试**: 调用 GET /api/audit/tasks/test-id/history，验证返回 404（未修复代码将失败）
4. **现有 API 正常测试**: 调用 GET /api/audits，验证返回 200（应该通过，确认现有功能正常）

**Expected Counterexamples**:
- 新增的 API 端点返回 404 Not Found
- 可能的原因：路由未注册、控制器方法不存在、服务层方法缺失

### Fix Checking

**Goal**: 验证修复后，所有新增 API 端点都能正确响应并返回预期的数据格式和状态码。

**Pseudocode:**
```
FOR ALL request WHERE isBugCondition(request) DO
  response := handleRequest_fixed(request)
  ASSERT response.statusCode IN [200, 201]
  ASSERT response.body.data IS NOT NULL
  ASSERT response.body.data matches expected schema
END FOR
```

**Test Cases**:

1. **模板管理 API 测试**:
   - GET /api/audit/templates 返回 200 和模板数组
   - POST /api/audit/templates 返回 201 和创建的模板对象
   - PUT /api/audit/templates/:id 返回 200 和更新后的模板对象
   - DELETE /api/audit/templates/:id 返回 200 和删除成功消息

2. **流程配置管理 API 测试**:
   - GET /api/audit/workflow-configs 返回 200 和配置数组
   - GET /api/audit/workflow-configs/:id 返回 200 和配置详情
   - POST /api/audit/workflow-configs 返回 201 和创建的配置对象
   - PUT /api/audit/workflow-configs/:id 返回 200 和更新后的配置对象
   - DELETE /api/audit/workflow-configs/:id 返回 200 和删除成功消息

3. **历史记录 API 测试**:
   - GET /api/audit/tasks/:id/history 返回 200 和历史记录数组
   - 历史记录包含 action, changes, performedBy, performedAt 字段

4. **数据验证测试**:
   - 提交无效数据（空名称、错误类型等）返回 400 错误
   - 访问不存在的资源返回 404 错误
   - 删除被使用的模板/配置返回 422 错误

### Preservation Checking

**Goal**: 验证修复后，所有现有审核功能的行为与修复前完全一致，确保没有引入回归问题。

**Pseudocode:**
```
FOR ALL request WHERE NOT isBugCondition(request) DO
  ASSERT handleRequest_original(request) = handleRequest_fixed(request)
END FOR
```

**Testing Approach**: 使用属性测试（Property-Based Testing）来验证保持性，因为：
- 自动生成大量测试用例覆盖现有 API 端点
- 捕获手动测试可能遗漏的边界情况
- 提供强有力的保证：所有非 bug 相关的输入行为保持不变

**Test Plan**: 在未修复代码上观察现有审核 API 的行为，然后编写属性测试捕获这些行为，在修复后的代码上运行以验证保持性。

**Test Cases**:

1. **审核任务提交保持性**: 
   - 观察未修复代码：POST /api/audits 提交审核任务的完整流程
   - 验证修复后：相同输入产生相同的审核任务创建结果

2. **审核决策执行保持性**:
   - 观察未修复代码：POST /api/audits/:id/review 执行审核决策的业务逻辑
   - 验证修复后：审核通过/拒绝/退回的逻辑完全一致

3. **审核任务转交保持性**:
   - 观察未修复代码：POST /api/audits/:id/reassign 转交任务的行为
   - 验证修复后：转交逻辑和权限验证保持不变

4. **样品放行保持性**:
   - 观察未修复代码：POST /api/samples/:id/release 放行验证逻辑
   - 验证修复后：前置条件验证和状态更新逻辑一致

5. **审核统计保持性**:
   - 观察未修复代码：GET /api/audits/statistics 统计计算逻辑
   - 验证修复后：统计数据计算方法和结果格式保持一致

6. **数据库完整性保持性**:
   - 验证新增的数据模型不影响现有数据的查询和更新
   - 验证现有审核任务、样品数据的关联关系保持完整

### Unit Tests

- 测试 AuditService 中新增的模板管理方法（CRUD 操作）
- 测试 AuditService 中新增的流程配置管理方法（CRUD 操作）
- 测试 AuditService 中新增的历史记录查询方法
- 测试数据验证逻辑（模板和流程配置的字段验证）
- 测试边界情况（删除不存在的资源、更新被使用的配置等）

### Property-Based Tests

- 生成随机的模板数据，验证 CRUD 操作的幂等性和一致性
- 生成随机的流程配置数据，验证 levels 数组的格式验证逻辑
- 生成随机的审核任务操作序列，验证历史记录的完整性和顺序
- 测试现有审核 API 在各种输入下的行为保持性

### Integration Tests

- 测试完整的模板管理流程：创建 → 使用 → 更新 → 删除
- 测试完整的流程配置流程：创建 → 激活 → 应用到审核任务 → 停用
- 测试审核任务执行时自动记录历史的集成逻辑
- 测试前端调用新 API 端点的完整场景（包括认证和权限验证）
- 测试数据库迁移后的数据完整性和兼容性
