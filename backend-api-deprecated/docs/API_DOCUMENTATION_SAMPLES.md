# 样品管理 API 文档注释

本文档包含样品管理相关 API 端点的 Swagger 注释示例。

## 主要端点

### 1. 创建样品 (POST /api/samples)
- 创建新的样品记录
- 自动生成唯一条码和样品编号
- 需要 sample:create 权限

### 2. 查询样品列表 (GET /api/samples)
- 支持分页查询
- 支持多条件过滤（条码、客户名称、状态等）
- 支持字段选择和排序
- 需要 sample:read 权限

### 3. 获取样品详情 (GET /api/samples/:id)
- 获取指定样品的完整信息
- 支持字段选择
- 需要 sample:read 权限

### 4. 更新样品 (PUT /api/samples/:id)
- 更新样品信息
- 记录修改历史
- 需要 sample:update 权限

### 5. 样品流转 (POST /api/samples/:id/transfer)
- 创建样品流转记录
- 更新样品当前位置
- 支持双方确认机制
- 需要 sample:update 权限

### 6. 获取监管链 (GET /api/samples/:id/custody)
- 获取样品完整的流转历史
- 按时间顺序排列
- 需要 sample:read 权限

### 7. 分样操作 (POST /api/samples/:id/split)
- 从母样品创建子样品
- 建立母子关联关系
- 需要 sample:create 权限

### 8. 合样操作 (POST /api/samples/merge)
- 将多个样品合并为一个
- 记录来源样品信息
- 需要 sample:create 权限

### 9. 样品放行 (POST /api/samples/:id/release)
- 验证放行条件
- 更新样品状态为已放行
- 需要 sample:release 权限

## 数据模型

### Sample（样品）
- 包含样品的所有基本信息
- 状态流转：REGISTERED → IN_TESTING → TESTING_COMPLETE → IN_AUDIT → AUDIT_COMPLETE → RELEASED → ARCHIVED

### Transfer（流转记录）
- 记录样品流转的完整信息
- 支持双方确认机制
- 状态：PENDING → IN_TRANSIT → RECEIVED / REJECTED

## 错误码说明

- `VALIDATION_ERROR`: 请求参数验证失败
- `UNAUTHORIZED`: 未认证或令牌无效
- `PERMISSION_DENIED`: 无权限执行操作
- `NOT_FOUND`: 样品不存在
- `CONFLICT`: 并发冲突或业务规则冲突
- `INTERNAL_ERROR`: 服务器内部错误

## 注意事项

1. 所有样品相关接口都需要认证（Bearer Token）
2. 不同操作需要不同的权限
3. 条码和样品编号由系统自动生成，确保唯一性
4. 样品流转操作在事务中执行，确保数据一致性
5. 分样和合样操作会建立样品间的关联关系
