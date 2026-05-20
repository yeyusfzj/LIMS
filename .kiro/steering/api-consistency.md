---
inclusion: auto
---

# API 一致性规则

## 前后端 HTTP 方法一致性

**重要原则：前端 API 调用必须与后端 API 端点使用相同的 HTTP 方法。**

## RESTful API 标准

### HTTP 方法语义

1. **GET**: 查询资源
   - 幂等操作（多次调用结果相同）
   - 不修改服务器状态
   - 可以被缓存

2. **POST**: 创建新资源
   - 非幂等操作
   - 创建新的资源实例
   - 返回新创建的资源

3. **PUT**: 完整替换资源
   - 幂等操作
   - 需要提供资源的所有字段
   - 如果资源不存在，可能创建新资源

4. **PATCH**: 部分更新资源
   - 幂等操作（通常）
   - 只更新提供的字段
   - 其他字段保持不变

5. **DELETE**: 删除资源
   - 幂等操作
   - 删除指定的资源
   - 返回删除结果

## FastAPI 后端 API 规范

### 样品管理 API

**端点**: `/api/v1/samples`

| 操作 | HTTP 方法 | 路径 | 说明 |
|------|----------|------|------|
| 创建样品 | POST | `/samples` | 创建新样品 |
| 查询列表 | GET | `/samples` | 分页查询样品列表 |
| 查询详情 | GET | `/samples/{id}` | 获取单个样品详情 |
| 更新样品 | **PATCH** | `/samples/{id}` | **部分更新样品信息** |
| 删除样品 | DELETE | `/samples/{id}` | 软删除样品 |
| 更新状态 | PATCH | `/samples/{id}/status` | 更新样品状态 |
| 按条码查询 | GET | `/samples/barcode/{barcode}` | 按条码查询 |
| 批量删除 | POST | `/samples/batch-delete` | 批量删除样品 |

**注意**：样品更新使用 **PATCH** 方法，不是 PUT 方法。

### 其他模块 API

根据 FastAPI 后端的实现，其他模块也遵循类似的规范：

- **认证 API**: POST `/auth/login`, POST `/auth/refresh`
- **用户管理**: GET/POST/PATCH/DELETE `/users`
- **角色管理**: GET/POST/PATCH/DELETE `/roles`
- **审核管理**: GET/POST/PATCH/DELETE `/audits`
- **报告管理**: GET/POST/PATCH/DELETE `/reports`

## 前端 API 服务规范

### 文件位置

前端 API 服务文件位于：`vue-project/src/services/api/`

### 命名规范

```typescript
class SampleApi {
  async getList(params): Promise<PageResponse<Sample>> {
    return http.get('/samples', { params })
  }

  async getById(id: string): Promise<Sample> {
    return http.get(`/samples/${id}`)
  }

  async create(data): Promise<Sample> {
    return http.post('/samples', data)
  }

  async update(data): Promise<Sample> {
    const { id, ...updateData } = data
    // 使用 PATCH 方法，不是 PUT
    return http.patch(`/samples/${id}`, updateData)
  }

  async delete(id: string): Promise<void> {
    return http.delete(`/samples/${id}`)
  }
}
```

### HTTP 客户端方法

`vue-project/src/services/http.ts` 提供以下方法：

```typescript
class HttpClient {
  get<T>(url: string, config?: RequestConfig): Promise<T>
  post<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  put<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  patch<T>(url: string, data?: any, config?: RequestConfig): Promise<T>
  delete<T>(url: string, config?: RequestConfig): Promise<T>
}
```

## 常见错误和解决方案

### 错误 1: 405 Method Not Allowed

**症状**：
```
HTTP 405 Method Not Allowed
```

**原因**：
- 前端使用的 HTTP 方法与后端不匹配
- 例如：前端使用 PUT，后端只支持 PATCH

**解决方案**：
1. 检查后端 API 端点支持的 HTTP 方法
2. 修改前端代码，使用正确的 HTTP 方法
3. 参考 FastAPI 的 `/docs` 端点查看 API 规范

**示例**：
```typescript
// ❌ 错误：使用 PUT 方法
async update(data) {
  return http.put(`/samples/${id}`, data)
}

// ✅ 正确：使用 PATCH 方法
async update(data) {
  return http.patch(`/samples/${id}`, data)
}
```

### 错误 2: 404 Not Found

**症状**：
```
HTTP 404 Not Found
```

**原因**：
- API 路径不正确
- 缺少路径参数
- 路由未注册

**解决方案**：
1. 检查 API 路径是否正确
2. 确认路径参数是否正确传递
3. 查看 FastAPI 的 `/docs` 端点确认路由

### 错误 3: 400 Bad Request

**症状**：
```
HTTP 400 Bad Request
```

**原因**：
- 请求参数格式不正确
- 缺少必填参数
- 参数类型不匹配

**解决方案**：
1. 检查请求参数格式
2. 确认所有必填参数都已提供
3. 检查参数类型是否正确

## 开发流程

### 1. 后端 API 开发

1. 在 `fastapi-backend/app/api/v1/` 或 `fastapi-backend/app/routers/` 创建路由
2. 使用正确的 HTTP 方法装饰器：
   ```python
   @router.get("/samples")
   @router.post("/samples")
   @router.patch("/samples/{sample_id}")
   @router.delete("/samples/{sample_id}")
   ```
3. 编写 API 文档注释
4. 测试 API 端点

### 2. 前端 API 服务开发

1. 在 `vue-project/src/services/api/` 创建或修改 API 服务文件
2. 使用与后端相同的 HTTP 方法：
   ```typescript
   async update(data) {
     // 后端使用 PATCH，前端也使用 PATCH
     return http.patch(`/samples/${id}`, data)
   }
   ```
3. 添加 TypeScript 类型定义
4. 编写单元测试

### 3. 集成测试

1. 创建集成测试脚本（如 `test-sample-update.js`）
2. 测试前后端 API 调用
3. 验证 HTTP 方法是否匹配
4. 验证请求和响应格式

## 检查清单

在开发或修复 API 相关问题时，请检查：

- [ ] 前端使用的 HTTP 方法与后端一致
- [ ] API 路径正确（包括路径参数）
- [ ] 请求参数格式正确
- [ ] 响应数据格式正确
- [ ] 错误处理完善
- [ ] 添加了类型定义
- [ ] 编写了测试用例
- [ ] 更新了 API 文档

## 参考资源

### FastAPI 文档

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 代码位置

- 后端路由：`fastapi-backend/app/api/v1/` 和 `fastapi-backend/app/routers/`
- 前端 API 服务：`vue-project/src/services/api/`
- HTTP 客户端：`vue-project/src/services/http.ts`
- 类型定义：`vue-project/src/types/`

## 总结

**核心原则：前端 API 调用必须与后端 API 端点使用相同的 HTTP 方法。**

遵循这个原则可以避免：
- 405 Method Not Allowed 错误
- API 调用失败
- 前后端不一致
- 维护困难

在开发新功能或修复 Bug 时，始终先检查后端 API 的 HTTP 方法，然后在前端使用相同的方法。
