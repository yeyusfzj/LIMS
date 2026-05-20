# 任务服务实现文档

## 概述

任务服务（Task Service）实现了工作流任务的完整生命周期管理，包括任务的创建、查询、分配、执行和完成。本文档描述了任务服务的实现细节和 API 端点。

## 功能特性

### 1. 任务管理
- ✅ 创建任务
- ✅ 查询任务列表（支持分页和多条件筛选）
- ✅ 获取任务详情
- ✅ 更新任务信息
- ✅ 删除任务（通过工作流实例级联删除）

### 2. 任务分配
- ✅ 手动分配任务给指定用户
- ✅ 批量分配任务
- ✅ 获取用户的待办任务列表
- ⏳ 自动派工（待实现自动分配引擎）

### 3. 任务执行
- ✅ 开始任务（ASSIGNED → IN_PROGRESS）
- ✅ 完成任务（IN_PROGRESS → COMPLETED）
- ✅ 拒绝任务（ASSIGNED → REJECTED）

### 4. 任务统计
- ✅ 获取任务统计信息（按状态分组）
- ✅ 支持按用户筛选统计数据

## 数据模型

### Task 模型

```python
class Task(Base):
    """任务模型"""
    __tablename__ = "tasks"
    
    id: str                    # 任务 ID
    instanceId: str            # 工作流实例 ID
    nodeId: str                # 节点 ID
    nodeName: str              # 节点名称
    nodeType: str              # 节点类型
    assignedTo: Optional[str]  # 分配给用户 ID
    assignedAt: Optional[datetime]  # 分配时间
    status: TaskStatus         # 任务状态
    priority: Priority         # 优先级
    result: Optional[Dict]     # 任务结果
    completedAt: Optional[datetime]  # 完成时间
    createdAt: datetime        # 创建时间
    updatedAt: datetime        # 更新时间
```

### 任务状态枚举

```python
class TaskStatus(str, Enum):
    PENDING = "PENDING"           # 待分配
    ASSIGNED = "ASSIGNED"         # 已分配
    IN_PROGRESS = "IN_PROGRESS"   # 进行中
    COMPLETED = "COMPLETED"       # 已完成
    REJECTED = "REJECTED"         # 已拒绝
```

### 优先级枚举

```python
class Priority(str, Enum):
    LOW = "LOW"         # 低
    NORMAL = "NORMAL"   # 普通
    HIGH = "HIGH"       # 高
    URGENT = "URGENT"   # 紧急
```

## API 端点

### 1. 创建任务

**端点**: `POST /api/v1/tasks`

**权限**: `task:create`

**请求体**:
```json
{
  "instanceId": "instance-123",
  "nodeId": "node-1",
  "nodeName": "样品登记",
  "nodeType": "TASK",
  "assignedTo": "user-123",  // 可选
  "priority": "NORMAL"       // 可选，默认 NORMAL
}
```

**响应**:
```json
{
  "id": "task-123",
  "instanceId": "instance-123",
  "nodeId": "node-1",
  "nodeName": "样品登记",
  "nodeType": "TASK",
  "assignedTo": "user-123",
  "assignedAt": "2024-01-01T00:00:00Z",
  "status": "ASSIGNED",
  "priority": "NORMAL",
  "result": null,
  "completedAt": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### 2. 查询任务列表

**端点**: `GET /api/v1/tasks`

**权限**: `task:read`

**查询参数**:
- `instanceId`: 工作流实例 ID（可选）
- `assignedTo`: 分配给用户 ID（可选）
- `status`: 任务状态（可选）
- `priority`: 优先级（可选）
- `nodeType`: 节点类型（可选）
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

**响应**:
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

### 3. 获取任务详情

**端点**: `GET /api/v1/tasks/{task_id}`

**权限**: `task:read`

**响应**: 返回任务详细信息

### 4. 更新任务

**端点**: `PUT /api/v1/tasks/{task_id}`

**权限**: `task:update`

**请求体**:
```json
{
  "assignedTo": "user-456",  // 可选
  "status": "IN_PROGRESS",   // 可选
  "priority": "HIGH",        // 可选
  "result": {...}            // 可选
}
```

### 5. 分配任务

**端点**: `POST /api/v1/tasks/{task_id}/assign`

**权限**: `task:assign`

**请求体**:
```json
{
  "userId": "user-123"
}
```

**响应**: 返回更新后的任务信息

### 6. 开始任务

**端点**: `POST /api/v1/tasks/{task_id}/start`

**权限**: 需要认证（任务必须分配给当前用户）

**响应**: 返回更新后的任务信息（状态变为 IN_PROGRESS）

### 7. 完成任务

**端点**: `POST /api/v1/tasks/{task_id}/complete`

**权限**: 需要认证（任务必须分配给当前用户）

**请求体**:
```json
{
  "result": {
    "status": "success",
    "data": {
      "testResult": "合格"
    }
  }
}
```

**响应**: 返回更新后的任务信息（状态变为 COMPLETED）

### 8. 拒绝任务

**端点**: `POST /api/v1/tasks/{task_id}/reject`

**权限**: 需要认证（任务必须分配给当前用户）

**请求体**:
```json
{
  "reason": "样品信息不完整"
}
```

**响应**: 返回更新后的任务信息（状态变为 REJECTED）

### 9. 获取待办任务

**端点**: `GET /api/v1/tasks/pending`

**权限**: 需要认证

**查询参数**:
- `page`: 页码（默认 1）
- `pageSize`: 每页数量（默认 20）

**响应**: 返回当前用户的待办任务列表（状态为 ASSIGNED 或 IN_PROGRESS）

### 10. 获取任务统计

**端点**: `GET /api/v1/tasks/statistics`

**权限**: `task:read`

**查询参数**:
- `userId`: 用户 ID（可选，不传则统计所有任务）

**响应**:
```json
{
  "total": 100,
  "pending": 20,
  "assigned": 30,
  "inProgress": 25,
  "completed": 20,
  "rejected": 5
}
```

### 11. 批量分配任务

**端点**: `POST /api/v1/tasks/batch-assign`

**权限**: `task:assign`

**请求体**:
```json
{
  "taskIds": ["task-1", "task-2", "task-3"],
  "userId": "user-123"
}
```

**响应**:
```json
{
  "count": 3,
  "message": "成功分配 3 个任务"
}
```

## 业务逻辑

### 任务状态转换

```
PENDING (待分配)
    ↓ assign
