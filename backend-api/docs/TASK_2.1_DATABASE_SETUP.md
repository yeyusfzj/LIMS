# 任务 2.1: 配置 SQLAlchemy 异步引擎和连接池

## 概述

本任务实现了 FastAPI 后端服务的数据库连接配置，包括 SQLAlchemy 异步引擎、连接池管理和会话依赖注入。

## 实现内容

### 1. 数据库连接模块 (`app/core/database.py`)

实现了以下核心功能：

#### 1.1 异步引擎创建 (`get_engine`)

- 创建 SQLAlchemy 异步引擎
- 支持两种模式：
  - **测试模式**: 使用 `NullPool`（每次请求创建新连接）
  - **生产模式**: 使用 `AsyncAdaptedQueuePool`（连接池复用）
- 配置参数：
  - `pool_size`: 连接池大小（默认 10）
  - `max_overflow`: 最大溢出连接数（默认 20）
  - `pool_pre_ping`: 连接前检查连接有效性
  - `echo`: 调试模式下打印 SQL 语句

#### 1.2 会话工厂创建 (`get_session_factory`)

- 创建异步会话工厂
- 配置：
  - `expire_on_commit=False`: 提交后不过期对象
  - `autocommit=False`: 不自动提交
  - `autoflush=False`: 不自动刷新

#### 1.3 依赖注入函数 (`get_db`)

- 提供异步数据库会话的依赖注入
- 自动管理会话生命周期：
  - 创建会话
  - yield 会话供路由使用
  - 异常时自动回滚
  - 最终自动关闭会话

**使用示例**:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db

router = APIRouter()

@router.get("/samples")
async def list_samples(db: AsyncSession = Depends(get_db)):
    # 使用 db 进行数据库操作
    result = await db.execute(select(Sample))
    samples = result.scalars().all()
    return samples
```

#### 1.4 健康检查 (`check_database_connection`)

- 检查数据库连接是否可用
- 执行简单查询 `SELECT 1` 测试连接
- 返回布尔值，不抛出异常

#### 1.5 连接关闭 (`close_database_connection`)

- 关闭数据库引擎和连接池
- 应在应用关闭时调用
- 清理全局资源

### 2. 应用生命周期管理 (`app/main.py`)

集成了数据库连接管理：

- **启动时**: 检查数据库连接状态
- **关闭时**: 关闭数据库连接和引擎
- 使用 FastAPI 的 `lifespan` 上下文管理器

### 3. 健康检查 API (`app/api/v1/health.py`)

提供了三个健康检查端点：

#### 3.1 基础健康检查 (`GET /api/v1/health/`)

返回服务状态和版本信息。

**响应示例**:
```json
{
  "status": "healthy",
  "service": "fastapi-backend",
  "version": "0.1.0",
  "timestamp": "2024-01-01T00:00:00"
}
```

#### 3.2 数据库健康检查 (`GET /api/v1/health/database`)

检查数据库连接状态。

**响应示例**:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00"
}
```

#### 3.3 数据库查询测试 (`GET /api/v1/health/database/query`)

使用依赖注入的数据库会话执行查询，验证会话管理功能。

**响应示例**:
```json
{
  "status": "success",
  "query_result": {
    "num": 1,
    "current_time": "2024-01-01T00:00:00"
  },
  "message": "Database query executed successfully"
}
```

## 配置说明

### 环境变量

在 `.env` 文件中配置以下变量：

```env
# 数据库配置
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/laboratory
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20

# 测试模式
TESTING=false
```

### 数据库 URL 格式

- **生产环境**: `postgresql+asyncpg://user:password@host:port/database`
- **测试环境**: 同上，但会使用 `NullPool`

**注意**: 必须使用 `postgresql+asyncpg://` 前缀，因为我们使用 asyncpg 驱动。

## 技术要求验证

### 需求 2.1: 数据库连接

✅ 使用 SQLAlchemy ORM 连接 PostgreSQL 数据库

### 需求 2.3: 连接池管理

✅ 支持数据库连接池管理
- 配置 `pool_size=10`
- 配置 `max_overflow=20`
- 支持测试模式（NullPool）

### 需求 13.2: 异步 I/O

✅ 使用异步 I/O 处理数据库操作
- 使用 `create_async_engine`
- 使用 `AsyncSession`
- 使用 `asyncpg` 驱动

## 测试

### 单元测试 (`tests/unit/test_database.py`)

