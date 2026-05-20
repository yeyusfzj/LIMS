"""
中间件模块

提供各种中间件功能：
- 认证中间件：JWT 令牌验证
- 权限中间件：基于角色的访问控制
- 限流中间件：防止 API 滥用
- 日志中间件：请求日志记录
- 错误处理中间件：统一的错误响应格式
- CORS 中间件：跨域资源共享配置
"""

from app.middleware.auth import get_current_user, get_current_user_optional
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.cors import configure_cors, get_cors_config
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    database_error_handler,
    data_error_handler,
    http_exception_handler,
    generic_exception_handler
)

__all__ = [
    # 认证
    "get_current_user",
    "get_current_user_optional",
    # 中间件类
    "RequestLoggingMiddleware",
    "RateLimitMiddleware",
    # CORS 配置
    "configure_cors",
    "get_cors_config",
    # 异常处理器
    "api_exception_handler",
    "validation_exception_handler",
    "integrity_error_handler",
    "database_error_handler",
    "data_error_handler",
    "http_exception_handler",
    "generic_exception_handler",
]
