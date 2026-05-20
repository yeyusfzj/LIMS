# 质量判定引擎使用指南

## 概述

质量判定引擎是实验室管理系统的核心功能之一，用于根据配置的判定规则自动执行质量判定，支持人工复核和判定历史追踪。

## 功能特性

### 1. 判定规则配置

支持三种判定规则类型：

- **范围判定（RANGE）**：检测参数值是否在指定范围内
- **公式判定（FORMULA）**：使用数学公式计算判定结果
- **逻辑判定（LOGIC）**：使用逻辑表达式评估判定条件

### 2. 自动质量判定

- 根据样品的检测项类型自动匹配适用的判定规则
- 支持多条规则组合判定（AND 关系）
- 记录详细的判定依据，包括每个条件的评估结果

### 3. 人工复核

- 允许授权人员复核并覆盖自动判定结果
- 记录复核原因和复核人员信息
- 保留完整的判定历史记录

### 4. 判定历史追踪

- 记录所有判定结果的变更历史
- 包含变更前后的结果、变更原因和变更人员
- 支持按样品或判定结果查询历史记录

## API 端点

### 判定规则管理

#### 创建判定规则
```http
POST /api/judgment-rules
Authorization: Bearer {token}

{
  "name": "pH范围判定",
  "description": "pH值应在6.5-8.5之间",
  "testItemType": "pH测定",
  "conditions": [
    {
      "type": "RANGE",
      "parameter": "pH",
      "minValue": 6.5,
      "maxValue": 8.5
    }
  ],
  "priority": 1
}
```

#### 查询判定规则列表
```http
GET /api/judgment-rules?testItemType=pH测定&isActive=true&page=1&pageSize=20
Authorization: Bearer {token}
```

#### 更新判定规则
```http
PUT /api/judgment-rules/{ruleId}
Authorization: Bearer {token}

{
  "name": "pH范围判定（已更新）",
  "priority": 10,
  "isActive": true
}
```

#### 删除判定规则
```http
DELETE /api/judgment-rules/{ruleId}
Authorization: Bearer {token}
```

### 质量判定

#### 执行质量判定
```http
POST /api/samples/{sampleId}/judgment
Authorization: Bearer {token}

{
  "ruleIds": ["rule-id-1", "rule-id-2"]  // 可选，不指定则自动匹配
}
```

响应示例：
```json
{
  "message": "质量判定完成",
  "data": {
    "id": "judgment-id",
    "sampleId": "sample-id",
    "result": "QUALIFIED",
    "basis": "[...]",
    "basisDetails": [
      {
        "ruleId": "range",
        "ruleName": "范围判定",
        "conditionType": "RANGE",
        "parameter": "pH",
        "actualValue": 7.2,
        "expectedRange": { "min": 6.5, "max": 8.5 },
        "evaluationResult": true,
        "message": "参数 pH 的值为 7.2，在合格范围内 [6.5, 8.5]"
      }
    ],
    "isAutomatic": true,
    "judgedBy": "user-id",
    "judgedAt": "2024-03-09T10:30:00Z"
  }
}
```

#### 获取判定结果
```http
GET /api/samples/{sampleId}/judgment
Authorization: Bearer {token}
```

#### 人工复核判定结果
```http
POST /api/judgments/{judgmentId}/review
Authorization: Bearer {token}

{
  "newResult": "UNQUALIFIED",
  "reason": "人工复核发现问题"
}
```

#### 批量判定
```http
POST /api/judgments/batch
Authorization: Bearer {token}

{
  "sampleIds": ["sample-id-1", "sample-id-2", "sample-id-3"]
}
```

### 判定历史

#### 查询判定历史
```http
GET /api/judgment-history?sampleId={sampleId}&page=1&pageSize=20
Authorization: Bearer {token}
```

## 判定规则配置示例

### 范围判定规则

```json
{
  "name": "pH范围判定",
  "testItemType": "pH测定",
  "conditions": [
    {
      "type": "RANGE",
      "parameter": "pH",
      "minValue": 6.5,
      "maxValue": 8.5
    }
  ]
}
```

