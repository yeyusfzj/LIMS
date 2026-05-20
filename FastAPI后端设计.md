# 实验室管理系统 - FastAPI后端分层架构设计文档

## 📋 文档概述

本文档详细描述了实验室智能管理系统FastAPI后端的分层架构设计，重点阐述各层的职责划分、交互方式和设计原则。

**文档版本**: 1.0  
**创建日期**: 2026-04-30  
**最后更新**: 2026-04-30  
**后端框架**: FastAPI (Python)

---

## 🏗️ 整体架构概览

### 分层架构模型

```
┌─────────────────────────────────────────────────────────────┐
│                    客户端 (Client)                           │
│                  Vue.js Frontend                            │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 入口层 (Entry Layer)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  FastAPI App │  │  Uvicorn     │  │  Lifespan    │      │
│  │              │  │  Server      │  │  Manager     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              中间件层 (Middleware Layer)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  CORS        │  │  Auth/RBAC   │  │  Rate Limit  │      │
│  │  (跨域)       │  │  (JWT)       │  │  (限流)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Logging     │  │  Error       │  │  Prometheus  │      │
│  │  (日志)       │  │  Handler     │  │  (监控)       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                 路由层 (Router Layer)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sample Routes│  │ Workflow     │  │ Audit Routes │      │
│  │              │  │ Routes       │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               验证层 (Schema Layer)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Pydantic    │  │  Request     │  │  Response    │      │
│  │  Models      │  │  Validation  │  │  Serialization│     │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               服务层 (Service Layer)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sample Svc   │  │ Workflow Svc │  │ Audit Svc    │      │
│  │ (业务逻辑)    │  │ (工作流引擎)  │  │ (审核流程)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            数据访问层 (Repository Layer)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Base Repo    │  │ Sample Repo  │  │ Workflow Repo│      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            ORM层 (SQLAlchemy Models)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Sample Model │  │ Workflow     │  │ Audit Model  │      │
│  │              │  │ Model        │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据层 (Data Layer)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Redis     │  │ File Storage │      │
│  │  (主数据库)   │  │   (缓存)      │  │  (文件存储)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

**核心框架**
- Python 3.11+ - 编程语言
- FastAPI 0.104+ - 现代化Web框架
- Uvicorn 0.24+ - ASGI服务器
- Pydantic 2.5+ - 数据验证和序列化

**数据库与ORM**
- PostgreSQL 14+ - 关系型数据库
- SQLAlchemy 2.0+ - 异步ORM
- Alembic 1.12+ - 数据库迁移工具
- asyncpg 0.29+ - PostgreSQL异步驱动

**认证与安全**
- PyJWT 2.8+ - JWT令牌
- python-jose 3.3+ - JWT加密
- passlib 1.7+ - 密码哈希（bcrypt）
- slowapi 0.1+ - API限流

**异步任务**
- Redis 5.0+ - 缓存和消息队列
- ARQ 0.25+ - 异步任务队列

**监控与日志**
- prometheus-client 0.19+ - Prometheus监控
- prometheus-fastapi-instrumentator 6.1+ - FastAPI监控集成
- Python logging - 日志管理

**文件处理**
- openpyxl 3.1+ - Excel文件处理
- weasyprint 60.1+ - PDF生成

**测试框架**
- pytest 7.4+ - 测试框架
- pytest-asyncio 0.21+ - 异步测试
- pytest-cov 4.1+ - 测试覆盖率
- httpx 0.25+ - HTTP客户端测试
- faker 20.1+ - 测试数据生成
- locust 2.17+ - 性能测试

**代码质量**
- black 23.11+ - 代码格式化
- flake8 6.1+ - 代码检查
- mypy 1.7+ - 类型检查
- isort 5.12+ - import排序

---

## 🔧 第一层：入口层 (Entry Layer)

### 职责定义

入口层负责**应用程序的启动和初始化**，是整个后端服务的入口点。

**核心职责：**
- ✅ FastAPI应用创建和配置
- ✅ Uvicorn服务器启动
- ✅ 生命周期管理（启动/关闭）
- ✅ 数据库连接初始化
- ✅ Redis连接初始化
- ✅ 中间件注册
- ✅ 路由挂载
- ✅ 异常处理器注册
- ✅ API文档配置

**禁止行为：**
- ❌ 包含业务逻辑
- ❌ 直接操作数据库
- ❌ 处理具体的HTTP请求

### 核心文件

**位置：** `app/`

```
app/
├── main.py              # FastAPI应用入口
├── config.py            # 配置管理
└── worker.py            # 异步任务Worker
```

### 代码示例

**main.py - 应用入口**
```python
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.database import check_database_connection
from app.middleware.cors import configure_cors
from app.routers import samples, workflows, audits

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时
    logger.info("Starting FastAPI application...")
    
    # 检查数据库连接
    db_connected = await check_database_connection()
    if db_connected:
        logger.info("Database connection: OK")
    
    # 初始化自动分配引擎
    await assignment_engine.initialize(db)
    
    yield
    
    # 关闭时
    logger.info("Shutting down...")
    await close_database_connection()
    await close_redis_connection()

