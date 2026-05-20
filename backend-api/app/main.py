"""
FastAPI 应用入口
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError, HTTPException
from sqlalchemy.exc import IntegrityError, OperationalError, DataError
from sqlalchemy import text
from prometheus_fastapi_instrumentator import Instrumentator
from app.core.logging import setup_logging
from app.core.database import check_database_connection, close_database_connection
from app.core.redis import close_redis_connection
from app.core.exceptions import APIException
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    database_error_handler,
    data_error_handler,
    http_exception_handler,
    generic_exception_handler
)
from app.middleware.cors import configure_cors
from app.config import settings
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.api.v1 import health, samples, transfers, auth, instruments
from app.routers import permissions, roles, users, performance, workflows, tasks, results, formulas, anomalies, judgments, report_templates, reports, signatures, statistics, export, queue, methods, docs, audits, dashboard
from app.agent import routes as agent_routes
from app.agent.error_handlers import register_error_handlers as register_agent_error_handlers
from app.services.assignment_engine import assignment_engine
from app.core.database import AsyncSessionLocal
import logging

# 配置日志
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理
    
    启动时：
    - 预初始化 bcrypt（避免并发初始化问题）
    - 检查数据库连接
    - 预热数据库连接池
    - 初始化自动分配引擎
    
    关闭时：
    - 关闭数据库连接
    - 关闭 Redis 连接
    """
    # 启动
    logger.info("Starting FastAPI application...")
    
    # 1. 预初始化 bcrypt（已在 auth_service.py 模块加载时完成）
    logger.info("Password hashing backend pre-initialized")
    
    # 2. 检查数据库连接
    db_connected = await check_database_connection()
    if db_connected:
        logger.info("Database connection: OK")
        
        # 3. 预热数据库连接池（创建初始连接）
        try:
            from app.core.database import get_engine
            engine = get_engine()
            # 创建几个连接来预热连接池
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
            logger.info("Database connection pool warmed up")
        except Exception as e:
            logger.warning(f"Failed to warm up connection pool: {str(e)}")
        
        # 4. 初始化自动分配引擎
        try:
            async with AsyncSessionLocal() as db:
                await assignment_engine.initialize(db)
            logger.info("Assignment engine initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize assignment engine: {str(e)}")
    else:
        logger.warning("Database connection: FAILED (service will continue)")
    
    logger.info("Application startup complete")
    
    yield
    
    # 关闭
    logger.info("Shutting down FastAPI application...")
    await close_database_connection()
    await close_redis_connection()
    logger.info("Application shutdown complete")


