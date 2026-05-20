# 并发控制指南

## 概述

本系统实现了完整的并发控制机制，包括乐观锁、事务管理和并发冲突检测，确保在多用户并发操作时数据的一致性和完整性。

## 核心功能

### 1. 乐观锁机制

乐观锁通过版本号（version）字段实现，防止并发修改导致的数据覆盖。

#### 支持乐观锁的模型

- **Sample（样品）**：version 字段
- **Result（检测结果）**：version 字段
- **Report（报告）**：version 字段
- **QualityJudgment（质量判定）**：version 字段

#### 工作原理

1. 每次读取资源时，同时获取当前版本号
2. 更新资源时，必须提供版本号
3. 系统检查版本号是否匹配
4. 如果匹配，执行更新并递增版本号
5. 如果不匹配，返回 409 冲突错误

#### 使用示例

```typescript
// 1. 获取样品及其版本号
const sample = await prisma.sample.findUnique({
  where: { id: sampleId },
  select: { id: true, sampleName: true, version: true }
});

// 2. 使用乐观锁更新
const updated = await lockManager.updateSampleWithLock({
  id: sample.id,
  version: sample.version,
  data: {
    sampleName: '新名称',
    quantity: 200
  }
});

// 3. 如果版本号不匹配，会抛出 ConcurrencyConflictError
```

### 2. 事务管理

系统使用 Prisma 事务确保关键业务操作的原子性。

#### 支持的事务操作

##### 样品流转事务
```typescript
const result = await transactionManager.executeSampleTransfer(
  sampleId,
  transferData,
  sampleUpdateData
);
// 确保流转记录创建和样品位置更新同时成功或失败
```

##### 分样事务
```typescript
const result = await transactionManager.executeSampleSplit(
  parentId,
  childSamplesData,
  parentUpdateData
);
// 确保子样品创建和母样品更新的原子性
```

##### 合样事务
```typescript
const result = await transactionManager.executeSampleMerge(
  mergedSampleData,
  sourceSampleIds,
  sourceUpdateData
);
// 确保合并样品创建和来源样品更新的原子性
```

##### 批量结果导入事务
```typescript
const results = await transactionManager.executeBatchResultImport(
  resultsData
);
// 确保所有结果要么全部插入成功，要么全部失败
```

##### 批量样品放行事务
```typescript
const samples = await transactionManager.executeBatchSampleRelease(
  sampleIds,
  releaseData
);
// 确保所有样品状态更新的原子性
```

### 3. 并发冲突检测

系统自动检测并发冲突，返回标准化的错误响应。

#### 冲突响应格式

```json
{
  "error": {
    "code": "CONCURRENCY_CONFLICT",
    "message": "资源已被其他用户修改，请刷新后重试",
    "details": {
      "currentVersion": 5,
      "requestedVersion": 4
    },
    "timestamp": "2024-03-10T10:30:00.000Z",
    "path": "/api/samples/123"
  }
}
```

#### HTTP 状态码

- **409 Conflict**：并发冲突
- **400 Bad Request**：缺少或无效的版本号
- **408 Request Timeout**：事务超时

## API 使用指南

### 更新操作必须提供版本号

所有更新操作都需要在请求体中包含 `version` 字段：

```http
PUT /api/samples/:id
Content-Type: application/json

{
  "version": 3,
  "sampleName": "更新后的名称",
  "quantity": 200
}
```

### 处理并发冲突

客户端应该处理 409 冲突错误：

```typescript
try {
  const response = await fetch('/api/samples/123', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      version: currentVersion,
      sampleName: '新名称'
    })
  });

  if (response.status === 409) {
    // 并发冲突：提示用户刷新数据
    const error = await response.json();
    alert(`数据已被修改，当前版本：${error.details.currentVersion}`);
    // 重新获取最新数据
    await refreshData();
  }
} catch (error) {
  console.error('更新失败', error);
}
```

### 重试策略

对于并发冲突，可以使用自动重试：

```typescript
import { RetryStrategy } from '../utils/concurrencyControl';

const result = await RetryStrategy.executeWithRetry(
  async () => {
    // 获取最新版本
    const sample = await getSample(id);
    
    // 执行更新
    return await updateSample(id, sample.version, data);
  },
  maxRetries: 3,
  delayMs: 100
);
```

## 最佳实践

### 1. 总是获取最新版本

在更新操作前，确保获取资源的最新版本号：

```typescript
// ✅ 正确
const sample = await getSample(id);
await updateSample(id, sample.version, newData);

// ❌ 错误：使用缓存的旧版本号
await updateSample(id, cachedVersion, newData);
```

### 2. 在事务中执行关联操作

对于需要同时修改多个资源的操作，使用事务：

