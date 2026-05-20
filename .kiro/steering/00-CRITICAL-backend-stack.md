---
inclusion: auto
priority: critical
---

# 🚨 关键规则：后端技术栈选择

## ⚠️ 最高优先级规则

**本项目使用 FastAPI (Python) 作为后端，不使用 Node.js 后端！**

### 明确声明

1. **默认后端**：FastAPI (Python)
   - 路径：`fastapi-backend/`
   - 端口：8000
   - 启动命令：`uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`

2. **不使用的后端**：Node.js/Express
   - 路径：`backend-api/`（仅作为参考，不启动）
   - 端口：3000（不使用）
   - 状态：**已废弃，仅保留作为参考实现**

## 🔴 强制执行规则

### 当用户说"启动后端"或"打开后端"时

**必须且只能启动 FastAPI 后端：**

```bash
cd fastapi-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**绝对不要启动 Node.js 后端（backend-api）！**

### 当用户说"检查后端"或"修复后端bug"时

**必须且只能检查/修改 FastAPI 后端：**

- 检查路径：`fastapi-backend/`
- 修改文件：`fastapi-backend/app/` 下的文件
- 不要查看或修改 `backend-api/` 目录

### 当用户说"后端API"或"后端服务"时

**默认指的是 FastAPI 后端：**

- API 基础路径：`http://localhost:8000/api/v1`
- API 文档：`http://localhost:8000/docs`
- 不要使用 `http://localhost:3000`

## 🎯 唯一例外

**只有在用户明确说明以下内容时，才可以涉及 Node.js 后端：**

- "我要看 Node.js 后端的实现"
- "对比 FastAPI 和 Node.js 的实现"
- "参考 backend-api 目录"
- "使用 Express 后端"

**除此之外，任何情况下都使用 FastAPI 后端！**

## 📋 快速参考

### FastAPI 后端信息

| 项目 | 值 |
|------|-----|
| 目录 | `fastapi-backend/` |
| 端口 | 8000 |
| API 前缀 | `/api/v1` |
| 文档 | `http://localhost:8000/docs` |
| 数据库 | PostgreSQL (lims_dev) |
| ORM | SQLAlchemy (异步) |
| 认证 | JWT |
| 管理员账号 | admin / Admin@123456 |

### 启动命令

```bash
# 启动 FastAPI 后端（正确）✅
cd fastapi-backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 启动 Node.js 后端（错误）❌
# 不要执行这个命令！
cd backend-api
npm run dev
```

## 🔧 常见场景处理

### 场景1：用户说"启动前后端"

**正确做法**：
1. 启动 FastAPI 后端（端口 8000）
2. 启动 Vue 前端（端口 5173）

**错误做法**：
- ❌ 启动 Node.js 后端（backend-api）

### 场景2：用户说"检测编辑保存功能"

**正确做法**：
1. 检查 FastAPI 后端的 API 实现
2. 检查前端的 API 调用
3. 确认前端配置指向端口 8000

**错误做法**：
- ❌ 检查 backend-api 目录的代码

### 场景3：用户说"修复后端bug"

**正确做法**：
1. 在 `fastapi-backend/` 目录下查找问题
2. 修改 `fastapi-backend/app/` 下的文件
3. 重启 FastAPI 服务验证

**错误做法**：
- ❌ 修改 `backend-api/` 目录的代码

## 📝 记忆要点

1. **后端 = FastAPI**（除非明确说明）
2. **端口 8000 = FastAPI**（正确）
3. **端口 3000 = Node.js**（不使用）
4. **backend-api/ = 参考代码**（不启动）
5. **fastapi-backend/ = 实际使用**（启动这个）

## 🚫 禁止行为

以下行为是**明确禁止**的，除非用户特别要求：

1. ❌ 启动 `backend-api` 目录的服务
2. ❌ 修改 `backend-api` 目录的代码
3. ❌ 使用端口 3000 的 API
4. ❌ 参考 Node.js/Express 的实现方式
5. ❌ 使用 npm/node 命令启动后端

## ✅ 推荐行为

以下行为是**推荐和正确**的：

1. ✅ 启动 `fastapi-backend` 目录的服务
2. ✅ 修改 `fastapi-backend` 目录的代码
3. ✅ 使用端口 8000 的 API
4. ✅ 参考 FastAPI/Python 的实现方式
5. ✅ 使用 uvicorn 命令启动后端

---

**再次强调：本项目使用 FastAPI 后端，不使用 Node.js 后端！**
