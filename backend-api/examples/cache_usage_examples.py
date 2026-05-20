"""
缓存使用示例

展示如何在实际应用中使用 Redis 缓存服务
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.cache import cache_service, cache_result


# ============================================================================
# 示例 1: 统计查询缓存
# ============================================================================

@cache_result(key_prefix="statistics", ttl=1800)
async def get_sample_statistics(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime
):
    """
    获取样品统计数据（缓存 30 分钟）
    
    统计查询通常比较耗时，适合使用缓存
    """
    # 模拟复杂的统计查询
    # result = await db.execute(
    #     select(
    #         func.count(Sample.id).label("total"),
    #         func.count(Sample.id).filter(Sample.status == "COMPLETED").label("completed")
    #     )
    #     .where(Sample.createdAt.between(start_date, end_date))
    # )
    # stats = result.first()
    
    return {
        "total": 100,
        "completed": 80,
        "in_progress": 15,
        "pending": 5
    }


# ============================================================================
# 示例 2: 用户信息缓存
# ============================================================================

async def get_user_by_id(db: AsyncSession, user_id: str):
    """
    获取用户信息（带缓存）
    
    用户信息变化不频繁，适合缓存 30 分钟
    """
    cache_key = f"user:{user_id}"
    
    async def load_user():
        # 从数据库加载用户
        # result = await db.execute(
        #     select(User).where(User.id == user_id)
        # )
        # user = result.scalar_one_or_none()
        # return user.dict() if user else None
        
        # 模拟数据
        return {
            "id": user_id,
            "username": "testuser",
            "email": "test@example.com",
            "realName": "测试用户"
        }
    
    return await cache_service.get_or_load(cache_key, load_user, ttl=1800)


async def update_user(db: AsyncSession, user_id: str, data: dict):
    """
    更新用户信息
    
    更新后需要使相关缓存失效
    """
    # 更新数据库
    # await db.execute(
    #     update(User)
    #     .where(User.id == user_id)
    #     .values(**data)
    # )
    # await db.commit()
    
    # 使缓存失效
    await cache_service.delete(f"user:{user_id}")
    
    return {"message": "用户更新成功"}


# ============================================================================
# 示例 3: 列表查询缓存
# ============================================================================

@cache_result(key_prefix="sample_list", ttl=300)
async def get_samples(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None
):
    """
    获取样品列表（缓存 5 分钟）
    
    列表查询缓存时间较短，避免数据过时
    """
    # 模拟查询
    # query = select(Sample)
    # if status:
    #     query = query.where(Sample.status == status)
    # 
    # result = await db.execute(
    #     query.offset((page - 1) * page_size).limit(page_size)
    # )
    # samples = result.scalars().all()
    
    return {
        "items": [
            {"id": "1", "barcode": "SP20240101000001", "status": "REGISTERED"},
            {"id": "2", "barcode": "SP20240101000002", "status": "TESTING"}
        ],
        "total": 2,
        "page": page,
        "pageSize": page_size
    }


async def create_sample(db: AsyncSession, data: dict):
    """
    创建样品
    
    创建后需要使列表缓存失效
    """
    # 创建样品
    # sample = Sample(**data)
    # db.add(sample)
    # await db.commit()
    
    # 使列表缓存失效
    await cache_service.del_pattern("sample_list:*")
    
    return {"message": "样品创建成功"}


# ============================================================================
# 示例 4: 限流控制
# ============================================================================

async def check_rate_limit(user_id: str, limit: int = 60):
    """
    检查限流（每分钟最多 60 次请求）
    
    使用 Redis 计数器实现简单的限流
    """
    key = f"rate_limit:{user_id}"
    count = await cache_service.incr(key)
    
    if count == 1:
        # 第一次请求，设置过期时间
        await cache_service.expire(key, 60)
    
    if count > limit:
        return False, f"请求过于频繁，请稍后再试（{count}/{limit}）"
    
    return True, f"请求正常（{count}/{limit}）"


# ============================================================================
# 示例 5: 会话管理
# ============================================================================

async def create_session(user_id: str, session_data: dict):
    """
    创建会话
    
    使用 Redis 存储会话数据，自动过期
    """
    import uuid
    session_id = str(uuid.uuid4())
    cache_key = f"session:{session_id}"
    
    await cache_service.set(
        cache_key,
        {"user_id": user_id, **session_data},
        ttl=3600  # 1 小时
    )
    
    return session_id


async def get_session(session_id: str):
    """获取会话"""
    cache_key = f"session:{session_id}"
    return await cache_service.get(cache_key)


async def delete_session(session_id: str):
    """删除会话（登出）"""
    cache_key = f"session:{session_id}"
    await cache_service.delete(cache_key)


async def extend_session(session_id: str, ttl: int = 3600):
    """延长会话时间"""
    cache_key = f"session:{session_id}"
    await cache_service.expire(cache_key, ttl)


# ============================================================================
# 示例 6: 批量操作优化
# ============================================================================

async def get_users_batch(db: AsyncSession, user_ids: List[str]):
    """
    批量获取用户信息
    
    使用 mget 减少网络往返
    """
    # 生成缓存键
    cache_keys = [f"user:{user_id}" for user_id in user_ids]
    
    # 批量获取缓存
    cached_users = await cache_service.mget(cache_keys)
    
    # 找出未命中的用户 ID
    missing_ids = []
    result = []
    
    for i, user in enumerate(cached_users):
        if user is None:
            missing_ids.append(user_ids[i])
        else:
            result.append(user)
    
    # 从数据库加载未命中的用户
    if missing_ids:
        # db_users = await db.execute(
        #     select(User).where(User.id.in_(missing_ids))
        # )
        # users = db_users.scalars().all()
        
        # 模拟数据
        users = [
            {"id": uid, "username": f"user{uid}", "email": f"user{uid}@example.com"}
            for uid in missing_ids
        ]
        
        # 批量写入缓存
        cache_items = [
            {"key": f"user:{user['id']}", "value": user}
            for user in users
        ]
        await cache_service.mset(cache_items, ttl=1800)
        
        result.extend(users)
    
    return result


# ============================================================================
# 示例 7: 缓存预热
# ============================================================================

async def warmup_cache(db: AsyncSession):
    """
    缓存预热
    
    系统启动时预加载热点数据
    """
    print("开始缓存预热...")
    
    # 预加载活跃用户
    # active_users = await db.execute(
    #     select(User).where(User.isActive == True).limit(100)
    # )
    # users = active_users.scalars().all()
    
    # 模拟数据
    users = [
        {"id": str(i), "username": f"user{i}", "email": f"user{i}@example.com"}
        for i in range(1, 11)
    ]
    
    # 批量写入缓存
    cache_items = [
        {"key": f"user:{user['id']}", "value": user}
        for user in users
    ]
    await cache_service.mset(cache_items, ttl=3600)
    
    print(f"预热完成：缓存了 {len(users)} 个用户")


# ============================================================================
# 示例 8: 分布式锁（简单实现）
# ============================================================================

async def acquire_lock(lock_key: str, ttl: int = 10):
    """
    获取分布式锁
    
    使用 Redis 的 SETNX 实现简单的分布式锁
    """
    from app.core.redis import get_redis_client
    
    redis_client = await get_redis_client()
    if not redis_client:
        return False
    
    # 尝试获取锁
    result = await redis_client.set(
        f"lock:{lock_key}",
        "1",
        nx=True,  # 只在键不存在时设置
        ex=ttl    # 设置过期时间
    )
    
    return result is not None


async def release_lock(lock_key: str):
    """释放分布式锁"""
    await cache_service.delete(f"lock:{lock_key}")


async def with_lock_example(resource_id: str):
    """
    使用分布式锁的示例
    
    确保同一时间只有一个进程处理某个资源
    """
    lock_key = f"process:{resource_id}"
    
    # 尝试获取锁
    if not await acquire_lock(lock_key, ttl=30):
        return {"error": "资源正在被处理，请稍后再试"}
    
    try:
        # 执行需要加锁的操作
        # ... 处理资源 ...
        return {"message": "处理成功"}
    finally:
        # 释放锁
        await release_lock(lock_key)


# ============================================================================
# 示例 9: 缓存失效策略
# ============================================================================

async def invalidate_related_caches(sample_id: str):
    """
    使相关缓存失效
    
    当样品更新时，需要使多个相关缓存失效
    """
    # 删除样品详情缓存
    await cache_service.delete(f"sample:{sample_id}")
    
    # 删除样品列表缓存
    await cache_service.del_pattern("sample_list:*")
    
    # 删除统计缓存
    await cache_service.del_pattern("statistics:*")
    
    # 删除相关的工作流缓存
    await cache_service.del_pattern(f"workflow:sample:{sample_id}:*")


# ============================================================================
# 示例 10: 缓存监控
# ============================================================================

async def get_cache_stats():
    """
    获取缓存统计信息
    
    监控缓存使用情况
    """
    from app.core.redis import get_redis_client
    
    redis_client = await get_redis_client()
    if not redis_client:
        return {"error": "Redis 未连接"}
    
    # 获取 Redis 信息
    info = await redis_client.info()
    
    return {
        "used_memory": info.get("used_memory_human"),
        "connected_clients": info.get("connected_clients"),
        "total_commands_processed": info.get("total_commands_processed"),
        "keyspace_hits": info.get("keyspace_hits", 0),
        "keyspace_misses": info.get("keyspace_misses", 0),
        "hit_rate": (
            info.get("keyspace_hits", 0) / 
            (info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1))
        ) * 100
    }


# ============================================================================
# 使用示例
# ============================================================================

async def main():
    """主函数 - 演示各种缓存使用场景"""
    from sqlalchemy.ext.asyncio import AsyncSession
    
    # 模拟数据库会话
    db = None  # 实际使用时需要真实的数据库会话
    
    print("=" * 60)
    print("缓存使用示例")
    print("=" * 60)
    
    # 1. 统计查询缓存
    print("\n1. 统计查询缓存")
    stats = await get_sample_statistics(db, datetime.now(), datetime.now())
    print(f"   统计结果: {stats}")
    
    # 2. 用户信息缓存
    print("\n2. 用户信息缓存")
    user = await get_user_by_id(db, "123")
    print(f"   用户信息: {user}")
    
    # 3. 限流控制
    print("\n3. 限流控制")
    allowed, message = await check_rate_limit("user123", limit=5)
    print(f"   限流检查: {message}")
    
    # 4. 会话管理
    print("\n4. 会话管理")
    session_id = await create_session("user123", {"ip": "127.0.0.1"})
    print(f"   创建会话: {session_id}")
    
    session = await get_session(session_id)
    print(f"   获取会话: {session}")
    
    # 5. 批量操作
    print("\n5. 批量操作")
    users = await get_users_batch(db, ["1", "2", "3"])
    print(f"   批量获取用户: {len(users)} 个")
    
    # 6. 缓存统计
    print("\n6. 缓存统计")
    cache_stats = await get_cache_stats()
    print(f"   缓存统计: {cache_stats}")
    
    print("\n" + "=" * 60)
    print("示例完成")
    print("=" * 60)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
