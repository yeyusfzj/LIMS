# 任务 2.1 验证指南

## 任务概述

任务 2.1: 配置 SQLAlchemy 异步引擎和连接池

**验证需求**: 2.1, 2.3, 13.2

## 实现的文件

### 核心实现

1. **`app/core/database.py`** - 数据库连接模块
   - `get_engine()` - 创建异步引擎
   - `get_session_factory()` - 创建会话工厂
   - `get_db()` - 依赖注入函数
   - `check_database_connection()` - 健康检查
   - `close_database_connection()` - 关闭连接

2. **`app/main.py`** - 应用入口（已更新）
   - 集成数据库生命周期管理
   - 启动时检查数据库连接
   - 关闭时清理资源

3. **`app/api/v1/health.py`** - 健康检查 API
   - `GET /api/v1/health/` - 基础健康检查
   - `GET /api/v1/health/database` - 数据库健康检查
   - `GET /api/v1/health/database/query` - 数据库查询测试

### 测试文件

4. **`tests/unit/test_database.py`** - 单元测试
5. **`tests/integration/test_database_connection.py`** - 集成测试

### 文档和脚本

6. **`docs/TASK_2.1_DATABASE_SETUP.md`** - 详细文档
7. **`scripts/test_database_connection.py`** - 快速验证脚本

## 验证步骤

### 前置条件

1. 确保 PostgreSQL 数据库正在运行
2. 确保 `.env` 文件配置正确

```bash
# 检查 .env 文件
cat .env

# 应包含以下配置
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

### 方法 1: 使用快速验证脚本（推荐）

```bash
# 运行验证脚本
python scripts/test_database_connection.py
```

**预期输出**:
```
============================================================
数据库连接测试
============================================================

配置信息:
  DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory
  POOL_SIZE: 10
  MAX_OVERFLOW: 20
  TESTING: False

测试 1: 基础连接检查
  ✓ 数据库连接成功

测试 2: 会话创建和查询
  ✓ 查询成功
    - 查询结果: num=1, current_time=2024-01-01 00:00:00

测试 3: 数据库版本信息
  ✓ PostgreSQL 版本:
    PostgreSQL 14.x ...

测试 4: 数据库表列表
  ✓ 找到 X 个表:
    - Sample
    - Transfer
    ...

============================================================
所有测试通过！数据库连接配置正确。
============================================================
```

### 方法 2: 启动服务并测试 API

```bash
# 启动 FastAPI 服务
uvicorn app.main:app --reload --port 8000
```

然后在浏览器或使用 curl 测试：

```bash
# 1. 基础健康检查
curl http://localhost:8000/api/v1/health/

# 预期响应:
# {
#   "status": "healthy",
#   "service": "fastapi-backend",
#   "version": "0.1.0",
#   "timestamp": "2024-01-01T00:00:00"
# }

# 2. 数据库健康检查
curl http://localhost:8000/api/v1/health/database

# 预期响应:
# {
#   "status": "healthy",
#   "database": "connected",
#   "timestamp": "2024-01-01T00:00:00"
# }

# 3. 数据库查询测试
curl http://localhost:8000/api/v1/health/database/query

# 预期响应:
# {
#   "status": "success",
#   "query_result": {
#     "num": 1,
#     "current_time": "2024-01-01T00:00:00"
#   },
#   "message": "Database query executed successfully"
# }
```

### 方法 3: 运行单元测试

```bash
# 运行数据库单元测试
pytest tests/unit/test_database.py -v

# 预期输出:
# tests/unit/test_database.py::TestDatabaseEngine::test_get_engine_creates_engine PASSED
# tests/unit/test_database.py::TestDatabaseEngine::test_get_engine_returns_same_instance PASSED
# tests/unit/test_database.py::TestDatabaseEngine::test_get_engine_uses_nullpool_in_testing_mode PASSED
# ...
```

### 方法 4: 运行集成测试

```bash
# 运行数据库集成测试
pytest tests/integration/test_database_connection.py -v

# 预期输出:
# tests/integration/test_database_connection.py::TestDatabaseConnection::test_database_connection_check PASSED
# tests/integration/test_database_connection.py::TestDatabaseConnection::test_get_db_session PASSED
# tests/integration/test_database_connection.py::TestDatabaseConnection::test_session_transaction PASSED
```

## 验证清单

### 功能验证

- [ ] 异步引擎创建成功
- [ ] 连接池配置正确（pool_size=10, max_overflow=20）
- [ ] 测试模式使用 NullPool
- [ ] 生产模式使用连接池
- [ ] 会话工厂创建成功
- [ ] `get_db()` 依赖注入正常工作
- [ ] 数据库连接检查功能正常
- [ ] 应用启动时检查数据库连接
- [ ] 应用关闭时清理资源

### 需求验证

#### 需求 2.1: 数据库连接

- [ ] 使用 SQLAlchemy ORM 连接 PostgreSQL
- [ ] 使用 asyncpg 驱动
- [ ] 从 `app.config.settings` 读取数据库 URL

#### 需求 2.3: 连接池管理

- [ ] 配置连接池参数（pool_size=10）
- [ ] 配置最大溢出（max_overflow=20）
- [ ] 支持测试模式（NullPool）

#### 需求 13.2: 异步 I/O

- [ ] 使用异步 I/O 处理数据库操作
- [ ] 使用 `create_async_engine`
- [ ] 使用 `AsyncSession`

### API 验证

- [ ] `GET /api/v1/health/` 返回正确响应
- [ ] `GET /api/v1/health/database` 返回数据库状态
- [ ] `GET /api/v1/health/database/query` 执行查询成功

### 测试验证

- [ ] 单元测试全部通过
- [ ] 集成测试全部通过
- [ ] 验证脚本执行成功

## 常见问题

### Q1: 数据库连接失败

**问题**: 运行验证脚本时提示连接失败

**解决方案**:
1. 检查 PostgreSQL 是否运行: `pg_isready`
2. 检查数据库 URL 配置是否正确
3. 检查数据库用户权限
4. 检查防火墙设置

### Q2: 导入错误

**问题**: 运行脚本时提示 `ModuleNotFoundError`

**解决方案**:
```bash
# 确保在项目根目录
cd fastapi-backend

# 安装依赖
pip install -r requirements.txt

# 设置 PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)
```

### Q3: 测试失败

**问题**: pytest 测试失败

**解决方案**:
1. 确保数据库正在运行
2. 确保 `.env` 文件存在且配置正确
3. 检查测试数据库是否可访问
4. 查看详细错误信息: `pytest -v -s`

## 下一步

任务 2.1 验证通过后，可以继续：

- **任务 2.2**: 定义 SQLAlchemy 数据模型
- **任务 2.3**: 编写数据模型单元测试

## 技术支持

如有问题，请查看：
- 详细文档: `docs/TASK_2.1_DATABASE_SETUP.md`
- SQLAlchemy 文档: https://docs.sqlalchemy.org/
- FastAPI 文档: https://fastapi.tiangolo.com/
