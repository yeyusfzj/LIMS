# 自动任务分配引擎

## 概述

自动任务分配引擎实现了基于多种策略的智能任务分配功能，可以根据用户技能、工作负载和优先级等因素自动选择最合适的人员执行任务。

## 功能特性

### 1. 多种分配策略

- **基于技能匹配** (SKILL_BASED): 根据任务所需技能和用户技能进行匹配
- **基于工作负载** (WORKLOAD_BASED): 优先分配给当前工作负载较低的用户
- **轮询分配** (ROUND_ROBIN): 按顺序轮流分配任务
- **手动分配** (MANUAL): 需要手动指定分配对象

### 2. 灵活的规则配置

支持配置多条分配规则，每条规则包含：
- 规则名称和描述
- 适用的节点类型
- 分配策略
- 优先级（数字越大优先级越高）
- 触发条件（可选）
- 启用/禁用状态

### 3. 智能候选人筛选

自动筛选候选人时会考虑：
- 用户技能匹配度
- 当前工作负载
- 最大并发任务数限制
- 用户状态（仅选择活跃用户）

### 4. 评分机制

为每个候选人计算匹配分数：
- 技能匹配度：0-50 分
- 工作负载：0-50 分（负载越低分数越高）
- 总分：0-100 分

## API 端点

### POST /api/v1/tasks/{task_id}/auto-assign

自动分配指定任务。

**请求参数：**
- `task_id` (路径参数): 任务 ID

**响应示例：**
```json
{
  "success": true,
  "message": "任务已自动分配给 zhangsan",
  "result": {
    "success": true,
    "taskId": "task-123",
    "assignedTo": "user-456",
    "assignedUser": {
      "id": "user-456",
      "username": "zhangsan",
      "fullName": "张三"
    },
    "candidates": [
      {
        "userId": "user-456",
        "username": "zhangsan",
        "fullName": "张三",
        "score": 85.5,
        "currentWorkload": 3,
        "skills": ["chemical_analysis", "sample_preparation"],
        "reason": "技能匹配，当前负载: 3 个任务"
      }
    ],
    "strategy": "SKILL_BASED"
  }
}
```

## 使用示例

### 1. 自动分配任务

```bash
curl -X POST "http://localhost:8000/api/v1/tasks/task-123/auto-assign" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. 配置用户技能

用户技能在引擎初始化时自动加载，根据用户的部门和职位分配技能：

- **化学分析室**: chemical_analysis, sample_preparation
- **微生物室**: microbiology_test, culture_preparation
- **高级职位**: review, approval, quality_judgment
- **其他**: general

### 3. 自定义分配规则

可以通过引擎的 API 添加、更新或删除规则：

```python
from app.services.assignment_engine import assignment_engine
from app.schemas.assignment import AssignmentRule, AssignmentStrategy

# 添加新规则
new_rule = AssignmentRule(
    id="custom-rule-1",
    name="高优先级任务优先分配",
    nodeType="*",
    strategy=AssignmentStrategy.WORKLOAD_BASED,
    priority=150,
    isActive=True
)
assignment_engine.add_rule(new_rule)
```

## 默认规则

引擎预配置了以下默认规则：

1. **化学分析任务派工** (优先级: 100)
   - 节点类型: chemical_analysis
   - 策略: 基于技能
   - 条件: sampleCategory = "chemical"

2. **微生物检测任务派工** (优先级: 100)
   - 节点类型: microbiology_test
   - 策略: 基于技能
   - 条件: sampleCategory = "microbiology"

3. **紧急任务优先派工** (优先级: 200)
   - 节点类型: *（所有类型）
   - 策略: 基于工作负载
   - 条件: priority = "URGENT"

4. **默认轮询派工** (优先级: 1)
   - 节点类型: *（所有类型）
   - 策略: 轮询
   - 条件: 无

## 工作流程

1. **接收分配请求**: 通过 API 端点接收任务自动分配请求
2. **构建上下文**: 收集任务相关信息（节点类型、优先级等）
3. **匹配规则**: 按优先级查找匹配的分配规则
4. **筛选候选人**: 根据规则策略筛选合适的候选人
5. **计算分数**: 为每个候选人计算匹配分数
6. **选择最佳**: 选择分数最高的候选人
7. **执行分配**: 更新任务的分配信息
8. **返回结果**: 返回分配结果和候选人列表

## 失败处理

当自动分配失败时（如未找到合适候选人），引擎会：
1. 将任务标记为 PENDING 状态
2. 记录失败原因
3. 等待手动分配

## 性能优化

- 使用异步数据库查询
- 缓存用户技能配置
- 批量查询工作负载统计
- 规则按优先级排序，提前终止匹配

## 监控和统计

可以通过以下方法获取分配统计信息：

```python
statistics = await assignment_engine.get_assignment_statistics(db)
# 返回：
# {
#   "totalTasks": 100,
#   "assignedTasks": 85,
#   "pendingTasks": 15,
#   "failedAssignments": 5,
#   "assignmentRate": 85.0
# }
```

## 配置选项

- `enable_auto_assignment`: 启用/禁用自动分配（默认: True）
- `fallback_to_manual`: 失败时回退到手动分配（默认: True）
- `maxConcurrentTasks`: 用户最大并发任务数（默认: 10）

## 与 Node.js 后端的兼容性

FastAPI 实现与 Node.js 后端完全兼容：
- 相同的 API 端点路径
- 相同的请求/响应格式
- 相同的分配策略和规则结构
- 相同的评分算法

## 扩展性

引擎设计为可扩展的，可以轻松添加：
- 新的分配策略
- 自定义评分算法
- 更复杂的条件判断
- 与外部系统集成

## 注意事项

1. 引擎在应用启动时自动初始化
2. 用户技能配置基于部门和职位自动生成
3. 规则按优先级从高到低匹配
4. 只有活跃状态的用户才会被考虑
5. 超过最大并发任务数的用户会被排除
