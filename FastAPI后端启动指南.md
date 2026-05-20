# FastAPI 后端启动指南

## 快速启动

### 1. 确保数据库运行
```bash
# PostgreSQL 应该已经在运行
# 数据库: lims_dev
# 端口: 5432
```

### 2. 激活虚拟环境
```bash
cd fastapi-backend
venv\Scripts\activate  # Windows
```

### 3. 启动 FastAPI 服务
```bash
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 验证服务运行
访问: http://localhost:8000/docs

## 服务信息

### 端口配置
- **FastAPI 后端**: http://localhost:8000
- **Vue 前端**: http://localhost:5173
- **Node.js 后端**: http://localhost:3000 (如果需要认证功能)

### API 文档
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### 健康检查
```bash
# 基础健康检查
curl http://localhost:8000/health

# 详细健康检查
curl http://localhost:8000/api/v1/health
```

## 环境配置

### .env 文件
位置: `fastapi-backend/.env`

```env
# 数据库配置
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/lims_dev

# JWT 配置
JWT_SECRET_KEY=dev-secret-key-12345
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000

# 日志配置
LOG_LEVEL=INFO

# 限流配置
RATE_LIMIT_PER_MINUTE=60
```

## 常用命令

### 启动服务（开发模式）
```bash
cd fastapi-backend
venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 启动服务（生产模式）
```bash
cd fastapi-backend
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 运行测试
```bash
cd fastapi-backend
venv\Scripts\python.exe -m pytest
```

### 查看日志
服务日志会输出到控制台，包含：
- 请求日志
- 错误日志
- 数据库查询日志

## 故障排查

### 问题 1: 数据库连接失败
**症状**: 启动时显示 "Database connection: FAILED"

**解决方案**:
1. 检查 PostgreSQL 是否运行
2. 验证 `.env` 中的 `DATABASE_URL` 配置
3. 确认数据库 `lims_dev` 已创建
4. 检查数据库用户权限

### 问题 2: 端口被占用
**症状**: "Address already in use"

**解决方案**:
```bash
# 查找占用端口的进程
netstat -ano | findstr :8000

# 结束进程
taskkill /PID <进程ID> /F

# 或使用不同端口
uvicorn app.main:app --port 8001
```

### 问题 3: 模块导入错误
**症状**: "ModuleNotFoundError" 或 "ImportError"

**解决方案**:
```bash
# 重新安装依赖
cd fastapi-backend
venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 问题 4: CORS 错误
**症状**: 前端请求被 CORS 策略阻止

**解决方案**:
1. 检查 `.env` 中的 `CORS_ORIGINS` 配置
2. 确保包含前端地址（如 http://localhost:5173）
3. 重启 FastAPI 服务

## 开发建议

### 1. 使用自动重载
开发时使用 `--reload` 参数，代码修改后自动重启：
```bash
uvicorn app.main:app --reload
```

### 2. 查看 API 文档
访问 http://localhost:8000/docs 查看所有可用端点

### 3. 测试 API
使用 Swagger UI 的 "Try it out" 功能测试 API

### 4. 查看日志
观察控制台输出，了解请求处理过程

## 与前端集成

### 前端配置
在 Vue 项目中配置 API 基础地址：

```typescript
// vue-project/src/services/http.ts
const API_BASE_URL = 'http://localhost:8000/api/v1';
```

### 认证流程
由于 FastAPI 后端未实现认证端点，建议：

**方案 1: 混合架构**（推荐）
- 登录使用 Node.js 后端: `http://localhost:3000/api/auth/login`
- 样品管理使用 FastAPI 后端: `http://localhost:8000/api/v1/samples`

**方案 2: 完整 FastAPI**
- 在 FastAPI 中实现认证端点
- 前端完全使用 FastAPI 后端

## 性能优化

### 1. 连接池配置
在 `.env` 中调整：
```env
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

### 2. 限流配置
调整请求限制：
```env
RATE_LIMIT_PER_MINUTE=100
```

### 3. 日志级别
生产环境使用 WARNING 或 ERROR：
```env
LOG_LEVEL=WARNING
```

## 部署建议

### Docker 部署
```bash
# 构建镜像
docker build -t fastapi-backend:latest .

# 运行容器
docker run -d \
  -p 8000:8000 \
  --env-file .env \
  --name fastapi-backend \
  fastapi-backend:latest
```

### 使用 Gunicorn
```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000
```

## 监控和维护

### 健康检查
定期检查服务状态：
```bash
curl http://localhost:8000/health
```

### 日志监控
观察错误日志，及时发现问题

### 性能监控
- 监控响应时间
- 监控数据库连接池
- 监控内存使用

## 相关文档

- [FastAPI 官方文档](https://fastapi.tiangolo.com/)
- [SQLAlchemy 文档](https://docs.sqlalchemy.org/)
- [Pydantic 文档](https://docs.pydantic.dev/)
- [Uvicorn 文档](https://www.uvicorn.org/)

## 支持

如有问题，请查看：
1. FastAPI后端测试报告.md
2. fastapi-backend/README.md
3. 项目 Issues
