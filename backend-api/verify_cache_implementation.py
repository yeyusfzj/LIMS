"""
验证缓存实现

这个脚本验证缓存服务的基本功能
"""
import asyncio
import sys
from app.core.cache import CacheService, cache_service, cache_result


async def test_basic_operations():
    """测试基础操作"""
    print("=" * 60)
    print("测试基础操作")
    print("=" * 60)
    
    cache = CacheService()
    
    # 测试 set 和 get
    print("\n1. 测试 set 和 get")
    test_data = {"id": "123", "name": "测试用户", "email": "test@example.com"}
    await cache.set("test:user:123", test_data, ttl=60)
    print(f"   设置缓存: test:user:123 = {test_data}")
    
    result = await cache.get("test:user:123")
    print(f"   获取缓存: {result}")
    assert result == test_data, "缓存数据不匹配"
    print("   ✓ 通过")
    
    # 测试 exists
    print("\n2. 测试 exists")
    exists = await cache.exists("test:user:123")
    print(f"   缓存是否存在: {exists}")
    assert exists is True, "缓存应该存在"
    print("   ✓ 通过")
    
    # 测试 ttl
    print("\n3. 测试 ttl")
    ttl = await cache.ttl("test:user:123")
    print(f"   缓存剩余时间: {ttl} 秒")
    assert ttl > 0, "TTL 应该大于 0"
    print("   ✓ 通过")
    
    # 测试 delete
    print("\n4. 测试 delete")
    await cache.delete("test:user:123")
    print("   删除缓存: test:user:123")
    
    exists = await cache.exists("test:user:123")
    print(f"   缓存是否存在: {exists}")
    assert exists is False, "缓存应该已被删除"
    print("   ✓ 通过")


async def test_batch_operations():
    """测试批量操作"""
    print("\n" + "=" * 60)
    print("测试批量操作")
    print("=" * 60)
    
    cache = CacheService()
    
    # 测试 mset
    print("\n1. 测试 mset")
    items = [
        {"key": "test:user:1", "value": {"id": "1", "name": "用户1"}},
        {"key": "test:user:2", "value": {"id": "2", "name": "用户2"}},
        {"key": "test:user:3", "value": {"id": "3", "name": "用户3"}}
    ]
    await cache.mset(items, ttl=60)
    print(f"   批量设置 {len(items)} 个缓存")
    print("   ✓ 通过")
    
    # 测试 mget
    print("\n2. 测试 mget")
    keys = ["test:user:1", "test:user:2", "test:user:3"]
    results = await cache.mget(keys)
    print(f"   批量获取 {len(results)} 个缓存:")
    for i, result in enumerate(results):
        print(f"     - {keys[i]}: {result}")
    assert len(results) == 3, "应该返回 3 个结果"
    assert all(r is not None for r in results), "所有结果都应该存在"
    print("   ✓ 通过")
    
    # 测试 del_pattern
    print("\n3. 测试 del_pattern")
    await cache.del_pattern("test:user:*")
    print("   删除匹配 'test:user:*' 的所有缓存")
    
    results = await cache.mget(keys)
    print(f"   验证删除结果: {results}")
    assert all(r is None for r in results), "所有缓存都应该已被删除"
    print("   ✓ 通过")


async def test_counter_operations():
    """测试计数器操作"""
    print("\n" + "=" * 60)
    print("测试计数器操作")
    print("=" * 60)
    
    cache = CacheService()
    
    # 测试 incr
    print("\n1. 测试 incr")
    count1 = await cache.incr("test:counter")
    print(f"   第一次增加: {count1}")
    assert count1 == 1, "第一次增加应该返回 1"
    
    count2 = await cache.incr("test:counter", increment=5)
    print(f"   增加 5: {count2}")
    assert count2 == 6, "应该返回 6"
    print("   ✓ 通过")
    
    # 测试 decr
    print("\n2. 测试 decr")
    count3 = await cache.decr("test:counter", decrement=2)
    print(f"   减少 2: {count3}")
    assert count3 == 4, "应该返回 4"
    print("   ✓ 通过")
    
    # 清理
    await cache.delete("test:counter")


