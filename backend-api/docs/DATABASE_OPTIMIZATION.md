# 数据库连接池和查询优化

本文档描述了 FastAPI 后端的数据库连接池配置和查询优化工具的实现。

## 概述

为了提高数据库操作性能，FastAPI 后端实现了以下优化：

1. **连接池管理**：优化数据库连接池配置，复用连接，减少连接开销
2. **查询优化工具**：提供常见的查询优化模式和最佳实践
3. **慢查询监控**：自动检测和记录慢查询（阈值：1000ms）
4. **性能分析**：提供查询性能统计和分析工具

## 连接池配置

### 配置参数

与 Node.js 后端保持一致的连接池配置：

| 参数 | 值 | 说明 |
|------|-----|------|
| `DATABASE_POOL_SIZE` | 20 | 连接池基础大小 |
| `DATABASE_MAX_OVERFLOW` | 10 | 最大溢出连接数 |
| `DATABASE_POOL_TIMEOUT` | 30秒 | 获取连接超时时间 |
| `DATABASE_POOL_RECYCLE` | 3600秒 | 连接回收时间（1小时） |
| `pool_pre_ping` | True | 连接前检查连接有效性 |

### 配置文件

**app/config.py**:
```python
class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://..."
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_POOL_RECYCLE: int = 3600
```

**app/core/database.py**:
```python
_engine = create_async_engine(
    settings.DATABASE_URL,
    poolclass=AsyncAdaptedQueuePool,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_timeout=settings.DATABASE_POOL_TIMEOUT,
    pool_recycle=settings.DATABASE_POOL_RECYCLE,
    pool_pre_ping=True,
    echo=settings.DEBUG,
    future=True,
)
```

### 连接池优势

1. **性能提升**：复用连接，避免频繁创建和销毁连接
2. **资源控制**：限制最大连接数，防止数据库过载
3. **自动恢复**：自动检测和回收失效连接
4. **负载均衡**：合理分配连接资源

## 慢查询监控

### 监控配置

系统自动监控所有数据库查询，记录执行时间超过 1000ms 的慢查询。

**实现**（app/core/database.py）:
```python
@event.listens_for(engine.sync_engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """查询执行前记录开始时间"""
    import time
    conn.info.setdefault('query_start_time', []).append(time.time())

@event.listens_for(engine.sync_engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """查询执行后检查是否为慢查询"""
    import time
    start_times = conn.info.get('query_start_time', [])
    if start_times:
        start_time = start_times.pop()
        duration = (time.time() - start_time) * 1000
        
        if duration > 1000:  # 慢查询阈值：1000ms
            logger.warning(
                f"Slow query detected: {duration:.2f}ms",
                extra={
                    "query": statement,
                    "duration": f"{duration:.2f}ms",
                    "params": parameters
                }
            )
```

### 慢查询日志格式

```json
{
  "level": "WARNING",
  "message": "Slow query detected: 1523.45ms",
  "query": "SELECT * FROM Sample WHERE ...",
  "duration": "1523.45ms",
  "params": {"param1": "value1"}
}
```

## 查询优化工具

### QueryOptimizer 类

提供常见的查询优化模式和最佳实践。

#### 1. 分页查询

**偏移分页**（适用于小到中等数据量）:
```python
from app.utils.query_optimizer import QueryOptimizer

# 构建分页参数
pagination = QueryOptimizer.build_offset_pagination(page=2, page_size=20)
# 返回: {"offset": 20, "limit": 20}

# 执行分页查询
result = await QueryOptimizer.paginate_query(
    db=db,
    query=select(Sample),
    page=2,
    page_size=20
)
# 返回: PaginationResult(items, total, page, page_size)
```

**游标分页**（适用于大数据量）:
```python
# 构建游标分页参数
params = QueryOptimizer.build_cursor_pagination(
    cursor="last_id",
    page_size=20
)

# 处理分页结果
result = QueryOptimizer.process_cursor_pagination_result(
    items=items,
    page_size=20
)
# 返回: CursorPaginationResult(items, has_more, next_cursor)
```

