"""
健康检查和系统状态 API

提供健康检查、数据库连接状态等系统信息。
"""
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
import time
import psutil
import os

from app.core.database import get_db, check_database_connection
from app.core.redis import check_redis_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """
    基础健康检查
    
    返回服务的基本健康状态，不检查依赖服务。
    用于快速检查服务是否运行。
    
    Returns:
        - status: 服务状态（healthy）
        - timestamp: 当前时间戳
        - uptime: 服务运行时间（秒）
        - environment: 运行环境
        - memory: 内存使用情况
    """
    # 获取进程信息
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    
    # 计算运行时间
    uptime = time.time() - process.create_time()
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": round(uptime, 2),
        "environment": os.getenv("ENVIRONMENT", "development"),
        "memory": {
            "rss": memory_info.rss,  # 常驻集大小（字节）
            "vms": memory_info.vms,  # 虚拟内存大小（字节）
            "percent": process.memory_percent()  # 内存使用百分比
        }
    }


@router.get("/health/detailed")
async def detailed_health_check():
    """
    详细健康检查
    
    检查服务及其所有依赖服务（数据库、Redis）的状态。
    返回每个依赖服务的详细状态和响应时间。
    
    Returns:
        - status: 整体状态（healthy/degraded/unhealthy）
        - timestamp: 当前时间戳
        - checks: 各个依赖服务的检查结果
            - database: 数据库连接状态
            - redis: Redis 连接状态
    """
    # 检查数据库连接
    db_start = time.time()
    db_connected = await check_database_connection()
    db_response_time = round((time.time() - db_start) * 1000, 2)  # 毫秒
    
    # 检查 Redis 连接
    redis_start = time.time()
    redis_connected = await check_redis_connection()
    redis_response_time = round((time.time() - redis_start) * 1000, 2)  # 毫秒
    
    # 判断整体状态
    if db_connected and redis_connected:
        overall_status = "healthy"
        status_code = status.HTTP_200_OK
    elif db_connected:
        overall_status = "degraded"  # 数据库正常但 Redis 不可用
        status_code = status.HTTP_200_OK
    else:
        overall_status = "unhealthy"  # 数据库不可用
        status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    
    response_data = {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database": {
                "status": "ok" if db_connected else "error",
                "message": "Connected" if db_connected else "Connection failed",
                "response_time": db_response_time
            },
            "redis": {
                "status": "ok" if redis_connected else "error",
                "message": "Connected" if redis_connected else "Connection failed or not configured",
                "response_time": redis_response_time
            }
        }
    }
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )


@router.get("/ready")
async def readiness_check():
    """
    就绪检查
    
    检查服务及其所有依赖服务（数据库、Redis）是否就绪。
    用于 Kubernetes 等容器编排系统的就绪探测。
    
    如果服务未就绪，返回 503 状态码。
    
    Returns:
        - status: 就绪状态（ready/not_ready）
        - timestamp: 当前时间戳
        - checks: 各个依赖服务的检查结果
    """
    # 检查数据库连接
    db_start = time.time()
    db_connected = await check_database_connection()
    db_response_time = round((time.time() - db_start) * 1000, 2)
    
    # 检查 Redis 连接
    redis_start = time.time()
    redis_connected = await check_redis_connection()
    redis_response_time = round((time.time() - redis_start) * 1000, 2)
    
    # 判断就绪状态（数据库必须可用，Redis 可选）
    is_ready = db_connected
    
    response_data = {
        "status": "ready" if is_ready else "not_ready",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database": {
                "status": "ok" if db_connected else "error",
                "message": "Connected" if db_connected else "Connection failed",
                "response_time": db_response_time
            },
            "redis": {
                "status": "ok" if redis_connected else "error",
                "message": "Connected" if redis_connected else "Connection failed or not configured",
                "response_time": redis_response_time
            }
        }
    }
    
    status_code = status.HTTP_200_OK if is_ready else status.HTTP_503_SERVICE_UNAVAILABLE
    
    return JSONResponse(
        status_code=status_code,
        content=response_data
    )


@router.get("/live")
async def liveness_check():
    """
    存活检查
    
    检查服务进程是否存活。
    用于 Kubernetes 等容器编排系统的存活探测。
    
    这是一个轻量级检查，不检查依赖服务。
    
    Returns:
        - status: 存活状态（alive）
        - timestamp: 当前时间戳
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/database")
async def database_health():
    """
    数据库健康检查
    
    检查数据库连接状态。
    """
    db_connected = await check_database_connection()
    
    return {
        "status": "healthy" if db_connected else "unhealthy",
        "database": "connected" if db_connected else "disconnected",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/database/query")
async def database_query_test(db: AsyncSession = Depends(get_db)):
    """
    数据库查询测试
    
    使用依赖注入的数据库会话执行简单查询，验证会话管理功能。
    
    Args:
        db: 数据库会话（通过依赖注入）
    
    Returns:
        查询结果和状态信息
    """
    try:
        # 执行简单查询
        result = await db.execute(text("SELECT 1 as num, NOW() as current_time"))
        row = result.fetchone()
        
        return {
            "status": "success",
            "query_result": {
                "num": row[0],
                "current_time": row[1].isoformat() if row[1] else None
            },
            "message": "Database query executed successfully"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Database query failed: {str(e)}"
        }