# 创建FastAPI应用
app = FastAPI(
    title="实验室样品管理 FastAPI 后端服务",
    description="实验室样品管理微服务",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 配置CORS
configure_cors(app)

# 注册中间件
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# 注册异常处理器
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

# 注册路由
app.include_router(samples.router, prefix="/api/v1")
app.include_router(workflows.router, prefix="/api/v1")
app.include_router(audits.router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    """健康检查"""
    db_status = await check_database_connection()
    return {
        "status": "healthy" if db_status else "degraded",
        "service": "fastapi-backend",
        "database": "connected" if db_status else "disconnected"
    }
```

**config.py - 配置管理**
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    """应用配置"""
    
    # 应用配置
    APP_NAME: str = "实验室管理系统"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # 数据库配置
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis配置
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # JWT配置
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # CORS配置
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]
    
    # 限流配置
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

---

## 🛡️ 第二层：中间件层 (Middleware Layer)

### 职责定义

中间件层负责**请求预处理和响应后处理**，提供横切关注点的功能。

**核心职责：**
- CORS跨域处理
- JWT认证验证
- RBAC权限控制
- API限流保护
- 请求日志记录
- 性能监控
- 错误处理

**设计原则：**
- ✅ 单一职责：每个中间件只做一件事
- ✅ 可组合：中间件可以灵活组合
- ✅ 顺序敏感：注意中间件执行顺序
- ✅ 异步优先：使用async/await

### 中间件分类

**位置：** `app/middleware/`

```
middleware/
├── cors.py                        # CORS配置
├── auth.py                        # JWT认证
├── logging.py                     # 请求日志
├── rate_limit.py                  # API限流
└── error_handler.py               # 错误处理
```

### 中间件执行顺序

```
请求进入
    ↓
[1] CORS中间件 (处理跨域)
    ↓
[2] 请求日志中间件 (记录请求)
    ↓
[3] 限流中间件 (检查频率)
    ↓
[4] Prometheus监控 (性能追踪)
    ↓
[5] 路由匹配
    ↓
[6] JWT认证 (依赖注入)
    ↓
[7] RBAC权限检查 (依赖注入)
    ↓
[8] Pydantic验证 (自动)
    ↓
[9] 路由处理器执行
    ↓
[10] 响应返回
    ↓
[11] 错误处理 (如有异常)
    ↓
响应输出
```

### 核心中间件示例

**auth.py - JWT认证（依赖注入）**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from jose import JWTError, jwt
from app.config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security)
) -> dict:
    """
    获取当前用户（JWT认证）
    
    使用FastAPI的依赖注入系统
    """
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证令牌"
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌"
        )

async def require_permission(permission: str):
    """
    权限检查装饰器
    
    使用方式:
    @router.get("/samples")
    async def get_samples(
        user: dict = Depends(get_current_user),
        _: None = Depends(require_permission("sample:read"))
    ):
        ...
    """
    async def permission_checker(
        user: dict = Depends(get_current_user)
    ):
        user_permissions = user.get("permissions", [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"缺少权限: {permission}"
            )
    return permission_checker
```

**rate_limit.py - API限流**
```python
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address

# 创建限流器
limiter = Limiter(key_func=get_remote_address)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """API限流中间件"""
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
    
    async def dispatch(self, request: Request, call_next):
        # 检查限流
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            if "rate limit exceeded" in str(e).lower():
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "请求过于频繁，请稍后再试"
                        }
                    }
                )
            raise
```

**logging.py - 请求日志**
```python
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """请求日志中间件"""
    
    async def dispatch(self, request: Request, call_next):
        # 记录请求开始
        start_time = time.time()
        request_id = str(uuid.uuid4())
        
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host
            }
        )
        
        # 处理请求
        response = await call_next(request)
        
        # 记录请求完成
        duration = time.time() - start_time
        logger.info(
            f"Request completed",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2)
            }
        )
        
        # 添加响应头
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time"] = str(duration)
        
        return response
```

**error_handler.py - 错误处理**
```python
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from app.core.exceptions import APIException

async def api_exception_handler(request: Request, exc: APIException):
    """自定义API异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError
):
    """Pydantic验证异常处理"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "请求数据验证失败",
                "details": errors
            }
        }
    )

async def integrity_error_handler(request: Request, exc: IntegrityError):
    """数据库完整性约束异常处理"""
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={
            "error": {
                "code": "INTEGRITY_ERROR",
                "message": "数据完整性约束冲突",
                "details": str(exc.orig)
            }
        }
    )
```

---

## 🚦 第三层：路由层 (Router Layer)

### 职责定义

路由层负责**定义API端点和路由规则**，将HTTP请求映射到对应的处理函数。

**核心职责：**
- 定义RESTful API端点
- 路由参数解析
- 依赖注入配置
- OpenAPI文档标注
- 响应模型定义

**设计原则：**
- ✅ RESTful规范：遵循REST API设计原则
- ✅ 资源导向：以资源为中心设计路由
- ✅ 版本控制：支持API版本管理
- ✅ 文档完整：完整的OpenAPI注解

### 路由模块

**位置：** `app/api/v1/` 和 `app/routers/`

```
api/v1/
├── health.py                     # 健康检查
├── samples.py                    # 样品管理
├── transfers.py                  # 样品流转
├── auth.py                       # 认证授权
└── instruments.py                # 仪器管理

routers/
├── workflows.py                  # 工作流管理
├── tasks.py                      # 任务管理
├── results.py                    # 检测结果
├── formulas.py                   # 计算公式
├── anomalies.py                  # 异常检测
├── audits.py                     # 审核管理
├── judgments.py                  # 质量判定
├── report_templates.py           # 报告模板
├── reports.py                    # 报告管理
├── signatures.py                 # 电子签名
├── statistics.py                 # 统计分析
├── export.py                     # 数据导出
├── queue.py                      # 队列管理
├── methods.py                    # 检测方法
├── permissions.py                # 权限管理
├── roles.py                      # 角色管理
├── users.py                      # 用户管理
├── performance.py                # 性能监控
└── docs.py                       # 文档管理
```

### 路由示例

**samples.py - 样品管理路由**
```python
from fastapi import APIRouter, Depends, Query, Path, status
from typing import List, Optional
from app.schemas.sample import (
    SampleCreate,
    SampleUpdate,
    SampleResponse,
    SampleListResponse
)
from app.schemas.response import APIResponse
from app.services.sample_service import SampleService
from app.core.security import get_current_user, require_permission

router = APIRouter(prefix="/samples", tags=["samples"])

@router.post(
    "",
    response_model=APIResponse[SampleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建样品",
    description="创建新的样品记录，自动生成条码和编号"
)
async def create_sample(
    sample_data: SampleCreate,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("sample:create")),
    service: SampleService = Depends()
):
    """
    创建样品
    
    - **client_name**: 客户名称（必填）
    - **sample_name**: 样品名称（必填）
    - **quantity**: 数量（必填）
    - **unit**: 单位（必填）
    - **priority**: 优先级（可选，默认NORMAL）
    """
    sample = await service.create_sample(
        sample_data,
        created_by=current_user["sub"]
    )
    return APIResponse(
        message="样品创建成功",
        data=sample
    )

@router.get(
    "",
    response_model=APIResponse[SampleListResponse],
    summary="获取样品列表",
    description="分页查询样品列表，支持多条件筛选"
)
async def get_samples(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    barcode: Optional[str] = Query(None, description="条码"),
    status: Optional[str] = Query(None, description="状态"),
    client_name: Optional[str] = Query(None, description="客户名称"),
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read")),
    service: SampleService = Depends()
):
    """获取样品列表"""
    result = await service.get_samples(
        page=page,
        page_size=page_size,
        barcode=barcode,
        status=status,
        client_name=client_name
    )
    return APIResponse(
        message="获取样品列表成功",
        data=result
    )

@router.get(
    "/{sample_id}",
    response_model=APIResponse[SampleResponse],
    summary="获取样品详情",
    description="根据ID获取样品详细信息"
)
async def get_sample(
    sample_id: str = Path(..., description="样品ID"),
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read")),
    service: SampleService = Depends()
):
    """获取样品详情"""
    sample = await service.get_sample_by_id(sample_id)
    return APIResponse(
        message="获取样品详情成功",
        data=sample
    )

@router.patch(
    "/{sample_id}",
    response_model=APIResponse[SampleResponse],
    summary="更新样品",
    description="更新样品信息"
)
async def update_sample(
    sample_id: str = Path(..., description="样品ID"),
    sample_data: SampleUpdate = ...,
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("sample:update")),
    service: SampleService = Depends()
):
    """更新样品"""
    sample = await service.update_sample(sample_id, sample_data)
    return APIResponse(
        message="样品更新成功",
        data=sample
    )

@router.delete(
    "/{sample_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除样品",
    description="删除样品记录"
)
async def delete_sample(
    sample_id: str = Path(..., description="样品ID"),
    current_user: dict = Depends(get_current_user),
    _: None = Depends(require_permission("sample:delete")),
    service: SampleService = Depends()
):
    """删除样品"""
    await service.delete_sample(sample_id)
```

---
## 📝 第四层：验证层 (Schema Layer)

### 职责定义

验证层使用 **Pydantic** 模型，负责**数据验证和序列化**。

**核心职责:**
- 请求数据验证
- 响应数据序列化
- 类型转换
- 数据文档生成
- OpenAPI Schema生成

**设计原则:**
- ✅ 类型安全：完整的类型注解
- ✅ 自动验证：利用Pydantic验证机制
- ✅ 模型分离：Create/Update/Response模型分离
- ✅ 可复用：基础模型继承

### Schema模块

**位置:** `app/schemas/`

```
schemas/
├── __init__.py
├── sample.py                     # 样品Schema
├── workflow.py                   # 工作流Schema
├── task.py                       # 任务Schema
├── result.py                     # 结果Schema
├── audit.py                      # 审核Schema
├── report.py                     # 报告Schema
├── user.py                       # 用户Schema
└── response.py                   # 通用响应Schema
```

### 实际文件描述

**`app/schemas/sample.py` - 样品验证模型**

包含完整的样品数据验证模型:
- **SampleBase**: 基础模型，包含共享字段
- **SampleCreate**: 创建请求模型，必填字段验证
- **SampleUpdate**: 更新请求模型，所有字段可选
- **SampleResponse**: 响应模型，包含完整样品信息
- **SampleListResponse**: 列表响应，包含分页信息
- **SampleStatusUpdate**: 状态更新专用模型
- **BatchDeleteRequest/Response**: 批量删除模型

### Schema示例

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SampleStatus(str, Enum):
    """样品状态枚举"""
    REGISTERED = "REGISTERED"
    IN_TESTING = "IN_TESTING"
    TESTED = "TESTED"
    RELEASED = "RELEASED"
    ARCHIVED = "ARCHIVED"

class SampleBase(BaseModel):
    """样品基础模型"""
    client_name: str = Field(..., description="客户名称", min_length=1, max_length=200)
    sample_name: str = Field(..., description="样品名称", min_length=1, max_length=200)
    sample_type: str = Field(..., description="样品类型")
    quantity: Optional[float] = Field(None, description="样品数量", gt=0)
    unit: Optional[str] = Field(None, description="单位")

class SampleCreate(SampleBase):
    """样品创建模型"""
    received_date: datetime = Field(..., description="接收日期")
    sampling_date: Optional[datetime] = Field(None, description="采样日期")
    priority: Optional[str] = Field("NORMAL", description="优先级")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "client_name": "测试客户",
                "sample_name": "水样",
                "sample_type": "环境样品",
                "quantity": 500.0,
                "unit": "mL",
                "received_date": "2026-04-30T10:00:00",
                "priority": "NORMAL"
            }
        }
    )

class SampleUpdate(BaseModel):
    """样品更新模型（所有字段可选）"""
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sample_name: Optional[str] = Field(None, min_length=1, max_length=200)
    storage_location: Optional[str] = None
    remarks: Optional[str] = None
    
    model_config = ConfigDict(extra="forbid")  # 禁止额外字段

class SampleResponse(SampleBase):
    """样品响应模型"""
    id: str
    barcode: str
    sample_number: str
    status: SampleStatus
    created_at: datetime
    updated_at: datetime
    created_by: str
    version: int
    
    model_config = ConfigDict(from_attributes=True)  # 支持ORM模型转换

class PaginationMeta(BaseModel):
    """分页元数据"""
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页数量")
    total_pages: int = Field(..., description="总页数")

class SampleListResponse(BaseModel):
    """样品列表响应"""
    items: List[SampleResponse]
    pagination: PaginationMeta
```

---

## 💼 第五层：服务层 (Service Layer)

### 职责定义

服务层负责**实现核心业务逻辑**，是后端架构的核心。

**核心职责:**
- 实现业务规则和流程
- 调用仓储层进行数据访问
- 处理业务异常
- 管理事务边界
- 协调多个仓储操作

**设计原则:**
- ✅ 业务逻辑集中：所有业务规则在服务层
- ✅ 事务管理：使用数据库事务保证一致性
- ✅ 异常处理：统一的异常处理机制
- ✅ 可测试性：业务逻辑独立可测

### 服务模块

**位置:** `app/services/`

```
services/
├── __init__.py
├── sample_service.py             # 样品服务
├── workflow_service.py           # 工作流服务
├── task_service.py               # 任务服务
├── result_service.py             # 结果服务
├── audit_service.py              # 审核服务
├── report_service.py             # 报告服务
├── barcode_service.py            # 条码生成服务
└── user_service.py               # 用户服务
```

### 实际文件描述

**`app/services/sample_service.py` - 样品业务逻辑服务**

实现样品管理的完整业务逻辑:

**核心方法:**
- **create_sample**: 创建样品，自动生成条码和样品编号
- **get_samples**: 分页查询样品，支持多条件过滤
- **get_sample_by_id**: 根据ID查询样品详情
- **get_sample_by_barcode**: 根据条码查询样品
- **update_sample**: 更新样品，支持乐观锁（版本控制）
- **update_sample_status**: 更新样品状态，处理放行状态特殊逻辑
- **split_sample**: 分样操作，建立父子样品关系
- **merge_samples**: 合样操作，记录来源样品
- **delete_sample**: 软删除样品（更新状态为ARCHIVED）
- **batch_delete_samples**: 批量删除样品

**业务逻辑特点:**
- 完整的事务管理（commit/rollback）
- 详细的日志记录
- 业务规则验证（状态检查、权限检查）
- 乐观锁支持（版本控制）
- 异常处理和错误转换

### 服务层示例

```python
import logging
from typing import List, Optional, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sample import Sample, SampleStatus
from app.repositories.sample_repository import SampleRepository
from app.services.barcode_service import BarcodeService
from app.schemas.sample import SampleCreate, SampleUpdate
from app.core.exceptions import NotFoundException, ValidationException

