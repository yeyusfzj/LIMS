# 数据库优化指南

## 概述

本文档描述了实验室管理系统后端 API 的数据库优化策略，包括索引优化、连接池配置、查询优化和性能监控。

## 索引策略

### 已创建的性能优化索引

系统已创建以下索引以优化常见查询模式：

#### 样品表索引

1. **复合索引：状态 + 创建时间**
   - 索引名：`idx_samples_status_created`
   - 用途：优化按状态和创建时间查询样品列表
   - 查询示例：`SELECT * FROM samples WHERE status = 'IN_TESTING' ORDER BY created_at DESC`

2. **复合索引：客户名称 + 状态**
   - 索引名：`idx_samples_client_status`
   - 用途：优化按客户名称和状态查询
   - 查询示例：`SELECT * FROM samples WHERE client_name = '某公司' AND status = 'REGISTERED'`

3. **复合索引：优先级 + 状态**
   - 索引名：`idx_samples_priority_status`
   - 用途：优化按优先级和状态查询
   - 查询示例：`SELECT * FROM samples WHERE priority = 'HIGH' AND status = 'IN_TESTING'`

4. **单列索引：接收日期**
   - 索引名：`idx_samples_received_date`
   - 用途：优化按接收日期范围查询
   - 查询示例：`SELECT * FROM samples WHERE received_date BETWEEN '2024-01-01' AND '2024-12-31'`

5. **全文搜索索引**
   - 索引名：`idx_samples_fulltext_search`
   - 类型：GIN 索引
   - 用途：优化样品名称和客户名称的全文搜索
   - 查询示例：使用 `to_tsvector` 和 `to_tsquery` 进行全文搜索

#### 审计日志表索引

1. **单列索引：时间戳（降序）**
   - 索引名：`idx_audit_logs_timestamp_desc`
   - 用途：优化按时间范围查询审计日志
   - 查询示例：`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100`

2. **复合索引：用户 + 时间戳**
   - 索引名：`idx_audit_logs_user_timestamp`
   - 用途：优化按用户和时间查询
   - 查询示例：`SELECT * FROM audit_logs WHERE user_id = 'xxx' ORDER BY timestamp DESC`

#### 任务表索引

1. **复合索引：分配人员 + 状态（部分索引）**
   - 索引名：`idx_tasks_assigned_status`
   - 用途：优化按分配人员和状态查询任务
   - 特点：仅索引已分配的任务（WHERE assigned_to IS NOT NULL）
   - 查询示例：`SELECT * FROM tasks WHERE assigned_to = 'user123' AND status = 'IN_PROGRESS'`

2. **单列索引：创建时间**
   - 索引名：`idx_tasks_created_at`
   - 用途：优化按创建时间查询任务
   - 查询示例：`SELECT * FROM tasks ORDER BY created_at DESC`

3. **复合索引：优先级 + 状态**
   - 索引名：`idx_tasks_priority_status`
   - 用途：优化按优先级和状态查询
   - 查询示例：`SELECT * FROM tasks WHERE priority = 'URGENT' AND status = 'PENDING'`

#### 检测结果表索引

1. **复合索引：样品 + 录入时间**
   - 索引名：`idx_results_sample_entered`
   - 用途：优化按样品和录入时间查询结果
   - 查询示例：`SELECT * FROM results WHERE sample_id = 'xxx' ORDER BY entered_at DESC`

2. **部分索引：异常结果**
   - 索引名：`idx_results_abnormal`
   - 用途：优化查询异常结果
   - 特点：仅索引异常结果（WHERE is_abnormal = true）
   - 查询示例：`SELECT * FROM results WHERE is_abnormal = true`

3. **部分索引：复测结果**
   - 索引名：`idx_results_retest`
   - 用途：优化查询复测结果
   - 特点：仅索引复测结果（WHERE is_retest = true）
   - 查询示例：`SELECT * FROM results WHERE is_retest = true`

#### 其他表索引

详见迁移文件 `20240101000000_add_performance_indexes/migration.sql`

