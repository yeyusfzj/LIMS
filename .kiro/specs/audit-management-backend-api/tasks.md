# 实现计划

- [x] 1. 编写 Bug Condition 探索性测试（修复前）
  - **Property 1: Bug Condition** - API 端点返回 404 错误
  - **关键要求**: 此测试必须在未修复的代码上失败 - 失败确认 bug 存在
  - **不要在测试失败时尝试修复测试或代码**
  - **注意**: 此测试编码了预期行为 - 在实现修复后通过时将验证修复
  - **目标**: 暴露证明 bug 存在的反例
  - **作用域 PBT 方法**: 对于确定性 bug，将属性限定为具体的失败案例以确保可重现性
  - 测试新增 API 端点（模板、流程配置、历史记录）返回 404 错误
  - 测试实现细节来自设计文档中的 Bug Condition
  - 测试断言应匹配设计文档中的 Expected Behavior Properties
  - 在未修复的代码上运行测试
  - **预期结果**: 测试失败（这是正确的 - 证明 bug 存在）
  - 记录发现的反例以理解根本原因
  - 当测试编写完成、运行并记录失败时标记任务完成
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [x] 2. 编写保持性属性测试（修复前）
  - **Property 2: Preservation** - 现有审核功能不受影响
  - **重要**: 遵循观察优先方法
  - 在未修复的代码上观察非 bug 输入的行为
  - 从设计文档的 Preservation Requirements 编写捕获观察行为模式的属性测试
  - 属性测试生成许多测试用例以提供更强保证
  - 在未修复的代码上运行测试
  - **预期结果**: 测试通过（这确认了要保持的基线行为）
  - 当测试编写完成、运行并在未修复代码上通过时标记任务完成
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. 实现审核管理后端 API 修复

  - [x] 3.1 扩展数据模型
    - 在 `backend-api/prisma/schema.prisma` 中添加 AuditCommentTemplate 模型
    - 添加 AuditWorkflowConfig 模型
    - 添加 AuditHistory 模型
    - 添加枚举类型 CommentTemplateType 和 WorkflowConfigStatus
    - 创建数据库迁移脚本
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - API 返回正确状态码和数据_
    - _Preservation: Preservation Requirements from design - 现有审核功能保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.2 实现服务层方法
    - 在 `backend-api/src/services/auditService.ts` 中添加模板管理方法（listTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, incrementTemplateUsage）
    - 添加流程配置管理方法（listWorkflowConfigs, getWorkflowConfigById, createWorkflowConfig, updateWorkflowConfig, deleteWorkflowConfig, activateWorkflowConfig, deactivateWorkflowConfig）
    - 添加历史记录方法（getAuditHistory, recordAuditAction）
    - 修改现有 performAudit 方法以自动记录历史
    - 实现数据验证逻辑（名称唯一性、levels 格式验证、删除前关联检查）
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - 服务层正确处理业务逻辑_
    - _Preservation: Preservation Requirements from design - 现有审核服务方法保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.3 实现控制器层方法
    - 在 `backend-api/src/controllers/auditController.ts` 中添加模板路由处理方法（listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate）
    - 添加流程配置路由处理方法（listWorkflowConfigs, getWorkflowConfig, createWorkflowConfig, updateWorkflowConfig, deleteWorkflowConfig）
    - 添加历史记录路由处理方法（getAuditHistory）
    - 实现统一错误处理（try-catch 和标准化错误响应）
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - 控制器正确处理 HTTP 请求_
    - _Preservation: Preservation Requirements from design - 现有控制器方法保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.4 注册路由
    - 在路由文件中注册审核模板路由（GET, POST, PUT, DELETE /api/audit/templates）
    - 注册审核流程配置路由（GET, POST, PUT, DELETE /api/audit/workflow-configs）
    - 注册审核历史记录路由（GET /api/audit/tasks/:id/history）
    - 添加认证和权限中间件
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - 路由正确映射到控制器方法_
    - _Preservation: Preservation Requirements from design - 现有路由保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.5 添加类型定义
    - 创建 `backend-api/src/types/audit.ts` 或扩展现有文件
    - 添加模板相关类型（CreateTemplateDto, UpdateTemplateDto）
    - 添加流程配置相关类型（AuditLevel, CreateWorkflowConfigDto, UpdateWorkflowConfigDto）
    - 添加历史记录相关类型（RecordAuditActionDto）
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - 类型定义支持类型安全_
    - _Preservation: Preservation Requirements from design - 现有类型定义保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.6 实现验证器
    - 创建 `backend-api/src/validators/auditValidator.ts`
    - 实现模板数据验证（name, type, content, isDefault）
    - 实现流程配置数据验证（name, sampleTypes, levels, parallelAudit）
    - 验证 levels 数组格式和 order 字段唯一性
    - _Bug_Condition: isBugCondition(request) where request.path IN ['/api/audit/templates', '/api/audit/workflow-configs', '/api/audit/tasks/:id/history']_
    - _Expected_Behavior: expectedBehavior(result) from design - 验证器正确验证输入数据_
    - _Preservation: Preservation Requirements from design - 现有验证逻辑保持不变_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [x] 3.7 验证 Bug Condition 探索性测试现在通过
    - **Property 1: Expected Behavior** - API 端点正确响应
    - **重要**: 重新运行任务 1 中的相同测试 - 不要编写新测试
    - 任务 1 中的测试编码了预期行为
    - 当此测试通过时，确认满足预期行为
    - 运行任务 1 中的 Bug Condition 探索性测试
    - **预期结果**: 测试通过（确认 bug 已修复）
    - _Requirements: Expected Behavior Properties from design_

  - [x] 3.8 验证保持性测试仍然通过
    - **Property 2: Preservation** - 现有审核功能不受影响
    - **重要**: 重新运行任务 2 中的相同测试 - 不要编写新测试
    - 运行任务 2 中的保持性属性测试
    - **预期结果**: 测试通过（确认无回归）
    - 确认修复后所有测试仍然通过（无回归）

- [x] 4. Checkpoint - 确保所有测试通过
  - 确保所有测试通过，如有问题请询问用户