#### 2. 日期范围查询

```python
# 构建日期范围过滤器
filters = QueryOptimizer.build_date_range_filter(
    field="created_at",
    start_date=datetime(2026, 1, 1),
    end_date=datetime(2026, 12, 31)
)
# 返回: {"created_at_gte": ..., "created_at_lte": ...}
```

#### 3. 批量操作

**批量创建**:
```python
# 批量创建记录
samples = await QueryOptimizer.batch_create(
    db=db,
    model_class=Sample,
    data_list=[
        {"barcode": "SP001", "sampleName": "样品1"},
        {"barcode": "SP002", "sampleName": "样品2"},
    ]
)
```

**批量更新**:
```python
# 批量更新记录
count = await QueryOptimizer.batch_update(
    db=db,
    model_class=Sample,
    updates=[
        {"id": "id1", "status": "COMPLETED"},
        {"id": "id2", "status": "COMPLETED"},
    ]
)
```

**分批处理**:
```python
# 将大量数据分批处理
batches = QueryOptimizer.split_into_batches(items, batch_size=1000)
# 返回: [[batch1], [batch2], ...]

# 分批执行操作
results = await QueryOptimizer.execute_in_batches(
    db=db,
    items=items,
    process_fn=process_function,
    batch_size=1000
)
```

#### 4. 预加载关联数据

避免 N+1 查询问题：

```python
from sqlalchemy.orm import selectinload

# 使用 selectinload 预加载关联数据
query = select(Sample).options(
    selectinload(Sample.test_items),
    selectinload(Sample.results),
    selectinload(Sample.transfers)
)

result = await db.execute(query)
samples = result.scalars().all()
# 一次查询获取所有关联数据
```

#### 5. 性能监控

```python
# 执行带性能监控的查询
result = await QueryOptimizer.execute_with_monitoring(
    query_name="get_samples",
    query_fn=get_samples_function,
    db=db,
    filters=filters
)
# 自动记录执行时间，超过 1000ms 记录警告日志
```

### QueryAnalyzer 类

查询性能分析器，用于统计和分析查询性能。

#### 记录查询统计

```python
from app.utils.query_optimizer import QueryAnalyzer

# 记录查询执行时间
QueryAnalyzer.record_query("get_samples", duration=150.5)
QueryAnalyzer.record_query("get_samples", duration=200.3)
```

#### 获取统计报告

```python
# 获取所有查询的统计报告
report = QueryAnalyzer.get_report()
# 返回:
# [
#   {
#     "queryName": "get_samples",
#     "count": 2,
#     "avgDuration": 175.4,
#     "maxDuration": 200.3,
#     "minDuration": 150.5
#   }
# ]
```

#### 获取慢查询列表

```python
# 获取平均执行时间超过 1000ms 的查询
slow_queries = QueryAnalyzer.get_slow_queries(threshold=1000.0)
```

#### 重置统计数据

```python
# 重置所有统计数据
QueryAnalyzer.reset()
```

## 查询优化最佳实践

### 1. 使用索引

确保所有常用查询字段都有索引：

```python
class Sample(Base):
    __tablename__ = 'Sample'
    
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    sampleNumber = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(SQLEnum(SampleStatus), default=SampleStatus.REGISTERED, index=True)
    createdAt = Column(DateTime, default=datetime.utcnow, index=True)
```

### 2. 使用分页

避免一次性加载大量数据：

```python
# 好的做法：使用分页
result = await QueryOptimizer.paginate_query(
    db=db,
    query=select(Sample),
    page=1,
    page_size=20
)

# 不好的做法：加载所有数据
all_samples = await db.execute(select(Sample))
```

### 3. 预加载关联数据

避免 N+1 查询问题：

```python
# 好的做法：预加载关联数据
query = select(Sample).options(
    selectinload(Sample.test_items),
    selectinload(Sample.results)
)

# 不好的做法：循环查询关联数据
samples = await db.execute(select(Sample))
for sample in samples:
    test_items = await db.execute(
        select(TestItem).where(TestItem.sampleId == sample.id)
    )
```

