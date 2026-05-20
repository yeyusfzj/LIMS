# CORS 错误响应修复报告

## 问题描述

前端访问 `/api/v1/workflows` 端点时出现 CORS 错误：
```
Access to XMLHttpRequest at 'http://localhost:8001/api/v1/workflows' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 根本原因

1. **认证失败返回 401 错误**：工作流端点需要认证，但前端没有提供有效的 JWT 令牌
2. **错误响应缺少 CORS 头**：FastAPI 的异常处理器返回的错误响应没有包含 CORS 头
3. **浏览器阻止响应**：由于缺少 CORS 头，浏览器阻止了 401 响应，导致前端看到的是 CORS 错误而不是认证错误

## 技术细节

### 中间件执行顺序问题

在 FastAPI 中：
- **中间件**按照添加的相反顺序执行（后进先出）
- **异常处理器**不是中间件，在中间件之外执行
- 当异常处理器返回响应时，CORS 中间件可能不会处理这个响应

### 修复方案

在所有异常处理器中手动添加 CORS 头，确保错误响应也包含正确的 CORS 头。

## 修复内容

### 1. 添加 CORS 头辅助函数

在 `backend-api/app/middleware/error_handler.py` 中添加：

```python
def add_cors_headers(response: JSONResponse, request: Request) -> JSONResponse:
    """
    为响应添加 CORS 头
    
    确保错误响应也包含正确的 CORS 头，避免浏览器阻止响应。
    """
    # 获取请求的 Origin
    origin = request.headers.get("origin")
    
    # 检查 Origin 是否在允许列表中
    if origin and origin in settings.cors_origins_list:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
    
    return response
```

### 2. 更新所有异常处理器

为以下 8 个异常处理器添加 CORS 头：

1. ✅ `api_exception_handler` - 自定义 API 异常（包括 401 未授权）
2. ✅ `validation_exception_handler` - Pydantic 验证异常
3. ✅ `integrity_error_handler` - 数据库完整性约束异常
4. ✅ `database_error_handler` - 数据库操作异常
5. ✅ `data_error_handler` - 数据类型错误
6. ✅ `sqlalchemy_error_handler` - 通用 SQLAlchemy 异常
7. ✅ `http_exception_handler` - FastAPI HTTP 异常
8. ✅ `generic_exception_handler` - 未捕获的通用异常

每个处理器在返回响应前都调用 `add_cors_headers(response, request)`。

## 验证结果

### 测试命令
```powershell
$headers = @{"Origin" = "http://localhost:5173"}
Invoke-WebRequest -Uri "http://localhost:8001/api/v1/workflows" -Headers $headers -Method GET
```

### 测试结果
```
Status: 401 Unauthorized

CORS Headers:
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
  Access-Control-Allow-Methods: *
  Access-Control-Allow-Headers: *
```

✅ **验证成功**：即使是 401 错误响应也包含了正确的 CORS 头

## 影响范围

### 修复的文件
- `backend-api/app/middleware/error_handler.py`

### 受益的场景
1. ✅ 认证失败（401）- 前端可以正确接收到认证错误
2. ✅ 权限不足（403）- 前端可以正确接收到权限错误
3. ✅ 资源不存在（404）- 前端可以正确接收到 404 错误
4. ✅ 数据验证失败（422）- 前端可以正确接收到验证错误
5. ✅ 服务器错误（500）- 前端可以正确接收到服务器错误
6. ✅ 所有其他错误响应

## 后续步骤

### 1. 前端认证问题

现在 CORS 问题已解决，前端会收到 401 错误：
```json
{
  "message": "操作失败",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "缺少认证令牌"
  }
}
```

**需要检查**：
- 前端是否正确存储和发送 JWT 令牌
- 前端的 HTTP 拦截器是否正确添加 `Authorization` 头
- 用户是否已登录

### 2. 权限系统问题

工作流路由当前使用 `get_current_user`（临时解决方案），禁用了权限检查。

**长期解决方案**：
- 运行数据库迁移创建 `role_permissions` 表
- 或使用 Prisma 同步数据库：`cd backend-api-deprecated && npx prisma db push`
- 恢复 `PermissionChecker` 权限检查功能

### 3. 其他路由检查

检查其他路由是否也使用了 `PermissionChecker` 并有相同问题。

## 总结

✅ **问题已解决**：所有错误响应现在都包含正确的 CORS 头

✅ **浏览器不再阻止错误响应**：前端可以正确接收和处理所有 HTTP 错误

✅ **后端自动重新加载**：修改已生效，无需手动重启

🔄 **下一步**：解决前端认证问题，确保前端正确发送 JWT 令牌

---

**修复时间**: 2026-05-08 15:54:24  
**修复人员**: Kiro AI Assistant  
**验证状态**: ✅ 已验证通过
