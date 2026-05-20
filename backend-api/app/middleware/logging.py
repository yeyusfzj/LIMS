"""
请求日志中间件

记录所有 HTTP 请求的详细信息，包括：
- 请求 ID（用于追踪）
- 请求方法和路径
- 响应状态码
- 响应时间
- 客户端 IP
"""

import time
import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    请求日志中间件
    
    功能：
    1. 为每个请求生成唯一的 request_id
    2. 记录请求的详细信息（方法、路径、客户端 IP）
    3. 记录响应状态码和处理时间
    4. 将 request_id 添加到响应头中
    
    日志格式：
    - 请求开始: [REQUEST] {request_id} {method} {path} from {client_ip}
    - 请求完成: [RESPONSE] {request_id} {status_code} in {duration}ms
    """
    
    def __init__(self, app: ASGIApp):
        """
        初始化中间件
        
        Args:
            app: ASGI 应用实例
        """
        super().__init__(app)
    
    async def dispatch(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """
        处理请求
        
        Args:
            request: FastAPI 请求对象
            call_next: 下一个中间件或路由处理器
        
        Returns:
            Response: 响应对象（添加了 X-Request-ID 头）
        """
        # 生成唯一的请求 ID
        request_id = str(uuid.uuid4())
        
        # 将 request_id 添加到请求状态中（供其他中间件或路由使用）
        request.state.request_id = request_id
        
        # 获取客户端 IP
        client_ip = self._get_client_ip(request)
        
        # 记录请求开始
        logger.info(
            f"[REQUEST] {request_id} {request.method} {request.url.path} "
            f"from {client_ip}"
        )
        
        # 记录开始时间
        start_time = time.time()
        
        try:
            # 调用下一个中间件或路由处理器
            response = await call_next(request)
            
            # 计算处理时间（毫秒）
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录请求完成
            logger.info(
                f"[RESPONSE] {request_id} {response.status_code} "
                f"in {duration_ms:.2f}ms"
            )
            
            # 将 request_id 添加到响应头
            response.headers["X-Request-ID"] = request_id
            
            return response
            
        except Exception as e:
            # 计算处理时间（毫秒）
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录异常
            logger.error(
                f"[ERROR] {request_id} {request.method} {request.url.path} "
                f"failed in {duration_ms:.2f}ms: {str(e)}",
                exc_info=True
            )
            
            # 重新抛出异常，让全局异常处理器处理
            raise
    
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
        # 检查 X-Forwarded-For 头（可能包含多个 IP，取第一个）
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            # X-Forwarded-For 格式: client, proxy1, proxy2
            return forwarded_for.split(",")[0].strip()
        
        # 检查 X-Real-IP 头（Nginx 常用）
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # 使用直连 IP
        if request.client:
            return request.client.host
        
        return "unknown"
