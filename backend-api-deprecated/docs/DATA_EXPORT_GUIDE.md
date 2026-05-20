# 数据导出功能使用指南

## 概述

数据导出功能允许用户将统计数据导出为 CSV、Excel 或 JSON 格式。系统使用异步任务队列处理导出请求，避免阻塞 API 响应，并提供文件过期机制确保存储空间的有效利用。

## 功能特性

### 支持的导出格式

- **CSV**: 逗号分隔值文件，适合在 Excel 或其他数据分析工具中打开
- **Excel**: XLSX 格式，支持更丰富的格式化选项
- **JSON**: 结构化数据格式，适合程序化处理

### 核心特性

1. **异步处理**: 导出任务在后台异步执行，不阻塞 API 响应
2. **任务队列**: 使用任务队列管理导出请求，支持并发处理
3. **文件过期**: 导出文件在 24 小时后自动过期删除
4. **安全控制**: 防止路径遍历攻击，确保文件访问安全
5. **多维度支持**: 支持按时间、样品类型、状态等多个维度导出
6. **过滤条件**: 支持按样品类型、状态、客户等条件过滤数据

## API 端点

### 1. 创建导出任务

**端点**: `POST /api/statistics/export`

**权限**: 需要 `statistics:export` 权限

**查询参数**:

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| dimensions | string | 是 | 统计维度（逗号分隔），如 "time,sampleType" |
| format | string | 是 | 导出格式：csv, excel, json |
| timeGranularity | string | 条件 | 时间粒度（当包含时间维度时必需）：day, week, month, quarter, year |
| startDate | string | 否 | 开始日期（ISO 8601 格式） |
| endDate | string | 否 | 结束日期（ISO 8601 格式） |
| filename | string | 否 | 自定义文件名 |
| sampleType | string | 否 | 样品类型过滤（逗号分隔） |
| status | string | 否 | 状态过滤（逗号分隔） |
| clientName | string | 否 | 客户名称过滤（逗号分隔） |
| department | string | 否 | 部门过滤（逗号分隔） |
| useCache | boolean | 否 | 是否使用缓存（默认 true） |

**响应示例**:

```json
{
  "taskId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending"
}
```

**示例请求**:

```bash
# 导出 CSV 格式的样品类型统计
curl -X POST "http://localhost:3000/api/statistics/export?dimensions=sampleType&format=csv" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 导出 Excel 格式的时间序列统计
curl -X POST "http://localhost:3000/api/statistics/export?dimensions=time,sampleType&timeGranularity=day&format=excel&startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 导出带过滤条件的 JSON 数据
curl -X POST "http://localhost:3000/api/statistics/export?dimensions=status&format=json&status=REGISTERED,IN_TESTING" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 查询导出任务状态

**端点**: `GET /api/statistics/export/tasks/:taskId`

**权限**: 需要 `statistics:read` 权限

**响应示例**:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "query": {
    "dimensions": ["sampleType"],
    "format": "csv"
  },
  "status": "completed",
  "downloadUrl": "/api/statistics/export/download/export_2024-03-10T10-30-00-000Z.csv",
  "expiresAt": "2024-03-11T10:30:00.000Z",
  "createdAt": "2024-03-10T10:30:00.000Z",
  "completedAt": "2024-03-10T10:30:05.000Z",
  "userId": "user-id"
}
```

**任务状态说明**:

- `pending`: 任务已创建，等待处理
- `processing`: 任务正在处理中
- `completed`: 任务已完成，文件可供下载
- `failed`: 任务失败，查看 error 字段了解原因

**示例请求**:

