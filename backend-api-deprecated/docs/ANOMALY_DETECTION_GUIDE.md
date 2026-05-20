# 异常检测和复测管理指南

## 概述

异常检测和复测管理模块提供了自动检测检测结果异常并管理复测流程的功能。系统支持多种检测规则类型，包括范围检测、偏差检测和趋势检测。

## 功能特性

### 1. 异常检测规则配置

系统支持以下类型的异常检测规则：

#### 范围检测（RANGE）
检测结果值是否在指定的最小值和最大值范围内。

**配置示例：**
```json
{
  "name": "pH值范围检测",
  "testMethod": "pH测定",
  "parameter": "pH值",
  "ruleType": "RANGE",
  "config": {
    "min": 6.5,
    "max": 8.5,
    "unit": "pH"
  }
}
```

#### 偏差检测（DEVIATION）
检测结果值与参考值的偏差是否超过允许范围。支持绝对偏差和百分比偏差。

**绝对偏差示例：**
```json
{
  "name": "温度偏差检测",
  "testMethod": "温度测定",
  "parameter": "温度",
  "ruleType": "DEVIATION",
  "config": {
    "referenceValue": 25,
    "maxDeviation": 2,
    "deviationType": "absolute"
  }
}
```

**百分比偏差示例：**
```json
{
  "name": "浓度偏差检测",
  "testMethod": "浓度测定",
  "parameter": "浓度",
  "ruleType": "DEVIATION",
  "config": {
    "referenceValue": 100,
    "maxDeviation": 10,
    "deviationType": "percentage"
  }
}
```

#### 趋势检测（TREND）
检测结果值与历史平均值的变化是否超过允许范围。

**配置示例：**
```json
{
  "name": "pH趋势检测",
  "testMethod": "pH测定",
  "parameter": "pH值",
  "ruleType": "TREND",
  "config": {
    "windowSize": 10,
    "maxChange": 0.5,
    "changeType": "absolute"
  }
}
```

### 2. 自动异常检测

当创建新的检测结果时，系统会自动执行异常检测：

1. 查找适用于该检测方法和参数的所有激活规则
2. 按优先级从高到低检查每个规则
3. 如果检测到异常，自动标记结果并记录异常原因
4. 记录检测日志供审计追踪

### 3. 手动异常标记

除了自动检测，用户也可以手动标记结果为异常：

**API 端点：**
```
POST /api/results/:id/mark-abnormal
```

**请求体：**
```json
{
  "reason": "人工判断为异常"
}
```

### 4. 复测申请

当发现异常结果时，可以申请复测：

**API 端点：**
```
POST /api/results/:id/retest
```

**请求体：**
```json
{
  "reason": "检测结果异常，需要复测",
  "priority": "HIGH"
}
```

**复测流程：**
1. 系统创建新的检测任务
2. 任务关联到原样品
3. 原结果记录复测原因
4. 新任务进入待分配状态
5. 完成复测后，新结果关联到原结果

## API 端点

### 异常检测规则管理

#### 创建规则
```
POST /api/anomaly-rules
```

#### 查询规则列表
```
GET /api/anomaly-rules
```

#### 获取规则详情
```
GET /api/anomaly-rules/:id
```

#### 更新规则
```
PUT /api/anomaly-rules/:id
```

#### 删除规则
```
DELETE /api/anomaly-rules/:id
```

### 结果异常处理

#### 手动标记异常
```
POST /api/results/:id/mark-abnormal
```

#### 申请复测
```
POST /api/results/:id/retest
```

#### 手动检测异常
```
POST /api/results/:id/detect-anomaly
```

## 使用示例

### 1. 创建范围检测规则

```bash
curl -X POST http://localhost:3000/api/anomaly-rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "pH值范围检测",
    "description": "检测pH值是否在6.5-8.5范围内",
    "testMethod": "pH测定",
    "parameter": "pH值",
    "ruleType": "RANGE",
    "config": {
      "min": 6.5,
      "max": 8.5
    },
    "isActive": true,
    "priority": 10
  }'
```

### 2. 创建检测结果（自动检测异常）

```bash
curl -X POST http://localhost:3000/api/results \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sampleId": "sample123",
    "testItemId": "item456",
    "parameter": "pH值",
    "value": 9.5,
    "unit": "pH",
    "method": "pH测定"
  }'
```

如果值超出范围，系统会自动标记为异常。

### 3. 申请复测

```bash
curl -X POST http://localhost:3000/api/results/result789/retest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "检测结果异常，需要复测确认",
    "priority": "HIGH"
  }'
```

## 规则优先级

当多个规则适用于同一个检测结果时，系统按以下方式处理：

1. 按优先级（priority）从高到低排序规则
2. 依次检查每个规则
3. 遇到第一个检测为异常的规则时，立即返回
4. 记录触发的规则信息

**建议：**
- 严格规则设置高优先级（如 priority: 10）
- 宽松规则设置低优先级（如 priority: 1）
- 通用规则设置中等优先级（如 priority: 5）

## 数据模型

### 异常检测规则
```typescript
interface AnomalyDetectionRule {
  id: string
  name: string
  description?: string
  testMethod: string
  parameter: string
  ruleType: 'RANGE' | 'DEVIATION' | 'TREND' | 'CUSTOM'
  config: RuleConfig
  isActive: boolean
  priority: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

### 检测结果（包含异常信息）
```typescript
interface Result {
  id: string
  sampleId: string
  testItemId: string
  parameter: string
  value?: number
  method: string
  
  // 异常检测字段
  isAbnormal: boolean
  abnormalReason?: string
  
  // 复测字段
  isRetest: boolean
  originalResultId?: string
  retestReason?: string
  
  enteredBy: string
  enteredAt: Date
}
```

## 最佳实践

### 1. 规则配置
- 为每个检测方法和参数配置合适的检测规则
- 定期审查和更新规则配置
- 使用优先级控制规则检查顺序
- 为规则添加清晰的描述

### 2. 异常处理
- 及时处理检测到的异常结果
- 记录详细的异常原因
- 对于重要异常，及时申请复测
- 保持异常处理记录的完整性

### 3. 复测管理
- 明确复测原因
- 设置合适的复测优先级
- 及时完成复测任务
- 对比原结果和复测结果

### 4. 审计追踪
- 所有异常检测和复测操作都会记录日志
- 定期审查异常检测日志
- 分析异常模式，优化检测规则
- 保持审计记录的完整性

## 注意事项

1. **规则冲突**：避免为同一检测方法和参数配置冲突的规则
2. **性能考虑**：趋势检测需要查询历史数据，可能影响性能
3. **数据质量**：确保检测结果数据的准确性
4. **权限控制**：只有授权用户才能配置规则和申请复测
5. **通知机制**：重要异常应该及时通知相关人员

## 故障排查

### 异常未被检测到
1. 检查是否配置了适用的规则
2. 确认规则是否处于激活状态
3. 验证检测方法和参数是否匹配
4. 查看日志了解检测过程

### 误报异常
1. 检查规则配置是否合理
2. 调整范围或偏差阈值
3. 考虑使用更合适的规则类型
4. 降低规则优先级

### 复测任务未创建
1. 确认原结果是否存在
2. 检查样品是否有工作流实例
3. 验证用户权限
4. 查看错误日志

## 相关文档

- [检测结果管理](./RESULT_MANAGEMENT.md)
- [工作流引擎](./WORKFLOW_ENGINE.md)
- [任务管理](./TASK_MANAGEMENT.md)
- [审计日志](./AUDIT_LOG.md)