async def test_null_value_protection():
    """测试空值缓存（防止缓存穿透）"""
    print("\n" + "=" * 60)
    print("测试空值缓存（防止缓存穿透）")
    print("=" * 60)
    
    cache = CacheService()
    
    # 测试 set_null
    print("\n1. 测试 set_null")
    await cache.set_null("test:null:key", ttl=60)
    print("   设置空值缓存: test:null:key")
    print("   ✓ 通过")
    
    # 测试 is_null
    print("\n2. 测试 is_null")
    is_null = await cache.is_null("test:null:key")
    print(f"   是否为空值缓存: {is_null}")
    assert is_null is True, "应该是空值缓存"
    print("   ✓ 通过")
    
    # 清理
    await cache.delete("test:null:key")


async def test_get_or_load():
    """测试 Cache-Aside 模式"""
    print("\n" + "=" * 60)
    print("测试 Cache-Aside 模式")
    print("=" * 60)
    
    cache = CacheService()
    
    load_count = 0
    
    async def load_data():
        nonlocal load_count
        load_count += 1
        print(f"   加载数据（第 {load_count} 次）")
        return {"id": "123", "name": "测试数据"}
    
    # 第一次调用，应该加载数据
    print("\n1. 第一次调用 get_or_load（缓存未命中）")
    result1 = await cache.get_or_load("test:load:key", load_data, ttl=60)
    print(f"   结果: {result1}")
    assert load_count == 1, "应该调用了一次加载函数"
    print("   ✓ 通过")
    
    # 第二次调用，应该从缓存获取
    print("\n2. 第二次调用 get_or_load（缓存命中）")
    result2 = await cache.get_or_load("test:load:key", load_data, ttl=60)
    print(f"   结果: {result2}")
    assert load_count == 1, "不应该再次调用加载函数"
    assert result2 == result1, "结果应该相同"
    print("   ✓ 通过")
    
    # 清理
    await cache.delete("test:load:key")


async def test_cache_decorator():
    """测试缓存装饰器"""
    print("\n" + "=" * 60)
    print("测试缓存装饰器")
    print("=" * 60)
    
    call_count = 0
    
    @cache_result(key_prefix="test_func", ttl=60)
    async def expensive_function(arg1: str, arg2: int):
        nonlocal call_count
        call_count += 1
        print(f"   执行函数（第 {call_count} 次）: arg1={arg1}, arg2={arg2}")
        return {"arg1": arg1, "arg2": arg2, "count": call_count}
    
    # 第一次调用
    print("\n1. 第一次调用函数")
    result1 = await expensive_function("hello", 123)
    print(f"   结果: {result1}")
    assert call_count == 1, "应该执行了一次函数"
    print("   ✓ 通过")
    
    # 第二次调用相同参数
    print("\n2. 第二次调用函数（相同参数）")
    result2 = await expensive_function("hello", 123)
    print(f"   结果: {result2}")
    assert call_count == 1, "不应该再次执行函数"
    assert result2 == result1, "结果应该相同"
    print("   ✓ 通过")
    
    # 第三次调用不同参数
    print("\n3. 第三次调用函数（不同参数）")
    result3 = await expensive_function("world", 456)
    print(f"   结果: {result3}")
    assert call_count == 2, "应该执行了第二次函数"
    print("   ✓ 通过")


async def test_global_cache_service():
    """测试全局缓存服务实例"""
    print("\n" + "=" * 60)
    print("测试全局缓存服务实例")
    print("=" * 60)
    
    # 使用全局实例
    print("\n1. 使用全局 cache_service 实例")
    test_data = {"message": "使用全局实例"}
    await cache_service.set("test:global", test_data, ttl=60)
    print(f"   设置缓存: {test_data}")
    
    result = await cache_service.get("test:global")
    print(f"   获取缓存: {result}")
    assert result == test_data, "数据应该匹配"
    print("   ✓ 通过")
    
    # 清理
    await cache_service.delete("test:global")


async def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("Redis 缓存服务验证")
    print("=" * 60)
    
    try:
        # 检查 Redis 连接
        from app.core.redis import check_redis_connection
        
        print("\n检查 Redis 连接...")
        is_connected = await check_redis_connection()
        
        if not is_connected:
            print("❌ Redis 未连接，跳过缓存测试")
            print("\n提示：请确保 Redis 服务正在运行")
            print("  - 检查 .env 文件中的 REDIS_HOST 和 REDIS_PORT 配置")
            print("  - 或者启动 Redis: docker-compose up -d redis")
            return
        
        print("✓ Redis 连接正常\n")
        
        # 运行所有测试
        await test_basic_operations()
        await test_batch_operations()
        await test_counter_operations()
        await test_null_value_protection()
        await test_get_or_load()
        await test_cache_decorator()
        await test_global_cache_service()
        
        print("\n" + "=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
