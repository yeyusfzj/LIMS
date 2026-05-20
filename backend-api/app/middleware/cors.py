"""
CORS 中间件配置

配置跨域资源共享（CORS）策略，允许前端应用访问 API。

CORS 策略：
- 允许的源：从环境变量配置（支持多个源）
- 允许的方法：所有 HTTP 方法（GET, POST, PUT, DELETE, PATCH, OPTIONS）
- 允许的头：所有请求头
- 允许凭证：支持（允许发送 Cookie 和认证信息）
- 预检请求缓存：1 小时

与 Node.js 后端的兼容性：
- 使用相同的 CORS 配置策略
- 支持相同的源列表
- 支持相同的请求头和方法
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def configure_cors(app: FastAPI) -> None:
    """
    配置 CORS 中间件
    
    为 FastAPI 应用添加 CORS 中间件，允许跨域请求。
    
    配置说明：
    - allow_origins: 允许的源列表（从环境变量读取）
    - allow_credentials: 允许发送凭证（Cookie、Authorization 头）
    - allow_methods: 允许所有 HTTP 方法
    - allow_headers: 允许所有请求头
    - max_age: 预检请求缓存时间（秒）
    
    Args:
        app: FastAPI 应用实例
    """
    # 获取允许的源列表
    allowed_origins = settings.cors_origins_list
    
    # 记录 CORS 配置
    logger.info(
        f"Configuring CORS middleware with {len(allowed_origins)} allowed origin(s)"
    )
    for origin in allowed_origins:
        logger.info(f"  - {origin}")
    
    # 添加 CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,  # 允许的源列表
        allow_credentials=True,  # 允许发送凭证
        allow_methods=["*"],  # 允许所有 HTTP 方法
        allow_headers=["*"],  # 允许所有请求头
        max_age=3600,  # 预检请求缓存 1 小时
    )
    
    logger.info("CORS middleware configured successfully")


def get_cors_config() -> dict:
    """
    获取当前 CORS 配置
    
    用于调试和监控，返回当前的 CORS 配置信息。
    
    Returns:
        dict: CORS 配置字典
    """
    return {
        "allowed_origins": settings.cors_origins_list,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
        "max_age": 3600
    }