## 连接池配置

### 配置参数

系统支持以下连接池配置参数（通过环境变量设置）：

```env
# 连接池大小（默认：20）
DB_CONNECTION_LIMIT=20

# 连接池超时时间（秒，默认：30）
DB_POOL_TIMEOUT=30

# 连接超时时间（秒，默认：10）
DB_CONNECT_TIMEOUT=10

# 语句超时时间（毫秒，默认：30000）
DB_STATEMENT_TIMEOUT=30000
```

### 推荐配置

#### 开发环境

```env
DB_CONNECTION_LIMIT=10
DB_POOL_TIMEOUT=30
DB_CONNECT_TIMEOUT=10
DB_STATEMENT_TIMEOUT=30000
```

#### 生产环境（单实例）

```env
DB_CONNECTION_LIMIT=20
DB_POOL_TIMEOUT=30
DB_CONNECT_TIMEOUT=10
DB_STATEMENT_TIMEOUT=30000
```

#### 生产环境（多实例）

```env
# 假设有 3 个实例，总连接数不超过数据库最大连接数
DB_CONNECTION_LIMIT=15
DB_POOL_TIMEOUT=30
DB_CONNECT_TIMEOUT=10
DB_STATEMENT_TIMEOUT=30000
```

### 连接池大小计算

推荐的连接池大小计算公式：

```
连接池大小 = ((核心数 * 2) + 有效磁盘数)
```

例如：
- 4 核 CPU + 1 个 SSD：(4 * 2) + 1 = 9，建议设置为 10
- 8 核 CPU + 2 个 SSD：(8 * 2) + 2 = 18，建议设置为 20

注意事项：
- 连接池不是越大越好，过大会增加数据库负担
- 多实例部署时，总连接数 = 单实例连接数 × 实例数
- PostgreSQL 默认最大连接数为 100，需要根据实际情况调整

## 查询优化

### 使用查询优化工具类

系统提供了 `QueryOptimizer` 工具类，包含常见的查询优化模式：

#### 1. 分页查询优化

```typescript
import QueryOptimizer from '../utils/queryOptimizer'

// 偏移分页（适用于小到中等数据量）
const pagination = QueryOptimizer.buildOffsetPagination(page, pageSize)
const samples = await prisma.sample.findMany({
  ...pagination,
  orderBy: { createdAt: 'desc' }
})

// 游标分页（适用于大数据量，性能更好）
const cursorPagination = QueryOptimizer.buildCursorPagination(cursor, pageSize)
const items = await prisma.sample.findMany({
  ...cursorPagination,
  orderBy: { createdAt: 'desc' }
})
const result = QueryOptimizer.processCursorPaginationResult(items, pageSize)
```

#### 2. 字段选择优化

```typescript
// 只查询需要的字段，减少数据传输量
const fields = ['id', 'barcode', 'sampleName', 'status']
const select = QueryOptimizer.buildFieldSelection(fields)

const samples = await prisma.sample.findMany({
  select,
  where: { status: 'REGISTERED' }
})
```

#### 3. 日期范围查询

```typescript
// 构建日期范围查询条件
const dateFilter = QueryOptimizer.buildDateRangeFilter(
  'receivedDate',
  startDate,
  endDate
)

const samples = await prisma.sample.findMany({
  where: {
    ...dateFilter,
    status: 'REGISTERED'
  }
})
```

#### 4. 全文搜索

```typescript
// 使用 PostgreSQL 全文搜索
const searchCondition = QueryOptimizer.buildFullTextSearch(
  searchTerm,
  ['sampleName', 'clientName']
)

const samples = await prisma.$queryRaw`
  SELECT * FROM samples
  WHERE ${searchCondition}
  LIMIT 100
`
```

#### 5. 批量操作

```typescript
// 自动分批处理大量 ID
const batches = QueryOptimizer.splitIntoBatches(sampleIds, 1000)

for (const batch of batches) {
  await prisma.sample.updateMany({
    where: { id: { in: batch } },
    data: { status: 'ARCHIVED' }
  })
}
```