logger = logging.getLogger(__name__)

class SampleService:
    """样品服务类"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.sample_repo = SampleRepository(db)
        self.barcode_service = BarcodeService(db)
    
    async def create_sample(
        self,
        sample_data: SampleCreate,
        created_by: str
    ) -> Sample:
        """
        创建样品
        
        业务逻辑:
        1. 生成唯一的条码（格式：SP{YYYYMMDD}{6位序列号}）
        2. 生成唯一的样品编号（格式：{YYYY}{6位序列号}）
        3. 初始化样品状态为 REGISTERED
        4. 设置创建人和创建时间
        5. 保存到数据库
        """
        try:
            logger.info(f"开始创建样品，创建人: {created_by}")
            
            # 生成唯一条码和样品编号
            barcode = await self.barcode_service.generate_barcode()
            sample_number = await self.barcode_service.generate_sample_number()
            
            # 准备样品数据
            sample_dict = sample_data.model_dump()
            sample_dict.update({
                "barcode": barcode,
                "sample_number": sample_number,
                "status": SampleStatus.REGISTERED,
                "created_by": created_by,
                "version": 1,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
            
            # 创建样品记录
            sample = await self.sample_repo.create(sample_dict)
            
            # 提交事务
            await self.db.commit()
            await self.db.refresh(sample)
            
            logger.info(f"样品创建成功: ID={sample.id}, 条码={sample.barcode}")
            return sample
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"样品创建失败: {str(e)}", exc_info=True)
            raise ValidationException(f"样品创建失败: {str(e)}")
    
    async def update_sample(
        self,
        sample_id: str,
        sample_data: SampleUpdate,
        check_version: bool = False,
        current_version: Optional[int] = None
    ) -> Sample:
        """
        更新样品信息
        
        业务逻辑:
        1. 验证样品是否存在
        2. 过滤掉 None 值（只更新提供的字段）
        3. 防止更新受保护字段（barcode、sample_number等）
        4. 自动更新 updated_at 时间戳
        5. 可选：使用乐观锁防止并发冲突（version字段）
        """
        try:
            # 验证样品是否存在
            existing_sample = await self.get_sample_by_id(sample_id)
            
            # 过滤掉 None 值
            update_dict = sample_data.model_dump(exclude_unset=True)
            
            # 定义受保护字段
            protected_fields = {
                "barcode", "sample_number", "created_by",
                "created_at", "id", "version"
            }
            
            # 移除受保护字段
            filtered_update_dict = {
                k: v for k, v in update_dict.items()
                if k not in protected_fields
            }
            
            if not filtered_update_dict:
                return existing_sample
            
            # 执行更新（支持乐观锁）
            updated_sample = await self.sample_repo.update(
                id=sample_id,
                obj_in=filtered_update_dict,
                check_version=check_version,
                current_version=current_version
            )
            
            logger.info(f"样品更新成功: ID={sample_id}")
            return updated_sample
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"样品更新失败: {str(e)}", exc_info=True)
            raise ValidationException(f"样品更新失败: {str(e)}")
```

---

## 🗄️ 第六层：数据访问层 (Repository Layer)

### 职责定义

数据访问层（仓储层）负责**封装数据库操作**，提供统一的数据访问接口。

**核心职责:**
- 封装SQLAlchemy查询操作
- 提供通用的CRUD方法
- 实现特定的查询方法
- 处理数据库异常
- 支持分页和过滤

**设计原则:**
- ✅ 仓储模式：每个实体一个仓储类
- ✅ 基类复用：通用操作在BaseRepository实现
- ✅ 异步操作：所有方法都是异步的
- ✅ 类型安全：使用泛型支持类型推断

### 仓储模块

**位置:** `app/repositories/`

```
repositories/
├── __init__.py
├── base_repository.py            # 基础仓储（通用CRUD）
├── sample_repository.py          # 样品仓储
├── workflow_repository.py        # 工作流仓储
├── task_repository.py            # 任务仓储
├── result_repository.py          # 结果仓储
├── audit_repository.py           # 审核仓储
└── user_repository.py            # 用户仓储
```

### 实际文件描述

**`app/repositories/sample_repository.py` - 样品数据访问层**

继承自 `BaseRepository`，复用通用CRUD操作。

**样品特定查询方法:**
- **get_by_barcode**: 根据条码查询样品
- **get_by_sample_number**: 根据样品编号查询样品
- **get_by_status**: 根据状态查询样品列表
- **get_by_client_name**: 根据客户名称查询（模糊匹配）
- **get_by_sample_type**: 根据样品类型查询
- **get_active_samples**: 获取所有活跃样品（排除已归档）
- **get_by_parent_sample_id**: 查询子样品
- **count_by_status**: 统计指定状态的样品数量
- **barcode_exists**: 检查条码是否存在
- **sample_number_exists**: 检查样品编号是否存在

### 仓储层示例

```python
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.sample import Sample, SampleStatus
from app.repositories.base_repository import BaseRepository

class SampleRepository(BaseRepository[Sample]):
    """样品仓库类"""
    
    def __init__(self, db: AsyncSession):
        super().__init__(Sample, db)
    
    async def get_by_barcode(self, barcode: str) -> Optional[Sample]:
        """根据条码查询样品"""
        result = await self.db.execute(
            select(Sample).where(Sample.barcode == barcode)
        )
        return result.scalar_one_or_none()
    
    async def get_by_sample_number(self, sample_number: str) -> Optional[Sample]:
        """根据样品编号查询样品"""
        result = await self.db.execute(
            select(Sample).where(Sample.sample_number == sample_number)
        )
        return result.scalar_one_or_none()
    
    async def get_by_status(
        self,
        status: SampleStatus,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """根据状态查询样品列表"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status": status}
        )
    
    async def get_by_client_name(
        self,
        client_name: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """根据客户名称查询样品列表（模糊查询）"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"client_name__ilike": f"%{client_name}%"}
        )
    
    async def get_active_samples(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sample]:
        """获取所有活跃样品（排除已归档）"""
        return await self.get_all(
            skip=skip,
            limit=limit,
            filters={"status__notin": [SampleStatus.ARCHIVED]}
        )
    
    async def count_by_status(self, status: SampleStatus) -> int:
        """统计指定状态的样品数量"""
        return await self.count(filters={"status": status})
    
    async def barcode_exists(self, barcode: str) -> bool:
        """检查条码是否已存在"""
        return await self.exists_by_field("barcode", barcode)
```

---

## 🗃️ 第七层：ORM层 (SQLAlchemy Models)

### 职责定义

ORM层使用 **SQLAlchemy** 定义数据库模型，负责**对象关系映射**。

**核心职责:**
- 定义数据库表结构
- 定义字段类型和约束
- 定义表关系（一对多、多对多）
- 定义索引和唯一约束
- 提供数据库迁移基础

**设计原则:**
- ✅ 声明式映射：使用SQLAlchemy 2.0声明式语法
- ✅ 类型注解：完整的类型提示
- ✅ 关系定义：清晰的表关系定义
- ✅ 索引优化：合理的索引设计

### ORM模块

**位置:** `app/models/`

```
models/
├── __init__.py
├── base.py                       # 基础模型
├── sample.py                     # 样品模型
├── workflow.py                   # 工作流模型
├── task.py                       # 任务模型
├── result.py                     # 结果模型
├── audit.py                      # 审核模型
├── report.py                     # 报告模型
└── user.py                       # 用户模型
```

### 实际文件描述

**`app/models/sample.py` - 样品ORM模型**

定义样品表结构（`samples`表）:

**字段定义:**
- 主键：`id` (UUID)
- 唯一标识：`barcode`（条码）、`sample_number`（样品编号）
- 客户信息：`client_name`、`client_contact`
- 样品信息：`sample_name`、`sample_type`、`sample_category`
- 数量信息：`quantity`、`unit`
- 状态信息：`status`（枚举类型）
- 时间信息：`received_date`、`sampling_date`、`created_at`、`updated_at`
- 存储信息：`storage_location`、`storage_condition`
- 关系字段：`parent_sample_id`（父样品）、`merged_from_ids`（合样来源）
- 放行信息：`released_at`、`released_by`
- 版本控制：`version`（乐观锁）

**索引定义:**
- 条码索引（唯一）
- 样品编号索引（唯一）
- 状态索引
- 客户名称索引

**枚举类型:**
- `SampleStatus`：样品状态（REGISTERED、IN_TESTING、TESTED、RELEASED、ARCHIVED）
- `Priority`：优先级（LOW、NORMAL、HIGH、URGENT）

### ORM模型示例

```python
from sqlalchemy import Column, String, DateTime, Enum, Integer, Float, JSON, Text
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from datetime import datetime
import uuid
import enum

from app.core.database import Base

class SampleStatus(str, enum.Enum):
    """样品状态枚举"""
    REGISTERED = "REGISTERED"        # 已登记
    IN_TESTING = "IN_TESTING"        # 检测中
    TESTED = "TESTED"                # 已检测
    RELEASED = "RELEASED"            # 已放行
    ARCHIVED = "ARCHIVED"            # 已归档

class Priority(str, enum.Enum):
    """优先级枚举"""
    LOW = "LOW"                      # 低
    NORMAL = "NORMAL"                # 正常
    HIGH = "HIGH"                    # 高
    URGENT = "URGENT"                # 紧急

class Sample(Base):
    """样品模型"""
    __tablename__ = "samples"
    
    # 主键
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # 唯一标识
    barcode = Column(String(50), unique=True, nullable=False, index=True, comment="样品条码")
    sample_number = Column(String(50), unique=True, nullable=False, index=True, comment="样品编号")
    
    # 客户信息
    client_name = Column(String(200), nullable=False, index=True, comment="客户名称")
    client_contact = Column(String(100), comment="客户联系方式")
    
    # 样品信息
    sample_name = Column(String(200), nullable=False, comment="样品名称")
    sample_type = Column(String(100), nullable=False, comment="样品类型")
    sample_category = Column(String(100), comment="样品类别")
    
    # 数量信息
    quantity = Column(Float, comment="样品数量")
    unit = Column(String(50), comment="单位")
    
    # 状态
    status = Column(Enum(SampleStatus), nullable=False, index=True, default=SampleStatus.REGISTERED, comment="样品状态")
    priority = Column(Enum(Priority), default=Priority.NORMAL, comment="优先级")
    
    # 时间信息
    received_date = Column(DateTime, nullable=False, comment="接收日期")
    sampling_date = Column(DateTime, comment="采样日期")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, comment="更新时间")
    
    # 存储信息
    storage_location = Column(String(200), comment="存储位置")
    storage_condition = Column(String(200), comment="存储条件")
    retention_days = Column(Integer, comment="保留天数")
    
    # 关系字段
    parent_sample_id = Column(UUID(as_uuid=True), comment="父样品ID（分样）")
    merged_from_ids = Column(ARRAY(UUID(as_uuid=True)), comment="合样来源ID列表")
    
    # 放行信息
    released_at = Column(DateTime, comment="放行时间")
    released_by = Column(String(100), comment="放行人")
    
    # 审计字段
    created_by = Column(String(100), nullable=False, comment="创建人")
    
    # 版本控制（乐观锁）
    version = Column(Integer, default=1, nullable=False, comment="版本号")
    
    # 备注
    remarks = Column(Text, comment="备注")
    properties = Column(JSON, comment="自定义属性")
    
    def __repr__(self):
        return f"<Sample(id={self.id}, barcode={self.barcode}, status={self.status})>"
```

---

## 🔄 完整的样品管理业务链路示例

### 创建样品的完整流程

以"创建样品"为例，展示从前端请求到数据库保存的完整数据流：

```
前端请求 → 路由层 → 验证层 → 服务层 → 仓储层 → ORM层 → 数据库
   ↓                                                            ↓
响应返回 ← 路由层 ← 验证层 ← 服务层 ← 仓储层 ← ORM层 ← 数据库响应
```

#### 1. 前端发起请求

```javascript
// Vue前端代码
const sampleApi = {
  async createSample(data) {
    const response = await axios.post('/api/v1/samples', {
      client_name: data.clientName,
      sample_name: data.sampleName,
      sample_type: data.sampleType,
      quantity: data.quantity,
      unit: data.unit,
      received_date: data.receivedDate
    })
    return response.data
  }
}
```

#### 2. 路由层接收请求

**`app/api/v1/samples.py`**
```python
@router.post(
    "",
    response_model=SuccessResponse[SampleResponse],
    status_code=status.HTTP_201_CREATED
)
async def create_sample(
    sample_data: SampleCreate,                    # Pydantic自动验证
    db: AsyncSession = Depends(get_db),           # 依赖注入：数据库会话
    current_user: Dict = Depends(get_current_user), # 依赖注入：当前用户
    _: None = Depends(require_permission("sample:create"))  # 依赖注入：权限检查
):
    """创建样品"""
    service = SampleService(db)
    sample = await service.create_sample(
        sample_data=sample_data,
        created_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="样品创建成功"
    )
```

#### 3. 验证层验证数据

**`app/schemas/sample.py`**
```python
class SampleCreate(SampleBase):
    """样品创建模型"""
    client_name: str = Field(..., min_length=1, max_length=200)
    sample_name: str = Field(..., min_length=1, max_length=200)
    sample_type: str = Field(...)
    quantity: float = Field(..., gt=0)
    unit: str = Field(...)
    received_date: datetime = Field(...)
    
    # Pydantic自动验证：
    # - 类型检查
    # - 必填字段检查
    # - 长度限制检查
    # - 数值范围检查
```

#### 4. 服务层执行业务逻辑

**`app/services/sample_service.py`**
```python
async def create_sample(
    self,
    sample_data: SampleCreate,
    created_by: str
) -> Sample:
    """创建样品"""
    try:
        # 业务逻辑1: 生成唯一条码
        barcode = await self.barcode_service.generate_barcode()
        # 结果: "SP20260430000001"
        
        # 业务逻辑2: 生成唯一样品编号
        sample_number = await self.barcode_service.generate_sample_number()
        # 结果: "2026000001"
        
        # 业务逻辑3: 准备样品数据
        sample_dict = sample_data.model_dump()
        sample_dict.update({
            "barcode": barcode,
            "sample_number": sample_number,
            "status": SampleStatus.REGISTERED,  # 初始状态
            "created_by": created_by,
            "version": 1,  # 版本号
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        
        # 业务逻辑4: 调用仓储层创建记录
        sample = await self.sample_repo.create(sample_dict)
        
        # 业务逻辑5: 提交事务
        await self.db.commit()
        await self.db.refresh(sample)
        
        logger.info(f"样品创建成功: {sample.barcode}")
        return sample
        
    except Exception as e:
        # 业务逻辑6: 异常处理，回滚事务
        await self.db.rollback()
        logger.error(f"样品创建失败: {str(e)}")
        raise ValidationException(f"样品创建失败: {str(e)}")
```

#### 5. 仓储层执行数据库操作

**`app/repositories/sample_repository.py`**
```python
async def create(self, obj_in: dict) -> Sample:
    """创建记录"""
    # 创建ORM对象
    db_obj = Sample(**obj_in)
    
    # 添加到会话
    self.db.add(db_obj)
    
    # 刷新以获取数据库生成的字段（如自增ID）
    await self.db.flush()
    await self.db.refresh(db_obj)
    
    return db_obj
```

#### 6. ORM层映射到数据库

**`app/models/sample.py`**
```python
class Sample(Base):
    """样品模型"""
    __tablename__ = "samples"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    sample_number = Column(String(50), unique=True, nullable=False, index=True)
    client_name = Column(String(200), nullable=False, index=True)
    # ... 其他字段
```

#### 7. 数据库执行SQL

```sql
INSERT INTO samples (
    id, barcode, sample_number, client_name, sample_name,
    sample_type, quantity, unit, status, received_date,
    created_by, created_at, updated_at, version
) VALUES (
    'uuid-here', 'SP20260430000001', '2026000001', '测试客户', '水样',
    '环境样品', 500.0, 'mL', 'REGISTERED', '2026-04-30 10:00:00',
    'user123', '2026-04-30 10:00:00', '2026-04-30 10:00:00', 1
) RETURNING *;
```

#### 8. 响应返回前端

```json
{
  "success": true,
  "message": "样品创建成功",
  "data": {
    "id": "uuid-here",
    "barcode": "SP20260430000001",
    "sample_number": "2026000001",
    "client_name": "测试客户",
    "sample_name": "水样",
    "sample_type": "环境样品",
    "quantity": 500.0,
    "unit": "mL",
    "status": "REGISTERED",
    "received_date": "2026-04-30T10:00:00",
    "created_at": "2026-04-30T10:00:00",
    "updated_at": "2026-04-30T10:00:00",
    "version": 1
  }
}
```

---

## 🎯 核心功能模块架构设计

### 1. 样品管理模块

**功能概述**
- 样品全生命周期管理
- 样品登记、流转、检测、留样、放行
- 条码管理与追溯

**架构设计**

```
样品管理模块
├── API层 (app/api/v1/)
│   ├── samples.py                # 样品CRUD
│   └── transfers.py              # 样品流转
├── Schema层 (app/schemas/)
│   └── sample.py                 # 样品验证模型
├── Service层 (app/services/)
│   ├── sample_service.py         # 样品业务逻辑
│   └── barcode_service.py        # 条码生成服务
├── Repository层 (app/repositories/)
│   └── sample_repository.py      # 样品数据访问
└── Model层 (app/models/)
    └── sample.py                 # 样品ORM模型
```

**关键特性**
- 条码自动生成（格式：SP{YYYYMMDD}{6位序列号}）
- 样品编号自动生成（格式：{YYYY}{6位序列号}）
- 样品状态实时追踪（REGISTERED → IN_TESTING → TESTED → RELEASED → ARCHIVED）
- 监管链完整记录
- 支持分样、合样操作
- 留样到期自动提醒
- 乐观锁防止并发冲突

---

### 2. 工作流管理模块

**功能概述**
- 可视化工作流设计
- 检测方法库管理
- 任务自动分配与派工
- 工作流模板配置

**架构设计**

```
工作流管理模块
├── API层 (app/routers/)
│   ├── workflows.py              # 工作流管理
│   ├── tasks.py                  # 任务管理
│   └── methods.py                # 检测方法
├── Schema层 (app/schemas/)
│   ├── workflow.py               # 工作流验证模型
│   └── task.py                   # 任务验证模型
├── Service层 (app/services/)
│   ├── workflow_service.py       # 工作流业务逻辑
│   ├── task_service.py           # 任务业务逻辑
│   └── assignment_engine.py      # 自动分配引擎
├── Repository层 (app/repositories/)
│   ├── workflow_repository.py    # 工作流数据访问
│   └── task_repository.py        # 任务数据访问
└── Model层 (app/models/)
    ├── workflow.py               # 工作流ORM模型
    └── task.py                   # 任务ORM模型
```

**工作流引擎架构**
```
┌─────────────────────────────────────┐
│      工作流设计器 (Designer)          │
│  - 节点定义（JSON格式）               │
│  - 连线配置                          │
│  - 节点属性设置                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      工作流引擎 (Engine)              │
│  - 流程实例化                         │
│  - 任务自动分配                       │
│  - 状态流转控制                       │
│  - 并行/串行/条件分支                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      任务执行 (Task Execution)        │
│  - 任务领取                          │
│  - 结果录入                          │
│  - 任务完成                          │
└─────────────────────────────────────┘
```

**关键特性**
- 可视化流程设计（JSON格式存储）
- 支持并行、串行、条件分支
- 任务自动分配规则（基于角色、技能、工作量）
- 工作流模板复用
- 实时进度追踪
- 任务超时提醒

---

### 3. 结果管理模块

**功能概述**
- 多种方式结果录入
- 批量结果导入
- 公式自动计算
- 异常结果标记与复测

**架构设计**

```
结果管理模块
├── API层 (app/routers/)
│   ├── results.py                # 结果管理
│   ├── formulas.py               # 公式配置
│   └── anomalies.py              # 异常管理
├── Schema层 (app/schemas/)
│   ├── result.py                 # 结果验证模型
│   └── formula.py                # 公式验证模型
├── Service层 (app/services/)
│   ├── result_service.py         # 结果业务逻辑
│   ├── formula_service.py        # 公式计算服务
│   └── anomaly_service.py        # 异常检测服务
├── Repository层 (app/repositories/)
│   └── result_repository.py      # 结果数据访问
└── Model层 (app/models/)
    └── result.py                 # 结果ORM模型
```

**公式计算引擎**
```
┌─────────────────────────────────────┐
│      公式定义 (Formula Definition)    │
│  - 公式表达式（字符串）               │
│  - 变量映射                          │
│  - 函数库支持                        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      公式解析器 (Parser)              │
│  - 语法解析（AST）                    │
│  - 表达式验证                        │
│  - 变量替换                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      计算引擎 (Calculator)            │
│  - 实时计算                          │
│  - 精度控制                          │
│  - 错误处理                          │
└─────────────────────────────────────┘
```

**关键特性**
- 手工录入、文件导入、仪器对接
- 公式自动计算（支持复杂表达式）
- 异常值自动检测（基于规则或统计）
- 复测流程管理
- 结果审核追溯
- 数据完整性验证

---

### 4. 审核与质量判定模块

**功能概述**
- 多级审核流程
- 审核任务管理
- 质量判定规则配置
- 自动判定与人工复核

**架构设计**

```
审核判定模块
├── API层 (app/routers/)
│   ├── audits.py                 # 审核管理
│   └── judgments.py              # 质量判定
├── Schema层 (app/schemas/)
│   ├── audit.py                  # 审核验证模型
│   └── judgment.py               # 判定验证模型
├── Service层 (app/services/)
│   ├── audit_service.py          # 审核业务逻辑
│   └── judgment_service.py       # 判定业务逻辑
├── Repository层 (app/repositories/)
│   └── audit_repository.py       # 审核数据访问
└── Model层 (app/models/)
    └── audit.py                  # 审核ORM模型
```

**审核流程引擎**
```
┌─────────────────────────────────────┐
│      审核配置 (Audit Config)          │
│  - 审核级别定义                       │
│  - 审核人员分配                       │
│  - 审核规则设置                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      审核引擎 (Audit Engine)          │
│  - 自动分配审核任务                   │
│  - 审核流程控制                       │
│  - 审核意见记录                       │
│  - 电子签名验证                       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      质量判定 (Quality Judgment)      │
│  - 判定规则匹配                       │
│  - 自动判定                          │
│  - 人工复核                          │
└─────────────────────────────────────┘
```

**关键特性**
- 多级审核流程（一审、二审、三审）
- 审核模板配置
- 电子签名支持（符合21 CFR Part 11）
- 审核意见追溯
- 质量判定自动化（基于规则引擎）
- 审核统计分析

---

### 5. 报告管理模块

**功能概述**
- 报告模板设计
- 报告自动生成
- 电子签名管理
- 报告分发与回收

**架构设计**

```
报告管理模块
├── API层 (app/routers/)
│   ├── report_templates.py       # 报告模板
│   ├── reports.py                # 报告管理
│   └── signatures.py             # 电子签名
├── Schema层 (app/schemas/)
│   ├── report.py                 # 报告验证模型
│   └── signature.py              # 签名验证模型
├── Service层 (app/services/)
│   ├── report_service.py         # 报告业务逻辑
│   └── signature_service.py      # 签名业务逻辑
├── Repository层 (app/repositories/)
│   └── report_repository.py      # 报告数据访问
└── Model层 (app/models/)
    └── report.py                 # 报告ORM模型
```

**报告生成流程**
```
┌─────────────────────────────────────┐
│      模板设计 (Template Design)       │
│  - HTML模板                          │
│  - 变量占位符                        │
│  - 样式配置（CSS）                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      数据填充 (Data Filling)          │
│  - 样品数据                          │
│  - 检测结果                          │
│  - 审核信息                          │
│  - 签名信息                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      报告生成 (Report Generation)     │
│  - PDF生成（WeasyPrint）              │
│  - 电子签名嵌入                       │
│  - 水印添加                          │
│  - 文件存储                          │
└─────────────────────────────────────┘
```

**关键特性**
- 可视化模板设计（HTML + CSS）
- 变量自动填充（Jinja2模板引擎）
- 电子签名集成
- 报告版本管理
- 分发记录追溯
- PDF生成（WeasyPrint）
- 报告回收机制

---

### 6. 统计分析模块

**功能概述**
- 实时数据统计
- 多维度数据分析
- 自定义报表配置
- 数据可视化展示

**架构设计**

```
统计分析模块
├── API层 (app/routers/)
│   ├── statistics.py             # 统计分析
│   └── export.py                 # 数据导出
├── Schema层 (app/schemas/)
│   └── statistics.py             # 统计验证模型
├── Service层 (app/services/)
│   ├── statistics_service.py     # 统计业务逻辑
│   └── export_service.py         # 导出业务逻辑
├── Repository层 (app/repositories/)
│   └── statistics_repository.py  # 统计数据访问
└── Model层 (app/models/)
    └── (复用其他模块的模型)
```

**数据处理流程**
```
┌─────────────────────────────────────┐
│      数据源 (Data Source)             │
│  - 样品数据                          │
│  - 检测结果                          │
│  - 审核记录                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      数据处理 (Data Processing)       │
│  - 数据聚合（GROUP BY）               │
│  - 统计计算（COUNT、AVG、SUM）        │
│  - 趋势分析（时间序列）               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      结果输出 (Output)                │
│  - JSON格式（前端图表）               │
│  - Excel导出（openpyxl）              │
│  - PDF报表（WeasyPrint）              │
└─────────────────────────────────────┘
```

**关键特性**
- 实时数据更新（WebSocket推送）
- 多维度分析（按时间、类型、状态等）
- 自定义报表（灵活的查询条件）
- 数据导出（Excel、PDF、CSV）
- 缓存优化（Redis缓存热点数据）
- 异步任务（大数据量导出使用ARQ）

---

## 📊 数据库设计

### 核心表结构

**samples表 - 样品表**
```sql
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(50) UNIQUE NOT NULL,
    sample_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(200) NOT NULL,
    sample_name VARCHAR(200) NOT NULL,
    sample_type VARCHAR(100) NOT NULL,
    quantity FLOAT,
    unit VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    received_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    
    INDEX idx_barcode (barcode),
    INDEX idx_sample_number (sample_number),
    INDEX idx_status (status),
    INDEX idx_client_name (client_name)
);
```

**workflows表 - 工作流表**
```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    is_template BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    INDEX idx_status (status),
    INDEX idx_is_template (is_template)
);
```

**tasks表 - 任务表**
```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL,
    sample_id UUID NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    task_name VARCHAR(200) NOT NULL,
    assigned_to VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id),
    FOREIGN KEY (sample_id) REFERENCES samples(id),
    INDEX idx_status (status),
    INDEX idx_assigned_to (assigned_to)
);
```

---

## 🔐 安全架构设计

### 认证与授权

**JWT认证流程**
```
1. 用户登录 → 验证用户名密码
2. 生成JWT Token（包含用户ID、角色、权限）
3. 返回Access Token（30分钟）和Refresh Token（7天）
4. 客户端存储Token
5. 后续请求携带Token（Authorization: Bearer <token>）
6. 服务端验证Token（中间件/依赖注入）
7. Token过期 → 使用Refresh Token刷新
```

**RBAC权限模型**
```
用户 (User) → 角色 (Role) → 权限 (Permission)

示例:
- 用户: 张三
- 角色: 检测员
- 权限: sample:read, sample:update, task:execute
```

**权限检查实现**
```python
async def require_permission(permission: str):
    """权限检查装饰器"""
    async def permission_checker(
        user: dict = Depends(get_current_user)
    ):
        user_permissions = user.get("permissions", [])
        if permission not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail=f"缺少权限: {permission}"
            )
    return permission_checker

# 使用方式
@router.post("/samples")
async def create_sample(
    _: None = Depends(require_permission("sample:create"))
):
    ...
```

### 数据安全

**敏感数据加密**
- 密码：bcrypt哈希（不可逆）
- 电子签名：RSA加密
- 敏感字段：AES-256加密

**SQL注入防护**
- 使用SQLAlchemy ORM（参数化查询）
- 禁止拼接SQL字符串
- 输入验证（Pydantic）

**XSS防护**
- 输出转义（自动）
- Content-Security-Policy头
- 输入验证

**CSRF防护**
- SameSite Cookie
- CSRF Token（如需要）

---

## 🚀 性能优化策略

### 1. 数据库优化

**索引优化**
```sql
-- 常用查询字段添加索引
CREATE INDEX idx_samples_barcode ON samples(barcode);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_client_name ON samples(client_name);

-- 复合索引
CREATE INDEX idx_samples_status_created_at ON samples(status, created_at DESC);
```

**查询优化**
```python
# 使用select_in_load避免N+1查询
from sqlalchemy.orm import selectinload

query = select(Sample).options(
    selectinload(Sample.workflow_instances),
    selectinload(Sample.results)
)
```

**连接池配置**
```python
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,              # 连接池大小
    max_overflow=10,           # 最大溢出连接数
    pool_pre_ping=True,        # 连接健康检查
    pool_recycle=3600          # 连接回收时间（秒）
)
```

### 2. 缓存策略

**Redis缓存**
```python
# 缓存热点数据
async def get_sample_by_barcode(barcode: str) -> Sample:
    # 1. 尝试从Redis获取
    cache_key = f"sample:barcode:{barcode}"
    cached = await redis.get(cache_key)
    if cached:
        return Sample.parse_raw(cached)
    
    # 2. 从数据库查询
    sample = await sample_repo.get_by_barcode(barcode)
    
    # 3. 写入Redis（过期时间5分钟）
    await redis.setex(
        cache_key,
        300,
        sample.json()
    )
    
    return sample
```

**缓存失效策略**
```python
# 更新数据时删除缓存
async def update_sample(sample_id: str, data: dict):
    sample = await sample_repo.update(sample_id, data)
    
    # 删除相关缓存
    await redis.delete(f"sample:id:{sample_id}")
    await redis.delete(f"sample:barcode:{sample.barcode}")
    
    return sample
```

### 3. 异步任务

**ARQ异步任务队列**
```python
# 定义异步任务
async def generate_report_task(ctx, report_id: str):
    """生成报告（异步任务）"""
    report_service = ReportService(ctx['db'])
    await report_service.generate_pdf(report_id)
    return {"status": "completed", "report_id": report_id}

# 提交任务
await arq_redis.enqueue_job(
    'generate_report_task',
    report_id=report_id
)
```

**适用场景**
- 报告生成（PDF）
- 数据导出（大量数据）
- 邮件发送
- 数据统计计算

### 4. 分页优化

**游标分页（Cursor Pagination）**
```python
async def get_samples_cursor(
    cursor: Optional[str] = None,
    limit: int = 20
):
    """游标分页（适合大数据量）"""
    query = select(Sample).order_by(Sample.created_at.desc())
    
    if cursor:
        # 解码游标
        cursor_data = decode_cursor(cursor)
        query = query.where(Sample.created_at < cursor_data['created_at'])
    
    query = query.limit(limit + 1)
    results = await db.execute(query)
    samples = results.scalars().all()
    
    has_next = len(samples) > limit
    if has_next:
        samples = samples[:limit]
    
    next_cursor = None
    if has_next and samples:
        next_cursor = encode_cursor({
            'created_at': samples[-1].created_at
        })
    
    return {
        'items': samples,
        'next_cursor': next_cursor,
        'has_next': has_next
    }
```

### 5. 响应压缩

**Gzip压缩**
```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

---

## 🧪 测试策略

### 单元测试

**测试框架**: pytest + pytest-asyncio

```python
# tests/services/test_sample_service.py
import pytest
from app.services.sample_service import SampleService
from app.schemas.sample import SampleCreate

@pytest.mark.asyncio
async def test_create_sample(db_session):
    """测试创建样品"""
    service = SampleService(db_session)
    
    sample_data = SampleCreate(
        client_name="测试客户",
        sample_name="水样",
        sample_type="环境样品",
        quantity=500.0,
        unit="mL",
        received_date=datetime.now()
    )
    
    sample = await service.create_sample(
        sample_data=sample_data,
        created_by="test_user"
    )
    
    assert sample.id is not None
    assert sample.barcode.startswith("SP")
    assert sample.status == SampleStatus.REGISTERED
```

### 集成测试

```python
# tests/api/test_samples.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_sample_api(client: AsyncClient, auth_headers):
    """测试创建样品API"""
    response = await client.post(
        "/api/v1/samples",
        json={
            "client_name": "测试客户",
            "sample_name": "水样",
            "sample_type": "环境样品",
            "quantity": 500.0,
            "unit": "mL",
            "received_date": "2026-04-30T10:00:00"
        },
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["data"]["barcode"].startswith("SP")
```

### 性能测试

**Locust负载测试**
```python
# locustfile.py
from locust import HttpUser, task, between

class SampleUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """登录获取Token"""
        response = self.client.post("/api/v1/auth/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        self.token = response.json()["data"]["access_token"]
    
    @task(3)
    def get_samples(self):
        """查询样品列表"""
        self.client.get(
            "/api/v1/samples",
            headers={"Authorization": f"Bearer {self.token}"}
        )
    
    @task(1)
    def create_sample(self):
        """创建样品"""
        self.client.post(
            "/api/v1/samples",
            json={
                "client_name": "测试客户",
                "sample_name": "水样",
                "sample_type": "环境样品",
                "quantity": 500.0,
                "unit": "mL",
                "received_date": "2026-04-30T10:00:00"
            },
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

---

## 📊 监控与日志

### Prometheus监控

**指标收集**
```python
from prometheus_client import Counter, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

# 自定义指标
sample_created_counter = Counter(
    'sample_created_total',
    'Total number of samples created'
)

sample_creation_duration = Histogram(
    'sample_creation_duration_seconds',
    'Sample creation duration'
)

# 在FastAPI应用中启用
Instrumentator().instrument(app).expose(app)

# 使用指标
@router.post("/samples")
async def create_sample(...):
    with sample_creation_duration.time():
        sample = await service.create_sample(...)
        sample_created_counter.inc()
    return sample
```

**监控指标**
- HTTP请求数量、延迟、错误率
- 数据库连接池使用情况
- 缓存命中率
- 任务队列长度
- 业务指标（样品创建数、任务完成数等）

### 日志管理

**结构化日志**
```python
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """JSON格式日志"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        if hasattr(record, 'extra'):
            log_data.update(record.extra)
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/app.log")
    ]
)
logger = logging.getLogger(__name__)
logger.setFormatter(JSONFormatter())

