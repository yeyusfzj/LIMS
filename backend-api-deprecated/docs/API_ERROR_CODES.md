# API 错误码说明文档

本文档定义了实验室管理系统后端 API 的所有错误码及其含义。

## 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "用户友好的错误消息",
    "details": {},
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/samples",
    "requestId": "uuid"
  }
}
```

## HTTP 状态码

- **200 OK**: 请求成功
- **201 Created**: 资源创建成功
- **204 No Content**: 删除成功
- **400 Bad Request**: 请求参数错误
- **401 Unauthorized**: 未认证或令牌无效
- **403 Forbidden**: 无权限访问
- **404 Not Found**: 资源不存在
- **409 Conflict**: 并发冲突或业务规则冲突
- **422 Unprocessable Entity**: 业务验证失败
- **429 Too Many Requests**: 请求过于频繁
- **500 Internal Server Error**: 服务器内部错误
- **503 Service Unavailable**: 服务暂时不可用

## 错误码分类

### 1. 认证相关错误 (AUTH_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `AUTH_FAILED` | 401 | 认证失败，用户名或密码错误 |
| `TOKEN_EXPIRED` | 401 | 访问令牌已过期 |
| `TOKEN_INVALID` | 401 | 访问令牌无效 |
| `TOKEN_REFRESH_FAILED` | 401 | 刷新令牌无效或已过期 |
| `UNAUTHORIZED` | 401 | 未授权的请求，需要登录 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求过于频繁，超过速率限制 |

### 2. 权限相关错误 (PERMISSION_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `PERMISSION_DENIED` | 403 | 无权限执行此操作 |
| `INSUFFICIENT_PERMISSIONS` | 403 | 权限不足 |

### 3. 验证相关错误 (VALIDATION_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `INVALID_INPUT` | 400 | 输入数据格式不正确 |
| `MISSING_REQUIRED_FIELD` | 400 | 缺少必填字段 |
| `INVALID_UUID` | 400 | UUID 格式不正确 |
| `INVALID_DATE_FORMAT` | 400 | 日期格式不正确 |

### 4. 资源相关错误 (NOT_FOUND, CONFLICT)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `NOT_FOUND` | 404 | 请求的资源不存在 |
| `SAMPLE_NOT_FOUND` | 404 | 样品不存在 |
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `REPORT_NOT_FOUND` | 404 | 报告不存在 |
| `CONFLICT` | 409 | 资源冲突（如并发修改） |
| `DUPLICATE_BARCODE` | 409 | 条码已存在 |
| `DUPLICATE_SAMPLE_NUMBER` | 409 | 样品编号已存在 |

### 5. 业务规则错误 (BUSINESS_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `BUSINESS_RULE_VIOLATION` | 422 | 违反业务规则 |
| `INVALID_STATUS_TRANSITION` | 422 | 无效的状态转换 |
| `RELEASE_CONDITIONS_NOT_MET` | 422 | 样品放行条件不满足 |
| `SAMPLE_ALREADY_RELEASED` | 422 | 样品已经放行 |
| `REPORT_ALREADY_SIGNED` | 422 | 报告已经签名，不能修改 |
| `REPORT_NOT_SIGNED` | 422 | 报告未签名，不能分发 |

### 6. 样品管理错误 (SAMPLE_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `SAMPLE_NOT_FOUND` | 404 | 样品不存在 |
| `SAMPLE_CREATION_FAILED` | 500 | 样品创建失败 |
| `SAMPLE_UPDATE_FAILED` | 500 | 样品更新失败 |
| `TRANSFER_FAILED` | 500 | 样品流转失败 |
| `SPLIT_FAILED` | 500 | 分样操作失败 |
| `MERGE_FAILED` | 500 | 合样操作失败 |
| `INVALID_PARENT_SAMPLE` | 400 | 无效的母样品 |
| `INVALID_SOURCE_SAMPLES` | 400 | 无效的来源样品 |

### 7. 检测结果错误 (RESULT_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `RESULT_NOT_FOUND` | 404 | 检测结果不存在 |
| `RESULT_CREATION_FAILED` | 500 | 结果创建失败 |
| `IMPORT_FAILED` | 500 | 批量导入失败 |
| `CALCULATION_FAILED` | 400 | 公式计算失败 |
| `INVALID_FORMULA` | 400 | 无效的计算公式 |
| `RETEST_REQUEST_FAILED` | 500 | 复测申请失败 |

### 8. 报告管理错误 (REPORT_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `REPORT_NOT_FOUND` | 404 | 报告不存在 |
| `REPORT_GENERATION_FAILED` | 500 | 报告生成失败 |
| `TEMPLATE_NOT_FOUND` | 404 | 报告模板不存在 |
| `INVALID_TEMPLATE` | 400 | 无效的报告模板 |
| `SIGNATURE_FAILED` | 500 | 签名失败 |
| `INVALID_SIGNATURE` | 400 | 无效的签名 |
| `DISTRIBUTION_FAILED` | 500 | 报告分发失败 |
| `RECALL_FAILED` | 500 | 报告回收失败 |

### 9. 工作流错误 (WORKFLOW_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `WORKFLOW_NOT_FOUND` | 404 | 工作流不存在 |
| `WORKFLOW_VALIDATION_FAILED` | 400 | 工作流配置验证失败 |
| `WORKFLOW_HAS_CYCLES` | 400 | 工作流存在死循环 |
| `WORKFLOW_HAS_ORPHAN_NODES` | 400 | 工作流存在孤立节点 |
| `TASK_NOT_FOUND` | 404 | 任务不存在 |
| `TASK_ASSIGNMENT_FAILED` | 500 | 任务分配失败 |

### 10. 审核判定错误 (AUDIT_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `AUDIT_NOT_FOUND` | 404 | 审核任务不存在 |
| `AUDIT_FAILED` | 500 | 审核操作失败 |
| `INVALID_AUDIT_DECISION` | 400 | 无效的审核决定 |
| `JUDGMENT_FAILED` | 500 | 质量判定失败 |
| `RELEASE_FAILED` | 500 | 样品放行失败 |

### 11. 系统错误 (INTERNAL_*, DATABASE_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `DATABASE_ERROR` | 500 | 数据库操作失败 |
| `DATABASE_CONNECTION_FAILED` | 503 | 数据库连接失败 |
| `CACHE_ERROR` | 500 | 缓存操作失败 |
| `FILE_UPLOAD_FAILED` | 500 | 文件上传失败 |
| `FILE_PARSE_FAILED` | 400 | 文件解析失败 |

### 12. 并发控制错误 (CONCURRENCY_*)

| 错误码 | HTTP 状态码 | 说明 |
|--------|------------|------|
| `CONCURRENCY_CONFLICT` | 409 | 并发冲突，资源已被其他用户修改 |
| `VERSION_MISMATCH` | 409 | 版本不匹配 |
| `LOCK_ACQUISITION_FAILED` | 409 | 获取锁失败 |

## 错误处理最佳实践

### 客户端处理建议

1. **401 错误**: 清除本地令牌，跳转到登录页面
2. **403 错误**: 显示权限不足提示，引导用户联系管理员
3. **404 错误**: 显示资源不存在提示，返回列表页面
4. **409 错误**: 提示用户刷新页面重新获取最新数据
5. **422 错误**: 显示具体的业务规则错误信息
6. **429 错误**: 提示用户稍后重试
7. **500 错误**: 显示通用错误提示，记录错误日志

### 错误信息国际化

所有错误消息都应该支持国际化，客户端可以根据错误码显示本地化的错误消息。

### 错误日志记录

服务器端应该记录所有错误的详细信息，包括：
- 错误堆栈
- 请求参数
- 用户信息
- 时间戳
- 请求 ID（用于追踪）

## 示例

### 验证错误示例

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "邮箱格式不正确"
        },
        {
          "field": "quantity",
          "message": "数量必须大于 0"
        }
      ]
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/samples",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 业务规则错误示例

```json
{
  "error": {
    "code": "RELEASE_CONDITIONS_NOT_MET",
    "message": "样品放行条件不满足",
    "details": {
      "violations": [
        "审核未完成",
        "质量判定未通过"
      ]
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/samples/123/release",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 并发冲突错误示例

```json
{
  "error": {
    "code": "CONCURRENCY_CONFLICT",
    "message": "资源已被其他用户修改",
    "details": {
      "currentVersion": 5,
      "requestedVersion": 4
    },
    "timestamp": "2024-01-01T00:00:00.000Z",
    "path": "/api/samples/123",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```
