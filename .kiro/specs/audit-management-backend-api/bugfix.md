# Bugfix Requirements Document

## Introduction

审核管理架构重构后，前端需要调用新的 API 端点来支持审核意见模板管理、审核流程配置管理和审核历史记录查询功能。然而，后端尚未实现这些 API 端点，导致前端调用时返回 404 错误，影响了审核管理重构的前端功能正常使用。

本 bugfix 旨在实现缺失的后端 API 端点，确保前端能够正常调用这些接口，完成审核管理的完整功能闭环。

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN 前端调用 GET /api/audit/templates 获取审核意见模板列表 THEN 后端返回 404 错误

1.2 WHEN 前端调用 POST /api/audit/templates 创建审核意见模板 THEN 后端返回 404 错误

1.3 WHEN 前端调用 PUT /api/audit/templates/:id 更新审核意见模板 THEN 后端返回 404 错误

1.4 WHEN 前端调用 DELETE /api/audit/templates/:id 删除审核意见模板 THEN 后端返回 404 错误

1.5 WHEN 前端调用 GET /api/audit/workflow-configs 获取审核流程配置列表 THEN 后端返回 404 错误

1.6 WHEN 前端调用 GET /api/audit/workflow-configs/:id 获取单个审核流程配置 THEN 后端返回 404 错误

1.7 WHEN 前端调用 POST /api/audit/workflow-configs 创建审核流程配置 THEN 后端返回 404 错误

1.8 WHEN 前端调用 PUT /api/audit/workflow-configs/:id 更新审核流程配置 THEN 后端返回 404 错误

1.9 WHEN 前端调用 DELETE /api/audit/workflow-configs/:id 删除审核流程配置 THEN 后端返回 404 错误

1.10 WHEN 前端调用 GET /api/audit/tasks/:id/history 获取审核任务历史记录 THEN 后端返回 404 错误

### Expected Behavior (Correct)

2.1 WHEN 前端调用 GET /api/audit/templates 获取审核意见模板列表 THEN 后端 SHALL 返回 200 状态码和模板列表数据

2.2 WHEN 前端调用 POST /api/audit/templates 创建审核意见模板 THEN 后端 SHALL 返回 201 状态码和创建的模板数据

2.3 WHEN 前端调用 PUT /api/audit/templates/:id 更新审核意见模板 THEN 后端 SHALL 返回 200 状态码和更新后的模板数据

2.4 WHEN 前端调用 DELETE /api/audit/templates/:id 删除审核意见模板 THEN 后端 SHALL 返回 200 状态码和删除成功消息

2.5 WHEN 前端调用 GET /api/audit/workflow-configs 获取审核流程配置列表 THEN 后端 SHALL 返回 200 状态码和配置列表数据

2.6 WHEN 前端调用 GET /api/audit/workflow-configs/:id 获取单个审核流程配置 THEN 后端 SHALL 返回 200 状态码和配置详情数据

2.7 WHEN 前端调用 POST /api/audit/workflow-configs 创建审核流程配置 THEN 后端 SHALL 返回 201 状态码和创建的配置数据

2.8 WHEN 前端调用 PUT /api/audit/workflow-configs/:id 更新审核流程配置 THEN 后端 SHALL 返回 200 状态码和更新后的配置数据

2.9 WHEN 前端调用 DELETE /api/audit/workflow-configs/:id 删除审核流程配置 THEN 后端 SHALL 返回 200 状态码和删除成功消息

2.10 WHEN 前端调用 GET /api/audit/tasks/:id/history 获取审核任务历史记录 THEN 后端 SHALL 返回 200 状态码和历史记录列表数据

### Unchanged Behavior (Regression Prevention)

3.1 WHEN 前端调用现有的审核任务相关 API（如 GET /api/audits, POST /api/audits/:id/review）THEN 后端 SHALL CONTINUE TO 正常响应并返回正确的数据

3.2 WHEN 后端处理审核任务的提交、执行、转交等核心业务逻辑 THEN 后端 SHALL CONTINUE TO 保持现有的业务规则和数据完整性

3.3 WHEN 前端调用样品放行相关 API（如 POST /api/samples/:id/release）THEN 后端 SHALL CONTINUE TO 正常执行放行逻辑并验证前置条件

3.4 WHEN 后端返回审核统计信息（GET /api/audits/statistics）THEN 后端 SHALL CONTINUE TO 返回准确的统计数据

3.5 WHEN 数据库中已存在的审核任务、样品数据和审核记录 THEN 这些数据 SHALL CONTINUE TO 保持完整性和一致性