测试内容：
- 引擎创建和单例模式
- 测试模式下使用 NullPool
- 生产模式下使用连接池
- 会话工厂创建
- 依赖注入函数

### 集成测试 (`tests/integration/test_database_connection.py`)

测试内容：
- 实际数据库连接检查
- 获取数据库会话
- 执行简单查询
- 事务功能

### 运行测试

```bash
# 运行所有数据库相关测试
pytest tests/unit/test_database.py -v
pytest tests/integration/test_database_connection.py -v

# 运行所有测试
pytest tests/ -v
```

## 使用指南

### 1. 在路由中使用数据库会话

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.sample import Sample

router = APIRouter()

@router.get("/samples")
async def list_samples(db: AsyncSession = Depends(get_db)):
    """查询样品列表"""
    result = await db.execute(select(Sample))
    samples = result.scalars().all()
    return samples

@router.post("/samples")
async def create_sample(
    sample_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """创建样品"""
    sample = Sample(**sample_data)
    db.add(sample)
    await db.commit()
    await db.refresh(sample)
    return sample
```

### 2. 使用事务

```python
@router.post("/samples/transfer")
async def transfer_sample(
    transfer_data: dict,
    db: AsyncSession = Depends(get_db)
):
    """样品流转（使用事务）"""
    try:
        # 开始事务
        async with db.begin():
            # 创建流转记录
            transfer = Transfer(**transfer_data)
            db.add(transfer)
            
            # 更新样品位置
            sample = await db.get(Sample, transfer_data["sample_id"])
            sample.storage_location = transfer_data["to_location"]
            
            # 提交事务
            await db.commit()
        
        return {"message": "Transfer successful"}
    except Exception as e:
        # 异常时自动回滚
        await db.rollback()
        raise
```

### 3. 健康检查

```python
from app.core.database import check_database_connection

@router.get("/health")
async def health_check():
    """健康检查"""
    db_connected = await check_database_connection()
    
    return {
        "status": "healthy" if db_connected else "degraded",
        "database": "connected" if db_connected else "disconnected"
    }
```

## 与 Node.js 后端的兼容性

### 共享数据库

- ✅ 使用相同的 PostgreSQL 数据库
- ✅ 使用相同的表结构（基于 Prisma Schema）
- ✅ 使用相同的数据库 URL 格式

### 连接池配置

| 配置项 | Node.js (Prisma) | FastAPI (SQLAlchemy) |
|--------|------------------|----------------------|
| 连接池大小 | `connection_limit=20` | `pool_size=10` |
| 最大溢出 | N/A | `max_overflow=20` |
| 连接超时 | `connect_timeout=10s` | 由 asyncpg 管理 |
| 语句超时 | `statement_timeout=30s` | 由 asyncpg 管理 |

**注意**: FastAPI 的总连接数 = `pool_size + max_overflow` = 30，与 Node.js 的配置相当。

## 性能优化

### 1. 连接池复用

- 生产模式下使用连接池，避免频繁创建连接
- 配置 `pool_pre_ping=True`，确保连接有效性

### 2. 异步 I/O

- 使用 `asyncpg` 驱动，性能优于同步驱动
- 使用 `AsyncSession`，支持并发请求

### 3. 会话管理

- 使用依赖注入自动管理会话生命周期
- 异常时自动回滚，避免资源泄漏

## 故障排查

### 问题 1: 数据库连接失败

**症状**: 启动时提示 "Database connection: FAILED"

**解决方案**:
1. 检查数据库是否运行
2. 检查 `DATABASE_URL` 配置是否正确
3. 检查网络连接
4. 检查数据库用户权限

### 问题 2: 连接池耗尽

**症状**: 请求超时或返回 "connection pool exhausted"

**解决方案**:
1. 增加 `DATABASE_POOL_SIZE`
2. 增加 `DATABASE_MAX_OVERFLOW`
3. 检查是否有连接泄漏（未关闭的会话）

### 问题 3: 测试模式下连接问题

**症状**: 测试时数据库连接异常

**解决方案**:
1. 确保 `TESTING=true`
2. 使用 NullPool 避免连接复用问题
3. 每个测试后清理数据

## 下一步

任务 2.1 已完成，接下来可以进行：

- **任务 2.2**: 定义 SQLAlchemy 数据模型
- **任务 2.3**: 编写数据模型单元测试

## 参考资料

- [SQLAlchemy 异步文档](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
- [FastAPI 依赖注入](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [asyncpg 文档](https://magicstack.github.io/asyncpg/current/)
