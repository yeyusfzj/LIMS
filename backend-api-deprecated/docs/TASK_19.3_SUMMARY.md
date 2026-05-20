# 任务 19.3 实施总结：并发控制

## 任务概述

实现了完整的并发控制机制，包括乐观锁、事务管理和并发冲突检测，确保系统在多用户并发操作时的数据一致性和完整性。

## 实施内容

### 1. 数据库模型更新

在关键数据模型中添加了版本字段（version）用于乐观锁：

**更新的模型：**
- `Sample`（样品）
- `Result`（检测结果）
- `Report`（报告）
- `QualityJudgment`（质量判定）

**数据库迁移：**
- 创建了迁移文件 `20260310_add_version_fields/migration.sql`
- 为所有关键表添加 `version` 字段，默认值为 1

### 2. 并发控制工具类

创建了 `src/utils/concurrencyControl.ts`，包含：

#### OptimisticLockManager（乐观锁管理器）
- `updateSampleWithLock()` - 使用乐观锁更新样品
- `updateResultWithLock()` - 使用乐观锁更新检测结果
- `updateReportWithLock()` - 使用乐观锁更新报告
- `updateQualityJudgmentWithLock()` - 使用乐观锁更新质量判定

#### TransactionManager（事务管理器）
- `executeSampleTransfer()` - 在事务中执行样品流转
- `executeSampleSplit()` - 在事务中执行分样操作
- `executeSampleMerge()` - 在事务中执行合样操作
- `executeBatchResultImport()` - 在事务中执行批量结果导入
- `executeBatchSampleRelease()` - 在事务中执行批量样品放行
- `executeAuditProcess()` - 在事务中执行审核流程
- `executeTransaction()` - 通用事务执行方法

#### ConcurrencyConflictError（并发冲突错误类）
自定义错误类，包含当前版本号和请求版本号信息

#### RetryStrategy（重试策略）
- `executeWithRetry()` - 执行带重试的操作，支持指数退避

### 3. 并发控制中间件

创建了 `src/middleware/concurrencyMiddleware.ts`，包含：

- `handleConcurrencyConflict` - 并发冲突处理中间件，捕获冲突并返回 409 响应
- `requireVersion` - 版本号验证中间件，确保请求包含必需的版本号
- `transactionTimeout` - 事务超时中间件，为长时间运行的事务设置超时限制

### 4. 并发控制增强服务

创建了 `src/services/concurrentSampleService.ts`，提供：

- `updateSampleWithLock()` - 使用乐观锁更新样品
- `transferSampleInTransaction()` - 在事务中执行样品流转
- `splitSampleInTransaction()` - 在事务中执行分样操作
- `mergeSamplesInTransaction()` - 在事务中执行合样操作
- `batchUpdateSampleStatus()` - 批量更新样品状态
- `checkSampleVersion()` - 检查样品版本

### 5. 应用程序集成

更新了 `src/app.ts`：
- 导入并发冲突处理中间件
- 在错误处理链中添加并发冲突处理

### 6. 测试套件

创建了 `src/__tests__/concurrencyControl.test.ts`，包含：

**乐观锁机制测试：**
- 成功更新具有正确版本号的样品
- 拒绝使用过期版本号的更新
- 并发冲突时返回正确的版本信息
- 支持多次连续更新

**事务管理测试：**
- 在事务中原子性地执行样品流转
- 在事务中原子性地执行分样操作
- 事务失败时回滚所有操作
- 支持批量操作的事务性

**重试策略测试：**
- 在并发冲突时自动重试
- 达到最大重试次数后抛出错误
- 对非并发冲突错误立即抛出

**并发场景模拟：**
- 正确处理两个用户同时更新同一样品

### 7. 文档

创建了 `docs/CONCURRENCY_CONTROL_GUIDE.md`，包含：
- 并发控制概述
- 乐观锁机制详解
- 事务管理指南
- 并发冲突检测说明
- API 使用指南
- 最佳实践
- 性能考虑
- 监控和日志
- 故障排查

## 技术实现

### 乐观锁工作原理

