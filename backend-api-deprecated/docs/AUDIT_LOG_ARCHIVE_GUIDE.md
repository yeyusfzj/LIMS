# 审计日志归档指南

## 概述

审计日志归档功能允许系统管理员将旧的审计日志从主表移动到归档表，以优化查询性能并管理数据库存储空间。归档的日志仍然可以查询，但不会影响日常审计日志查询的性能。

## 功能特性

### 1. 自动归档
- 支持按日期归档旧日志
- 归档操作是事务性的，确保数据一致性
- 归档后的日志保留所有原始信息

### 2. 归档日志查询
- 支持与主表相同的查询条件
- 支持分页查询
- 支持多条件过滤（用户、资源、操作类型、时间范围等）

### 3. 归档统计
- 查看活跃日志和归档日志的数量
- 查看最早的活跃日志和归档日志时间

## API 端点

### 1. 归档审计日志

**端点**: `POST /api/audit-logs/archive`

**权限**: 需要 `audit-log:manage` 权限

**请求体**:
```json
{
  "beforeDate": "2024-01-01T00:00:00.000Z"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "archivedCount": 1500,
    "beforeDate": "2024-01-01T00:00:00.000Z"
  }
}
```

**说明**: 归档指定日期之前的所有审计日志。

### 2. 查询归档日志

**端点**: `GET /api/audit-logs/archived`

**权限**: 需要 `audit-log:read` 权限

**查询参数**:
- `userId` (可选): 用户 ID
- `username` (可选): 用户名（支持模糊搜索）
- `action` (可选): 操作类型
- `resource` (可选): 资源类型
- `resourceId` (可选): 资源 ID
- `startDate` (可选): 开始日期
- `endDate` (可选): 结束日期
- `page` (可选): 页码，默认 1
- `pageSize` (可选): 每页数量，默认 20

**响应**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "userId": "user-id",
        "username": "username",
        "action": "CREATE",
        "resource": "SAMPLE",
        "resourceId": "sample-id",
        "changes": { "name": "Sample Name" },
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0...",
        "timestamp": "2024-01-01T10:00:00.000Z"
      }
    ],
    "total": 1500,
    "page": 1,
    "pageSize": 20,
    "totalPages": 75
  }
}
```

### 3. 获取归档统计

**端点**: `GET /api/audit-logs/archive-statistics`

**权限**: 需要 `audit-log:read` 权限

**响应**:
```json
{
  "success": true,
  "data": {
    "activeCount": 5000,
    "archivedCount": 15000,
    "oldestActive": "2024-06-01T00:00:00.000Z",
    "oldestArchived": "2023-01-01T00:00:00.000Z"
  }
}
```

## 定时任务

### 使用 Node.js 脚本

系统提供了一个独立的归档脚本，可以通过 cron 或其他调度工具定期执行：

```bash
# 归档 90 天前的日志（默认）
node dist/jobs/archiveAuditLogs.js

# 通过环境变量配置归档天数
AUDIT_LOG_ARCHIVE_DAYS=180 node dist/jobs/archiveAuditLogs.js
```

### 使用 Cron 定时任务

在 Linux 系统上，可以使用 cron 定期执行归档任务：

```bash
# 编辑 crontab
crontab -e

# 添加定时任务（每天凌晨 2 点执行）
0 2 * * * cd /path/to/backend-api && node dist/jobs/archiveAuditLogs.js >> /var/log/audit-archive.log 2>&1
```

### 使用 Kubernetes CronJob

在 Kubernetes 环境中，可以使用 CronJob 资源：

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: audit-log-archive
spec:
  schedule: "0 2 * * *"  # 每天凌晨 2 点
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: archive
            image: lims-api:latest
            command:
            - node
            - dist/jobs/archiveAuditLogs.js
            env:
            - name: AUDIT_LOG_ARCHIVE_DAYS
              value: "90"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: lims-secrets
                  key: database-url
          restartPolicy: OnFailure
```

## 环境变量配置

在 `.env` 文件中配置归档参数：

```env
# 审计日志归档天数（默认 90 天）
AUDIT_LOG_ARCHIVE_DAYS=90
```

## 最佳实践

### 1. 归档策略

**推荐的归档周期**:
- 开发环境: 30 天
- 测试环境: 60 天
- 生产环境: 90-180 天

**考虑因素**:
- 合规要求（某些行业可能要求保留更长时间）
- 数据库存储容量
- 查询性能需求
- 审计追溯需求

### 2. 归档时机

**推荐在以下时间执行归档**:
- 系统负载较低的时段（如凌晨 2-4 点）
- 避免在业务高峰期执行
- 定期执行（如每天或每周）

### 3. 监控和告警

**建议监控以下指标**:
- 活跃日志表的大小
- 归档日志表的大小
- 归档任务执行时间
- 归档任务失败次数

**设置告警**:
- 活跃日志表超过阈值（如 100 万条）
- 归档任务执行失败
- 归档任务执行时间过长

### 4. 数据备份

**在归档前**:
- 确保数据库有完整备份
- 测试归档功能在测试环境中正常工作
- 验证归档后的数据可以正常查询

### 5. 性能优化

**优化建议**:
- 分批归档大量数据（如每次归档不超过 10 万条）
- 在归档表上创建适当的索引
- 定期清理非常旧的归档数据（如超过 5 年）

## 故障排查

### 问题 1: 归档任务执行缓慢

**可能原因**:
- 需要归档的数据量太大
- 数据库负载过高
- 缺少必要的索引

**解决方案**:
- 分批归档数据
- 在低峰期执行归档
- 检查并优化数据库索引

### 问题 2: 归档后查询失败

**可能原因**:
- 归档表缺少索引
- 查询条件不正确

**解决方案**:
- 确保归档表有与主表相同的索引
- 检查查询参数是否正确

### 问题 3: 归档任务失败

**可能原因**:
- 数据库连接失败
- 磁盘空间不足
- 权限不足

**解决方案**:
- 检查数据库连接配置
- 检查磁盘空间
- 确保数据库用户有足够的权限

## 数据恢复

如果需要将归档的日志恢复到主表：

```typescript
// 示例代码（需要根据实际情况调整）
async function restoreArchivedLogs(startDate: Date, endDate: Date) {
  const archivedLogs = await prisma.archivedAuditLog.findMany({
    where: {
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    }
  })

  await prisma.$transaction(async (tx) => {
    // 恢复到主表
    await tx.auditLog.createMany({
      data: archivedLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        username: log.username,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        changes: log.changes,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        timestamp: log.timestamp
      }))
    })

    // 从归档表删除
    await tx.archivedAuditLog.deleteMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      }
    })
  })
}
```

## 安全考虑

1. **权限控制**: 只有具有 `audit-log:manage` 权限的用户才能执行归档操作
2. **审计追踪**: 归档操作本身也会被记录到审计日志
3. **数据完整性**: 归档操作使用事务确保数据一致性
4. **不可篡改**: 归档的日志与主表日志一样不可修改或删除

## 总结

审计日志归档功能帮助系统管理员有效管理审计数据，在保持合规性的同时优化系统性能。通过合理配置归档策略和定期执行归档任务，可以确保系统长期稳定运行。
