# API 端点映射文档

本文档列出了 FastAPI 和 Node.js 后端的所有 API 端点映射关系。

## 1. 认证和授权 (Authentication & Authorization)

### 1.1 认证端点

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 用户登录 | `/api/auth/login` | `/api/v1/auth/login` | POST | 返回访问令牌和刷新令牌 |
| 刷新令牌 | `/api/auth/refresh` | `/api/v1/auth/refresh` | POST | 使用刷新令牌获取新的访问令牌 |
| 用户登出 | `/api/auth/logout` | `/api/v1/auth/logout` | POST | 撤销当前令牌 |
| 获取当前用户 | `/api/auth/me` | `/api/v1/auth/me` | GET | 获取当前登录用户信息 |

### 1.2 权限管理端点

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建权限 | `/api/permissions` | `/api/v1/permissions` | POST | 创建新权限 |
| 查询权限列表 | `/api/permissions` | `/api/v1/permissions` | GET | 分页查询权限 |
| 获取权限详情 | `/api/permissions/:id` | `/api/v1/permissions/{id}` | GET | 获取单个权限 |
| 更新权限 | `/api/permissions/:id` | `/api/v1/permissions/{id}` | PUT | 更新权限信息 |
| 删除权限 | `/api/permissions/:id` | `/api/v1/permissions/{id}` | DELETE | 删除权限 |

### 1.3 角色管理端点

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建角色 | `/api/roles` | `/api/v1/roles` | POST | 创建新角色 |
| 查询角色列表 | `/api/roles` | `/api/v1/roles` | GET | 分页查询角色 |
| 获取角色详情 | `/api/roles/:id` | `/api/v1/roles/{id}` | GET | 获取单个角色 |
| 更新角色 | `/api/roles/:id` | `/api/v1/roles/{id}` | PUT | 更新角色信息 |
| 删除角色 | `/api/roles/:id` | `/api/v1/roles/{id}` | DELETE | 删除角色 |
| 分配权限 | `/api/roles/:id/permissions` | `/api/v1/roles/{id}/permissions` | POST | 为角色分配权限 |

### 1.4 用户管理端点

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建用户 | `/api/users` | `/api/v1/users` | POST | 创建新用户 |
| 查询用户列表 | `/api/users` | `/api/v1/users` | GET | 分页查询用户 |
| 获取用户详情 | `/api/users/:id` | `/api/v1/users/{id}` | GET | 获取单个用户 |
| 更新用户 | `/api/users/:id` | `/api/v1/users/{id}` | PUT | 更新用户信息 |
| 删除用户 | `/api/users/:id` | `/api/v1/users/{id}` | DELETE | 删除用户 |
| 分配角色 | `/api/users/:id/roles` | `/api/v1/users/{id}/roles` | POST | 为用户分配角色 |

## 2. 样品管理 (Sample Management)

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建样品 | `/api/samples` | `/api/v1/samples` | POST | 创建新样品 |
| 查询样品列表 | `/api/samples` | `/api/v1/samples` | GET | 分页查询样品 |
| 获取样品详情 | `/api/samples/:id` | `/api/v1/samples/{id}` | GET | 获取单个样品 |
| 更新样品 | `/api/samples/:id` | `/api/v1/samples/{id}` | PUT | 更新样品信息 |
| 删除样品 | `/api/samples/:id` | `/api/v1/samples/{id}` | DELETE | 删除样品 |
| 样品流转 | `/api/samples/:id/transfer` | `/api/v1/samples/{id}/transfer` | POST | 创建流转记录 |
| 监管链 | `/api/samples/:id/custody` | `/api/v1/samples/{id}/custody` | GET | 获取流转历史 |
| 分样 | `/api/samples/:id/split` | `/api/v1/samples/{id}/split` | POST | 分样操作 |
| 合样 | `/api/samples/merge` | `/api/v1/samples/merge` | POST | 合样操作 |
| 样品放行 | `/api/samples/:id/release` | `/api/v1/samples/{id}/release` | POST | 样品放行 |
| 流转列表 | `/api/samples/transfers` | `/api/v1/samples/transfers` | GET | 查询流转记录 |
| 确认流转 | `/api/samples/transfers/:id/confirm` | `/api/v1/samples/transfers/{id}/confirm` | POST | 确认流转 |
| 取消流转 | `/api/samples/transfers/:id/cancel` | `/api/v1/samples/transfers/{id}/cancel` | PUT | 取消流转 |

