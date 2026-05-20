# 异步任务队列使用指南

## 概述

实验室管理系统后端 API 集成了基于 Bull 的异步任务队列系统，用于处理耗时的操作，如报告生成、批量数据处理和数据导出。

## 架构

系统包含三个主要队列：

1. **报告生成队列 (report-generation)**: 处理报告生成任务
2. **批量操作队列 (batch-operations)**: 处理批量导入、更新、删除操作
3. **数据导出队列 (data-export)**: 处理数据导出任务

每个队列都有独立的 worker 进程来处理任务，支持并发处理和自动重试。

## 功能特性

### 1. 报告生成异步处理

**使用场景**: 当需要生成大量报告或报告生成耗时较长时

**API 端点**: `POST /api/reports/generate-async`

**请求示例**:
```json
{
  "sampleId": "sample-123",
  "templateId": "template-456"
}
```

**响应示例**:
```json
{
  "jobId": "job-789",
  "message": "报告生成任务已提交，请稍后查询任务状态"
}
```

### 2. 批量操作异步处理

#### 批量导入

**使用场景**: 导入大量检测结果或样品数据

**API 端点**: `POST /api/results/import-async`

**请求示例**:
```json
{
  "type": "results",
  "fileData": {
    "rows": [...]
  }
}
```

#### 批量更新

**使用场景**: 批量更新样品或结果状态

**示例代码**:
```typescript
const jobId = await queueService.addBatchUpdateJob({
  operation: 'update',
  type: 'samples',
  updates: [
    { id: 'sample-1', data: { status: 'COMPLETED' } },
    { id: 'sample-2', data: { status: 'COMPLETED' } }
  ],
  userId: 'user-123'
})
```

#### 批量删除

**使用场景**: 批量删除过期或无效数据

**示例代码**:
```typescript
const jobId = await queueService.addBatchDeleteJob({
  operation: 'delete',
  type: 'samples',
  ids: ['sample-1', 'sample-2', 'sample-3'],
  userId: 'user-123'
})
```

### 3. 数据导出异步处理

**使用场景**: 导出大量数据为 CSV 或 Excel 格式

**API 端点**: `POST /api/statistics/export-async`

**请求示例**:
```json
{
  "type": "samples",
  "format": "excel",
  "query": {
    "status": "COMPLETED",
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}
```

## 任务管理

### 查询任务状态

**API 端点**: `GET /api/queue/jobs/:jobId?queueType=report`

**响应示例**:
```json
{
  "id": "job-789",
  "type": "report",
  "status": "completed",
  "progress": 100,
  "data": {
    "sampleId": "sample-123",
    "templateId": "template-456"
  },
  "result": {
    "reportId": "report-abc",
    "reportNumber": "REPORT-20240101-0001",
    "success": true
  },
  "createdAt": "2024-01-01T10:00:00Z",
  "finishedAt": "2024-01-01T10:05:00Z",
  "attempts": 1,
  "maxAttempts": 3
}
```

### 任务状态说明

- `waiting`: 等待处理
- `active`: 正在处理
- `completed`: 已完成
- `failed`: 失败
- `delayed`: 延迟执行

### 获取队列统计信息

**API 端点**: `GET /api/queue/:queueType/stats`

**响应示例**:
```json
{
  "queueType": "report",
  "waiting": 5,
  "active": 2,
  "completed": 100,
  "failed": 3,
  "delayed": 0,
  "total": 110
}
```

### 获取任务列表

**API 端点**: `GET /api/queue/:queueType/jobs?status=waiting&start=0&end=10`

**响应示例**:
```json
{
  "jobs": [
    {
      "id": "job-1",
      "type": "report",
      "status": "waiting",
      "progress": 0,
      "data": {...},
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 5
}
```

### 重试失败的任务

**API 端点**: `POST /api/queue/jobs/:jobId/retry`

**请求体**:
```json
{
  "queueType": "report"
}
```

### 删除任务

**API 端点**: `DELETE /api/queue/jobs/:jobId?queueType=report`

### 清空队列

**API 端点**: `POST /api/queue/:queueType/clean`

**请求体**:
```json
{
  "status": "completed"
}
```

## 配置

### 队列配置

队列配置位于 `src/config/queue.ts`：

```typescript
const queueConfig = {
  redis: {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 3,              // 最大重试次数
    backoff: {
      type: 'exponential',    // 指数退避
      delay: 2000,            // 初始延迟 2 秒
    },
    removeOnComplete: 100,    // 保留最近 100 个完成的任务
    removeOnFail: 200,        // 保留最近 200 个失败的任务
  },
}
```

### Worker 并发配置

Worker 并发数可以在 `src/workers/index.ts` 中配置：

```typescript
startReportWorker(2)  // 2 个并发处理报告生成
startBatchWorker(2)   // 2 个并发处理批量操作
startExportWorker(2)  // 2 个并发处理数据导出
```

## 监控和日志

### 队列事件监听

系统自动监听以下队列事件：

- `completed`: 任务完成
- `failed`: 任务失败
- `progress`: 任务进度更新

所有事件都会记录到日志系统中。

### 日志示例

```
[INFO] Report generation job added { jobId: 'job-789', sampleId: 'sample-123' }
[INFO] Processing report generation job { jobId: 'job-789' }
[INFO] Report generation completed { jobId: 'job-789', reportId: 'report-abc' }
```

## 错误处理

### 自动重试

任务失败时会自动重试，最多重试 3 次，使用指数退避策略：

- 第 1 次重试: 2 秒后
- 第 2 次重试: 4 秒后
- 第 3 次重试: 8 秒后

### 失败处理

如果任务在 3 次重试后仍然失败，任务状态会标记为 `failed`，并记录错误信息。管理员可以通过 API 查看失败原因并手动重试。

## 性能优化建议

1. **合理设置并发数**: 根据服务器资源调整 worker 并发数
2. **监控队列长度**: 定期检查队列统计信息，避免任务积压
3. **清理历史任务**: 定期清理已完成和失败的任务，释放 Redis 内存
4. **优化任务粒度**: 将大任务拆分为多个小任务，提高并发处理效率

## 最佳实践

1. **使用异步队列的场景**:
   - 任务执行时间超过 5 秒
   - 需要批量处理大量数据
   - 需要生成大文件（报告、导出文件）
   - 需要调用外部服务（邮件发送、文件上传）

2. **不适合使用异步队列的场景**:
   - 需要立即返回结果的操作
   - 简单的 CRUD 操作
   - 实时性要求高的操作

3. **任务设计原则**:
   - 任务应该是幂等的（可以安全地重试）
   - 任务应该有明确的超时时间
   - 任务应该记录详细的进度信息
   - 任务失败时应该记录清晰的错误信息

## 故障排查

### 任务一直处于 waiting 状态

**可能原因**:
- Worker 未启动
- Redis 连接失败
- Worker 进程崩溃

**解决方法**:
1. 检查 worker 是否正常运行
2. 检查 Redis 连接状态
3. 查看应用日志

### 任务频繁失败

**可能原因**:
- 数据库连接问题
- 外部服务不可用
- 任务逻辑错误

**解决方法**:
1. 查看任务错误信息
2. 检查相关服务状态
3. 修复代码逻辑后重试任务

### 队列积压

**可能原因**:
- Worker 并发数不足
- 任务处理速度慢
- 任务量突增

**解决方法**:
1. 增加 worker 并发数
2. 优化任务处理逻辑
3. 考虑水平扩展（增加 worker 实例）

## 相关文档

- [Bull 官方文档](https://github.com/OptimalBits/bull)
- [Redis 配置指南](./REDIS_CONFIGURATION.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
