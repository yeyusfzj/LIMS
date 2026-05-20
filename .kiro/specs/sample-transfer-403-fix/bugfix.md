# 样品流转功能 403 Forbidden 错误修复

## 简介

在样品流转管理页面（SampleTransferManagement.vue）中，当用户尝试访问样品流转相关的 API 时，系统返回 403 Forbidden 错误。该问题影响了样品流转记录的查询、确认和取消等核心功能，导致用户无法正常使用样品流转管理功能。

错误信息：
```
Failed to load resource: the server responded with a status of 403 (Forbidden)
响应拦截器错误: AxiosError: Request failed with status code 403
```

## Bug 分析

### 当前行为（缺陷）

1.1 WHEN 用户访问 `GET /api/samples/transfers` 端点查询流转记录列表 THEN 系统返回 403 Forbidden 错误

1.2 WHEN 用户访问 `GET /api/samples/transfers/:transferId` 端点查询流转记录详情 THEN 系统返回 403 Forbidden 错误

1.3 WHEN 用户访问 `POST /api/samples/transfers/:transferId/confirm` 端点确认流转 THEN 系统返回 403 Forbidden 错误

1.4 WHEN 用户访问 `PUT /api/samples/transfers/:transferId/cancel` 端点取消流转 THEN 系统返回 403 Forbidden 错误

### 期望行为（正确）

2.1 WHEN 具有 `sample:read` 权限的用户访问 `GET /api/samples/transfers` 端点 THEN 系统应该返回流转记录列表（200 OK）

2.2 WHEN 具有 `sample:read` 权限的用户访问 `GET /api/samples/transfers/:transferId` 端点 THEN 系统应该返回指定的流转记录详情（200 OK）

2.3 WHEN 具有 `sample:update` 权限的用户访问 `POST /api/samples/transfers/:transferId/confirm` 端点 THEN 系统应该成功确认流转并返回更新后的流转记录（200 OK）

2.4 WHEN 具有 `sample:update` 权限的用户访问 `PUT /api/samples/transfers/:transferId/cancel` 端点 THEN 系统应该成功取消流转并返回更新后的流转记录（200 OK）

### 未改变行为（回归预防）

3.1 WHEN 用户访问 `POST /api/samples/:id/transfer` 端点创建样品流转 THEN 系统应该继续正常工作，创建流转记录并返回 201 Created

3.2 WHEN 用户访问 `GET /api/samples/:id` 端点查询样品详情 THEN 系统应该继续正常工作，返回样品信息（200 OK）

3.3 WHEN 用户访问 `GET /api/samples/:id/custody` 端点查询样品监管链 THEN 系统应该继续正常工作，返回完整的流转历史记录（200 OK）

3.4 WHEN 用户访问其他样品相关的 API 端点（如创建、更新、查询列表等）THEN 系统应该继续正常工作，不受此修复影响

3.5 WHEN 用户没有相应权限访问任何样品流转 API THEN 系统应该继续返回 403 Forbidden 错误（权限验证机制保持不变）
