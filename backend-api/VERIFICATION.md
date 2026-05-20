# 项目验证指南

本文档说明如何验证 FastAPI 项目初始化是否成功。

## 前置条件

确保已安装以下软件：

- Python 3.11 或更高版本
- pip (Python 包管理器)
- PostgreSQL 14 或更高版本（可选，用于完整测试）

## 验证步骤

### 1. 检查 Python 版本

```bash
python --version
# 或
python3 --version
```

期望输出：`Python 3.11.x` 或更高版本

### 2. 创建虚拟环境

```bash
cd fastapi-backend

# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

期望输出：所有依赖包成功安装，无错误

### 4. 验证项目结构

检查以下目录和文件是否存在：

```
✓ app/
  ✓ api/v1/
  ✓ core/
    ✓ logging.py
  ✓ middleware/
  ✓ models/
  ✓ repositories/
  ✓ schemas/
  ✓ services/
  ✓ utils/
  ✓ config.py
  ✓ main.py
✓ tests/
  ✓ unit/
  ✓ integration/
  ✓ property/
  ✓ conftest.py
  ✓ test_basic.py
✓ alembic/
  ✓ env.py
✓ .env.example
✓ requirements.txt
✓ pyproject.toml
✓ Dockerfile
✓ docker-compose.yml
✓ README.md
✓ DEPLOYMENT.md
```

### 5. 运行基础测试

```bash
pytest tests/test_basic.py -v
```

期望输出：

```
tests/test_basic.py::test_root_endpoint PASSED
tests/test_basic.py::test_health_check PASSED
tests/test_basic.py::test_openapi_docs PASSED
tests/test_basic.py::test_cors_headers PASSED
tests/test_basic.py::test_app_metadata PASSED

====== 5 passed in X.XXs ======
```

### 6. 启动服务

```bash
uvicorn app.main:app --reload
```

期望输出：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 7. 访问 API 文档

在浏览器中访问以下 URL：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **健康检查**: http://localhost:8000/health

#### 健康检查响应示例

```json
{
  "status": "healthy",
  "service": "fastapi-backend",
  "version": "0.1.0"
}
```

### 8. 测试 API 端点

使用 curl 或 Postman 测试：

```bash
# 测试根路径
curl http://localhost:8000/

# 测试健康检查
curl http://localhost:8000/health

# 测试 OpenAPI 规范
curl http://localhost:8000/openapi.json
```

### 9. 验证配置文件

检查 `.env.example` 文件内容：

```bash
cat .env.example
```

确认包含以下配置项：

- ✓ DATABASE_URL
- ✓ JWT_SECRET_KEY
- ✓ CORS_ORIGINS
- ✓ LOG_LEVEL
- ✓ REDIS_URL (可选)

### 10. 验证日志系统

启动服务后，检查日志输出格式：

期望看到 JSON 格式的日志：

```json
{
  "timestamp": "2026-04-09T10:00:00.000Z",
  "level": "INFO",
  "logger": "app.main",
  "message": "Application startup complete",
  "module": "main",
  "function": "startup",
  "line": 42
}
```

## Docker 验证

### 1. 构建镜像

```bash
docker build -t fastapi-backend:latest .
```

期望输出：镜像构建成功，无错误

### 2. 运行容器

```bash
docker run -p 8000:8000 --env-file .env fastapi-backend:latest
```

### 3. 使用 docker-compose

```bash
docker-compose up -d
```

检查服务状态：

```bash
docker-compose ps
```

期望输出：所有服务状态为 `Up`

## 常见问题

### Python 未找到

**问题**: `python: command not found`

**解决方案**:
- Windows: 从 https://www.python.org/downloads/ 下载并安装 Python 3.11+
- Linux: `sudo apt-get install python3.11` 或 `sudo yum install python311`
- Mac: `brew install python@3.11`

### 依赖安装失败

**问题**: `pip install` 失败

**解决方案**:
1. 升级 pip: `pip install --upgrade pip`
2. 使用国内镜像: `pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`

### 端口被占用

**问题**: `Address already in use`

**解决方案**:
1. 更改端口: `uvicorn app.main:app --port 8001`
2. 或停止占用 8000 端口的进程

### 导入错误

**问题**: `ModuleNotFoundError`

**解决方案**:
1. 确保虚拟环境已激活
2. 重新安装依赖: `pip install -r requirements.txt`
3. 检查 PYTHONPATH

## 验证清单

完成以下检查项：

- [ ] Python 3.11+ 已安装
- [ ] 虚拟环境已创建并激活
- [ ] 所有依赖已安装
- [ ] 项目目录结构完整
- [ ] 基础测试全部通过
- [ ] 服务可以启动
- [ ] API 文档可以访问
- [ ] 健康检查端点正常
- [ ] 日志格式正确（JSON）
- [ ] 配置文件完整
- [ ] Docker 镜像可以构建（可选）
- [ ] docker-compose 可以运行（可选）

## 成功标准

如果以上所有验证步骤都通过，说明项目初始化成功，可以继续下一步开发。

## 下一步

项目初始化验证通过后，可以继续执行：

1. **任务 2**: 数据库连接和 ORM 配置
2. **任务 3**: Pydantic 模型和数据验证
3. **任务 4**: 核心异常和错误处理
4. **任务 5**: 认证和授权系统

## 获取帮助

如果遇到问题：

1. 查看 README.md 了解项目概述
2. 查看 DEPLOYMENT.md 了解部署详情
3. 检查日志文件查找错误信息
4. 联系开发团队获取支持