1. 每个资源包含一个 `version` 字段
2. 读取资源时获取当前版本号
3. 更新时必须提供版本号
4. 系统检查版本号是否匹配
5. 匹配则更新并递增版本号
6. 不匹配则抛出 `ConcurrencyConflictError`

### 事务管理

使用 Prisma 的 `$transaction` API 确保操作的原子性：

```typescript
await prisma.$transaction(async (tx) => {
  // 所有操作要么全部成功，要么全部失败
  await tx.sample.update({ ... });
  await tx.transfer.create({ ... });
});
```

### 并发冲突响应

返回标准化的 409 Conflict 响应：

```json
{
  "error": {
    "code": "CONCURRENCY_CONFLICT",
    "message": "资源已被其他用户修改，请刷新后重试",
    "details": {
      "currentVersion": 5,
      "requestedVersion": 4
    }
  }
}
```

## 验证的需求

- ✅ **需求 25.1**：使用乐观锁机制防止并发冲突
- ✅ **需求 25.2**：检测到并发冲突时返回 409 错误
- ✅ **需求 25.3**：在事务中执行需要原子性的操作
- ✅ **需求 25.5**：记录所有并发冲突事件

## 使用示例

### 客户端使用乐观锁

```typescript
// 1. 获取资源及版本号
const sample = await getSample(id);

// 2. 更新资源，提供版本号
try {
  const updated = await updateSample(id, {
    version: sample.version,
    sampleName: '新名称',
    quantity: 200
  });
  console.log('更新成功', updated);
} catch (error) {
  if (error.status === 409) {
    // 并发冲突：提示用户刷新
    alert('数据已被修改，请刷新后重试');
  }
}
```

### 服务端使用事务

```typescript
// 在事务中执行样品流转
const result = await transactionManager.executeSampleTransfer(
  sampleId,
  transferData,
  sampleUpdateData
);
```

### 使用重试策略

```typescript
const result = await RetryStrategy.executeWithRetry(
  async () => {
    const sample = await getSample(id);
    return await updateSample(id, sample.version, data);
  },
  maxRetries: 3,
  delayMs: 100
);
```

## 性能影响

- **乐观锁**：几乎无性能开销，只增加一个整数字段
- **事务**：确保数据一致性，轻微的性能开销
- **重试**：在冲突时自动重试，提高成功率

## 监控指标

系统自动记录：
- 并发冲突频率
- 事务执行时间
- 重试成功率
- 事务失败原因

## 后续优化建议

1. **分布式锁**：对于高冲突场景，考虑使用 Redis 分布式锁
2. **版本号策略**：可以考虑使用时间戳或 UUID 作为版本标识
3. **冲突解决**：实现自动合并策略，减少用户干预
4. **性能监控**：添加 Prometheus 指标，监控并发冲突率
5. **WebSocket 通知**：实时通知用户数据变更，减少冲突

## 注意事项

1. **数据库迁移**：需要运行迁移添加 version 字段
2. **Prisma Client**：需要重新生成 Prisma Client
3. **客户端适配**：前端需要适配版本号机制
4. **测试环境**：测试需要数据库连接

## 文件清单

### 新增文件
- `src/utils/concurrencyControl.ts` - 并发控制工具类
- `src/middleware/concurrencyMiddleware.ts` - 并发控制中间件
- `src/services/concurrentSampleService.ts` - 并发控制增强服务
- `src/__tests__/concurrencyControl.test.ts` - 并发控制测试
- `docs/CONCURRENCY_CONTROL_GUIDE.md` - 并发控制指南
- `prisma/migrations/20260310_add_version_fields/migration.sql` - 数据库迁移

### 修改文件
- `prisma/schema.prisma` - 添加 version 字段
- `src/app.ts` - 集成并发冲突处理中间件

## 总结

成功实现了完整的并发控制机制，包括：

1. ✅ 乐观锁机制 - 防止数据覆盖
2. ✅ 事务管理 - 确保操作原子性
3. ✅ 并发冲突检测 - 返回标准化错误
4. ✅ 重试策略 - 自动处理冲突
5. ✅ 完整测试 - 覆盖各种场景
6. ✅ 详细文档 - 使用指南和最佳实践

系统现在能够安全地处理多用户并发操作，确保数据的一致性和完整性。