# 使用日志
logger.info(
    "Sample created",
    extra={
        "sample_id": sample.id,
        "barcode": sample.barcode,
        "user_id": user_id
    }
)
```

**日志级别**
- DEBUG: 详细的调试信息
- INFO: 一般信息（业务操作）
- WARNING: 警告信息（潜在问题）
- ERROR: 错误信息（需要关注）
- CRITICAL: 严重错误（系统故障）

---

## 📚 开发规范

### 代码规范

**命名规范**
- 文件名: snake_case (sample_service.py)
- 类名: PascalCase (SampleService)
- 函数名: snake_case (create_sample)
- 常量: UPPER_SNAKE_CASE (MAX_PAGE_SIZE)
- 变量: snake_case (sample_data)

**类型注解**
```python
from typing import List, Optional, Dict, Any

async def get_samples(
    page: int = 1,
    page_size: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[Sample]:
    """所有参数和返回值都要有类型注解"""
    ...
```

**文档字符串**
```python
async def create_sample(
    self,
    sample_data: SampleCreate,
    created_by: str
) -> Sample:
    """
    创建样品
    
    Args:
        sample_data: 样品创建数据
        created_by: 创建人用户ID
    
    Returns:
        Sample: 创建成功的样品实例
    
    Raises:
        ValidationException: 当数据验证失败时
        ConflictException: 当条码或编号冲突时
    
    Example:
        sample = await service.create_sample(
            sample_data=SampleCreate(...),
            created_by="user123"
        )
    """
    ...
```

### 代码组织

**Service类结构**
```python
class SampleService:
    """样品服务类"""
    
    def __init__(self, db: AsyncSession):
        """初始化"""
        self.db = db
        self.sample_repo = SampleRepository(db)
    
    # 1. 查询方法
    async def get_sample_by_id(self, sample_id: str) -> Sample:
        ...
    
    async def get_samples(self, ...) -> List[Sample]:
        ...
    
    # 2. 创建方法
    async def create_sample(self, ...) -> Sample:
        ...
    
    # 3. 更新方法
    async def update_sample(self, ...) -> Sample:
        ...
    
    # 4. 删除方法
    async def delete_sample(self, ...) -> None:
        ...
    
    # 5. 业务方法
    async def split_sample(self, ...) -> List[Sample]:
        ...
```

### 错误处理

**自定义异常**
```python
# app/core/exceptions.py
class APIException(Exception):
    """API异常基类"""
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "INTERNAL_ERROR",
        details: Any = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details

class NotFoundException(APIException):
    """资源不存在异常"""
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=404,
            error_code="NOT_FOUND"
        )

