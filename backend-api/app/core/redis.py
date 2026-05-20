"""
Redis 连接管理

提供 Redis 连接和基本操作。
"""
import redis.asyncio as aioredis
from typing import Optional
import logging

from app.config import settings

logger = logging.getLogger(__name__)

# 全局 Redis 客户端实例
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> Optional[aioredis.Redis]:
    """
    获取 Redis 客户端实例
    
    Returns:
        Redis 客户端实例，如果未配置则返回 None
    """
    global _redis_client
    
    if _redis_client is None:
        try:
            # 如果配置了 REDIS_URL，使用 URL 连接
            if settings.REDIS_URL:
                _redis_client = await aioredis.from_url(
                    settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True
                )
            else:
                # 否则使用单独的配置参数
                _redis_client = aioredis.Redis(
                    host=settings.REDIS_HOST,
                    port=settings.REDIS_PORT,
                    password=settings.REDIS_PASSWORD,
                    db=settings.REDIS_DB,
                    encoding="utf-8",
                    decode_responses=True
                )
            
            # 测试连接
            await _redis_client.ping()
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            _redis_client = None
    
    return _redis_client


async def close_redis_connection():
    """关闭 Redis 连接"""
    global _redis_client
    
    if _redis_client:
        try:
            await _redis_client.close()
            logger.info("Redis connection closed")
        except Exception as e:
            logger.error(f"Error closing Redis connection: {e}")
        finally:
            _redis_client = None


async def check_redis_connection() -> bool:
    """
    检查 Redis 连接状态
    
    Returns:
        连接正常返回 True，否则返回 False
    """
    try:
        client = await get_redis_client()
        if client is None:
            return False
        
        response = await client.ping()
        return response is True
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False