### 4. 批量操作

使用批量操作提高性能：

```python
# 好的做法：批量创建
samples = await QueryOptimizer.batch_create(
    db=db,
    model_class=Sample,
    data_list=sample_data_list
)

# 不好的做法：循环创建
for data in sample_data_list:
    sample = Sample(**data)
    db.add(sample)
    await db.flush()
```

### 5. 选择必要字段

只查询需要的字段：

```python
# 好的做法：只查询需要的字段
query = select(Sample.id, Sample.barcode, Sample.sampleName)

# 不好的做法：查询所有字段
query = select(Sample)
```

### 6. 使用事务

批量操作使用事务：

```python
async with db.begin():
    # 多个数据库操作
    await db.execute(...)
    await db.execute(...)
    # 自动提交或回滚
```

## 性能监控端点

系统提供性能监控端点，用于查看查询统计：

```bash
# 获取查询统计报告
GET /api/v1/performance/query-stats

# 获取慢查询列表
GET /api/v1/performance/slow-queries?threshold=1000

# 重置统计数据
POST /api/v1/performance/reset-stats
```

## 与 Node.js 后端的一致性

FastAPI 后端的数据库优化与 Node.js 后端保持一致：

| 特性 | Node.js 后端 | FastAPI 后端 | 一致性 |
|------|-------------|-------------|--------|
| 连接池大小 | 20 | 20 | ✅ |
| 最大溢出连接 | 10 | 10 | ✅ |
| 连接超时 | 10秒 | 30秒 | ⚠️ 略有不同 |
| 语句超时 | 30000ms | - | ⚠️ 需配置 |
| 慢查询阈值 | 1000ms | 1000ms | ✅ |
| 连接回收 | - | 3600秒 | ✅ |
| 连接前检查 | - | True | ✅ |

## 配置建议

### 开发环境

```python
DATABASE_POOL_SIZE = 5
DATABASE_MAX_OVERFLOW = 5
DATABASE_POOL_TIMEOUT = 30
DATABASE_POOL_RECYCLE = 3600
DEBUG = True
```

### 生产环境

```python
DATABASE_POOL_SIZE = 20
DATABASE_MAX_OVERFLOW = 10
DATABASE_POOL_TIMEOUT = 30
DATABASE_POOL_RECYCLE = 3600
DEBUG = False
```

### 高并发环境

```python
DATABASE_POOL_SIZE = 50
DATABASE_MAX_OVERFLOW = 20
DATABASE_POOL_TIMEOUT = 60
DATABASE_POOL_RECYCLE = 1800
```

## 故障排查

### 连接池耗尽

**症状**：请求超时，日志显示 "QueuePool limit of size X overflow Y reached"

**解决方案**：
1. 增加 `DATABASE_POOL_SIZE` 和 `DATABASE_MAX_OVERFLOW`
2. 检查是否有连接泄漏（未正确关闭会话）
3. 优化慢查询，减少连接占用时间

### 慢查询过多

**症状**：大量慢查询警告日志

**解决方案**：
1. 使用 `QueryAnalyzer.get_slow_queries()` 分析慢查询
2. 为常用查询字段添加索引
3. 使用预加载避免 N+1 查询
4. 使用分页避免大量数据加载
5. 优化复杂查询，考虑使用原生 SQL

### 连接频繁断开

**症状**：日志显示连接错误，需要频繁重连

**解决方案**：
1. 启用 `pool_pre_ping=True`（已启用）
2. 调整 `DATABASE_POOL_RECYCLE` 时间
3. 检查数据库服务器配置
4. 检查网络稳定性

## 参考资料

- [SQLAlchemy 连接池文档](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [asyncpg 性能优化](https://magicstack.github.io/asyncpg/current/usage.html#performance)
- [PostgreSQL 性能调优](https://www.postgresql.org/docs/current/performance-tips.html)
