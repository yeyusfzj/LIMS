# Redis 缓存使用指南

本文档介绍如何在 FastAPI 后端中使用 Redis 缓存服务。

## 概述

缓存服务提供了完整的 Redis 缓存操作接口，包括：
- 基础的 get/set/delete 操作
- 批量操作（mget/mset）
- 计数器操作（incr/decr）
- 缓存穿透防护（set_null/is_null）
- Cache-Aside 模式（get_or_load）
- 缓存装饰器（@cache_result）

## 快速开始

### 1. 导入缓存服务

```python
from app.core.cache import cache_service, cache_result
```

### 2. 基础操作

#### 设置缓存

```python
# 设置缓存，默认过期时间 300 秒（5 分钟）
await cache_service.set("user:123", {"id": "123", "name": "张三"})

# 设置缓存，指定过期时间 1800 秒（30 分钟）
await cache_service.set("user:123", {"id": "123", "name": "张三"}, ttl=1800)
```

#### 获取缓存

```python
# 获取缓存
user = await cache_service.get("user:123")
if user:
    print(f"用户名: {user['name']}")
```

#### 删除缓存

```python
# 删除单个缓存
await cache_service.delete("user:123")

# 删除多个缓存
await cache_service.delete(["user:123", "user:456"])

# 删除匹配模式的所有缓存
await cache_service.del_pattern("user:*")
```

#### 检查缓存是否存在

```python
exists = await cache_service.exists("user:123")
if exists:
    print("缓存存在")
```

#### 获取缓存剩余时间

```python
ttl = await cache_service.ttl("user:123")
if ttl > 0:
    print(f"缓存将在 {ttl} 秒后过期")
elif ttl == -1:
    print("缓存永不过期")
else:
    print("缓存不存在")
```

### 3. 批量操作

#### 批量获取

```python
keys = ["user:123", "user:456", "user:789"]
users = await cache_service.mget(keys)
for user in users:
    if user:
        print(f"用户: {user['name']}")
```

#### 批量设置

```python
items = [
    {"key": "user:123", "value": {"id": "123", "name": "张三"}},
    {"key": "user:456", "value": {"id": "456", "name": "李四"}},
    {"key": "user:789", "value": {"id": "789", "name": "王五"}}
]
await cache_service.mset(items, ttl=1800)
```

### 4. 计数器操作

```python
# 增加计数器
count = await cache_service.incr("page_views:123")
print(f"页面浏览量: {count}")

# 增加指定值
count = await cache_service.incr("page_views:123", increment=10)

# 减少计数器
count = await cache_service.decr("page_views:123")
```

### 5. 缓存穿透防护

当数据库中不存在某个数据时，可以缓存一个空值，防止缓存穿透：

```python
async def get_user(user_id: str):
    # 1. 尝试从缓存获取
    cache_key = f"user:{user_id}"
    user = await cache_service.get(cache_key)
    if user:
        return user
    
    # 2. 检查是否为空值缓存
    if await cache_service.is_null(cache_key):
        return None
    
    # 3. 从数据库查询
    user = await db.query(User).filter(User.id == user_id).first()
    
    # 4. 写入缓存
    if user:
        await cache_service.set(cache_key, user.dict(), ttl=1800)
    else:
        # 缓存空值，防止缓存穿透
        await cache_service.set_null(cache_key, ttl=60)
    
    return user
```

### 6. Cache-Aside 模式

使用 `get_or_load` 方法简化 Cache-Aside 模式的实现：

```python
async def get_user(user_id: str):
    cache_key = f"user:{user_id}"
    
    async def load_from_db():
        return await db.query(User).filter(User.id == user_id).first()
    
    user = await cache_service.get_or_load(cache_key, load_from_db, ttl=1800)
    return user
```

### 7. 缓存装饰器

使用 `@cache_result` 装饰器自动缓存函数结果：

```python
from app.core.cache import cache_result

@cache_result(key_prefix="statistics", ttl=1800)
async def get_statistics(start_date: str, end_date: str):
    """
    获取统计数据（缓存 30 分钟）
    """
    # 复杂的统计查询
    result = await db.execute(
        select(func.count(Sample.id))
        .where(Sample.createdAt.between(start_date, end_date))
    )
    return {"total": result.scalar()}

# 使用
stats = await get_statistics("2024-01-01", "2024-01-31")
```

## 实际应用场景

### 1. 统计查询缓存

统计查询通常比较耗时，适合使用缓存：

```python
from app.core.cache import cache_result

@cache_result(key_prefix="audit_statistics", ttl=1800)
async def get_audit_statistics(
    db: AsyncSession,
    start_date: datetime,
    end_date: datetime
):
    """获取审核统计（缓存 30 分钟）"""
    # 复杂的统计查询
    pass
```

### 2. 用户信息缓存

