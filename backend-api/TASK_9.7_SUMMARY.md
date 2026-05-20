# 任务 9.7 实现总结：异步任务队列服务

## 概述

本任务实现了基于 ARQ (Async Redis Queue) 的异步任务队列服务，提供任务的创建、查询、取消功能，以及任务状态监控。ARQ 是纯 Python 异步库，与 FastAPI 集成更好，性能优异。

## 实现内容

### 1. 队列配置 (`app/core/queue.py`)

**功能**:
- 配置 ARQ Redis 连接
- 提供连接池管理
- 定义队列配置和任务状态
- 提供任务入队、状态查询、取消等基础功能

**关键特性**:
- 使用 ARQ 异步 Redis 队列
- 支持任务重试（最大 3 次）
- 支持任务超时控制（默认 3600 秒）
- 连接池复用，提高性能

**队列类型**:
- `report-generation`: 报告生成队列
- `batch-operations`: 批量操作队列
- `data-export`: 数据导出队列
- `data-import`: 数据导入队列

### 2. 队列管理服务 (`app/services/queue_service.py`)

**功能**:
- 创建各类异步任务
- 查询任务状态
- 取消任务
- 获取队列统计信息

**支持的任务类型**:
1. **报告生成任务**: 根据样品和模板生成报告
2. **批量导入任务**: 批量导入检测结果或样品
3. **批量更新任务**: 批量更新样品或结果数据
4. **批量删除任务**: 批量删除样品或结果
5. **数据导出任务**: 导出各类数据为 Excel 或 CSV

### 3. 异步任务实现

#### 3.1 导入任务 (`app/tasks/import_tasks.py`)

**实现的任务**:
- `process_batch_import`: 批量导入检测结果或样品
- `process_batch_update`: 批量更新数据
- `process_batch_delete`: 批量删除数据

**特性**:
- 支持事务处理，确保数据一致性
- 详细的错误记录，记录每个失败项的索引和错误信息
- 进度跟踪和日志记录

#### 3.2 导出任务 (`app/tasks/export_tasks.py`)

**实现的任务**:
- `process_data_export`: 导出样品、结果、报告、统计数据
- `process_report_export`: 导出单个报告为 PDF 或 Word

**特性**:
- 支持多种导出格式（CSV, Excel, PDF, Word）
- 支持多种数据类型导出
- 异步处理，不阻塞主线程

#### 3.3 报告生成任务 (`app/tasks/report_tasks.py`)

**实现的任务**:
- `process_report_generation`: 生成单个报告
- `process_batch_report_generation`: 批量生成报告

**特性**:
- 根据模板和样品数据自动生成报告
- 支持批量生成，提高效率
- 详细的错误处理和日志记录

### 4. 队列路由 (`app/routers/queue.py`)

**实现的 API 端点**:

#### 查询端点
- `GET /api/v1/queue/tasks`: 查询任务列表
- `GET /api/v1/queue/tasks/{task_id}`: 查询任务状态
- `GET /api/v1/queue/stats/{queue_name}`: 获取队列统计信息

#### 操作端点
- `POST /api/v1/queue/tasks/{task_id}/cancel`: 取消任务

#### 任务创建端点
- `POST /api/v1/queue/tasks/report-generation`: 创建报告生成任务
- `POST /api/v1/queue/tasks/batch-import`: 创建批量导入任务
- `POST /api/v1/queue/tasks/batch-update`: 创建批量更新任务
- `POST /api/v1/queue/tasks/batch-delete`: 创建批量删除任务
- `POST /api/v1/queue/tasks/data-export`: 创建数据导出任务

### 5. Worker 配置 (`app/worker.py`)

**功能**:
- 配置 ARQ worker
- 注册所有任务函数
- 配置并发数和超时时间
- 提供启动和关闭钩子

**配置参数**:
- `max_jobs`: 10（最大并发任务数）
- `job_timeout`: 3600 秒（任务超时时间）
- `keep_result`: 3600 秒（保留结果时间）

### 6. 启动脚本

**Linux/Mac** (`scripts/start_worker.sh`):
```bash
#!/bin/bash
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
arq app.worker.WorkerSettings
```

**Windows** (`scripts/start_worker.ps1`):
```powershell
$env:PYTHONPATH = "$env:PYTHONPATH;$(Get-Location)"
arq app.worker.WorkerSettings
```

## 与 Node.js 后端的兼容性

### API 端点对比

| Node.js 端点 | FastAPI 端点 | 说明 |
|-------------|-------------|------|
| GET /api/v1/queue/tasks | GET /api/v1/queue/tasks | 查询任务列表 |
| GET /api/v1/queue/tasks/:id | GET /api/v1/queue/tasks/{task_id} | 查询任务状态 |
| POST /api/v1/queue/tasks/:id/cancel | POST /api/v1/queue/tasks/{task_id}/cancel | 取消任务 |

### 响应格式对比

**Node.js 响应**:
```json
{
  "id": "job-123",
  "type": "report",
  "status": "completed",
  "progress": 100,
  "data": {...},
  "result": {...}
}
```

**FastAPI 响应**:
```json
{
  "message": "操作成功",
  "data": {
    "id": "job-123",
    "status": "complete",
    "result": {...},
    "startTime": "2024-01-01T00:00:00",
    "finishTime": "2024-01-01T00:05:00",
    "success": true
  },
  "error": null
}
```

