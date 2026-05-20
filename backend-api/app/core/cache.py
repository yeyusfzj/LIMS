"""
Redis 缓存管理服务

提供完整的缓存操作接口，支持多种缓存策略。
参考 Node.js 后端的 cacheService.ts 实现。
"""

import json
from typing import Optional, List, Dict, Any, Callable, TypeVar, Generic, Union
from functools import wraps
from app.core.redis import get_redis_client
from app.core.logging import logger

T = TypeVar('T')


class CacheService:
    """
    缓存服务类
    提供统一的缓存操作接口，支持多种缓存策略
    """
    
    async def get(self, key: str) -> Optional[Any]:
        """
        获取缓存
        
        Args:
            key: 缓存键
            
        Returns:
            缓存值（JSON 解析后）或 None
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return None
        
        try:
            value = await redis_client.get(key)
            if not value:
                return None
            return json.loads(value)
        except Exception as e:
            logger.error(f"Cache get error: {str(e)}", extra={"key": key})
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """
        设置缓存
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），默认 300 秒（5 分钟）
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            serialized = json.dumps(value, ensure_ascii=False)
            await redis_client.setex(key, ttl, serialized)
        except Exception as e:
            logger.error(f"Cache set error: {str(e)}", extra={"key": key})
    
    async def delete(self, key: Union[str, List[str]]) -> None:
        """
        删除缓存
        
        Args:
            key: 缓存键或键数组
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            if isinstance(key, list):
                if len(key) > 0:
                    await redis_client.delete(*key)
            else:
                await redis_client.delete(key)
        except Exception as e:
            logger.error(f"Cache delete error: {str(e)}", extra={"key": key})
    
    async def exists(self, key: str) -> bool:
        """
        检查缓存是否存在
        
        Args:
            key: 缓存键
            
        Returns:
            是否存在
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return False
        
        try:
            result = await redis_client.exists(key)
            return result == 1
        except Exception as e:
            logger.error(f"Cache exists error: {str(e)}", extra={"key": key})
            return False
    
    async def expire(self, key: str, ttl: int) -> None:
        """
        设置缓存过期时间
        
        Args:
            key: 缓存键
            ttl: 过期时间（秒）
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            await redis_client.expire(key, ttl)
        except Exception as e:
            logger.error(f"Cache expire error: {str(e)}", extra={"key": key})
    
    async def ttl(self, key: str) -> int:
        """
        获取缓存剩余过期时间
        
        Args:
            key: 缓存键
            
        Returns:
            剩余秒数，-1 表示永不过期，-2 表示不存在
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return -2
        
        try:
            return await redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Cache ttl error: {str(e)}", extra={"key": key})
            return -2
    
    async def del_pattern(self, pattern: str) -> None:
        """
        批量删除匹配模式的缓存键
        
        Args:
            pattern: 匹配模式（如 "user:*"）
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            keys = []
            async for key in redis_client.scan_iter(match=pattern):
                keys.append(key)
            
            if len(keys) > 0:
                await redis_client.delete(*keys)
        except Exception as e:
            logger.error(f"Cache delete pattern error: {str(e)}", extra={"pattern": pattern})
    
    async def set_null(self, key: str, ttl: int = 60) -> None:
        """
        缓存穿透防护：缓存空值
        
        Args:
            key: 缓存键
            ttl: 过期时间（秒），默认 60 秒
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            await redis_client.setex(key, ttl, "null")
        except Exception as e:
            logger.error(f"Cache set null error: {str(e)}", extra={"key": key})
    
    async def is_null(self, key: str) -> bool:
        """
        检查是否为空值缓存
        
        Args:
            key: 缓存键
            
        Returns:
            是否为空值
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return False
        
        try:
            value = await redis_client.get(key)
            return value == "null"
        except Exception as e:
            logger.error(f"Cache is null error: {str(e)}", extra={"key": key})
            return False
    
    async def get_or_load(
        self,
        key: str,
        loader: Callable[[], Any],
        ttl: int = 300
    ) -> Optional[Any]:
        """
        Cache-Aside 模式：获取或加载
        
        Args:
            key: 缓存键
            loader: 数据加载函数
            ttl: 过期时间（秒）
            
        Returns:
            数据
        """
        try:
            # 1. 尝试从缓存获取
            cached = await self.get(key)
            if cached is not None:
                return cached
            
            # 2. 检查是否为空值缓存
            if await self.is_null(key):
                return None
            
            # 3. 缓存未命中，加载数据
            data = await loader() if callable(loader) and hasattr(loader, '__call__') else loader
            
            # 4. 写入缓存
            if data is not None:
                await self.set(key, data, ttl)
            else:
                # 缓存空值，防止缓存穿透
                await self.set_null(key, 60)
            
            return data
        except Exception as e:
            logger.error(f"Cache get or load error: {str(e)}", extra={"key": key})
            # 缓存失败时直接返回加载的数据
            try:
                return await loader() if callable(loader) and hasattr(loader, '__call__') else loader
            except Exception as load_error:
                logger.error(f"Loader error: {str(load_error)}", extra={"key": key})
                return None
    
    async def mget(self, keys: List[str]) -> List[Optional[Any]]:
        """
        批量获取缓存
        
        Args:
            keys: 缓存键数组
            
        Returns:
            缓存值数组
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return [None] * len(keys)
        
        try:
            if len(keys) == 0:
                return []
            
            values = await redis_client.mget(keys)
            result = []
            for value in values:
                if not value or value == "null":
                    result.append(None)
                else:
                    try:
                        result.append(json.loads(value))
                    except:
                        result.append(None)
            return result
        except Exception as e:
            logger.error(f"Cache mget error: {str(e)}", extra={"keys": keys})
            return [None] * len(keys)
    
    async def mset(self, items: List[Dict[str, Any]], ttl: int = 300) -> None:
        """
        批量设置缓存
        
        Args:
            items: 键值对数组，格式：[{"key": "key1", "value": value1}, ...]
            ttl: 过期时间（秒）
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return
        
        try:
            pipeline = redis_client.pipeline()
            for item in items:
                key = item.get("key")
                value = item.get("value")
                if key and value is not None:
                    serialized = json.dumps(value, ensure_ascii=False)
                    pipeline.setex(key, ttl, serialized)
            await pipeline.execute()
        except Exception as e:
            logger.error(f"Cache mset error: {str(e)}")
    
    async def incr(self, key: str, increment: int = 1) -> int:
        """
        增加计数器
        
        Args:
            key: 缓存键
            increment: 增量，默认 1
            
        Returns:
            增加后的值
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return 0
        
        try:
            return await redis_client.incrby(key, increment)
        except Exception as e:
            logger.error(f"Cache incr error: {str(e)}", extra={"key": key})
            return 0
    
    async def decr(self, key: str, decrement: int = 1) -> int:
        """
        减少计数器
        
        Args:
            key: 缓存键
            decrement: 减量，默认 1
            
        Returns:
            减少后的值
        """
        redis_client = await get_redis_client()
        if not redis_client:
            return 0
        
        try:
            return await redis_client.decrby(key, decrement)
        except Exception as e:
            logger.error(f"Cache decr error: {str(e)}", extra={"key": key})
            return 0


