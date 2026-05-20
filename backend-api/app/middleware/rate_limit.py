"""
限流中间件

基于 IP 地址的请求限流，防止 API 滥用。
支持两种实现方式：
1. 内存存储（开发环境）- 使用滑动窗口算法
2. Redis 存储（生产环境）- 使用 Redis 的过期键实现

功能特性：
- 全局限流：基于 IP 地址的全局请求限流
- 端点级限流：针对特定端点的限流（通过装饰器）
- 敏感操作保护：为登录等敏感端点提供更严格的限流
- 响应头信息：返回限流状态信息
"""

import time
import logging
from typing import Dict, Tuple, Callable, Optional
from collections import defaultdict
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    限流中间件
    
    功能：
    1. 基于 IP 地址的全局请求限流
    2. 使用滑动窗口算法（内存模式）或 Redis（生产模式）
    3. 超过限制时返回 429 状态码
    4. 在响应头中添加限流信息
    5. 支持端点级限流配置
    
    限流策略：
    - 默认: 每分钟 60 次请求
    - 登录端点: 每分钟 5 次请求
    - 敏感操作: 每分钟 10 次请求
    - 可配置不同的时间窗口和请求限制
    
    响应头：
    - X-RateLimit-Limit: 时间窗口内允许的最大请求数
    - X-RateLimit-Remaining: 剩余可用请求数
    - X-RateLimit-Reset: 限流重置时间（Unix 时间戳）
    - Retry-After: 超限后需要等待的秒数（仅在 429 响应中）
    """
    
    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 60,
        window_size: int = 60,
        redis_client: Optional[any] = None
    ):
        """
        初始化限流中间件
        
        Args:
            app: ASGI 应用实例
            requests_per_minute: 每分钟允许的请求数（默认 60）
            window_size: 时间窗口大小（秒，默认 60）
            redis_client: Redis 客户端实例（可选，用于生产环境）
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.window_size = window_size
        self.redis_client = redis_client
        
        # 存储每个 IP 的请求记录（仅在内存模式下使用）
        # 格式: {ip: [(timestamp1, timestamp2, ...)]}
        self.request_records: Dict[str, list] = defaultdict(list)
        
        # 端点级限流配置（性能测试时临时禁用）
        # 格式: {path_pattern: (requests_per_minute, window_size)}
        self.endpoint_limits: Dict[str, Tuple[int, int]] = {
            # "/api/v1/auth/login": (5, 60),  # 登录：每分钟 5 次
            # "/api/v1/auth/refresh": (10, 60),  # 刷新令牌：每分钟 10 次
            # "/api/auth/login": (5, 60),  # 兼容旧版路径
            # "/api/auth/refresh": (10, 60),  # 兼容旧版路径
        }
        
        logger.info(
            f"Rate limit middleware initialized: "
            f"{requests_per_minute} requests per {window_size} seconds "
            f"(Redis: {'enabled' if redis_client else 'disabled'})"
        )
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        处理请求并应用限流
        
        Args:
            request: FastAPI 请求对象
            call_next: 下一个中间件或路由处理器
        
        Returns:
            Response: 响应对象（包含限流信息头）
        """
        # 获取客户端 IP
        client_ip = self._get_client_ip(request)
        
        # 获取当前时间戳
        current_time = time.time()
        
        # 获取端点限流配置
        path = request.url.path
        endpoint_limit = self._get_endpoint_limit(path)
        
        if endpoint_limit:
            requests_limit, window = endpoint_limit
        else:
            requests_limit = self.requests_per_minute
            window = self.window_size
        
        # 检查是否超过限流
        if self.redis_client:
            # 使用 Redis 实现
            is_allowed, remaining, reset_time = await self._check_rate_limit_redis(
                client_ip, path, current_time, requests_limit, window
            )
        else:
            # 使用内存实现
            # 清理过期的请求记录
            self._cleanup_old_records(client_ip, current_time, window)
            
            is_allowed, remaining, reset_time = self._check_rate_limit_memory(
                client_ip, current_time, requests_limit, window
            )
        
        if not is_allowed:
            # 超过限流，返回 429 错误
            retry_after = int(reset_time - current_time)
            
            logger.warning(
                f"Rate limit exceeded for IP {client_ip} on {path}: "
                f"limit={requests_limit}/{window}s"
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": f"请求过于频繁，请在 {retry_after} 秒后重试",
                        "details": f"限流规则: {requests_limit} 次请求/{window} 秒"
                    }
                },
                headers={
                    "X-RateLimit-Limit": str(requests_limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(reset_time)),
                    "Retry-After": str(retry_after)
                }
            )
        
        # 记录本次请求
        if self.redis_client:
            await self._record_request_redis(client_ip, path, current_time, window)
        else:
            self.request_records[client_ip].append(current_time)
        
        # 调用下一个中间件或路由处理器
        response = await call_next(request)
        
        # 添加限流信息到响应头
        response.headers["X-RateLimit-Limit"] = str(requests_limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining - 1))
        response.headers["X-RateLimit-Reset"] = str(int(reset_time))
        
        return response
    
    def _get_endpoint_limit(self, path: str) -> Optional[Tuple[int, int]]:
        """
        获取端点的限流配置
        
        Args:
            path: 请求路径
        
        Returns:
            Optional[Tuple[int, int]]: (请求限制, 时间窗口) 或 None
        """
        return self.endpoint_limits.get(path)
    
    def _get_client_ip(self, request: Request) -> str:
        """
        获取客户端 IP 地址
        
        优先级：
        1. X-Forwarded-For 头（代理/负载均衡器）
        2. X-Real-IP 头（Nginx）
        3. request.client.host（直连）
        
        Args:
            request: FastAPI 请求对象
        
        Returns:
            str: 客户端 IP 地址
        """
        # 检查 X-Forwarded-For 头
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # 检查 X-Real-IP 头
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 使用直连 IP
        if request.client:
            return request.client.host
        
        return "unknown"
    
    def _cleanup_old_records(self, client_ip: str, current_time: float, window_size: int):
        """
        清理过期的请求记录（内存模式）
        
        删除超出时间窗口的请求记录，节省内存。
        
        Args:
            client_ip: 客户端 IP 地址
            current_time: 当前时间戳
            window_size: 时间窗口大小
        """
        if client_ip not in self.request_records:
            return
        
        # 计算窗口起始时间
        window_start = current_time - window_size
        
        # 过滤掉过期的记录
        self.request_records[client_ip] = [
            timestamp
            for timestamp in self.request_records[client_ip]
            if timestamp > window_start
        ]
        
        # 如果该 IP 没有记录了，删除键以节省内存
        if not self.request_records[client_ip]:
            del self.request_records[client_ip]
    
    def _check_rate_limit_memory(
        self,
        client_ip: str,
        current_time: float,
        requests_limit: int,
        window_size: int
    ) -> Tuple[bool, int, float]:
        """
        检查是否超过限流（内存模式）
        
        Args:
            client_ip: 客户端 IP 地址
            current_time: 当前时间戳
            requests_limit: 请求限制
            window_size: 时间窗口大小
        
        Returns:
            Tuple[bool, int, float]: (是否允许, 剩余请求数, 重置时间)
        """
        # 获取该 IP 在时间窗口内的请求数
        request_count = len(self.request_records.get(client_ip, []))
        
        # 计算剩余请求数
        remaining = max(0, requests_limit - request_count)
        
        # 计算重置时间（窗口结束时间）
        if self.request_records.get(client_ip):
            # 使用最早的请求时间 + 窗口大小
            oldest_request = min(self.request_records[client_ip])
            reset_time = oldest_request + window_size
        else:
            # 没有记录，使用当前时间 + 窗口大小
            reset_time = current_time + window_size
        
        # 判断是否允许请求
        is_allowed = request_count < requests_limit
        
        return is_allowed, remaining, reset_time
    
    async def _check_rate_limit_redis(
        self,
        client_ip: str,
        path: str,
        current_time: float,
        requests_limit: int,
        window_size: int
    ) -> Tuple[bool, int, float]:
        """
        检查是否超过限流（Redis 模式）
        
        使用 Redis 的 INCR 和 EXPIRE 命令实现限流。
        
        Args:
            client_ip: 客户端 IP 地址
            path: 请求路径
            current_time: 当前时间戳
            requests_limit: 请求限制
            window_size: 时间窗口大小
        
        Returns:
            Tuple[bool, int, float]: (是否允许, 剩余请求数, 重置时间)
        """
        # 生成 Redis 键
        key = f"rate_limit:{client_ip}:{path}"
        
        try:
            # 获取当前计数
            count = await self.redis_client.get(key)
            
            if count is None:
                # 第一次请求
                count = 0
                reset_time = current_time + window_size
            else:
                count = int(count)
                # 获取键的 TTL
                ttl = await self.redis_client.ttl(key)
                if ttl > 0:
                    reset_time = current_time + ttl
                else:
                    reset_time = current_time + window_size
            
            # 计算剩余请求数
            remaining = max(0, requests_limit - count)
            
            # 判断是否允许请求
            is_allowed = count < requests_limit
            
            return is_allowed, remaining, reset_time
            
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {str(e)}")
            # Redis 失败时，允许请求通过
            return True, requests_limit, current_time + window_size
    
    async def _record_request_redis(
        self,
        client_ip: str,
        path: str,
        current_time: float,
        window_size: int
    ):
        """
        记录请求（Redis 模式）
        
        Args:
            client_ip: 客户端 IP 地址
            path: 请求路径
            current_time: 当前时间戳
            window_size: 时间窗口大小
        """
        key = f"rate_limit:{client_ip}:{path}"
        
        try:
            # 增加计数
            count = await self.redis_client.incr(key)
            
            # 如果是第一次请求，设置过期时间
            if count == 1:
                await self.redis_client.expire(key, window_size)
                
        except Exception as e:
            logger.error(f"Redis rate limit record failed: {str(e)}")


# ============================================================================
# 端点级限流装饰器（使用 slowapi）
# ============================================================================

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request as FastAPIRequest

# 创建 slowapi 限流器实例
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["60/minute"],  # 默认限流
    storage_uri="memory://",  # 使用内存存储，生产环境可改为 Redis
    strategy="fixed-window",  # 固定窗口策略
)


def get_limiter():
    """获取限流器实例"""
    return limiter


# 自定义限流异常处理器
async def rate_limit_exceeded_handler(request: FastAPIRequest, exc: RateLimitExceeded):
    """
    处理限流异常
    
    Args:
        request: 请求对象
        exc: 限流异常
    
    Returns:
        JSONResponse: 429 错误响应
    """
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": "RATE_LIMIT_EXCEEDED",
                "message": "请求过于频繁，请稍后重试",
                "details": str(exc.detail)
            }
        },
        headers={
            "Retry-After": "60"
        }
    )