class ValidationException(APIException):
    """数据验证异常"""
    def __init__(self, message: str, details: Any = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details
        )
```

**异常处理**
```python
try:
    sample = await service.create_sample(...)
except ValidationException as e:
    logger.error(f"Validation error: {e.message}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}", exc_info=True)
    raise APIException("Internal server error")
```

---

## 🔄 部署架构

### Docker部署

**Dockerfile**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY . .

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  fastapi:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:pass@postgres:5432/lims
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=lims
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 生产环境配置

**Uvicorn配置**
```bash
# 多进程部署
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --workers 4 \
  --loop uvloop \
  --log-level info \
  --access-log \
  --proxy-headers
```

**Nginx反向代理**
```nginx
upstream fastapi_backend {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    server 127.0.0.1:8003;
}

server {
    listen 80;
    server_name api.example.com;
    
    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 📖 总结

### 架构优势

**1. 清晰的分层架构**
- 职责明确，易于维护
- 每层独立可测
- 支持模块化开发

**2. 高性能**
- 异步I/O（asyncio）
- 数据库连接池
- Redis缓存
- 异步任务队列

**3. 类型安全**
- Pydantic数据验证
- 完整的类型注解
- 自动生成OpenAPI文档

**4. 可扩展性**
- 微服务架构友好
- 支持水平扩展
- 模块化设计

**5. 安全性**
- JWT认证
- RBAC权限控制
- 数据加密
- SQL注入防护

### 技术栈总结

**核心框架**
- FastAPI - 现代化Web框架
- SQLAlchemy - 异步ORM
- Pydantic - 数据验证

**数据库**
- PostgreSQL - 关系型数据库
- Redis - 缓存和消息队列

**监控与日志**
- Prometheus - 监控指标
- 结构化日志 - JSON格式

**测试**
- pytest - 测试框架
- Locust - 性能测试

**部署**
- Docker - 容器化
- Uvicorn - ASGI服务器
- Nginx - 反向代理

---

**文档结束**

---

## 📂 实际文件结构说明

### 核心文件

#### 1. **`fastapi-backend/app/main.py`** - FastAPI 应用入口

**文件路径**: `fastapi-backend/app/main.py`

**功能描述**:
- FastAPI 应用的主入口文件
- 创建 FastAPI 应用实例
- 配置应用生命周期管理（lifespan）
- 注册所有中间件（CORS、日志、限流等）
- 挂载所有路由模块
- 注册全局异常处理器
- 配置 OpenAPI 文档（Swagger UI、ReDoc）
- 提供健康检查端点

**关键内容**:
```python
# 应用创建
app = FastAPI(
    title="实验室样品管理 FastAPI 后端服务",
    description="实验室样品管理微服务",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 生命周期管理
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    await check_database_connection()
    yield
    # 关闭时清理资源
    await close_database_connection()

# 中间件注册
app.add_middleware(CORSMiddleware, ...)
app.add_middleware(RequestLoggingMiddleware)

# 路由挂载
app.include_router(samples.router, prefix="/api/v1")
app.include_router(workflows.router, prefix="/api/v1")
```

---

#### 2. **`fastapi-backend/app/core/database.py`** - 数据库连接配置

**文件路径**: `fastapi-backend/app/core/database.py`

**功能描述**:
- 配置 SQLAlchemy 异步引擎
- 创建异步会话工厂
- 提供数据库会话依赖注入（`get_db`）
- 数据库连接健康检查
- 连接池配置
- 基础模型类定义

**关键内容**:
```python
# 创建异步引擎
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    echo=False
)

# 创建异步会话工厂
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# 依赖注入：获取数据库会话
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# 基础模型类
Base = declarative_base()
```

---

#### 3. **`fastapi-backend/app/core/security.py`** - JWT 认证和安全

**文件路径**: `fastapi-backend/app/core/security.py`

**功能描述**:
- JWT Token 生成和验证
- 密码哈希和验证（bcrypt）
- 获取当前用户（依赖注入）
- 权限检查装饰器
- Token 刷新机制

**关键内容**:
```python
# JWT Token 生成
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 密码哈希
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# 获取当前用户（依赖注入）
async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security)
) -> dict:
    token = credentials.credentials
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    return payload

# 权限检查
async def require_permission(permission: str):
    async def permission_checker(user: dict = Depends(get_current_user)):
        if permission not in user.get("permissions", []):
            raise HTTPException(status_code=403, detail="权限不足")
    return permission_checker
```

---

#### 4. **`fastapi-backend/app/api/v1/auth.py`** - 认证路由

**文件路径**: `fastapi-backend/app/api/v1/auth.py`

**功能描述**:
- 用户登录端点
- Token 刷新端点
- 用户注册端点（如有）
- 密码重置端点（如有）

**关键端点**:
```python
POST /api/v1/auth/login       # 用户登录
POST /api/v1/auth/refresh     # 刷新Token
POST /api/v1/auth/register    # 用户注册
POST /api/v1/auth/reset-password  # 密码重置
```

---

### 样品管理模块（完整业务链路示例）

#### 5. **`fastapi-backend/app/api/v1/samples.py`** - 样品路由层

**文件路径**: `fastapi-backend/app/api/v1/samples.py`

**功能描述**:
- 定义样品管理的所有 RESTful API 端点
- 处理 HTTP 请求参数（路径参数、查询参数、请求体）
- 调用服务层执行业务逻辑
- 返回标准化的 HTTP 响应
- 权限验证（通过依赖注入）

**关键端点**:
```python
POST   /api/v1/samples              # 创建样品
GET    /api/v1/samples              # 查询样品列表（分页）
GET    /api/v1/samples/{id}         # 获取样品详情
PATCH  /api/v1/samples/{id}         # 更新样品
DELETE /api/v1/samples/{id}         # 删除样品（软删除）
PATCH  /api/v1/samples/{id}/status  # 更新样品状态
GET    /api/v1/samples/barcode/{barcode}  # 按条码查询
POST   /api/v1/samples/batch-delete # 批量删除
```

**代码特点**:
- 使用 FastAPI 的依赖注入系统
- 完整的 OpenAPI 文档注解
- 统一的响应格式（`SuccessResponse`）
- 权限检查（`require_permission`）

---

#### 6. **`fastapi-backend/app/schemas/sample.py`** - 样品验证层

**文件路径**: `fastapi-backend/app/schemas/sample.py`

**功能描述**:
- 定义样品的 Pydantic 验证模型
- 请求数据验证（类型、格式、范围）
- 响应数据序列化
- 生成 OpenAPI Schema

**包含的模型**:
- `SampleBase`: 基础模型，包含共享字段
- `SampleCreate`: 创建请求模型，必填字段验证
- `SampleUpdate`: 更新请求模型，所有字段可选
- `SampleResponse`: 响应模型，包含完整样品信息
- `SampleListResponse`: 列表响应，包含分页信息
- `SampleStatusUpdate`: 状态更新专用模型
- `BatchDeleteRequest`: 批量删除请求模型
- `BatchDeleteResponse`: 批量删除响应模型

**代码特点**:
- 使用 Pydantic v2 语法
- 完整的字段验证（长度、范围、格式）
- 支持 ORM 模型转换（`from_attributes=True`）
- 禁止额外字段（`extra="forbid"`）

---

#### 7. **`fastapi-backend/app/services/sample_service.py`** - 样品服务层

**文件路径**: `fastapi-backend/app/services/sample_service.py`

**功能描述**:
- 实现样品管理的核心业务逻辑
- 调用仓储层进行数据访问
- 处理业务异常和错误
- 管理事务边界
- 协调多个仓储的操作

**核心方法**:
- `create_sample`: 创建样品，自动生成条码和样品编号
- `get_samples`: 分页查询样品，支持多条件过滤
- `get_sample_by_id`: 根据ID查询样品详情
- `get_sample_by_barcode`: 根据条码查询样品
- `update_sample`: 更新样品，支持乐观锁（版本控制）
- `update_sample_status`: 更新样品状态，处理放行状态特殊逻辑
- `split_sample`: 分样操作，建立父子样品关系
- `merge_samples`: 合样操作，记录来源样品
- `delete_sample`: 软删除样品（更新状态为ARCHIVED）
- `batch_delete_samples`: 批量删除样品

**代码特点**:
- 完整的事务管理（commit/rollback）
- 详细的日志记录
- 业务规则验证（状态检查、权限检查）
- 乐观锁支持（版本控制）
- 异常处理和错误转换

---

#### 8. **`fastapi-backend/app/repositories/sample_repository.py`** - 样品仓储层

**文件路径**: `fastapi-backend/app/repositories/sample_repository.py`

**功能描述**:
- 封装样品的数据库操作
- 继承 `BaseRepository`，复用通用 CRUD 操作
- 提供样品特定的查询方法
- 处理数据库异常
- 支持分页和过滤

**核心方法**:
- `get_by_barcode`: 根据条码查询样品
- `get_by_sample_number`: 根据样品编号查询样品
- `get_by_status`: 根据状态查询样品列表
- `get_by_client_name`: 根据客户名称查询（模糊匹配）
- `get_by_sample_type`: 根据样品类型查询
- `get_active_samples`: 获取所有活跃样品（排除已归档）
- `get_by_parent_sample_id`: 查询子样品
- `count_by_status`: 统计指定状态的样品数量
- `barcode_exists`: 检查条码是否存在
- `sample_number_exists`: 检查样品编号是否存在

**代码特点**:
- 继承 `BaseRepository[Sample]`（泛型）
- 使用 SQLAlchemy 异步 API
- 所有方法都是异步的
- 类型安全（完整的类型注解）

---

#### 9. **`fastapi-backend/app/models/sample.py`** - 样品 ORM 模型

**文件路径**: `fastapi-backend/app/models/sample.py`

**功能描述**:
- 定义样品表结构（`samples` 表）
- 定义字段类型和约束
- 定义索引和唯一约束
- 定义枚举类型（状态、优先级）

**字段定义**:
- 主键：`id` (UUID)
- 唯一标识：`barcode`（条码）、`sample_number`（样品编号）
- 客户信息：`client_name`、`client_contact`
- 样品信息：`sample_name`、`sample_type`、`sample_category`
- 数量信息：`quantity`、`unit`
- 状态信息：`status`（枚举类型）
- 时间信息：`received_date`、`sampling_date`、`created_at`、`updated_at`
- 存储信息：`storage_location`、`storage_condition`
- 关系字段：`parent_sample_id`（父样品）、`merged_from_ids`（合样来源）
- 放行信息：`released_at`、`released_by`
- 版本控制：`version`（乐观锁）

**枚举类型**:
- `SampleStatus`: 样品状态（REGISTERED、IN_TESTING、TESTED、RELEASED、ARCHIVED）
- `Priority`: 优先级（LOW、NORMAL、HIGH、URGENT）

**代码特点**:
- 使用 SQLAlchemy 2.0 声明式语法
- 完整的类型注解
- 合理的索引设计
- 支持 UUID 主键

---

### 其他业务模块

#### 10. **工作流管理模块**

**相关文件**:
- `fastapi-backend/app/routers/workflows.py` - 工作流路由
- `fastapi-backend/app/routers/tasks.py` - 任务路由
- `fastapi-backend/app/routers/methods.py` - 检测方法路由
- `fastapi-backend/app/schemas/workflow.py` - 工作流验证模型
- `fastapi-backend/app/schemas/task.py` - 任务验证模型
- `fastapi-backend/app/services/workflow_service.py` - 工作流服务
- `fastapi-backend/app/services/task_service.py` - 任务服务
- `fastapi-backend/app/repositories/workflow_repository.py` - 工作流仓储
- `fastapi-backend/app/repositories/task_repository.py` - 任务仓储
- `fastapi-backend/app/models/workflow.py` - 工作流模型
- `fastapi-backend/app/models/task.py` - 任务模型

**功能描述**:
- 可视化工作流设计（JSON格式存储节点和连线）
- 检测方法库管理
- 任务自动分配与派工
- 工作流模板配置
- 任务执行和状态追踪

---

#### 11. **结果管理模块**

**相关文件**:
- `fastapi-backend/app/routers/results.py` - 结果路由
- `fastapi-backend/app/routers/formulas.py` - 公式路由
- `fastapi-backend/app/routers/anomalies.py` - 异常路由
- `fastapi-backend/app/schemas/result.py` - 结果验证模型
- `fastapi-backend/app/services/result_service.py` - 结果服务
- `fastapi-backend/app/services/formula_service.py` - 公式服务
- `fastapi-backend/app/repositories/result_repository.py` - 结果仓储
- `fastapi-backend/app/models/result.py` - 结果模型

**功能描述**:
- 多种方式结果录入（手工、导入、仪器对接）
- 批量结果导入
- 公式自动计算
- 异常结果标记与复测

---

#### 12. **审核与质量判定模块**

**相关文件**:
- `fastapi-backend/app/routers/audits.py` - 审核路由
- `fastapi-backend/app/routers/judgments.py` - 质量判定路由
- `fastapi-backend/app/schemas/audit.py` - 审核验证模型
- `fastapi-backend/app/services/audit_service.py` - 审核服务
- `fastapi-backend/app/services/judgment_service.py` - 判定服务
- `fastapi-backend/app/repositories/audit_repository.py` - 审核仓储
- `fastapi-backend/app/models/audit.py` - 审核模型

**功能描述**:
- 多级审核流程
- 审核任务管理
- 质量判定规则配置
- 自动判定与人工复核
- 电子签名支持

---

#### 13. **报告管理模块**

**相关文件**:
- `fastapi-backend/app/routers/report_templates.py` - 报告模板路由
- `fastapi-backend/app/routers/reports.py` - 报告路由
- `fastapi-backend/app/routers/signatures.py` - 电子签名路由
- `fastapi-backend/app/schemas/report.py` - 报告验证模型
- `fastapi-backend/app/services/report_service.py` - 报告服务
- `fastapi-backend/app/services/signature_service.py` - 签名服务
- `fastapi-backend/app/repositories/report_repository.py` - 报告仓储
- `fastapi-backend/app/models/report.py` - 报告模型

**功能描述**:
- 报告模板设计（HTML + CSS）
- 报告自动生成（PDF）
- 电子签名管理
- 报告分发与回收

---

#### 14. **统计分析模块**

**相关文件**:
- `fastapi-backend/app/routers/statistics.py` - 统计路由
- `fastapi-backend/app/routers/export.py` - 导出路由
- `fastapi-backend/app/schemas/statistics.py` - 统计验证模型
- `fastapi-backend/app/services/statistics_service.py` - 统计服务
- `fastapi-backend/app/services/export_service.py` - 导出服务

**功能描述**:
- 实时数据统计
- 多维度数据分析
- 自定义报表配置
- 数据导出（Excel、PDF、CSV）

---

#### 15. **仪器管理模块**

**相关文件**:
- `fastapi-backend/app/api/v1/instruments.py` - 仪器路由
- `fastapi-backend/app/schemas/instrument.py` - 仪器验证模型
- `fastapi-backend/app/services/instrument_service.py` - 仪器服务
- `fastapi-backend/app/repositories/instrument_repository.py` - 仪器仓储
- `fastapi-backend/app/models/instrument.py` - 仪器模型

**功能描述**:
- 仪器档案管理
- 校准与维护管理
- 仪器使用记录
- 仪器状态监控

---

#### 16. **系统管理模块**

**相关文件**:
- `fastapi-backend/app/routers/users.py` - 用户路由
- `fastapi-backend/app/routers/roles.py` - 角色路由
- `fastapi-backend/app/routers/permissions.py` - 权限路由
- `fastapi-backend/app/routers/audit_logs.py` - 审计日志路由
- `fastapi-backend/app/schemas/user.py` - 用户验证模型
- `fastapi-backend/app/services/user_service.py` - 用户服务
- `fastapi-backend/app/repositories/user_repository.py` - 用户仓储
- `fastapi-backend/app/models/user.py` - 用户模型

**功能描述**:
- 用户管理
- 角色权限配置（RBAC）
- 审计日志查看
- 系统参数配置

---

### 中间件和工具

#### 17. **`fastapi-backend/app/middleware/auth.py`** - 认证中间件

**文件路径**: `fastapi-backend/app/middleware/auth.py`

**功能描述**:
- JWT Token 验证中间件
- 自动从请求头提取 Token
- 验证 Token 有效性
- 将用户信息注入到请求上下文

---

#### 18. **`fastapi-backend/app/config.py`** - 配置管理

**文件路径**: `fastapi-backend/app/config.py`

**功能描述**:
- 使用 Pydantic Settings 管理配置
- 从环境变量读取配置
- 提供配置验证
- 支持 .env 文件

**配置项**:
- 应用配置（名称、版本、调试模式）
- 数据库配置（URL、连接池）
- Redis 配置
- JWT 配置（密钥、算法、过期时间）
- CORS 配置
- 日志配置

---

#### 19. **`fastapi-backend/app/worker.py`** - 异步任务 Worker

**文件路径**: `fastapi-backend/app/worker.py`

**功能描述**:
- ARQ 异步任务队列配置
- 定义异步任务函数
- 任务调度和执行

**适用场景**:
- 报告生成（PDF）
- 数据导出（大量数据）
- 邮件发送
- 数据统计计算

---

### 说明

**关于预约模块和智能体模块**:
- ❌ **预约模块（reservation）**: 当前系统中不存在预约相关的业务模块
- ❌ **智能体模块（agent）**: 当前系统中不存在智能体相关的业务模块（只有 userAgent 字段用于记录浏览器信息）

**实际存在的核心业务模块**:
1. ✅ 样品管理模块（samples）- 完整的业务链路
2. ✅ 样品流转模块（transfers）
3. ✅ 工作流管理模块（workflows、tasks、methods）
4. ✅ 结果管理模块（results、formulas、anomalies）
5. ✅ 审核与质量判定模块（audits、judgments）
6. ✅ 报告管理模块（report_templates、reports、signatures）
7. ✅ 统计分析模块（statistics、export）
8. ✅ 仪器管理模块（instruments）
9. ✅ 系统管理模块（users、roles、permissions、audit_logs）

**文件组织结构**:
```
fastapi-backend/app/
├── main.py                    # 应用入口
├── config.py                  # 配置管理
├── worker.py                  # 异步任务Worker
├── core/                      # 核心模块
│   ├── database.py           # 数据库连接
│   ├── security.py           # JWT认证和安全
│   └── exceptions.py         # 自定义异常
├── api/v1/                    # API v1版本
│   ├── auth.py               # 认证路由
│   ├── health.py             # 健康检查
│   ├── samples.py            # 样品路由
│   ├── transfers.py          # 样品流转路由
│   └── instruments.py        # 仪器路由
├── routers/                   # 其他路由
│   ├── workflows.py          # 工作流路由
│   ├── tasks.py              # 任务路由
│   ├── results.py            # 结果路由
│   ├── audits.py             # 审核路由
│   ├── reports.py            # 报告路由
│   └── ...                   # 其他路由
├── schemas/                   # Pydantic验证模型
│   ├── sample.py             # 样品Schema
│   ├── workflow.py           # 工作流Schema
│   └── ...                   # 其他Schema
├── services/                  # 业务逻辑层
│   ├── sample_service.py     # 样品服务
│   ├── workflow_service.py   # 工作流服务
│   └── ...                   # 其他服务
├── repositories/              # 数据访问层
│   ├── base_repository.py    # 基础仓储
│   ├── sample_repository.py  # 样品仓储
│   └── ...                   # 其他仓储
├── models/                    # ORM模型
│   ├── sample.py             # 样品模型
│   ├── workflow.py           # 工作流模型
│   └── ...                   # 其他模型
├── middleware/                # 中间件
│   ├── auth.py               # 认证中间件
│   ├── logging.py            # 日志中间件
│   └── ...                   # 其他中间件
├── tasks/                     # 异步任务
└── utils/                     # 工具函数
```

---

**文档完整性说明**:

本文档已经包含了 FastAPI 后端的完整架构设计，包括：
- ✅ 分层架构模型
- ✅ 技术栈说明
- ✅ 各层职责定义
- ✅ 实际文件结构
- ✅ 完整的业务链路示例（样品管理模块）
- ✅ 核心功能模块设计
- ✅ 安全架构设计
- ✅ 性能优化策略
- ✅ 测试策略
- ✅ 监控与日志
- ✅ 开发规范
- ✅ 部署架构

所有内容都基于实际的代码文件，确保文档与实际实现一致。