## 3. 工作流管理 (Workflow Management)

### 3.1 工作流模板

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建模板 | `/api/workflows` | `/api/v1/workflows` | POST | 创建工作流模板 |
| 查询模板列表 | `/api/workflows` | `/api/v1/workflows` | GET | 分页查询模板 |
| 获取模板详情 | `/api/workflows/:id` | `/api/v1/workflows/{id}` | GET | 获取单个模板 |
| 更新模板 | `/api/workflows/:id` | `/api/v1/workflows/{id}` | PUT | 更新模板 |
| 删除模板 | `/api/workflows/:id` | `/api/v1/workflows/{id}` | DELETE | 删除模板 |

### 3.2 工作流实例

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建实例 | `/api/workflows/:id/instances` | `/api/v1/workflows/{id}/instances` | POST | 创建工作流实例 |
| 查询实例列表 | `/api/workflow-instances` | `/api/v1/workflow-instances` | GET | 分页查询实例 |
| 获取实例详情 | `/api/workflow-instances/:id` | `/api/v1/workflow-instances/{id}` | GET | 获取单个实例 |
| 执行工作流 | `/api/workflow-instances/:id/execute` | `/api/v1/workflow-instances/{id}/execute` | POST | 执行工作流 |

### 3.3 任务管理

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建任务 | `/api/tasks` | `/api/v1/tasks` | POST | 创建任务 |
| 查询任务列表 | `/api/tasks` | `/api/v1/tasks` | GET | 分页查询任务 |
| 获取任务详情 | `/api/tasks/:id` | `/api/v1/tasks/{id}` | GET | 获取单个任务 |
| 更新任务 | `/api/tasks/:id` | `/api/v1/tasks/{id}` | PUT | 更新任务 |
| 删除任务 | `/api/tasks/:id` | `/api/v1/tasks/{id}` | DELETE | 删除任务 |
| 分配任务 | `/api/tasks/:id/assign` | `/api/v1/tasks/{id}/assign` | POST | 分配任务 |
| 完成任务 | `/api/tasks/:id/complete` | `/api/v1/tasks/{id}/complete` | POST | 完成任务 |
| 自动分配 | `/api/tasks/:id/auto-assign` | `/api/v1/tasks/{id}/auto-assign` | POST | 自动分配任务 |

## 4. 检测结果管理 (Result Management)

### 4.1 检测结果

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建结果 | `/api/results` | `/api/v1/results` | POST | 创建检测结果 |
| 查询结果列表 | `/api/results` | `/api/v1/results` | GET | 分页查询结果 |
| 获取结果详情 | `/api/results/:id` | `/api/v1/results/{id}` | GET | 获取单个结果 |
| 更新结果 | `/api/results/:id` | `/api/v1/results/{id}` | PUT | 更新结果 |
| 删除结果 | `/api/results/:id` | `/api/v1/results/{id}` | DELETE | 删除结果 |
| 批量导入 | `/api/results/import` | `/api/v1/results/import` | POST | 批量导入结果 |
| 审核结果 | `/api/results/:id/review` | `/api/v1/results/{id}/review` | POST | 审核结果 |

### 4.2 计算公式

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建公式 | `/api/formulas` | `/api/v1/formulas` | POST | 创建公式 |
| 查询公式列表 | `/api/formulas` | `/api/v1/formulas` | GET | 分页查询公式 |
| 获取公式详情 | `/api/formulas/:id` | `/api/v1/formulas/{id}` | GET | 获取单个公式 |
| 更新公式 | `/api/formulas/:id` | `/api/v1/formulas/{id}` | PUT | 更新公式 |
| 删除公式 | `/api/formulas/:id` | `/api/v1/formulas/{id}` | DELETE | 删除公式 |
| 验证公式 | `/api/formulas/validate` | `/api/v1/formulas/validate` | POST | 验证公式语法 |
| 执行公式 | `/api/formulas/:id/execute` | `/api/v1/formulas/{id}/execute` | POST | 执行公式计算 |

### 4.3 异常检测

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建规则 | `/api/anomaly-rules` | `/api/v1/anomaly-rules` | POST | 创建异常检测规则 |
| 查询异常列表 | `/api/anomalies` | `/api/v1/anomalies` | GET | 分页查询异常 |
| 处理异常 | `/api/anomalies/:id/handle` | `/api/v1/anomalies/{id}/handle` | POST | 处理异常 |