```bash
curl -X GET "http://localhost:3000/api/statistics/export/tasks/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 下载导出文件

**端点**: `GET /api/statistics/export/download/:filename`

**权限**: 需要 `statistics:read` 权限

**响应**: 文件下载流

**示例请求**:

```bash
# 下载导出文件
curl -X GET "http://localhost:3000/api/statistics/export/download/export_2024-03-10T10-30-00-000Z.csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o export.csv
```

## 使用流程

### 完整导出流程

```javascript
// 1. 创建导出任务
const createExportTask = async () => {
  const response = await fetch('/api/statistics/export?dimensions=sampleType&format=csv', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  const { taskId } = await response.json()
  return taskId
}

// 2. 轮询任务状态
const pollTaskStatus = async (taskId) => {
  const maxAttempts = 30
  const interval = 2000 // 2 秒
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`/api/statistics/export/tasks/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    const task = await response.json()
    
    if (task.status === 'completed') {
      return task.downloadUrl
    } else if (task.status === 'failed') {
      throw new Error(task.error || '导出失败')
    }
    
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  
  throw new Error('任务超时')
}

// 3. 下载文件
const downloadFile = (downloadUrl) => {
  window.location.href = downloadUrl
}

// 完整流程
const exportData = async () => {
  try {
    const taskId = await createExportTask()
    console.log('导出任务已创建:', taskId)
    
    const downloadUrl = await pollTaskStatus(taskId)
    console.log('文件已准备好:', downloadUrl)
    
    downloadFile(downloadUrl)
  } catch (error) {
    console.error('导出失败:', error)
  }
}
```

## 统计维度说明

### 可用维度

| 维度 | 值 | 说明 |
|------|-----|------|
| 时间 | time | 按时间统计，需要指定 timeGranularity |
| 样品类型 | sampleType | 按样品类型统计 |
| 检测项目 | testItem | 按检测项目统计 |
| 状态 | status | 按样品状态统计 |
| 部门 | department | 按部门统计 |
| 客户 | client | 按客户统计 |

### 时间粒度

当使用时间维度时，必须指定时间粒度：

- `day`: 按天统计
- `week`: 按周统计
- `month`: 按月统计
- `quarter`: 按季度统计
- `year`: 按年统计

### 多维度组合

可以组合多个维度进行统计，例如：

```
dimensions=time,sampleType&timeGranularity=month
```

这将按月份和样品类型进行二维统计。

## 导出文件格式

### CSV 格式

CSV 文件包含表头和数据行，使用逗号分隔：

```csv
sampleType,count,completedCount,avgDuration,qualifiedRate
水质样品,150,145,3.5,96.67
土壤样品,80,75,4.2,93.75
```

**特殊字符处理**:
- 包含逗号、引号或换行符的值会用双引号包裹
- 引号会被转义为双引号

### Excel 格式

Excel 文件（.xlsx）包含一个名为"统计数据"的工作表，具有以下特性：

- 自动设置列宽
- 保留数据类型（数字、文本）
- 支持在 Excel 中直接打开和编辑

### JSON 格式

JSON 文件包含结构化的数据数组：

```json
[
  {
    "dimensions": {
      "sampleType": "水质样品"
    },
    "metrics": {
      "count": 150,
      "completedCount": 145,
      "avgDuration": 3.5,
      "qualifiedRate": 96.67
    }
  },
  {
    "dimensions": {
      "sampleType": "土壤样品"
    },
    "metrics": {
      "count": 80,
      "completedCount": 75,
      "avgDuration": 4.2,
      "qualifiedRate": 93.75
    }
  }
]
```

## 文件管理

### 文件过期机制

- 导出文件在创建后 24 小时自动过期
- 过期文件会被自动清理，释放存储空间
- 建议在文件过期前及时下载

### 存储位置

导出文件存储在服务器的 `exports` 目录中，该目录在服务启动时自动创建。

### 清理策略

系统会定期清理过期文件：

- 文件创建时间超过 24 小时的文件会被删除
- 清理操作可以手动触发或通过定时任务自动执行

## 错误处理

### 常见错误

| 错误码 | 说明 | 解决方法 |
|--------|------|----------|
| VALIDATION_ERROR | 参数验证失败 | 检查必需参数是否提供，格式是否正确 |
| UNAUTHORIZED | 未授权访问 | 确保提供有效的认证令牌 |
| FORBIDDEN | 无权限访问 | 确保用户具有 statistics:export 权限 |
| NOT_FOUND | 任务或文件不存在 | 检查任务 ID 或文件名是否正确 |
| INTERNAL_ERROR | 服务器内部错误 | 查看服务器日志了解详细信息 |

### 错误响应示例

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "必须指定至少一个统计维度",
    "timestamp": "2024-03-10T10:30:00.000Z",
    "path": "/api/statistics/export",
    "requestId": "req-123456"
  }
}
```

## 性能优化建议

### 1. 使用缓存

默认情况下，统计数据会被缓存 10 分钟。如果不需要实时数据，建议使用缓存：

```
useCache=true  # 默认值
```

### 2. 限制时间范围

导出大量数据时，建议限制时间范围：

```
startDate=2024-01-01&endDate=2024-01-31
```

### 3. 使用过滤条件

通过过滤条件减少数据量：

```
status=COMPLETED&sampleType=水质样品
```

### 4. 选择合适的格式

- CSV: 最快，文件最小
- Excel: 中等速度，支持格式化
- JSON: 最慢，但便于程序处理

## 安全注意事项

### 1. 权限控制

- 导出功能需要 `statistics:export` 权限
- 下载文件需要 `statistics:read` 权限
- 用户只能访问自己创建的导出任务

### 2. 文件访问安全

- 系统会验证文件路径，防止路径遍历攻击
- 文件只能从指定的导出目录访问
- 文件名会被严格验证

### 3. 数据隔离

- 用户只能导出有权限访问的数据
- 系统会根据用户权限自动过滤数据

## 监控和日志

### 日志记录

系统会记录以下导出相关的日志：

- 导出任务创建
- 任务处理开始和完成
- 文件生成成功或失败
- 文件下载请求
- 过期文件清理

### 监控指标

建议监控以下指标：

- 导出任务创建速率
- 任务处理时间
- 任务成功率
- 文件存储空间使用
- 下载请求频率

## 故障排查

### 任务一直处于 pending 状态

**可能原因**:
- 任务队列处理器未启动
- 系统负载过高

**解决方法**:
- 检查服务器日志
- 重启服务

### 任务失败

**可能原因**:
- 数据量过大
- 数据库连接失败
- 磁盘空间不足

**解决方法**:
- 查看任务的 error 字段
- 检查服务器日志
- 缩小查询范围

### 文件下载失败

**可能原因**:
- 文件已过期
- 文件被手动删除
- 权限不足

**解决方法**:
- 检查文件是否存在
- 重新创建导出任务
- 验证用户权限

## 最佳实践

1. **及时下载**: 在文件过期前及时下载，避免重复导出
2. **合理分页**: 对于大量数据，考虑分批导出
3. **使用过滤**: 通过过滤条件减少不必要的数据
4. **选择格式**: 根据使用场景选择合适的导出格式
5. **错误处理**: 实现完善的错误处理和重试机制
6. **用户反馈**: 在前端显示任务进度和状态

## 示例代码

### React 组件示例

```jsx
import React, { useState } from 'react'

