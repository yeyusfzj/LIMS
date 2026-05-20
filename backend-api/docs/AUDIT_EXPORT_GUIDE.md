# 审核数据导出功能使用指南

## 概述

审核数据导出功能允许用户将审核任务数据导出为 Excel 格式，方便数据分析和报表生成。

## 功能特性

### 1. 审核任务导出

- **端点**: `GET /api/v1/audits/export`
- **功能**: 导出审核任务列表为 Excel 格式
- **支持筛选条件**:
  - `sampleId`: 样品 ID
  - `auditorId`: 审核人员 ID
  - `status`: 审核状态（PENDING, IN_PROGRESS, APPROVED, REJECTED）
  - `level`: 审核级别（1, 2, 3）

### 2. 导出数据字段

导出的 Excel 文件包含以下字段：

| 字段名 | 说明 | 示例 |
|--------|------|------|
| 任务ID | 审核任务的唯一标识 | task-123 |
| 样品ID | 关联样品的唯一标识 | sample-456 |
| 样品编号 | 样品的编号 | S2024010001 |
| 样品名称 | 样品的名称 | 水质样品 |
| 样品类型 | 样品的类型 | 水质 |
| 审核级别 | 审核的级别 | 1 |
| 审核人员ID | 审核人员的唯一标识 | auditor-789 |
| 状态 | 审核任务的状态 | APPROVED |
| 决策 | 审核决策 | APPROVE |
| 审核意见 | 审核人员的意见 | 审核通过 |
| 提交时间 | 任务提交时间 | 2024-01-01 10:00:00 |
| 完成时间 | 任务完成时间 | 2024-01-01 12:00:00 |

## API 使用示例

### 1. 导出所有审核任务

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks.xlsx
```

### 2. 导出指定样品的审核任务

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export?sampleId=sample-123" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks_sample_123.xlsx
```

### 3. 导出指定审核人员的任务

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export?auditorId=auditor-456" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks_auditor_456.xlsx
```

### 4. 导出指定状态的任务

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export?status=PENDING" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks_pending.xlsx
```

### 5. 导出指定级别的任务

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export?level=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks_level_1.xlsx
```

### 6. 组合多个筛选条件

```bash
curl -X GET "http://localhost:8000/api/v1/audits/export?status=APPROVED&level=2" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -o audit_tasks_approved_level_2.xlsx
```

## 前端集成示例

### JavaScript/TypeScript

```typescript
import axios from 'axios';

/**
 * 导出审核任务
 */
async function exportAuditTasks(filters: {
  sampleId?: string;
  auditorId?: string;
  status?: string;
  level?: number;
}) {
  try {
    const response = await axios.get('/api/v1/audits/export', {
      params: filters,
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    });

    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit_tasks_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    console.log('审核任务导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    throw error;
  }
}

// 使用示例
exportAuditTasks({ status: 'PENDING' });
```

### Vue 3 组合式 API

```vue
<template>
  <div>
    <button @click="handleExport" :disabled="exporting">
      {{ exporting ? '导出中...' : '导出审核任务' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { auditService } from '@/services/auditService';

const exporting = ref(false);

const handleExport = async () => {
  try {
    exporting.value = true;
    
    await auditService.exportAuditTasks({
      status: 'PENDING',
      level: 1
    });
    
    // 显示成功提示
    ElMessage.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    ElMessage.error('导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
};
</script>
```

## 导出文件格式

### Excel 文件结构

- **文件格式**: `.xlsx` (Excel 2007+)
- **工作表名称**: "审核任务"
- **表头样式**:
  - 字体: 粗体，11号
  - 背景色: 浅蓝色 (#CCE5FF)
  - 对齐方式: 居中
- **列宽**: 自动调整，确保内容完整显示

### 示例输出

```
| 任务ID    | 样品ID    | 样品编号      | 样品名称   | 样品类型 | 审核级别 | 审核人员ID | 状态     | 决策    | 审核意见   | 提交时间            | 完成时间            |
|-----------|-----------|---------------|------------|----------|----------|------------|----------|---------|------------|---------------------|---------------------|
| task-001  | sample-01 | S2024010001   | 水质样品1  | 水质     | 1        | auditor-01 | APPROVED | APPROVE | 审核通过   | 2024-01-01 10:00:00 | 2024-01-01 12:00:00 |
| task-002  | sample-02 | S2024010002   | 土壤样品1  | 土壤     | 2        | auditor-02 | PENDING  |         |            | 2024-01-01 11:00:00 |                     |
```

## 性能考虑

### 数据量限制

- **建议最大导出数量**: 10,000 条记录
- **超过限制时**: 建议使用更精确的筛选条件分批导出

### 优化建议

1. **使用筛选条件**: 尽量使用筛选条件减少导出数据量
2. **分批导出**: 对于大量数据，按时间范围或其他条件分批导出
3. **异步处理**: 对于超大数据量，考虑使用异步任务队列

## 错误处理

### 常见错误

| 错误码 | 说明 | 解决方案 |
|--------|------|----------|
| 401 | 未授权 | 检查访问令牌是否有效 |
| 403 | 禁止访问 | 检查用户权限 |
| 500 | 服务器错误 | 查看服务器日志，联系管理员 |

### 错误响应示例

```json
{
  "error": {
    "code": "EXPORT_ERROR",
    "message": "导出审核数据失败",
    "details": "数据库连接超时"
  }
}
```

## 安全性

### 权限控制

- 需要有效的 JWT 访问令牌
- 需要具有审核查看权限
- 只能导出用户有权限查看的数据

### 数据保护

- 导出文件存储在服务器临时目录
- 文件在下载后自动清理
- 敏感信息已脱敏处理

## 与 Node.js 后端的兼容性

FastAPI 后端的导出功能与 Node.js 后端完全兼容：

- **相同的 API 端点**: `GET /api/v1/audits/export`
- **相同的查询参数**: sampleId, auditorId, status, level
- **相同的响应格式**: Excel (.xlsx) 文件
- **相同的数据字段**: 保持一致的列名和数据格式

## 扩展功能

### 未来计划

1. **支持更多导出格式**: CSV, PDF
2. **自定义导出字段**: 允许用户选择要导出的字段
3. **导出模板**: 支持自定义导出模板
4. **定时导出**: 支持定时自动导出
5. **邮件发送**: 导出完成后自动发送邮件

## 技术实现

### 核心组件

1. **ExportService**: 导出服务，负责生成 Excel 文件
2. **AuditService.export_audit_tasks**: 审核服务的导出方法
3. **GET /api/v1/audits/export**: 导出 API 端点

### 依赖库

- **openpyxl**: Python Excel 文件操作库
- **FastAPI**: Web 框架
- **SQLAlchemy**: ORM 框架

### 文件存储

- **导出目录**: `exports/`
- **文件命名**: `audit_tasks_{timestamp}.xlsx`
- **自动清理**: 定期清理过期文件

## 故障排查

### 问题：导出文件为空

**原因**: 查询条件过于严格，没有匹配的数据

**解决方案**: 
- 检查筛选条件是否正确
- 尝试放宽筛选条件
- 检查数据库中是否有符合条件的数据

### 问题：导出速度慢

**原因**: 数据量过大

**解决方案**:
- 使用更精确的筛选条件
- 分批导出数据
- 考虑使用异步导出

### 问题：文件下载失败

**原因**: 网络问题或服务器错误

**解决方案**:
- 检查网络连接
- 重试下载
- 查看服务器日志

## 联系支持

如有问题或建议，请联系：
- 技术支持邮箱: support@example.com
- 开发团队: dev@example.com

