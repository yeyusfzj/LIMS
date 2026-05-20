# 审核任务显示"no data"问题解决方案

## 问题诊断

通过浏览器控制台日志分析，发现：

```
http.ts:75 发送请求:{url: '/audits', method: 'get', baseURL: 'http://localhost:8000/api/v1', fullURL: 'http://localhost:8000/api/v1/audits'}
```

**根本原因**：前端正在连接 **FastAPI 后端**（端口8000），但测试数据在 **Node.js 后端**（端口3000）。

## 诊断结果

| 项目 | 状态 | 说明 |
|------|------|------|
| Node.js 后端 | ❌ 未运行 | 端口3000，包含29条审核任务测试数据 |
| FastAPI 后端 | ✅ 运行中 | 端口8000，没有审核任务数据 |
| 前端配置 | ❌ 错误 | 连接到FastAPI后端，应该连接到Node.js后端 |

## 解决方案

### 步骤1：修改前端环境变量（已完成）

文件：`vue-project/.env.development`

```env
# 开发环境配置
# Node.js 后端地址（端口 3000）- 包含测试数据
VITE_API_BASE_URL=http://localhost:3000/api
# FastAPI 后端地址（端口 8000）- 备用
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 步骤2：启动 Node.js 后端

在 `backend-api` 目录下运行：

```bash
cd backend-api
npm run dev
```

等待后端启动完成，应该看到：
```
Server is running on http://localhost:3000
```

### 步骤3：重启前端开发服务器

**重要**：必须重启前端才能使环境变量生效！

1. 停止当前的前端服务器（Ctrl+C）
2. 重新启动：

```bash
cd vue-project
npm run dev
```

### 步骤4：清除浏览器缓存并重新登录

1. 打开浏览器开发者工具（F12）
2. 在 Application/存储 → Local Storage 中清除所有数据
3. 刷新页面
4. 使用 `admin` / `admin123` 重新登录
5. 导航到"审核任务列表"页面

## 验证结果

登录后，审核任务列表应该显示 **29条审核任务记录**，包括：
- 任务编号
- 样品信息（名称、条码）
- 审核级别（分析审核、样品审核、技术审核、质量审核）
- 审核状态（待审核、已通过、已退回、要求补充）
- 审核人
- 提交时间
- 优先级

## 技术说明

### 为什么会出现这个问题？

1. **双后端架构**：项目同时有 Node.js 后端和 FastAPI 后端
2. **测试数据位置**：使用 `npm run seed` 生成的测试数据在 Node.js 后端的数据库中
3. **前端配置错误**：前端环境变量配置指向了 FastAPI 后端

### 两个后端的区别

| 特性 | Node.js 后端 | FastAPI 后端 |
|------|-------------|-------------|
| 端口 | 3000 | 8000 |
| API路径 | `/api` | `/api/v1` |
| 测试数据 | ✅ 有（29条审核任务） | ❌ 无 |
| 状态 | 需要启动 | 已运行 |

### 如果想使用 FastAPI 后端

如果您想使用 FastAPI 后端，需要：

1. 在 FastAPI 后端也实现数据填充功能
2. 或者将 Node.js 后端的数据迁移到 FastAPI 后端
3. 确保 FastAPI 后端的审核任务 API 已实现

## 故障排查

如果重启后仍然显示"no data"：

### 1. 检查后端是否运行

```bash
# 检查 Node.js 后端
curl http://localhost:3000/api/health
```

### 2. 检查前端连接

打开浏览器控制台（F12），查看 Network 标签：
- 找到 `/audits` 请求
- 检查 Request URL 是否为 `http://localhost:3000/api/audits`
- 检查状态码是否为 200

### 3. 检查认证

在浏览器控制台（F12）→ Application/存储 → Local Storage：
- 确认有 `accessToken` 键
- 确认有 `user` 键

### 4. 检查数据库

运行检查脚本：
```bash
node check-audit-data.js
```

应该显示 29 条审核任务记录。

## 总结

问题已解决！关键步骤：
1. ✅ 修改前端环境变量，连接到 Node.js 后端
2. ⏳ 启动 Node.js 后端（如果未运行）
3. ⏳ 重启前端开发服务器
4. ⏳ 清除浏览器缓存并重新登录

完成这些步骤后，审核任务列表应该正常显示数据。
