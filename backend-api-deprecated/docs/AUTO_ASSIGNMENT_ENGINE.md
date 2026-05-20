# 自动派工引擎使用指南

## 概述

自动派工引擎是实验室管理系统的核心功能之一，能够根据多种策略自动将任务分配给合适的人员，提高工作效率和资源利用率。

## 功能特性

### 1. 多种派工策略

- **基于技能的派工 (SKILL_BASED)**：根据用户的技能和资质匹配任务
- **基于工作负载的派工 (WORKLOAD_BASED)**：优先分配给当前负载较低的用户
- **轮询派工 (ROUND_ROBIN)**：按顺序轮流分配任务
- **手动派工 (MANUAL)**：需要人工手动分配

### 2. 派工规则配置

派工规则支持以下配置：

```typescript
{
  id: 'rule-1',
  name: '化学分析任务派工',
  nodeType: 'chemical_analysis',  // 适用的节点类型
  strategy: AssignmentStrategy.SKILL_BASED,
  priority: 100,  // 规则优先级，数字越大优先级越高
  conditions: [   // 可选的派工条件
    {
      field: 'sampleCategory',
      operator: 'equals',
      value: 'chemical',
    },
  ],
  isActive: true,
}
```

### 3. 用户技能管理

为用户配置技能和最大并发任务数：

```typescript
{
  userId: 'user-id',
  skills: ['chemical_analysis', 'sample_preparation'],
  certifications: ['ISO17025'],
  maxConcurrentTasks: 10,  // 最大并发任务数
}
```

## API 端点

### 1. 触发自动派工

```http
POST /api/tasks/:id/auto-assign
```

手动触发对指定任务的自动派工。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "success": true,
    "taskId": "task-id",
    "assignedTo": "user-id",
    "assignedUser": {
      "id": "user-id",
      "username": "chemist1",
      "fullName": "化学分析师1"
    },
    "candidates": [
      {
        "userId": "user-id",
        "username": "chemist1",
        "fullName": "化学分析师1",
        "score": 100,
        "currentWorkload": 3,
        "skills": ["chemical_analysis"],
        "reason": "技能匹配，当前负载: 2 个任务"
      }
    ],
    "strategy": "SKILL_BASED"
  }
}
```

### 2. 获取派工候选人

```http
GET /api/tasks/:id/candidates
```

获取任务的派工候选人列表，不实际分配任务。

**响应示例：**
```json
{
  "success": true,
  "data": {
    "taskId": "task-id",
    "candidates": [
      {
        "userId": "user-id",
        "username": "chemist1",
        "score": 100,
        "currentWorkload": 3,
        "skills": ["chemical_analysis"],
        "reason": "技能匹配，当前负载: 2 个任务"
      }
    ],
    "recommendedUser": {
      "id": "user-id",
      "username": "chemist1",
      "fullName": "化学分析师1"
    }
  }
}
```

## 自动派工流程

### 1. 任务创建时自动派工

当创建任务时，如果没有指定分配人员，系统会自动触发派工：

```typescript
// 创建任务
const task = await taskService.createTask({
  instanceId: 'workflow-instance-id',
  nodeId: 'analysis',
  nodeName: '化学分析',
  nodeType: 'chemical_analysis',
  priority: Priority.NORMAL,
  // 不指定 assignedTo，触发自动派工
})
```

### 2. 派工规则匹配

系统按以下步骤进行派工：

1. **查找匹配的派工规则**：根据节点类型和条件查找最高优先级的规则
2. **查找候选人**：根据规则策略查找符合条件的候选人
3. **选择最佳候选人**：按分数排序，选择得分最高的候选人
4. **分配任务**：将任务分配给选中的候选人

### 3. 派工失败处理

如果自动派工失败（没有找到合适的候选人），系统会：

1. 将任务标记为 `PENDING` 状态
2. 记录失败原因
3. 等待手动分配

## 配置示例

### 默认派工规则

系统预置了以下派工规则：

```typescript
// 1. 化学分析任务 - 基于技能
{
  id: 'rule-1',
  name: '化学分析任务派工',
  nodeType: 'chemical_analysis',
  strategy: AssignmentStrategy.SKILL_BASED,
  priority: 100,
  conditions: [
    { field: 'sampleCategory', operator: 'equals', value: 'chemical' }
  ],
  isActive: true,
}

// 2. 微生物检测任务 - 基于技能
{
  id: 'rule-2',
  name: '微生物检测任务派工',
  nodeType: 'microbiology_test',
  strategy: AssignmentStrategy.SKILL_BASED,
  priority: 100,
  conditions: [
    { field: 'sampleCategory', operator: 'equals', value: 'microbiology' }
  ],
  isActive: true,
}