### 公式判定规则

```json
{
  "name": "温度pH综合判定",
  "testItemType": "pH测定",
  "conditions": [
    {
      "type": "FORMULA",
      "formula": "(pH - 6) * (30 - temperature)"
    }
  ]
}
```

公式说明：
- 使用 mathjs 库进行计算
- 可以使用检测结果中的参数名作为变量
- 公式结果 > 0 表示合格，<= 0 表示不合格

### 逻辑判定规则

```json
{
  "name": "逻辑判定",
  "testItemType": "pH测定",
  "conditions": [
    {
      "type": "LOGIC",
      "logicExpression": "pH > 7 and temperature < 30"
    }
  ]
}
```

逻辑表达式说明：
- 支持比较运算符：`>`, `<`, `>=`, `<=`, `==`, `!=`
- 支持逻辑运算符：`and`, `or`, `not`
- 表达式结果为 true 表示合格，false 表示不合格

### 组合判定规则

可以在一个规则中配置多个条件，所有条件必须同时满足（AND 关系）：

```json
{
  "name": "综合判定",
  "testItemType": "pH测定",
  "conditions": [
    {
      "type": "RANGE",
      "parameter": "pH",
      "minValue": 6.5,
      "maxValue": 8.5
    },
    {
      "type": "RANGE",
      "parameter": "temperature",
      "minValue": 0,
      "maxValue": 30
    },
    {
      "type": "LOGIC",
      "logicExpression": "pH > 7 and temperature < 30"
    }
  ]
}
```

## 判定流程

1. **样品审核完成**：样品状态必须为 `AUDIT_COMPLETE`
2. **执行判定**：调用判定 API，系统自动匹配规则并执行判定
3. **记录结果**：保存判定结果和详细的判定依据
4. **人工复核**（可选）：授权人员可以复核并修改判定结果
5. **历史追踪**：所有变更都会记录在判定历史中

## 权限要求

- **创建规则**：需要 `judgment:create` 权限
- **查询规则**：需要 `judgment:read` 权限
- **更新规则**：需要 `judgment:update` 权限
- **删除规则**：需要 `judgment:delete` 权限
- **执行判定**：需要 `judgment:create` 权限
- **复核判定**：需要 `judgment:update` 权限

## 注意事项

1. **规则优先级**：当多个规则适用于同一检测项时，按优先级（priority）从高到低执行
2. **判定条件**：所有条件必须同时满足才判定为合格（AND 关系）
3. **公式安全**：公式和逻辑表达式使用 mathjs 库进行安全计算，不会执行任意代码
4. **判定依据**：系统会记录每个条件的详细评估结果，便于追溯和审查
5. **历史记录**：判定结果的所有变更都会永久保存，不可删除

## 错误处理

常见错误及解决方法：

- **样品状态不正确**：确保样品已完成审核（状态为 `AUDIT_COMPLETE`）
- **没有找到适用的规则**：检查是否为该检测项类型配置了判定规则
- **公式计算失败**：检查公式语法是否正确，参数名是否与检测结果匹配
- **重复判定**：每个样品只能判定一次，如需修改请使用复核功能

## 最佳实践

1. **规则命名**：使用清晰、描述性的规则名称
2. **规则优先级**：合理设置优先级，确保重要规则优先执行
3. **条件设计**：条件应该简单明确，避免过于复杂的逻辑
4. **定期审查**：定期审查和更新判定规则，确保符合最新标准
5. **人工复核**：对于关键样品，建议进行人工复核
6. **历史追踪**：定期查看判定历史，分析判定准确性

## 技术实现

- **数据库模型**：`JudgmentRule`、`QualityJudgment`、`JudgmentHistory`
- **服务层**：`JudgmentService`
- **控制器**：`JudgmentController`
- **路由**：`/api/judgment-rules`、`/api/samples/:id/judgment`、`/api/judgments`
- **计算引擎**：mathjs 库
