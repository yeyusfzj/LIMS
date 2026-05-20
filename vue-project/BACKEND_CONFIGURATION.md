# 后端配置说明

## 当前后端架构

本项目的前端 (Vue 3) 连接到 **FastAPI 后端**。

### 后端目录结构

```
项目根目录/
├── backend-api/              ← 当前使用的 FastAPI 后端 (主后端)
│   ├── app/
│   │   ├── main.py          # FastAPI 应用入口
│   │   ├── agent/           # AI Agent 模块
│   │   └── ...
│   └── requirements.txt
│
├── backend-api-deprecated/   ← 旧的 Node.js/Express 后端 (已弃用)
│   └── ...
│
└── vue-project/              ← Vue 3 前端
    ├── src/
    └── .env.development      # 配置后端 URL
```

## 后端服务配置

### FastAPI 后端 (当前使用)

- **目录**: `backend-api/`
- **端口**: `8001`
- **API 基础路径**: `http://localhost:8001/api/v1`
- **API 文档**: `http://localhost:8001/docs`
- **启动命令**:
  ```bash
  cd backend-api
  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
  ```

### 旧后端 (已弃用)

- **目录**: `backend-api-deprecated/`
- **端口**: `8000`
- **状态**: 已弃用，不再使用

## 前端配置

### 环境变量

前端通过环境变量配置后端 URL：

**开发环境** (`.env.development`):
```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
```

**生产环境** (`.env.production`):
```env
VITE_API_BASE_URL=/api/v1
```

### HTTP 客户端配置

文件: `vue-project/src/services/http.ts`

```typescript
this.instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## API 端点映射

### AI Agent 相关 API

前端服务: `vue-project/src/services/api/agent.ts`

| 前端方法 | API 端点 | 后端实现 |
|---------|---------|---------|
| `parseExperiment()` | `POST /api/agent/parse` | `backend-api/app/agent/routes.py` |
| `generatePlan()` | `POST /api/agent/plan` | `backend-api/app/agent/routes.py` |
| `askQuestion()` | `POST /api/agent/qa` | `backend-api/app/agent/routes.py` |
| `analyzeResult()` | `POST /api/agent/result-analysis` | `backend-api/app/agent/routes.py` |
| `healthCheck()` | `GET /api/agent/health` | `backend-api/app/agent/routes.py` |

### 样品管理 API

前端服务: `vue-project/src/services/api/sample.ts`

| 前端方法 | API 端点 | 后端实现 |
|---------|---------|---------|
| `getList()` | `GET /samples` | `backend-api/app/samples/routes.py` |
| `getById()` | `GET /samples/{id}` | `backend-api/app/samples/routes.py` |
| `create()` | `POST /samples` | `backend-api/app/samples/routes.py` |
| `update()` | `PATCH /samples/{id}` | `backend-api/app/samples/routes.py` |
| `delete()` | `DELETE /samples/{id}` | `backend-api/app/samples/routes.py` |

### 工作流管理 API

前端服务: `vue-project/src/services/api/workflow.ts`

| 前端方法 | API 端点 | 后端实现 |
|---------|---------|---------|
| `getList()` | `GET /workflows` | `backend-api/app/workflows/routes.py` |
| `getById()` | `GET /workflows/{id}` | `backend-api/app/workflows/routes.py` |
| `create()` | `POST /workflows` | `backend-api/app/workflows/routes.py` |
| `update()` | `PUT /workflows/{id}` | `backend-api/app/workflows/routes.py` |
| `delete()` | `DELETE /workflows/{id}` | `backend-api/app/workflows/routes.py` |

### 用户管理 API

前端服务: `vue-project/src/services/api/user.ts`

| 前端方法 | API 端点 | 后端实现 |
|---------|---------|---------|
| `getCurrentUser()` | `GET /users/me` | `backend-api/app/users/routes.py` |
| `getList()` | `GET /users` | `backend-api/app/users/routes.py` |
| `create()` | `POST /users` | `backend-api/app/users/routes.py` |
| `update()` | `PUT /users/{id}` | `backend-api/app/users/routes.py` |
| `delete()` | `DELETE /users/{id}` | `backend-api/app/users/routes.py` |

## 如何切换后端

### 方法 1: 修改环境变量 (推荐)

编辑 `vue-project/.env.development`:

```env
# 使用 backend-api (端口 8001) - FastAPI 后端
VITE_API_BASE_URL=http://localhost:8001/api/v1

# 或使用 backend-api-deprecated (端口 8000) - 旧的 Node.js 后端（不推荐）
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

### 方法 2: 修改 http.ts 默认值

编辑 `vue-project/src/services/http.ts`:

```typescript
baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api/v1'
```

## 启动顺序

### 方法 1: 使用启动脚本（推荐）

**Windows:**
```bash
start-dev.bat
```

**Linux/Mac:**
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 方法 2: 手动启动

1. **启动 FastAPI 后端**:
   ```bash
   cd backend-api
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
   ```

2. **启动 Vue 前端**:
   ```bash
   cd vue-project
   npm run dev
   ```

3. **访问应用**:
   - 前端: http://localhost:5173/
   - 后端 API 文档: http://localhost:8001/docs

## 验证连接

### 方法 1: 浏览器控制台

打开浏览器开发者工具，查看 Network 标签，确认请求发送到 `http://localhost:8001`。

### 方法 2: 健康检查

访问: http://localhost:8001/health

应该返回:
```json
{
  "status": "healthy",
  "service": "laboratory-management-system"
}
```

### 方法 3: 前端日志

前端启动时会在控制台输出:
```
HTTP客户端初始化，API基础URL: http://localhost:8001/api/v1
```

## 常见问题

### Q: 前端无法连接到后端

**A**: 检查以下几点:
1. FastAPI 后端是否正在运行 (端口 8001)
2. 环境变量配置是否正确
3. 浏览器控制台是否有 CORS 错误
4. 防火墙是否阻止了连接

### Q: API 返回 404 错误

**A**: 
1. 检查 API 端点路径是否正确
2. 访问 http://localhost:8001/docs 查看可用的 API 端点
3. 确认后端路由配置正确

### Q: CORS 错误

**A**: 
FastAPI 后端需要配置 CORS 中间件:

```python
# backend-api/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **UI 库**: Element Plus
- **状态管理**: Pinia
- **HTTP 客户端**: Axios
- **构建工具**: Vite

### 后端
- **框架**: FastAPI
- **语言**: Python 3.9+
- **数据库**: SQLite / PostgreSQL
- **ORM**: SQLAlchemy
- **文档**: OpenAPI (Swagger)

## 更新日志

### 2026-05-07
- ✅ 目录重命名优化
  - `fastapi-backend/` → `backend-api/` (主后端)
  - `backend-api/` → `backend-api-deprecated/` (旧后端)
- ✅ 创建启动脚本 `start-dev.bat` 和 `start-dev.sh`
- ✅ 将前端从 backend-api-deprecated (端口 8000) 迁移到 backend-api (端口 8001)
- ✅ 更新 `.env.development` 配置
- ✅ 创建本配置文档

### 2026-05-06
- ✅ 完成 AI Agent 模块开发
- ✅ 实现前端 UI 组件
- ✅ 集成 Pinia 状态管理

## 相关文档

- [FastAPI 后端设计](../FastAPI后端设计.md)
- [前端设计](../前端设计.md)
- [AI Agent 需求文档](.kiro/specs/local-ai-agent/requirements.md)
- [AI Agent 设计文档](.kiro/specs/local-ai-agent/design.md)

---

**最后更新**: 2026-05-07  
**维护者**: 开发团队  
**状态**: ✅ 已配置并验证