// 3. 紧急任务 - 基于工作负载
{
  id: 'rule-3',
  name: '紧急任务优先派工',
  nodeType: '*',
  strategy: AssignmentStrategy.WORKLOAD_BASED,
  priority: 200,
  conditions: [
    { field: 'priority', operator: 'equals', value: Priority.URGENT }
  ],
  isActive: true,
}

// 4. 默认规则 - 轮询
{
  id: 'rule-4',
  name: '默认轮询派工',
  nodeType: '*',
  strategy: AssignmentStrategy.ROUND_ROBIN,
  priority: 1,
  isActive: true,
}
```

### 用户技能配置

系统根据用户的部门和职位自动分配技能：

```typescript
// 化学分析室人员
{
  userId: 'user-1',
  skills: ['chemical_analysis', 'sample_preparation'],
  maxConcurrentTasks: 10,
}

// 微生物室人员
{
  userId: 'user-2',
  skills: ['microbiology_test', 'culture_preparation'],
  maxConcurrentTasks: 8,
}

// 高级人员/主管
{
  userId: 'user-3',
  skills: ['review', 'approval', 'quality_judgment'],
  maxConcurrentTasks: 15,
}
```

## 管理接口

### 添加派工规则

```typescript
assignmentEngine.addRule({
  id: 'custom-rule-1',
  name: '自定义规则',
  nodeType: 'custom_task',
  strategy: AssignmentStrategy.SKILL_BASED,
  priority: 50,
  isActive: true,
})
```

### 更新派工规则

```typescript
assignmentEngine.updateRule('rule-id', {
  priority: 150,
  isActive: false,
})
```

### 删除派工规则

```typescript
assignmentEngine.removeRule('rule-id')
```

### 设置用户技能

```typescript
assignmentEngine.setUserSkill('user-id', {
  userId: 'user-id',
  skills: ['chemical_analysis', 'review'],
  maxConcurrentTasks: 12,
})
```

### 启用/禁用自动派工

```typescript
// 禁用自动派工
assignmentEngine.setAutoAssignmentEnabled(false)

// 启用自动派工
assignmentEngine.setAutoAssignmentEnabled(true)
```

## 派工统计

获取派工统计信息：

```typescript
const statistics = await assignmentEngine.getAssignmentStatistics()

// 返回：
{
  totalTasks: 100,
  assignedTasks: 85,
  pendingTasks: 15,
  failedAssignments: 5,
  assignmentRate: 85.0,  // 派工成功率
}
```

## 最佳实践

### 1. 合理配置规则优先级

- 紧急任务规则应设置较高优先级（如 200）
- 特定类型任务规则设置中等优先级（如 100）
- 默认规则设置最低优先级（如 1）

### 2. 维护用户技能信息

- 定期更新用户的技能和资质
- 根据培训和考核结果调整技能配置
- 合理设置最大并发任务数，避免过载

### 3. 监控派工效果

- 定期查看派工统计信息
- 分析派工失败原因
- 根据实际情况调整规则和策略

### 4. 处理派工失败

- 对于频繁派工失败的任务类型，检查规则配置
- 确保有足够的人员具备相应技能
- 考虑增加通用技能人员作为后备

## 故障排查

### 问题：任务一直处于待分配状态

**可能原因：**
1. 没有用户具备所需技能
2. 所有符合条件的用户已达到最大并发任务数
3. 派工规则配置错误

**解决方法：**
1. 检查用户技能配置
2. 调整最大并发任务数
3. 检查派工规则的条件和优先级

### 问题：派工不均衡

**可能原因：**
1. 使用了基于技能的策略，某些用户技能匹配度更高
2. 工作负载统计不准确

**解决方法：**
1. 考虑使用轮询策略
2. 调整技能匹配分数计算逻辑
3. 定期清理已完成的任务

## 扩展开发

### 自定义派工策略

可以通过扩展 `AssignmentEngine` 类来实现自定义派工策略：

```typescript
class CustomAssignmentEngine extends AssignmentEngine {
  async findCandidatesByCustomStrategy(context: AssignmentContext) {
    // 实现自定义派工逻辑
    const candidates = []
    // ... 查找候选人
    return candidates
  }
}
```

### 集成外部系统

可以通过 webhook 或消息队列将派工事件推送到外部系统：

```typescript
// 派工成功后发送通知
if (result.success) {
  await notificationService.notify(result.assignedTo, {
    type: 'TASK_ASSIGNED',
    taskId: result.taskId,
  })
}
```

## 相关文档

- [任务管理 API 文档](./TASK_API.md)
- [工作流引擎文档](./WORKFLOW_ENGINE.md)
- [权限控制文档](./PERMISSION_SYSTEM.md)