#### 6. 性能监控

```typescript
// 执行带性能监控的查询
const samples = await QueryOptimizer.executeWithMonitoring(
  'getSamplesByStatus',
  async () => {
    return await prisma.sample.findMany({
      where: { status: 'IN_TESTING' }
    })
  }
)
```

### 查询优化最佳实践

1. **避免 SELECT ***
   - 只查询需要的字段
   - 使用 `select` 参数指定字段

2. **使用索引**
   - 确保 WHERE 条件中的字段有索引
   - 复合索引的字段顺序要与查询条件一致

3. **避免 N+1 查询**
   - 使用 `include` 一次性加载关联数据
   - 使用 `select` 精确控制加载的关联字段

4. **使用分页**
   - 大数据量查询必须使用分页
   - 优先使用游标分页而不是偏移分页

5. **批量操作**
   - 使用 `createMany`、`updateMany` 进行批量操作
   - 大批量操作要分批处理，避免单次操作数据量过大

6. **使用事务**
   - 多个相关操作使用事务确保一致性
   - 事务要尽可能短，避免长时间锁定

## 性能监控

### 使用数据库监控服务

系统提供了 `DatabaseMonitorService` 用于监控数据库性能：

#### 1. 获取连接池状态

```typescript
import databaseMonitorService from '../services/databaseMonitorService'

const poolStatus = await databaseMonitorService.getConnectionPoolStatus()
console.log('Active connections:', poolStatus.activeConnections)
console.log('Idle connections:', poolStatus.idleConnections)
console.log('Total connections:', poolStatus.totalConnections)
```

#### 2. 获取慢查询列表

```typescript
const slowQueries = await databaseMonitorService.getSlowQueries(10)
for (const query of slowQueries) {
  console.log(`Query: ${query.query}`)
  console.log(`Mean time: ${query.meanTime}ms`)
  console.log(`Calls: ${query.calls}`)
}
```

#### 3. 获取表大小统计

```typescript
const tableSizes = await databaseMonitorService.getTableSizes()
for (const table of tableSizes) {
  console.log(`Table: ${table.tableName}`)
  console.log(`Rows: ${table.rowCount}`)
  console.log(`Total size: ${table.totalSize}`)
  console.log(`Index size: ${table.indexSize}`)
}
```

#### 4. 获取索引使用统计

```typescript
const indexStats = await databaseMonitorService.getIndexUsageStats()
for (const stat of indexStats) {
  console.log(`Index: ${stat.indexName}`)
  console.log(`Scans: ${stat.indexScans}`)
  console.log(`Usage: ${stat.indexUsagePercent}%`)
}
```

#### 5. 获取未使用的索引

```typescript
const unusedIndexes = await databaseMonitorService.getUnusedIndexes()
for (const index of unusedIndexes) {
  console.log(`Unused index: ${index.indexName} on ${index.tableName}`)
  console.log(`Size: ${index.indexSize}`)
}
```

#### 6. 获取缓存命中率

```typescript
const cacheHitRatio = await databaseMonitorService.getCacheHitRatio()
console.log(`Heap cache hit ratio: ${cacheHitRatio.heapHitRatio}%`)
console.log(`Index cache hit ratio: ${cacheHitRatio.indexHitRatio}%`)
```

#### 7. 健康检查

```typescript
const health = await databaseMonitorService.checkHealth()
console.log(`Is healthy: ${health.isHealthy}`)
console.log('Issues:', health.issues)
console.log('Warnings:', health.warnings)
```

### 性能指标阈值

#### 连接池

- **正常**：使用率 < 70%
- **警告**：使用率 70% - 90%
- **严重**：使用率 > 90%

#### 缓存命中率

- **正常**：> 95%
- **警告**：90% - 95%
- **严重**：< 90%

#### 查询性能

- **正常**：平均响应时间 < 100ms
- **警告**：平均响应时间 100ms - 1000ms
- **严重**：平均响应时间 > 1000ms

## 维护任务

### 定期维护