### 技术栈对比

| 组件 | Node.js | FastAPI | 说明 |
|------|---------|---------|------|
| 队列库 | Bull | ARQ | 都基于 Redis |
| 语言 | TypeScript | Python | 都支持类型提示 |
| 异步模型 | async/await | async/await | 语法相似 |
| 任务重试 | ✓ | ✓ | 都支持 |
| 任务超时 | ✓ | ✓ | 都支持 |
| 进度跟踪 | ✓ | ✓ | 都支持 |

## 使用示例

### 1. 启动 Worker

```bash
# Linux/Mac
chmod +x scripts/start_worker.sh
./scripts/start_worker.sh

# Windows
powershell -ExecutionPolicy Bypass -File scripts/start_worker.ps1
```

### 2. 创建报告生成任务

```python
# 通过 API
POST /api/v1/queue/tasks/report-generation
{
  "sampleId": "sample-123",
  "templateId": "template-456"
}

# 响应
{
  "message": "报告生成任务已创建",
  "data": {
    "taskId": "arq:job:abc123"
  }
}
```

### 3. 查询任务状态

```python
# 通过 API
GET /api/v1/queue/tasks/arq:job:abc123

# 响应
{
  "message": "操作成功",
  "data": {
    "id": "arq:job:abc123",
    "status": "complete",
    "result": {
      "report_id": "report-789",
      "success": true
    },
    "startTime": "2024-01-01T00:00:00",
    "finishTime": "2024-01-01T00:05:00",
    "success": true
  }
}
```

### 4. 取消任务

```python
# 通过 API
POST /api/v1/queue/tasks/arq:job:abc123/cancel
{
  "reason": "用户取消"
}

# 响应
{
  "message": "任务已取消",
  "data": {
    "task_id": "arq:job:abc123",
    "cancelled": true,
    "reason": "用户取消"
  }
}
```

## 依赖更新

在 `requirements.txt` 中添加了 ARQ 依赖：

```txt
# ARQ（异步任务队列）
arq==0.25.0
```

## 配置要求

### 环境变量

需要在 `.env` 文件中配置 Redis 连接：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # 可选
REDIS_DB=0
```

### Redis 要求

- Redis 版本: 5.0+
- 需要启用持久化（可选，用于任务恢复）

## 性能特性

1. **异步处理**: 所有任务异步执行，不阻塞主线程
2. **并发控制**: 支持配置最大并发任务数
3. **任务重试**: 失败任务自动重试，最多 3 次
4. **超时控制**: 防止任务无限期运行
5. **结果缓存**: 任务结果保留 1 小时，便于查询

## 监控和日志

### 日志记录

所有任务执行都有详细的日志记录：
- 任务开始和结束时间
- 任务参数和结果
- 错误信息和堆栈跟踪

### 监控指标

可以通过以下方式监控队列状态：
- 查询队列统计信息 API
- Redis 监控工具（如 RedisInsight）
- 日志分析

## 扩展性

### 添加新任务类型

1. 在 `app/tasks/` 目录创建新的任务文件
2. 定义任务函数（必须是 async 函数）
3. 在 `app/worker.py` 中注册任务函数
4. 在 `queue_service.py` 中添加创建任务的方法
5. 在 `queue.py` 路由中添加 API 端点

### 示例：添加邮件发送任务

```python
# app/tasks/email_tasks.py
async def send_email(ctx, to: str, subject: str, body: str):
    """发送邮件任务"""
    # 实现邮件发送逻辑
    pass

# app/worker.py
from app.tasks.email_tasks import send_email

class WorkerSettings:
    functions = [
        # ... 其他任务
        send_email,
    ]

# app/services/queue_service.py
async def create_email_task(self, to: str, subject: str, body: str):
    return await enqueue_task("send_email", to=to, subject=subject, body=body)
```

## 注意事项

1. **Worker 必须运行**: 任务只有在 worker 运行时才会被处理
2. **Redis 依赖**: 队列功能依赖 Redis，确保 Redis 服务可用
3. **任务幂等性**: 由于任务可能重试，确保任务实现是幂等的
4. **资源限制**: 注意控制并发任务数，避免资源耗尽
5. **错误处理**: 任务中的异常会导致任务失败并重试

## 测试建议

### 单元测试

```python
import pytest
from app.services.queue_service import queue_service

@pytest.mark.asyncio
async def test_create_report_generation_task():
    task_id = await queue_service.create_report_generation_task(
        sample_id="test-sample",
        template_id="test-template",
        user_id="test-user"
    )
    assert task_id is not None
```

### 集成测试

```python
@pytest.mark.asyncio
async def test_task_execution():
    # 创建任务
    task_id = await queue_service.create_report_generation_task(...)
    
    # 等待任务完成
    await asyncio.sleep(5)
    
    # 查询任务状态
    status = await queue_service.get_task_status(task_id)
    assert status["success"] is True
```

## 总结

本任务成功实现了完整的异步任务队列服务，包括：

✅ 队列配置和连接管理  
✅ 队列管理服务  
✅ 导入、导出、报告生成任务  
✅ 完整的 API 端点  
✅ Worker 配置和启动脚本  
✅ 与 Node.js 后端 API 兼容  

该实现提供了高性能、可扩展的异步任务处理能力，支持各种批量操作和耗时任务，显著提升了系统的响应速度和用户体验。
