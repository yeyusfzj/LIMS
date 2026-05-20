"""
性能监控 API

提供性能统计、慢请求、慢查询等监控数据。
"""
from fastapi import APIRouter, Query, Depends
from datetime import datetime, timedelta
from typing import Optional

from app.services.performance_service import performance_service
from app.middleware.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/performance", tags=["性能监控"])


@router.get("/statistics")
async def get_performance_statistics(
    startTime: Optional[str] = Query(None, description="开始时间（ISO 8601 格式）"),
    endTime: Optional[str] = Query(None, description="结束时间（ISO 8601 格式）"),
    current_user: User = Depends(get_current_user)
):
    """
    获取性能统计数据
    
    返回指定时间范围内的 API 和数据库性能统计。
    
    Args:
        startTime: 开始时间（ISO 8601 格式），默认为 1 小时前
        endTime: 结束时间（ISO 8601 格式），默认为当前时间
    
    Returns:
        - apiStats: API 性能统计
            - totalRequests: 总请求数
            - averageDuration: 平均响应时间（毫秒）
            - p50Duration: P50 响应时间
            - p95Duration: P95 响应时间
            - p99Duration: P99 响应时间
            - slowRequestCount: 慢请求数量
            - errorRate: 错误率
        - databaseStats: 数据库性能统计
            - totalQueries: 总查询数
            - averageDuration: 平均查询时间（毫秒）
            - slowQueryCount: 慢查询数量
        - timeRange: 统计时间范围
    """
    # 解析时间参数
    start = None
    end = None
    
    if startTime:
        try:
            start = datetime.fromisoformat(startTime.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    if endTime:
        try:
            end = datetime.fromisoformat(endTime.replace('Z', '+00:00'))
        except ValueError:
            pass
    
    stats = await performance_service.get_performance_stats(start, end)
    
    return {
        "success": True,
        "data": stats
    }


@router.get("/slow-requests")
async def get_slow_requests(
    limit: int = Query(100, ge=1, le=1000, description="返回的最大数量"),
    current_user: User = Depends(get_current_user)
):
    """
    获取慢请求列表
    
    返回最近的慢请求记录（响应时间超过阈值的请求）。
    
    Args:
        limit: 返回的最大数量，默认 100，最大 1000
    
    Returns:
        慢请求列表，每个记录包含：
        - id: 记录 ID
        - method: HTTP 方法
        - path: 请求路径
        - duration: 响应时间（毫秒）
        - statusCode: HTTP 状态码
        - userId: 用户 ID（如果有）
        - timestamp: 时间戳
    """
    slow_requests = await performance_service.get_slow_requests(limit)
    
    return {
        "success": True,
        "data": slow_requests,
        "total": len(slow_requests)
    }


@router.get("/slow-queries")
async def get_slow_queries(
    limit: int = Query(100, ge=1, le=1000, description="返回的最大数量"),
    current_user: User = Depends(get_current_user)
):
    """
    获取慢查询列表
    
    返回最近的慢查询记录（查询时间超过阈值的数据库查询）。
    
    Args:
        limit: 返回的最大数量，默认 100，最大 1000
    
    Returns:
        慢查询列表，每个记录包含：
        - id: 记录 ID
        - query: SQL 查询语句（截断）
        - duration: 查询时间（毫秒）
        - timestamp: 时间戳
    """
    slow_queries = await performance_service.get_slow_queries(limit)
    
    return {
        "success": True,
        "data": slow_queries,
        "total": len(slow_queries)
    }


@router.get("/path-stats")
async def get_path_stats(
    limit: int = Query(50, ge=1, le=100, description="返回的最大数量"),
    current_user: User = Depends(get_current_user)
):
    """
    获取路径性能统计
    
    返回各个 API 路径的性能统计数据。
    
    Args:
        limit: 返回的最大数量，默认 50，最大 100
    
    Returns:
        路径性能统计列表，每个记录包含：
        - path: 请求路径
        - method: HTTP 方法
        - requestCount: 请求数量
        - averageDuration: 平均响应时间（毫秒）
        - minDuration: 最小响应时间
        - maxDuration: 最大响应时间
        - p50Duration: P50 响应时间
        - p95Duration: P95 响应时间
        - p99Duration: P99 响应时间
        - errorCount: 错误数量
        - errorRate: 错误率
    """
    path_stats = await performance_service.get_path_stats(limit)
    
    return {
        "success": True,
        "data": path_stats,
        "total": len(path_stats)
    }