#### 1. 更新统计信息（ANALYZE）

```bash
# 分析所有表
psql -d lims -c "ANALYZE;"

# 分析特定表
psql -d lims -c "ANALYZE samples;"
```

建议频率：
- 大表（> 100万行）：每天
- 中表（10万 - 100万行）：每周
- 小表（< 10万行）：每月

#### 2. 清理表碎片（VACUUM）

```bash
# 清理所有表
psql -d lims -c "VACUUM;"

# 完全清理（会锁表，谨慎使用）
psql -d lims -c "VACUUM FULL;"
```

建议频率：
- 常规 VACUUM：每天（自动）
- VACUUM FULL：每月（维护窗口期）

#### 3. 重建索引

```bash
# 重建特定索引
psql -d lims -c "REINDEX INDEX idx_samples_status_created;"

# 重建表的所有索引
psql -d lims -c "REINDEX TABLE samples;"
```

建议频率：
- 每季度或发现索引膨胀时

### 自动维护配置

PostgreSQL 的 autovacuum 配置：

```sql
-- 查看当前配置
SHOW autovacuum;
SHOW autovacuum_naptime;
SHOW autovacuum_vacuum_threshold;

-- 调整配置（需要超级用户权限）
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_naptime = '1min';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
```

## 故障排查

### 慢查询排查

1. **启用慢查询日志**

```sql
-- 设置慢查询阈值（毫秒）
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

2. **查看慢查询**

```sql
-- 使用 pg_stat_statements 扩展
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 查询最慢的 10 条 SQL
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

3. **分析查询计划**

```sql
EXPLAIN ANALYZE
SELECT * FROM samples
WHERE status = 'IN_TESTING'
ORDER BY created_at DESC
LIMIT 100;
```

### 连接池耗尽排查

1. **查看当前连接**

```sql
SELECT 
  pid,
  usename,
  application_name,
  client_addr,
  state,
  query_start,
  state_change,
  query
FROM pg_stat_activity
WHERE datname = 'lims';
```

2. **终止空闲连接**

```sql
-- 终止空闲超过 1 小时的连接
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'lims'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '1 hour';
```

### 索引问题排查

1. **查找缺失的索引**

```sql
-- 查找顺序扫描次数多的表
SELECT 
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  seq_tup_read / seq_scan AS avg_seq_tup
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_scan DESC
LIMIT 10;
```

2. **查找重复的索引**

```sql
SELECT 
  pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS size,
  (array_agg(idx))[1] AS idx1,
  (array_agg(idx))[2] AS idx2,
  (array_agg(idx))[3] AS idx3,
  (array_agg(idx))[4] AS idx4
FROM (
  SELECT 
    indexrelid::regclass AS idx,
    (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
     COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
  FROM pg_index
) sub
GROUP BY key
HAVING COUNT(*) > 1
ORDER BY SUM(pg_relation_size(idx)) DESC;
```

## 性能优化检查清单

### 部署前检查

- [ ] 所有必要的索引已创建
- [ ] 连接池参数已正确配置
- [ ] 慢查询日志已启用
- [ ] autovacuum 已启用
- [ ] pg_stat_statements 扩展已安装
- [ ] 数据库参数已根据硬件调优

### 运行时监控

- [ ] 定期检查连接池使用率
- [ ] 定期检查缓存命中率
- [ ] 定期检查慢查询列表
- [ ] 定期检查未使用的索引
- [ ] 定期检查表大小和增长趋势
- [ ] 定期执行 ANALYZE 更新统计信息

### 性能问题处理

- [ ] 识别慢查询并优化
- [ ] 添加缺失的索引
- [ ] 删除未使用的索引
- [ ] 优化查询逻辑
- [ ] 调整连接池大小
- [ ] 考虑数据归档策略

## 参考资料

- [PostgreSQL 性能优化官方文档](https://www.postgresql.org/docs/current/performance-tips.html)
- [Prisma 性能优化指南](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL 索引最佳实践](https://www.postgresql.org/docs/current/indexes.html)
