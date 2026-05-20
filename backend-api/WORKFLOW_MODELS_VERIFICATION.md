# 工作流模型验证文档

## 模型概览

本文档展示了新创建的工作流相关 SQLAlchemy 模型的关键特性和验证方法。

## 模型结构

### 1. Workflow（工作流模板）

```python
from app.models import Workflow, WorkflowStatus

# 创建工作流模板示例
workflow = Workflow(
    id="uuid-here",
    name="样品检测流程",
    description="标准样品检测工作流",
    version=1,
    config={
        "nodes": [
            {"id": "node1", "type": "start", "name": "开始"},
            {"id": "node2", "type": "task", "name": "样品登记"},
            {"id": "node3", "type": "task", "name": "检测"},
            {"id": "node4", "type": "end", "name": "结束"}
        ],
        "edges": [
            {"from": "node1", "to": "node2"},
            {"from": "node2", "to": "node3"},
            {"from": "node3", "to": "node4"}
        ]
    },
    status=WorkflowStatus.DRAFT,
    isActive=False,
    createdBy="admin"
)
```

**关键特性**：
- ✅ 支持 JSON 配置存储节点和边
- ✅ 版本控制
- ✅ 状态管理（DRAFT/ACTIVE/INACTIVE/ARCHIVED）
- ✅ 一对多关系到 WorkflowInstance

### 2. WorkflowInstance（工作流实例）

```python
from app.models import WorkflowInstance, InstanceStatus

# 创建工作流实例示例
instance = WorkflowInstance(
    id="uuid-here",
    workflowId="workflow-uuid",
    sampleId="sample-uuid",
    currentNodes=["node2"],  # 当前在节点2
    status=InstanceStatus.RUNNING,
    variables={
        "sampleType": "水质",
        "priority": "HIGH",
        "assignedTo": "user123"
    }
)
```

**关键特性**：
- ✅ 支持多个当前节点（并行执行）
- ✅ JSON 变量存储
- ✅ 与样品一对一关系
- ✅ 与工作流模板多对一关系
- ✅ 与任务一对多关系

### 3. Task（任务）

```python
from app.models import Task, TaskStatus, Priority

# 创建任务示例
task = Task(
    id="uuid-here",
    instanceId="instance-uuid",
    nodeId="node2",
    nodeName="样品登记",
    nodeType="task",
    assignedTo="user123",
    status=TaskStatus.ASSIGNED,
    priority=Priority.HIGH,
    result={
        "completed": True,
        "data": {
            "barcode": "BC123456",
            "registeredAt": "2024-01-01T10:00:00Z"
        }
    }
)
```

**关键特性**：
- ✅ 支持任务分配
- ✅ 优先级管理
- ✅ JSON 结果存储
- ✅ 与工作流实例多对一关系
- ✅ 级联删除（删除实例时自动删除任务）

## 关系映射验证

### 关系图

```
Workflow (1) ----< (N) WorkflowInstance (1) ----< (N) Task
                            |
                            | (1:1)
                            |
                          Sample
```

### 关系验证代码

```python
from sqlalchemy import inspect

# 验证 Workflow -> WorkflowInstance (一对多)
workflow_mapper = inspect(Workflow)
instances_rel = workflow_mapper.relationships['instances']
assert instances_rel.direction.name == 'ONETOMANY'

# 验证 WorkflowInstance -> Workflow (多对一)
instance_mapper = inspect(WorkflowInstance)
workflow_rel = instance_mapper.relationships['workflow']
assert workflow_rel.direction.name == 'MANYTOONE'

# 验证 WorkflowInstance -> Task (一对多)
tasks_rel = instance_mapper.relationships['tasks']
assert tasks_rel.direction.name == 'ONETOMANY'

# 验证 Task -> WorkflowInstance (多对一)
task_mapper = inspect(Task)
instance_rel = task_mapper.relationships['instance']
assert instance_rel.direction.name == 'MANYTOONE'
```

## 枚举类型验证

### WorkflowStatus

```python
from app.models import WorkflowStatus

assert WorkflowStatus.DRAFT.value == "DRAFT"
assert WorkflowStatus.ACTIVE.value == "ACTIVE"
assert WorkflowStatus.INACTIVE.value == "INACTIVE"
assert WorkflowStatus.ARCHIVED.value == "ARCHIVED"
```