```python
async def get_user_by_id(db: AsyncSession, user_id: str):
    """获取用户信息（带缓存）"""
    cache_key = f"user:{user_id}"
    
    async def load_user():
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        return user.dict() if user else None
    
    return await cache_service.get_or_load(cache_key, load_user, ttl=1800)
```

### 3. 列表查询缓存

```python
@cache_result(key_prefix="sample_list", ttl=300)
async def get_samples(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
    status: Optional[str] = None
):
    """获取样品列表（缓存 5 分钟）"""
    query = select(Sample)
    if status:
        query = query.where(Sample.status == status)
    
    result = await db.execute(
        query.offset((page - 1) * page_size).limit(page_size)
    )
    return [sample.dict() for sample in result.scalars().all()]
```

### 4. 缓存失效策略

当数据更新时，需要使相关缓存失效：

```python
async def update_sample(db: AsyncSession, sample_id: str, data: dict):
    """更新样品"""
    # 更新数据库
    await db.execute(
        update(Sample)
        .where(Sample.id == sample_id)
        .values(**data)
    )
    await db.commit()
    
    # 使相关缓存失效
    await cache_service.delete(f"sample:{sample_id}")
    await cache_service.del_pattern("sample_list:*")
    await cache_service.del_pattern("statistics:*")
```

### 5. 限流控制

使用计数器实现简单的限流：

```python
from fastapi import HTTPException

async def check_rate_limit(user_id: str, limit: int = 60):
    """检查限流（每分钟最多 60 次请求）"""
    key = f"rate_limit:{user_id}"
    count = await cache_service.incr(key)
    
    if count == 1:
        # 第一次请求，设置过期时间
        await cache_service.expire(key, 60)
    
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail="请求过于频繁，请稍后再试"
        )
```

### 6. 会话管理

```python
async def create_session(user_id: str, session_data: dict):
    """创建会话"""
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
    """删除会话"""
    cache_key = f"session:{session_id}"
    await cache_service.delete(cache_key)
```

## 缓存键命名规范

为了便于管理和避免冲突，建议遵循以下命名规范：

- **用户相关**: `user:{user_id}`
- **样品相关**: `sample:{sample_id}`
- **列表查询**: `{resource}_list:{params_hash}`
- **统计数据**: `statistics:{type}:{params_hash}`
- **会话数据**: `session:{session_id}`
- **限流计数**: `rate_limit:{user_id}`

## 缓存过期时间建议

- **用户信息**: 30 分钟（1800 秒）
- **列表查询**: 5 分钟（300 秒）
- **统计数据**: 30 分钟（1800 秒）
- **会话数据**: 1 小时（3600 秒）
- **空值缓存**: 1 分钟（60 秒）

## 注意事项

1. **缓存一致性**: 更新数据时记得使相关缓存失效
2. **缓存穿透**: 对于不存在的数据，缓存空值防止穿透
3. **缓存雪崩**: 避免大量缓存同时过期，可以添加随机过期时间
4. **缓存击穿**: 对于热点数据，考虑使用互斥锁或永不过期策略
5. **内存管理**: 合理设置过期时间，避免 Redis 内存溢出

## 性能优化建议

1. **批量操作**: 使用 `mget` 和 `mset` 减少网络往返
2. **合理的 TTL**: 根据数据更新频率设置合理的过期时间
3. **缓存预热**: 系统启动时预加载热点数据
4. **监控缓存命中率**: 定期检查缓存效果，调整策略

## 与 Node.js 后端的一致性

FastAPI 后端的缓存服务与 Node.js 后端的 `cacheService.ts` 保持一致：

| 功能 | Node.js | FastAPI | 说明 |
|------|---------|---------|------|
| 获取缓存 | `get(key)` | `get(key)` | ✅ 一致 |
| 设置缓存 | `set(key, value, ttl)` | `set(key, value, ttl)` | ✅ 一致 |
| 删除缓存 | `del(key)` | `delete(key)` | ✅ 功能一致 |
| 批量获取 | `mget(keys)` | `mget(keys)` | ✅ 一致 |
| 批量设置 | `mset(items, ttl)` | `mset(items, ttl)` | ✅ 一致 |
| 计数器 | `incr(key)` / `decr(key)` | `incr(key)` / `decr(key)` | ✅ 一致 |
| 空值缓存 | `setNull(key)` / `isNull(key)` | `set_null(key)` / `is_null(key)` | ✅ 功能一致 |
| Cache-Aside | `getOrLoad(key, loader, ttl)` | `get_or_load(key, loader, ttl)` | ✅ 一致 |
| 批量删除 | `delPattern(pattern)` | `del_pattern(pattern)` | ✅ 功能一致 |

## 相关文档

- [Redis 连接配置](./REDIS_SETUP.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
- [API 文档](./API_DOCUMENTATION.md)