## 5. 审核管理 (Audit Management)

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建审核任务 | `/api/audits` | `/api/v1/audits` | POST | 创建审核任务 |
| 查询审核列表 | `/api/audits` | `/api/v1/audits` | GET | 分页查询审核 |
| 获取审核详情 | `/api/audits/:id` | `/api/v1/audits/{id}` | GET | 获取单个审核 |
| 执行审核 | `/api/audits/:id/execute` | `/api/v1/audits/{id}/execute` | POST | 执行审核 |
| 审核统计 | `/api/audits/statistics` | `/api/v1/audits/statistics` | GET | 获取审核统计 |
| 创建模板 | `/api/audit-templates` | `/api/v1/audit-templates` | POST | 创建审核模板 |
| 查询模板列表 | `/api/audit-templates` | `/api/v1/audit-templates` | GET | 分页查询模板 |
| 导出审核数据 | `/api/audits/export` | `/api/v1/audits/export` | GET | 导出审核数据 |

## 6. 报告管理 (Report Management)

### 6.1 报告模板

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建模板 | `/api/report-templates` | `/api/v1/report-templates` | POST | 创建报告模板 |
| 查询模板列表 | `/api/report-templates` | `/api/v1/report-templates` | GET | 分页查询模板 |
| 获取模板详情 | `/api/report-templates/:id` | `/api/v1/report-templates/{id}` | GET | 获取单个模板 |
| 更新模板 | `/api/report-templates/:id` | `/api/v1/report-templates/{id}` | PUT | 更新模板 |
| 删除模板 | `/api/report-templates/:id` | `/api/v1/report-templates/{id}` | DELETE | 删除模板 |

### 6.2 报告生成和管理

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 生成报告 | `/api/reports/generate` | `/api/v1/reports/generate` | POST | 生成报告 |
| 查询报告列表 | `/api/reports` | `/api/v1/reports` | GET | 分页查询报告 |
| 获取报告详情 | `/api/reports/:id` | `/api/v1/reports/{id}` | GET | 获取单个报告 |
| 更新报告 | `/api/reports/:id` | `/api/v1/reports/{id}` | PUT | 更新报告 |
| 删除报告 | `/api/reports/:id` | `/api/v1/reports/{id}` | DELETE | 删除报告 |
| 导出 PDF | `/api/reports/:id/pdf` | `/api/v1/reports/{id}/pdf` | GET | 导出 PDF |
| 审核报告 | `/api/reports/:id/review` | `/api/v1/reports/{id}/review` | POST | 审核报告 |
| 发布报告 | `/api/reports/:id/publish` | `/api/v1/reports/{id}/publish` | POST | 发布报告 |
| 撤回报告 | `/api/reports/:id/recall` | `/api/v1/reports/{id}/recall` | POST | 撤回报告 |
| 分发报告 | `/api/reports/:id/distribute` | `/api/v1/reports/{id}/distribute` | POST | 分发报告 |
| 分发历史 | `/api/reports/:id/distribution-history` | `/api/v1/reports/{id}/distribution-history` | GET | 查询分发历史 |

### 6.3 电子签名

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建签名 | `/api/signatures` | `/api/v1/signatures` | POST | 创建电子签名 |
| 签署报告 | `/api/reports/:id/sign` | `/api/v1/reports/{id}/sign` | POST | 签署报告 |
| 验证签名 | `/api/signatures/verify` | `/api/v1/signatures/verify` | POST | 验证签名 |

## 7. 统计分析 (Statistics)

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 综合统计 | `/api/statistics/overview` | `/api/v1/statistics/overview` | GET | 综合统计数据 |
| 审核统计 | `/api/statistics/audit` | `/api/v1/statistics/audit` | GET | 审核统计数据 |
| 工作量统计 | `/api/statistics/workload` | `/api/v1/statistics/workload` | GET | 工作量统计 |
| 质量统计 | `/api/statistics/quality` | `/api/v1/statistics/quality` | GET | 质量统计 |
| 图表数据 | `/api/statistics/charts/:type` | `/api/v1/statistics/charts/{type}` | GET | 获取图表数据 |

## 8. 数据导出 (Export)

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 导出 Excel | `/api/export/excel` | `/api/v1/export/excel` | POST | 导出 Excel |
| 导出 CSV | `/api/export/csv` | `/api/v1/export/csv` | POST | 导出 CSV |
| 查询导出任务 | `/api/export/:taskId` | `/api/v1/export/{task_id}` | GET | 查询导出任务状态 |