### InstanceStatus

```python
from app.models import InstanceStatus

assert InstanceStatus.RUNNING.value == "RUNNING"
assert InstanceStatus.COMPLETED.value == "COMPLETED"
assert InstanceStatus.SUSPENDED.value == "SUSPENDED"
assert InstanceStatus.TERMINATED.value == "TERMINATED"
```

### TaskStatus

```python
from app.models import TaskStatus

assert TaskStatus.PENDING.value == "PENDING"
assert TaskStatus.ASSIGNED.value == "ASSIGNED"
assert TaskStatus.IN_PROGRESS.value == "IN_PROGRESS"
assert TaskStatus.COMPLETED.value == "COMPLETED"
assert TaskStatus.REJECTED.value == "REJECTED"
```

### Priority

```python
from app.models import Priority

assert Priority.LOW.value == "LOW"
assert Priority.NORMAL.value == "NORMAL"
assert Priority.HIGH.value == "HIGH"
assert Priority.URGENT.value == "URGENT"
```

## 字段验证

### Workflow 模型字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | String | ✓ | UUID | 主键 |
| name | String | ✓ | - | 工作流名称 |
| description | String | ✗ | - | 描述 |
| version | Integer | ✓ | 1 | 版本号 |
| config | JSON | ✓ | - | 节点和边配置 |
| status | Enum | ✓ | DRAFT | 状态 |
| isActive | Boolean | ✓ | False | 是否激活 |
| createdBy | String | ✓ | - | 创建人 |
| createdAt | DateTime | ✓ | now() | 创建时间 |
| updatedAt | DateTime | ✓ | now() | 更新时间 |
| activatedAt | DateTime | ✗ | - | 激活时间 |

### WorkflowInstance 模型字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | String | ✓ | UUID | 主键 |
| workflowId | String | ✓ | - | 工作流模板 ID |
| sampleId | String | ✓ | - | 样品 ID（唯一） |
| currentNodes | Array | ✓ | [] | 当前节点数组 |
| status | Enum | ✓ | RUNNING | 状态 |
| variables | JSON | ✓ | {} | 变量 |
| startedAt | DateTime | ✓ | now() | 开始时间 |
| completedAt | DateTime | ✗ | - | 完成时间 |

### Task 模型字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | String | ✓ | UUID | 主键 |
| instanceId | String | ✓ | - | 工作流实例 ID |
| nodeId | String | ✓ | - | 节点 ID |
| nodeName | String | ✓ | - | 节点名称 |
| nodeType | String | ✓ | - | 节点类型 |
| assignedTo | String | ✗ | - | 分配给谁 |
| assignedAt | DateTime | ✗ | - | 分配时间 |
| status | Enum | ✓ | PENDING | 状态 |
| priority | Enum | ✓ | NORMAL | 优先级 |
| result | JSON | ✗ | - | 执行结果 |
| completedAt | DateTime | ✗ | - | 完成时间 |
| createdAt | DateTime | ✓ | now() | 创建时间 |
| updatedAt | DateTime | ✓ | now() | 更新时间 |

## 索引验证

### Workflow 模型索引

- `status` - 用于按状态查询
- `isActive` - 用于查询激活的工作流

### WorkflowInstance 模型索引

- `workflowId` - 用于查询某个工作流的所有实例
- `status` - 用于按状态查询
- `sampleId` - 唯一索引，用于快速查找样品的工作流实例

### Task 模型索引

- `instanceId` - 用于查询某个实例的所有任务
- `assignedTo` - 用于查询分配给某人的任务
- `status` - 用于按状态查询

## 与 Prisma Schema 的对比

| 特性 | Prisma Schema | SQLAlchemy 模型 | 状态 |
|------|---------------|-----------------|------|
| 表名 | workflows | workflows | ✅ 一致 |
| 字段名 | 驼峰命名 | 驼峰命名 | ✅ 一致 |
| 字段类型 | String/Int/Json/DateTime | String/Integer/JSON/DateTime | ✅ 一致 |
| 枚举类型 | WorkflowStatus/InstanceStatus/TaskStatus | 相同 | ✅ 一致 |
| 关系映射 | @relation | relationship() | ✅ 一致 |
| 索引 | @@index | index=True | ✅ 一致 |
| 级联删除 | onDelete: Cascade | ondelete='CASCADE' | ✅ 一致 |
| 默认值 | @default | default/server_default | ✅ 一致 |

