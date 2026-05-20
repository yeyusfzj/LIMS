# CORS 问题排查指南

**时间**: 2026-05-08 15:20  
**状态**: 后端 CORS 配置正确，前端可能有缓存问题

## 问题现状

### 后端状态 ✅
- CORS 配置正确
- 预检请求（OPTIONS）正常返回 CORS 头
- 实际请求（GET）正常返回 CORS 头
- 响应头包含：
  - `access-control-allow-origin: http://localhost:5173`
  - `access-control-allow-credentials: true`
  - `access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT`

### 前端问题 ⚠️
前端仍然报告 CORS 错误：
```
Access to XMLHttpRequest at 'http://localhost:8001/api/v1/workflows' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```

## 可能的原因

### 1. 浏览器缓存 🔴
浏览器可能缓存了旧的 CORS 响应（当时后端还没有正确配置）

### 2. 前端连接到旧的后端进程 🔴
前端可能还在尝试连接之前的后端进程

### 3. 浏览器扩展干扰 🔴
某些浏览器扩展可能会干扰 CORS 请求

## 解决方案

### 方案 1: 清除浏览器缓存（推荐）⭐

#### Chrome/Edge
1. 打开开发者工具（F12）
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

或者：
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存的图片和文件"
3. 点击"清除数据"

#### Firefox
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存"
3. 点击"立即清除"

### 方案 2: 使用无痕模式测试

1. 打开无痕/隐私浏览窗口
2. 访问 http://localhost:5173
3. 测试功能是否正常

### 方案 3: 禁用浏览器扩展

1. 打开扩展管理页面
2. 暂时禁用所有扩展
3. 刷新页面测试

### 方案 4: 重启前端服务

```bash
# 停止前端（在 Terminal 3 中按 Ctrl+C）
# 然后重新启动
cd vue-project
npm run dev
```

### 方案 5: 使用测试页面验证

打开 `test-cors.html` 文件在浏览器中测试：
```
file:///D:/data/test-cors.html
```

点击测试按钮，查看 CORS 是否正常工作。

## 验证步骤

### 1. 打开浏览器开发者工具
按 F12 打开开发者工具

### 2. 查看 Network 标签
1. 切换到 Network 标签
2. 刷新页面
3. 找到失败的请求

### 3. 检查请求详情
点击失败的请求，查看：
- **Headers** 标签：
  - Request Headers 中是否有 `Origin: http://localhost:5173`
  - Response Headers 中是否有 `access-control-allow-origin`

### 4. 检查 Console 标签
查看是否有其他错误信息

## 测试命令

### 使用 curl 测试（PowerShell）

```powershell
# 测试健康检查
Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET -Headers @{"Origin"="http://localhost:5173"} -UseBasicParsing

# 测试 OPTIONS 预检
Invoke-WebRequest -Uri "http://localhost:8001/api/v1/workflows" -Method OPTIONS -Headers @{"Origin"="http://localhost:5173"; "Access-Control-Request-Method"="GET"} -UseBasicParsing

# 测试工作流 API
Invoke-WebRequest -Uri "http://localhost:8001/api/v1/workflows" -Method GET -Headers @{"Origin"="http://localhost:5173"} -UseBasicParsing
```

## 当前后端配置

### CORS 源列表
```
✓ http://localhost:3000
✓ http://localhost:5173  ← 您的前端地址
✓ http://localhost:8080
```

### CORS 策略
- **允许的方法**: 所有 HTTP 方法
- **允许的头**: 所有请求头
- **允许凭证**: 是
- **预检缓存**: 1 小时

## 如果问题仍然存在

### 检查前端配置

1. 检查前端的 API 基础地址：
```typescript
// vue-project/src/services/index.ts
const API_BASE_URL = 'http://localhost:8001'
```

2. 检查前端的 axios 配置：
```typescript
// 确保 withCredentials 设置正确
axios.defaults.withCredentials = true
```

### 检查后端日志

查看后端日志中是否有请求记录：
```bash
# 在 Terminal 4 中查看日志
# 应该看到类似这样的日志：
[INFO] ... [REQUEST] ... GET /api/v1/workflows from 127.0.0.1
[INFO] ... [RESPONSE] ... 401 in 2.00ms
```

### 联系支持

如果以上方法都无效，请提供：
1. 浏览器类型和版本
2. 开发者工具 Network 标签的截图
3. 开发者工具 Console 标签的错误信息
4. 后端日志中的相关请求记录

## 快速修复清单

- [ ] 清除浏览器缓存（Ctrl+Shift+Delete）
- [ ] 硬性重新加载页面（Ctrl+F5）
- [ ] 使用无痕模式测试
- [ ] 禁用浏览器扩展
- [ ] 重启前端服务
- [ ] 使用 test-cors.html 测试
- [ ] 检查浏览器开发者工具
- [ ] 检查后端日志

## 预期结果

修复后，您应该看到：
- ✅ 工作流模板列表正常加载
- ✅ 审核任务列表正常加载
- ✅ 没有 CORS 错误
- ✅ 只有 401 认证错误（这是正常的，需要登录）

---

**重要提示**: 后端 CORS 配置已经正确，问题很可能是浏览器缓存。请先尝试清除缓存并硬性重新加载页面。