ASSIGNED (已分配)
    ↓ start
IN_PROGRESS (进行中)
    ↓ complete
COMPLETED (已完成)

ASSIGNED (已分配)
    ↓ reject
REJECTED (已拒绝)
```

### 权限控制

1. **创建任务**: 需要 `task:create` 权限
2. **查询任务**: 需要 `task:read` 权限
3. **更新任务**: 需要 `task:update` 权限
4. **分配任务**: 需要 `task:assign` 权限
5. **执行任务**: 任务必须分配给当前用户

### 验证规则

1. **创建任务**:
   - 工作流实例必须存在
   - 如果指定分配人员，用户必须存在

2. **分配任务**:
   - 任务不能是已完成或已拒绝状态
   - 用户必须存在

3. **完成任务**:
   - 任务不能是已完成或已拒绝状态
   - 任务必须分配给当前用户

4. **开始任务**:
   - 任务状态必须是 PENDING 或 ASSIGNED
   - 任务必须分配给当前用户

5. **拒绝任务**:
   - 任务不能是已完成或已拒绝状态
   - 任务必须分配给当前用户

## 与 Node.js 后端的兼容性

### API 端点一致性

✅ 所有 API 端点路径与 Node.js 后端完全一致
✅ 请求参数格式一致
✅ 响应数据格式一致
✅ HTTP 状态码一致
✅ 错误响应格式一致

### 数据模型一致性

✅ 使用与 Prisma schema 相同的字段名
✅ 使用与 Prisma schema 相同的枚举值
✅ 使用与 Prisma schema 相同的关系映射

## 测试

### 单元测试

测试文件: `tests/test_task_service.py`

测试覆盖:
- ✅ 创建任务成功
- ✅ 创建任务并分配
- ✅ 创建任务时工作流实例不存在
- ✅ 分配任务成功
- ✅ 分配已完成的任务（应失败）
- ✅ 完成任务成功
- ✅ 完成未分配给当前用户的任务（应失败）
- ✅ 开始任务成功
- ✅ 拒绝任务成功

### 集成测试

⏳ 待实现

## 待实现功能

1. **自动派工引擎**
   - 根据负载均衡自动分配任务
   - 根据技能匹配自动分配任务
   - 根据优先级自动分配任务

2. **任务通知**
   - 任务分配通知
   - 任务完成通知
   - 任务拒绝通知

3. **任务历史**
   - 记录任务状态变更历史
   - 记录任务分配历史

4. **任务超时**
   - 任务超时检测
   - 任务超时提醒

## 性能优化

1. **数据库查询优化**
   - ✅ 使用索引优化查询（status, assignedTo, instanceId）
   - ✅ 使用 selectinload 预加载关联数据
   - ✅ 使用分页避免一次性加载大量数据

2. **批量操作优化**
   - ✅ 批量分配使用 updateMany 减少数据库操作

3. **缓存策略**
   - ⏳ 待实现任务统计数据缓存

## 日志记录

所有关键操作都会记录日志:
- 任务创建
- 任务分配
- 任务更新
- 任务完成
- 任务拒绝
- 批量分配

日志包含以下信息:
- 操作类型
- 任务 ID
- 用户 ID
- 操作时间
- 操作结果

## 错误处理

所有错误都使用统一的异常类:
- `NotFoundException`: 资源不存在（404）
- `ValidationException`: 验证失败（400）
- `ConflictException`: 资源冲突（409）

错误响应格式:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": "详细信息"
  }
}
```

## 总结

任务服务已完成核心功能的实现，包括任务的创建、查询、分配、执行和完成。所有 API 端点与 Node.js 后端保持一致，确保前端无需修改即可切换后端服务。

下一步工作:
1. 实现自动派工引擎
2. 添加任务通知功能
3. 实现任务历史记录
4. 添加任务超时检测
5. 完善集成测试