## 运行测试

### 单元测试

```bash
cd fastapi-backend
pytest tests/unit/test_workflow_models.py -v
```

预期输出：
```
tests/unit/test_workflow_models.py::TestWorkflowModel::test_table_name PASSED
tests/unit/test_workflow_models.py::TestWorkflowModel::test_columns PASSED
tests/unit/test_workflow_models.py::TestWorkflowModel::test_relationships PASSED
tests/unit/test_workflow_models.py::TestWorkflowModel::test_workflow_status_enum PASSED
tests/unit/test_workflow_models.py::TestWorkflowInstanceModel::test_table_name PASSED
tests/unit/test_workflow_models.py::TestWorkflowInstanceModel::test_columns PASSED
tests/unit/test_workflow_models.py::TestWorkflowInstanceModel::test_relationships PASSED
tests/unit/test_workflow_models.py::TestWorkflowInstanceModel::test_instance_status_enum PASSED
tests/unit/test_workflow_models.py::TestTaskModel::test_table_name PASSED
tests/unit/test_workflow_models.py::TestTaskModel::test_columns PASSED
tests/unit/test_workflow_models.py::TestTaskModel::test_relationships PASSED
tests/unit/test_workflow_models.py::TestTaskModel::test_task_status_enum PASSED
tests/unit/test_workflow_models.py::TestTaskModel::test_priority_enum PASSED
tests/unit/test_workflow_models.py::TestModelRelationships::test_workflow_to_instance_relationship PASSED
tests/unit/test_workflow_models.py::TestModelRelationships::test_instance_to_workflow_relationship PASSED
tests/unit/test_workflow_models.py::TestModelRelationships::test_instance_to_task_relationship PASSED
tests/unit/test_workflow_models.py::TestModelRelationships::test_task_to_instance_relationship PASSED
```

### 导入测试

```bash
cd fastapi-backend
python test_workflow_import.py
```

预期输出：
```
✓ 模型导入成功
  - Workflow: workflows
  - WorkflowInstance: workflow_instances
  - Task: tasks
```

## 使用示例

### 创建工作流模板

```python
from app.models import Workflow, WorkflowStatus
from app.core.database import get_db

async def create_workflow_template():
    async with get_db() as db:
        workflow = Workflow(
            name="标准检测流程",
            description="用于常规样品检测的标准流程",
            version=1,
            config={
                "nodes": [...],
                "edges": [...]
            },
            status=WorkflowStatus.DRAFT,
            createdBy="admin"
        )
        db.add(workflow)
        await db.commit()
        await db.refresh(workflow)
        return workflow
```

### 创建工作流实例

```python
from app.models import WorkflowInstance, InstanceStatus

async def create_workflow_instance(workflow_id: str, sample_id: str):
    async with get_db() as db:
        instance = WorkflowInstance(
            workflowId=workflow_id,
            sampleId=sample_id,
            currentNodes=["start_node"],
            status=InstanceStatus.RUNNING,
            variables={}
        )
        db.add(instance)
        await db.commit()
        await db.refresh(instance)
        return instance
```

### 创建任务

```python
from app.models import Task, TaskStatus, Priority

async def create_task(instance_id: str, node_config: dict):
    async with get_db() as db:
        task = Task(
            instanceId=instance_id,
            nodeId=node_config["id"],
            nodeName=node_config["name"],
            nodeType=node_config["type"],
            status=TaskStatus.PENDING,
            priority=Priority.NORMAL
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task
```

## 总结

✅ 所有模型已成功创建并与 Prisma schema 完全兼容  
✅ 所有关系映射已正确定义  
✅ 所有枚举类型已正确定义  
✅ 所有索引已正确添加  
✅ 单元测试已完整覆盖  

模型已准备好用于下一步的服务层和 API 层开发。