# 创建 FastAPI 应用
app = FastAPI(
    title="实验室样品管理 FastAPI 后端服务",
    description="""
    ## 实验室样品管理微服务
    
    该服务提供样品管理相关的 RESTful API，包括：
    
    - **认证授权**: 用户登录、令牌刷新、权限控制
    - **样品管理**: 创建、查询、更新、删除样品
    - **样品流转**: 记录样品流转和监管链
    - **分样合样**: 样品的拆分和合并操作
    - **条码管理**: 自动生成唯一条码和样品编号
    - **权限管理**: 权限、角色、用户管理
    
    ### 认证方式
    
    所有受保护的端点需要在请求头中包含 JWT 令牌：
    
    ```
    Authorization: Bearer <your-jwt-token>
    ```
    
    ### 响应格式
    
    所有 API 响应遵循统一格式：
    
    ```json
    {
      "message": "操作成功",
      "data": { ... },
      "error": null
    }
    ```
    
    ### 错误代码
    
    - `400` - 请求参数错误
    - `401` - 未授权（令牌无效或过期）
    - `403` - 权限不足
    - `404` - 资源不存在
    - `409` - 资源冲突
    - `422` - 数据验证失败
    - `429` - 请求过于频繁
    - `500` - 服务器内部错误
    - `503` - 服务暂时不可用
    
    ### 中间件
    
    - **CORS**: 跨域资源共享配置
    - **认证**: JWT 令牌验证
    - **权限**: 基于角色的访问控制（RBAC）
    - **限流**: 防止 API 滥用（默认 60 次/分钟）
    - **日志**: 请求日志记录和追踪
    - **错误处理**: 统一的错误响应格式
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
    contact={
        "name": "技术支持",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT License",
    },
    openapi_tags=[
        {
            "name": "auth",
            "description": "认证和授权 - 登录、登出、令牌刷新、用户信息"
        },
        {
            "name": "health",
            "description": "健康检查和系统状态"
        },
        {
            "name": "samples",
            "description": "样品管理操作 - 创建、查询、更新、删除样品"
        },
        {
            "name": "instruments",
            "description": "仪器管理操作 - 创建、查询、更新、删除仪器，状态管理"
        },
        {
            "name": "transfers",
            "description": "样品流转操作 - 流转记录、监管链、分样合样"
        },
        {
            "name": "权限管理",
            "description": "权限管理操作 - 创建、查询、删除权限"
        },
        {
            "name": "角色管理",
            "description": "角色管理操作 - 创建、查询、更新、删除角色，分配权限"
        },
        {
            "name": "用户管理",
            "description": "用户管理操作 - 创建、查询、更新、删除用户，重置密码"
        },
        {
            "name": "性能监控",
            "description": "性能监控操作 - 性能统计、慢请求、慢查询"
        },
        {
            "name": "workflows",
            "description": "工作流管理 - 工作流模板的创建、查询、更新、删除、激活和版本管理"
        },
        {
            "name": "tasks",
            "description": "任务管理 - 任务的创建、查询、更新、分配、执行和完成"
        },
        {
            "name": "results",
            "description": "检测结果管理 - 结果的创建、查询、更新、删除和审核"
        },
        {
            "name": "formulas",
            "description": "计算公式管理 - 公式的创建、查询、更新、删除、验证和执行"
        },
        {
            "name": "anomalies",
            "description": "异常检测管理 - 异常检测规则配置、异常标记、复测申请和异常处理"
        },
        {
            "name": "审核管理",
            "description": "审核管理 - 审核任务的创建、查询、执行、统计，审核意见模板和流程配置管理"
        },
        {
            "name": "质量判定",
            "description": "质量判定 - 判定规则管理、自动判定、手动判定、判定复核和判定历史"
        },
        {
            "name": "report-templates",
            "description": "报告模板管理 - 模板的创建、查询、更新、删除、激活和版本管理"
        },
        {
            "name": "reports",
            "description": "报告管理 - 报告的生成、查询、更新、删除和 PDF 导出"
        },
        {
            "name": "signatures",
            "description": "电子签名 - 报告签名、签名验证、签名撤销和签名查询"
        },
        {
            "name": "statistics",
            "description": "统计分析 - 综合统计、审核统计、工作量统计、质量统计和数据导出"
        },
        {
            "name": "export",
            "description": "数据导出 - 导出数据为 Excel 和 CSV 格式，支持异步导出任务管理"
        },
        {
            "name": "队列管理",
            "description": "异步任务队列管理 - 任务创建、查询、取消和队列统计"
        },
        {
            "name": "methods",
            "description": "检测方法库管理 - 方法的创建、查询、更新、删除、版本管理、归档和激活"
        },
        {
            "name": "文档管理",
            "description": "API 文档管理 - 文档导出、版本管理、版本对比和统计信息"
        },
        {
            "name": "AI Agent",
            "description": "本地轻量化 AI 智能体 - 实验需求解析、实验计划生成、智能问答"
        }
    ]
)

# ============================================================================
# Prometheus 监控配置
# ============================================================================

# 配置 Prometheus 监控
instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health", "/ready", "/live"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="fastapi_inprogress",
    inprogress_labels=True,
)

# 注册 Prometheus 监控
instrumentator.instrument(app)

# 暴露 /metrics 端点
instrumentator.expose(app, endpoint="/metrics", include_in_schema=False)

logger.info("Prometheus metrics enabled at /metrics")

# ============================================================================
# 中间件配置（按照执行顺序）
# ============================================================================

# 1. 配置 CORS 中间件（最先执行，处理跨域请求）
configure_cors(app)
logger.info("CORS middleware configured")

# 2. 添加请求日志中间件（记录所有请求）
app.add_middleware(RequestLoggingMiddleware)
logger.info("Request logging middleware added")

# 3. 添加限流中间件（防止 API 滥用）
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.RATE_LIMIT_PER_MINUTE,
    window_size=60
)
logger.info(f"Rate limit middleware added: {settings.RATE_LIMIT_PER_MINUTE} requests/minute")

# ============================================================================
# 全局异常处理器注册
# ============================================================================

# 注册自定义异常处理器
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, database_error_handler)
app.add_exception_handler(DataError, data_error_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)  # slowapi 限流异常
app.add_exception_handler(Exception, generic_exception_handler)

# 注册 AI Agent 错误处理器
register_agent_error_handlers(app)

logger.info("Exception handlers registered")

# ============================================================================
# 路由注册
# ============================================================================

# 注册路由
app.include_router(auth.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(transfers.router, prefix="/api/v1")  # 必须在 samples 之前，避免路由冲突
app.include_router(samples.router, prefix="/api/v1")
app.include_router(instruments.router, prefix="/api/v1")  # 仪器管理路由
app.include_router(permissions.router, prefix="/api")
app.include_router(roles.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(performance.router)
app.include_router(workflows.router)
app.include_router(tasks.router)
app.include_router(results.router)
app.include_router(formulas.router)
app.include_router(anomalies.router)
app.include_router(audits.router)
app.include_router(judgments.router)
app.include_router(report_templates.router)
app.include_router(reports.router)
app.include_router(signatures.router)
app.include_router(statistics.router)
app.include_router(export.router)
app.include_router(queue.router, prefix="/api/v1")
app.include_router(methods.router)
app.include_router(docs.router)
app.include_router(agent_routes.router)  # AI Agent 路由
app.include_router(dashboard.router)  # Dashboard 路由

logger.info("All routers registered")

# ============================================================================
# 根路径和健康检查端点
# ============================================================================

@app.get("/")
async def root():
    """根路径"""
    return {"message": "FastAPI 样品管理后端服务"}

@app.get("/health")
async def health_check():
    """
    健康检查端点
    
    检查服务和数据库状态
    """
    db_status = await check_database_connection()
    
    return {
        "status": "healthy" if db_status else "degraded",
        "service": "fastapi-backend",
        "version": "0.1.0",
        "database": "connected" if db_status else "disconnected"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