const DataExport = () => {
  const [taskId, setTaskId] = useState(null)
  const [status, setStatus] = useState('idle')
  const [downloadUrl, setDownloadUrl] = useState(null)
  const [error, setError] = useState(null)

  const handleExport = async () => {
    try {
      setStatus('creating')
      setError(null)

      // 创建导出任务
      const response = await fetch('/api/statistics/export?dimensions=sampleType&format=csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        throw new Error('创建导出任务失败')
      }

      const { taskId } = await response.json()
      setTaskId(taskId)
      setStatus('processing')

      // 轮询任务状态
      pollTaskStatus(taskId)
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const pollTaskStatus = async (taskId) => {
    const maxAttempts = 30
    const interval = 2000

    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(`/api/statistics/export/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        const task = await response.json()

        if (task.status === 'completed') {
          setDownloadUrl(task.downloadUrl)
          setStatus('completed')
          return
        } else if (task.status === 'failed') {
          throw new Error(task.error || '导出失败')
        }

        await new Promise(resolve => setTimeout(resolve, interval))
      } catch (err) {
        setError(err.message)
        setStatus('error')
        return
      }
    }

    setError('任务超时')
    setStatus('error')
  }

  return (
    <div>
      <h2>数据导出</h2>
      
      <button onClick={handleExport} disabled={status === 'processing'}>
        {status === 'processing' ? '导出中...' : '导出数据'}
      </button>

      {status === 'processing' && (
        <p>正在处理导出任务，请稍候...</p>
      )}

      {status === 'completed' && downloadUrl && (
        <div>
          <p>导出完成！</p>
          <a href={downloadUrl} download>下载文件</a>
        </div>
      )}

      {error && (
        <p style={{ color: 'red' }}>错误: {error}</p>
      )}
    </div>
  )
}

export default DataExport
```

## 总结

数据导出功能提供了灵活、安全、高效的数据导出能力，支持多种格式和维度组合。通过异步任务队列和文件过期机制，确保了系统的稳定性和资源的有效利用。在使用时，请注意权限控制、错误处理和性能优化，以获得最佳的使用体验。