```typescript
// ✅ 正确：使用事务
await transactionManager.executeTransaction(async (tx) => {
  await tx.sample.update({ where: { id }, data: sampleData });
  await tx.transfer.create({ data: transferData });
});

// ❌ 错误：分开执行
await prisma.sample.update({ where: { id }, data: sampleData });
await prisma.transfer.create({ data: transferData });
```

### 3. 处理并发冲突

提供友好的用户提示和恢复机制：

```typescript
try {
  await updateResource(id, version, data);
} catch (error) {
  if (error instanceof ConcurrencyConflictError) {
    // 提示用户并提供选项
    const choice = await showConflictDialog({
      message: '数据已被其他用户修改',
      options: ['刷新并重试', '放弃修改']
    });
    
    if (choice === '刷新并重试') {
      const latest = await getResource(id);
      // 合并用户的修改和最新数据
      await updateResource(id, latest.version, mergeChanges(data, latest));
    }
  }
}
```

### 4. 避免长时间持有版本号

不要在客户端长时间缓存版本号：

```typescript
// ❌ 错误：长时间缓存
const sample = await getSample(id);
// ... 用户编辑了 10 分钟 ...
await updateSample(id, sample.version, data); // 很可能冲突

// ✅ 正确：更新前重新获取
const sample = await getSample(id);
// 立即更新
await updateSample(id, sample.version, data);
```

### 5. 批量操作使用事务

批量操作必须在事务中执行：

```typescript
// ✅ 正确
await transactionManager.executeBatchSampleRelease(
  sampleIds,
  releaseData
);

// ❌ 错误：循环单独更新
for (const id of sampleIds) {
  await updateSample(id, data); // 可能部分成功部分失败
}
```

## 性能考虑

### 1. 乐观锁 vs 悲观锁

本系统使用乐观锁，适合以下场景：
- ✅ 读多写少的场景
- ✅ 冲突概率较低
- ✅ 需要高并发性能

不适合：
- ❌ 写操作频繁
- ❌ 冲突概率很高
- ❌ 必须避免重试

### 2. 事务超时

长时间运行的事务可能导致性能问题：

```typescript
// 设置事务超时
app.use('/api/batch-operations', transactionTimeout(60000)); // 60秒
```

### 3. 重试策略

合理设置重试次数和延迟：

```typescript
// 低冲突场景
await RetryStrategy.executeWithRetry(operation, 3, 100);

// 高冲突场景
await RetryStrategy.executeWithRetry(operation, 5, 500);
```

## 监控和日志

### 并发冲突日志

系统自动记录所有并发冲突：

```
WARN: Concurrency conflict detected
  path: /api/samples/123
  method: PUT
  currentVersion: 5
  requestedVersion: 4
  userId: user-456
```

### 事务失败日志

事务失败会记录详细信息：

```
ERROR: Transaction failed
  operation: executeSampleTransfer
  sampleId: sample-123
  error: Unique constraint violation
```

## 故障排查

### 问题：频繁的并发冲突

**原因**：
- 多个用户同时编辑同一资源
- 客户端使用过期的版本号
- 自动保存功能导致频繁更新

**解决方案**：
1. 实现乐观 UI 更新
2. 增加重试机制
3. 使用防抖延迟自动保存
4. 考虑使用分布式锁

### 问题：事务超时

**原因**：
- 事务包含太多操作
- 数据库性能问题
- 网络延迟

**解决方案**：
1. 拆分大事务为多个小事务
2. 优化数据库查询
3. 增加事务超时时间
4. 使用异步队列处理批量操作

### 问题：版本号不一致

**原因**：
- 缓存未及时更新
- 客户端状态管理问题
- 并发请求导致

**解决方案**：
1. 更新前总是重新获取最新数据
2. 使用 WebSocket 实时同步
3. 实现乐观更新和回滚机制

## 测试

运行并发控制测试：

```bash
npm run test -- concurrencyControl.test.ts
```

测试覆盖：
- ✅ 乐观锁更新成功
- ✅ 版本冲突检测
- ✅ 事务原子性
- ✅ 事务回滚
- ✅ 重试策略
- ✅ 并发场景模拟

## 相关文档

- [数据库优化指南](./DATABASE_OPTIMIZATION.md)
- [API 响应优化](./API_RESPONSE_OPTIMIZATION.md)
- [安全中间件指南](./SECURITY_MIDDLEWARE_GUIDE.md)

## 总结

并发控制是保证数据一致性的关键机制。通过乐观锁、事务管理和冲突检测，系统能够在高并发场景下安全可靠地运行。开发者应该：

1. 理解乐观锁的工作原理
2. 在关键操作中使用事务
3. 正确处理并发冲突
4. 实现合理的重试策略
5. 监控并发冲突频率

遵循本指南的最佳实践，可以有效避免数据不一致和并发问题。
