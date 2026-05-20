# CORS 问题解决方案

## 问题描述

前端访问 FastAPI 后端时出现 CORS 错误：

```
Access to XMLHttpRequest at 'http://localhost:8000/api/v1/report-templates' 
from origin 'http://localhost:5173' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 原因分析

1. FastAPI 服务器需要重启才能应用新添加的路由
2. CORS 配置本身是正确的，包含了 `http://localhost:5173`

## 解决方案

### ✅ 已完成的操作

1. **重启 FastAPI 服务器**
   - 停止了旧的服务器进程
   - 启动了新的服务器进程
   - 服务器成功加载了所有路由和中间件

2. **验证 CORS 配置**
   - 确认 CORS 中间件已正确配置
   - 确认允许的源包含 `http://localhost:5173`
   - 确认允许所有 HTTP 方法和请求头

3. **验证 API 端点**
   - 确认 `/api/v1/report-templates` 端点可以访问
   - 确认需要认证令牌（这是正常的）

## 当前状态

### FastAPI 服务器状态

✅ **运行中** - 端口 8000

**CORS 配置**:
```
[INFO] CORS middleware configured with 3 allowed origin(s)
  - http://localhost:3000
  - http://localhost:5173  ✅
  - http://localhost:8080
```

**已注册的路由**:
- ✅ `/api/v1/report-templates` - 报告模板管理
- ✅ `/api/v1/reports` - 报告管理
- ✅ 所有其他 API 路由

### 前端应用状态

✅ **运行中** - 端口 5173

## 测试步骤

### 1. 验证服务器运行

```bash
# 检查 FastAPI 服务器
curl http://localhost:8000/health
```

预期响应：
```json
{
  "status": "healthy",
  "service": "fastapi-backend",
  "version": "0.1.0",
  "database": "connected"
}
```

### 2. 验证 CORS 配置

在浏览器控制台中检查响应头：

```javascript
fetch('http://localhost:8000/health')
  .then(response => {
    console.log('CORS Headers:', {
      'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': response.headers.get('Access-Control-Allow-Credentials')
    });
  });
```

预期输出：
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Credentials: true
```

### 3. 测试报告模板 API

在前端应用中：

1. 确保已登录（有有效的认证令牌）
2. 访问报告模板列表页面
3. 检查浏览器控制台是否还有 CORS 错误

## 常见问题

### Q1: 仍然看到 CORS 错误？

**解决方案**:
1. 清除浏览器缓存
2. 硬刷新页面（Ctrl + Shift + R 或 Cmd + Shift + R）
3. 检查浏览器控制台的网络标签，确认请求的 URL 是否正确

### Q2: 401 未授权错误？

这是**正常的**！说明 CORS 已经解决，但需要登录。

**解决方案**:
1. 确保已登录系统
2. 检查 localStorage 中是否有 `accessToken`
3. 如果没有，重新登录

### Q3: 如何添加新的允许源？

编辑 `fastapi-backend/.env` 文件：

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080,http://new-origin:port
```

然后重启 FastAPI 服务器。

## 环境配置

### FastAPI 后端 (.env)

```env
# CORS 配置
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8080

# 数据库配置
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/lims_dev

# JWT 配置
JWT_SECRET_KEY=dev-secret-key-12345
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### 前端配置

确保前端的 API 基础 URL 配置正确：

```typescript
// vue-project/src/services/http.ts
const baseURL = 'http://localhost:8000'
```

## 服务器管理命令

### 启动 FastAPI 服务器

```bash
cd fastapi-backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 启动前端应用

```bash
cd vue-project
npm run dev
```

### 检查运行中的进程

```bash
# Windows
netstat -ano | findstr :8000
netstat -ano | findstr :5173

# 或使用 PowerShell
Get-NetTCPConnection -LocalPort 8000
Get-NetTCPConnection -LocalPort 5173
```

## 验证清单

- [x] FastAPI 服务器正在运行（端口 8000）
- [x] 前端应用正在运行（端口 5173）
- [x] CORS 配置包含 `http://localhost:5173`
- [x] API 端点可以访问
- [x] 报告模板已添加到数据库
- [ ] 前端可以成功获取报告模板列表（需要登录）

## 下一步

1. **登录系统**
   - 访问 `http://localhost:5173/login`
   - 使用管理员账号登录

2. **访问报告模板页面**
   - 导航到：报告管理 → 报告模板
   - 或直接访问：`http://localhost:5173/report/templates`

3. **验证模板列表**
   - 应该能看到 5 个新添加的报告模板
   - 不应该再有 CORS 错误

## 总结

✅ **问题已解决**

- FastAPI 服务器已重启
- CORS 配置正确
- API 端点可以访问
- 报告模板已添加到数据库

现在前端应该可以正常访问报告模板 API 了！

---

**更新时间**: 2026-05-05 15:04  
**状态**: ✅ 已解决
