"""
缓存服务单元测试
"""
import pytest
import json
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.cache import CacheService, cache_service, cache_result


@pytest.fixture
def mock_redis():
    """模拟 Redis 客户端"""
    redis_mock = AsyncMock()
    return redis_mock


@pytest.fixture
def cache_svc():
    """创建缓存服务实例"""
    return CacheService()


class TestCacheService:
    """缓存服务测试类"""
    
    @pytest.mark.asyncio
    async def test_get_success(self, cache_svc, mock_redis):
        """测试获取缓存成功"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            test_data = {"id": "123", "name": "测试"}
            mock_redis.get.return_value = json.dumps(test_data)
            
            result = await cache_svc.get("test:key")
            
            assert result == test_data
            mock_redis.get.assert_called_once_with("test:key")
    
    @pytest.mark.asyncio
    async def test_get_not_found(self, cache_svc, mock_redis):
        """测试获取不存在的缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = None
            
            result = await cache_svc.get("test:key")
            
            assert result is None
    
    @pytest.mark.asyncio
    async def test_get_no_redis(self, cache_svc):
        """测试 Redis 不可用时获取缓存"""
        with patch('app.core.cache.get_redis_client', return_value=None):
            result = await cache_svc.get("test:key")
            assert result is None
    
    @pytest.mark.asyncio
    async def test_set_success(self, cache_svc, mock_redis):
        """测试设置缓存成功"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            test_data = {"id": "123", "name": "测试"}
            
            await cache_svc.set("test:key", test_data, ttl=300)
            
            mock_redis.setex.assert_called_once()
            call_args = mock_redis.setex.call_args
            assert call_args[0][0] == "test:key"
            assert call_args[0][1] == 300
            assert json.loads(call_args[0][2]) == test_data
    
    @pytest.mark.asyncio
    async def test_delete_single_key(self, cache_svc, mock_redis):
        """测试删除单个缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            await cache_svc.delete("test:key")
            
            mock_redis.delete.assert_called_once_with("test:key")
    
    @pytest.mark.asyncio
    async def test_delete_multiple_keys(self, cache_svc, mock_redis):
        """测试删除多个缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            keys = ["test:key1", "test:key2", "test:key3"]
            
            await cache_svc.delete(keys)
            
            mock_redis.delete.assert_called_once_with(*keys)
    
    @pytest.mark.asyncio
    async def test_exists_true(self, cache_svc, mock_redis):
        """测试缓存存在"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.exists.return_value = 1
            
            result = await cache_svc.exists("test:key")
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_exists_false(self, cache_svc, mock_redis):
        """测试缓存不存在"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.exists.return_value = 0
            
            result = await cache_svc.exists("test:key")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_expire(self, cache_svc, mock_redis):
        """测试设置过期时间"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            await cache_svc.expire("test:key", 600)
            
            mock_redis.expire.assert_called_once_with("test:key", 600)
    
    @pytest.mark.asyncio
    async def test_ttl(self, cache_svc, mock_redis):
        """测试获取剩余过期时间"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.ttl.return_value = 300
            
            result = await cache_svc.ttl("test:key")
            
            assert result == 300
    
    @pytest.mark.asyncio
    async def test_del_pattern(self, cache_svc, mock_redis):
        """测试批量删除匹配模式的缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            # 模拟 scan_iter 返回的键
            async def mock_scan_iter(match):
                keys = ["test:key1", "test:key2", "test:key3"]
                for key in keys:
                    yield key
            
            mock_redis.scan_iter = mock_scan_iter
            
            await cache_svc.del_pattern("test:*")
            
            mock_redis.delete.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_set_null(self, cache_svc, mock_redis):
        """测试设置空值缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            await cache_svc.set_null("test:key", ttl=60)
            
            mock_redis.setex.assert_called_once_with("test:key", 60, "null")
    
    @pytest.mark.asyncio
    async def test_is_null_true(self, cache_svc, mock_redis):
        """测试检查空值缓存（是空值）"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = "null"
            
            result = await cache_svc.is_null("test:key")
            
            assert result is True
    
    @pytest.mark.asyncio
    async def test_is_null_false(self, cache_svc, mock_redis):
        """测试检查空值缓存（不是空值）"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = '{"id": "123"}'
            
            result = await cache_svc.is_null("test:key")
            
            assert result is False
    
    @pytest.mark.asyncio
    async def test_get_or_load_cache_hit(self, cache_svc, mock_redis):
        """测试 get_or_load 缓存命中"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            test_data = {"id": "123", "name": "测试"}
            mock_redis.get.return_value = json.dumps(test_data)
            
            loader = AsyncMock(return_value={"id": "456", "name": "不应该被调用"})
            
            result = await cache_svc.get_or_load("test:key", loader, ttl=300)
            
            assert result == test_data
            loader.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_get_or_load_cache_miss(self, cache_svc, mock_redis):
        """测试 get_or_load 缓存未命中"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = None
            mock_redis.exists.return_value = 0
            
            test_data = {"id": "123", "name": "测试"}
            loader = AsyncMock(return_value=test_data)
            
            result = await cache_svc.get_or_load("test:key", loader, ttl=300)
            
            assert result == test_data
            loader.assert_called_once()
            mock_redis.setex.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_or_load_null_value(self, cache_svc, mock_redis):
        """测试 get_or_load 加载空值"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = None
            mock_redis.exists.return_value = 0
            
            loader = AsyncMock(return_value=None)
            
            result = await cache_svc.get_or_load("test:key", loader, ttl=300)
            
            assert result is None
            loader.assert_called_once()
            # 应该调用 setex 设置空值缓存
            mock_redis.setex.assert_called_once_with("test:key", 60, "null")
    
    @pytest.mark.asyncio
    async def test_mget(self, cache_svc, mock_redis):
        """测试批量获取缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            keys = ["test:key1", "test:key2", "test:key3"]
            values = [
                json.dumps({"id": "1"}),
                json.dumps({"id": "2"}),
                None
            ]
            mock_redis.mget.return_value = values
            
            result = await cache_svc.mget(keys)
            
            assert len(result) == 3
            assert result[0] == {"id": "1"}
            assert result[1] == {"id": "2"}
            assert result[2] is None
    
    @pytest.mark.asyncio
    async def test_mset(self, cache_svc, mock_redis):
        """测试批量设置缓存"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_pipeline = AsyncMock()
            mock_redis.pipeline.return_value = mock_pipeline
            
            items = [
                {"key": "test:key1", "value": {"id": "1"}},
                {"key": "test:key2", "value": {"id": "2"}}
            ]
            
            await cache_svc.mset(items, ttl=300)
            
            mock_redis.pipeline.assert_called_once()
            assert mock_pipeline.setex.call_count == 2
            mock_pipeline.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_incr(self, cache_svc, mock_redis):
        """测试增加计数器"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.incrby.return_value = 5
            
            result = await cache_svc.incr("test:counter", increment=1)
            
            assert result == 5
            mock_redis.incrby.assert_called_once_with("test:counter", 1)
    
    @pytest.mark.asyncio
    async def test_decr(self, cache_svc, mock_redis):
        """测试减少计数器"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.decrby.return_value = 3
            
            result = await cache_svc.decr("test:counter", decrement=1)
            
            assert result == 3
            mock_redis.decrby.assert_called_once_with("test:counter", 1)