# 创建全局缓存服务实例
cache_service = CacheService()


# 缓存装饰器
def cache_result(key_prefix: str = "", ttl: int = 300):
    """
    缓存函数结果装饰器
    
    Args:
        key_prefix: 缓存键前缀
        ttl: 过期时间（秒），默认 300 秒（5 分钟）
        
    使用示例:
        @cache_result(key_prefix="statistics", ttl=1800)
        async def get_statistics(query: dict):
            # 复杂的统计查询
            return result
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 生成缓存键
            func_name = func.__name__
            args_str = json.dumps(args, ensure_ascii=False, default=str)
            kwargs_str = json.dumps(kwargs, ensure_ascii=False, default=str)
            cache_key = f"{key_prefix}:{func_name}:{args_str}:{kwargs_str}" if key_prefix else f"{func_name}:{args_str}:{kwargs_str}"
            
            # 尝试从缓存获取
            cached = await cache_service.get(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached
            
            # 执行函数
            result = await func(*args, **kwargs)
            
            # 存入缓存
            if result is not None:
                await cache_service.set(cache_key, result, ttl)
                logger.debug(f"Cache set: {cache_key}")
            
            return result
        return wrapper
    return decorator


# 向后兼容的函数接口
async def get_cache(key: str) -> Optional[str]:
    """获取缓存（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return None
    try:
        return await redis_client.get(key)
    except Exception as e:
        logger.error(f"Failed to get cache: {str(e)}", extra={"key": key})
        return None


async def set_cache(key: str, value: str, expire: int = 3600) -> bool:
    """设置缓存（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return False
    try:
        await redis_client.setex(key, expire, value)
        return True
    except Exception as e:
        logger.error(f"Failed to set cache: {str(e)}", extra={"key": key})
        return False


async def delete_cache(key: str) -> bool:
    """删除缓存（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return False
    try:
        await redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Failed to delete cache: {str(e)}", extra={"key": key})
        return False


async def delete_cache_pattern(pattern: str) -> int:
    """删除匹配模式的所有缓存（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return 0
    try:
        keys = []
        async for key in redis_client.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            await redis_client.delete(*keys)
            return len(keys)
        return 0
    except Exception as e:
        logger.error(f"Failed to delete cache pattern: {str(e)}", extra={"pattern": pattern})
        return 0


async def exists_cache(key: str) -> bool:
    """检查缓存是否存在（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return False
    try:
        return await redis_client.exists(key) > 0
    except Exception as e:
        logger.error(f"Failed to check cache existence: {str(e)}", extra={"key": key})
        return False


async def get_ttl(key: str) -> int:
    """获取缓存剩余过期时间（向后兼容）"""
    redis_client = await get_redis_client()
    if not redis_client:
        return -2
    try:
        return await redis_client.ttl(key)
    except Exception as e:
        logger.error(f"Failed to get cache TTL: {str(e)}", extra={"key": key})
        return -2
