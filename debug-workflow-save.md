# 工作流模板保存 403 错误调试指南

## 问题分析

您遇到的 403 Forbidden 错误可能由以下原因造成：

### 1. 认证问题
- 用户未登录或 token 过期
- token 格式不正确

### 2. 权限问题  
- 用户角色缺少 `workflow:create` 权限
- 权限中间件配置错误

### 3. 数据格式问题
- 前端发送的数据格式与后端验证器不匹配

## 解决步骤

### 步骤 1: 检查用户登录状态

1. 打开浏览器开发者工具 (F12)
2. 切换到 Application/存储 标签
3. 检查 localStorage 中是否有以下项目：
   - `accessToken`
   - `user`

如果没有这些项目，说明用户未登录，需要重新登录。

### 步骤 2: 检查网络请求

1. 在开发者工具中切换到 Network 标签
2. 尝试保存工作流模板
3. 查看发送的请求：
   - 请求 URL 应该是: `http://localhost:3000/api/workflows`
   - 请求方法应该是: `POST`
   - 请求头应该包含: `Authorization: Bearer <token>`

### 步骤 3: 验证用户权限

使用以下测试用户登录：
- **管理员账号**: `admin` / `Admin@123456` (拥有所有权限)
- **技术员账号**: `testuser` / `User@123456` (拥有 workflow:create 权限)

### 步骤 4: 检查数据格式

确保前端发送的数据格式正确：

```json
{
  "name": "模板名称",
  "description": "模板描述",
  "config": {
    "nodes": [
      {
        "id": "node-1",
        "type": "START",
        "name": "开始节点",
        "description": "开始节点",
        "config": {}
      }
    ],
    "edges": [
      {
        "id": "edge-1",
        "source": "node-1",
        "target": "node-2",
        "condition": "",
        "label": ""
      }
    ]
  }
}
```

## 快速修复方案

### 方案 1: 重新登录
1. 退出当前账号
2. 使用管理员账号 `admin` / `Admin@123456` 重新登录
3. 尝试保存工作流模板

### 方案 2: 清除浏览器缓存
1. 按 Ctrl+Shift+Delete 打开清除浏览器数据对话框
2. 选择清除缓存和 Cookie
3. 重新登录并尝试保存

### 方案 3: 检查后端服务
确保后端服务正在运行：
```bash
cd backend-api
npm run dev
```

## 常见错误信息对照

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| 403 Forbidden | 权限不足 | 使用有权限的账号登录 |
| 401 Unauthorized | 未认证 | 重新登录 |
| 400 Bad Request | 数据格式错误 | 检查请求数据格式 |
| 500 Internal Server Error | 服务器错误 | 检查后端日志 |

## 调试命令

### 检查后端服务状态
```bash
# 检查服务是否运行
netstat -an | findstr :3000

# 查看后端日志
cd backend-api
npm run dev
```

### 重新初始化数据库
```bash
cd backend-api
npx prisma db push
npx prisma db seed
```

## 联系支持

如果以上步骤都无法解决问题，请提供以下信息：
1. 浏览器控制台的完整错误信息
2. Network 标签中的请求详情
3. 当前使用的用户账号
4. 后端服务的日志输出