class TestCacheDecorator:
    """缓存装饰器测试类"""
    
    @pytest.mark.asyncio
    async def test_cache_result_decorator(self, mock_redis):
        """测试缓存装饰器"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            mock_redis.get.return_value = None
            
            call_count = 0
            
            @cache_result(key_prefix="test", ttl=300)
            async def test_function(arg1: str, arg2: int):
                nonlocal call_count
                call_count += 1
                return {"arg1": arg1, "arg2": arg2, "count": call_count}
            
            # 第一次调用，应该执行函数
            result1 = await test_function("hello", 123)
            assert result1["count"] == 1
            assert call_count == 1
            
            # 模拟缓存命中
            mock_redis.get.return_value = json.dumps(result1)
            
            # 第二次调用，应该从缓存获取
            result2 = await test_function("hello", 123)
            assert result2["count"] == 1  # 计数器没有增加
            assert call_count == 1  # 函数没有被再次调用


class TestGlobalCacheService:
    """全局缓存服务实例测试"""
    
    @pytest.mark.asyncio
    async def test_global_cache_service(self, mock_redis):
        """测试全局缓存服务实例"""
        with patch('app.core.cache.get_redis_client', return_value=mock_redis):
            test_data = {"id": "123"}
            mock_redis.get.return_value = json.dumps(test_data)
            
            result = await cache_service.get("test:key")
            
            assert result == test_data