## 9. 系统管理 (System Management)

### 9.1 审计日志

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 查询日志 | `/api/audit-logs` | `/api/v1/audit-logs` | GET | 分页查询审计日志 |
| 归档日志 | `/api/audit-logs/archive` | `/api/v1/audit-logs/archive` | POST | 归档历史日志 |

### 9.2 数据备份

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建备份 | `/api/backups` | `/api/v1/backups` | POST | 创建数据备份 |
| 查询备份列表 | `/api/backups` | `/api/v1/backups` | GET | 分页查询备份 |
| 恢复备份 | `/api/backups/:id/restore` | `/api/v1/backups/{id}/restore` | POST | 恢复备份 |

### 9.3 性能监控

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 性能统计 | `/api/performance/statistics` | `/api/v1/performance/statistics` | GET | 性能统计数据 |
| 慢查询列表 | `/api/performance/slow-queries` | `/api/v1/performance/slow-queries` | GET | 慢查询列表 |

### 9.4 异步任务队列

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 查询任务列表 | `/api/queue/tasks` | `/api/v1/queue/tasks` | GET | 查询队列任务 |
| 查询任务状态 | `/api/queue/tasks/:id` | `/api/v1/queue/tasks/{id}` | GET | 查询任务状态 |
| 取消任务 | `/api/queue/tasks/:id/cancel` | `/api/v1/queue/tasks/{id}/cancel` | POST | 取消任务 |

### 9.5 检测方法库

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建方法 | `/api/methods` | `/api/v1/methods` | POST | 创建检测方法 |
| 查询方法列表 | `/api/methods` | `/api/v1/methods` | GET | 分页查询方法 |
| 获取方法详情 | `/api/methods/:id` | `/api/v1/methods/{id}` | GET | 获取单个方法 |
| 更新方法 | `/api/methods/:id` | `/api/v1/methods/{id}` | PUT | 更新方法 |
| 删除方法 | `/api/methods/:id` | `/api/v1/methods/{id}` | DELETE | 删除方法 |

### 9.6 质量判定

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 创建规则 | `/api/judgment-rules` | `/api/v1/judgment-rules` | POST | 创建判定规则 |
| 查询规则列表 | `/api/judgment-rules` | `/api/v1/judgment-rules` | GET | 分页查询规则 |
| 更新规则 | `/api/judgment-rules/:id` | `/api/v1/judgment-rules/{id}` | PUT | 更新规则 |
| 删除规则 | `/api/judgment-rules/:id` | `/api/v1/judgment-rules/{id}` | DELETE | 删除规则 |
| 自动判定 | `/api/judgments/auto` | `/api/v1/judgments/auto` | POST | 自动判定 |
| 手动判定 | `/api/judgments/manual` | `/api/v1/judgments/manual` | POST | 手动判定 |

## 10. 健康检查 (Health Check)

| 功能 | Node.js | FastAPI | 方法 | 说明 |
|------|---------|---------|------|------|
| 基础健康检查 | `/health` | `/health` | GET | 基础健康检查 |
| 详细健康检查 | `/health/detailed` | `/health/detailed` | GET | 详细健康检查 |
| 就绪检查 | `/ready` | `/ready` | GET | 就绪检查 |
| 存活检查 | `/live` | `/live` | GET | 存活检查 |

## 响应格式对比

### Node.js 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**分页响应**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  },
  "message": "查询成功"
}
```

**错误响应**:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": { ... }
  }
}
```

### FastAPI 响应格式

**成功响应** (需要保持一致):
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

**分页响应** (需要保持一致):
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  },
  "message": "查询成功"
}
```

**错误响应** (需要保持一致):
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": { ... }
  }
}
```

## 日期时间格式

两个后端都应使用 **ISO 8601** 格式:
- 格式: `YYYY-MM-DDTHH:mm:ss.sssZ`
- 示例: `2024-03-15T10:30:45.123Z`

## 分页参数

两个后端都应支持相同的分页参数:
- `page`: 页码（从 1 开始）
- `pageSize`: 每页记录数（默认 10，最大 100）
- `sortBy`: 排序字段
- `sortOrder`: 排序方向（`asc` 或 `desc`）

## HTTP 状态码

两个后端应使用相同的 HTTP 状态码:
- `200`: 成功
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未认证
- `403`: 无权限
- `404`: 资源不存在
- `409`: 资源冲突
- `429`: 请求过于频繁
- `500`: 服务器内部错误
