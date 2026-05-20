# 审核任务 API 修复建议

## 当前状态

### ✅ 已完成
1. **模型定义已修复**
   - `AuditTask` 模型正确关联到 `Task` 表
   - `Task` 模型添加了 `audit_tasks` 关系
   - `Sample` 模型移除了错误的 `audit_tasks` 关系
   - 后端成功启动，没有模型错误

### ❌ 待修复
2. **审核服务需要更新**
   - `audit_service.py` 中的代码仍然假设 `AuditTask` 直接关联到 `Sample`
   - 需要更新查询逻辑以适应正确的关联路径

## 问题分析

### 数据库结构

**正确的关联路径**：
```
AuditTask → Task → WorkflowInstance → Sample
```

**表关系**：
- `audit_tasks.taskId` → `tasks.id`
- `tasks.instanceId` → `workflow_instances.id`
- `workflow_instances.sampleId` → `samples.id`

### 当前代码问题

**文件**: `backend-api/app/services/audit_service.py`

#### 问题 1: `submit_for_audit` 方法

```python
# ❌ 错误：直接使用 sampleId
task = AuditTask(
    id=str(uuid.uuid4()),
    sampleId=dto.sampleId,  # ← 这个字段不存在
    level=level_config.level,
    auditorId=auditor_id,
    status=AuditStatus.PENDING
)
```

**应该改为**：
```python
# ✅ 正确：使用 taskId
# 首先需要创建或获取 Task
task_instance = await self._get_or_create_task(db, dto.sampleId, level_config.level)

audit_task = AuditTask(
    id=str(uuid.uuid4()),
    taskId=task_instance.id,  # ← 关联到 Task
    level=level_config.level,
    auditorId=auditor_id,
    status=AuditStatus.PENDING
)
```

#### 问题 2: `list_audit_tasks` 方法

```python
# ❌ 错误：直接查询 sampleId
if query.sampleId:
    conditions.append(AuditTask.sampleId == query.sampleId)
```

**应该改为**：
```python
# ✅ 正确：通过 JOIN 查询
from app.models.task import Task
from app.models.workflow import WorkflowInstance

if query.sampleId:
    # 需要 JOIN Task 和 WorkflowInstance
    stmt = (
        select(AuditTask)
        .join(Task, AuditTask.taskId == Task.id)
        .join(WorkflowInstance, Task.instanceId == WorkflowInstance.id)
        .where(WorkflowInstance.sampleId == query.sampleId)
    )
```

#### 问题 3: `_format_audit_task` 方法

需要通过关联路径获取样品信息：

```python
async def _format_audit_task(self, db: AsyncSession, audit_task: AuditTask) -> AuditTaskResponse:
    # 通过 Task → WorkflowInstance → Sample 获取样品信息
    task = await db.get(Task, audit_task.taskId)
    if task and task.instanceId:
        instance = await db.get(WorkflowInstance, task.instanceId)
        if instance and instance.sampleId:
            sample = await db.get(Sample, instance.sampleId)
            # 使用 sample 信息
```

## 修复方案

### 方案 1: 完整重构审核服务（推荐）

**优点**：
- 符合正确的数据库结构
- 支持完整的工作流功能
- 可扩展性好

**缺点**：
- 改动较大
- 需要测试所有审核相关功能

**需要修改的文件**：
1. `backend-api/app/services/audit_service.py` - 主要修改
2. `backend-api/app/schemas/audit.py` - 可能需要调整
3. `backend-api/app/models/workflow.py` - 需要创建 WorkflowInstance 模型

**修改内容**：
- 创建 `WorkflowInstance` 模型
- 更新所有使用 `AuditTask.sampleId` 的地方
- 添加 JOIN 查询以获取样品信息
- 更新审核任务创建逻辑

### 方案 2: 临时兼容方案（不推荐）

**优点**：
- 改动较小
- 快速修复

**缺点**：
- 不符合数据库结构
- 需要修改数据库表结构
- 破坏了工作流设计

**实现方式**：
1. 在 `audit_tasks` 表中添加 `sampleId` 列
2. 保持 `taskId` 列用于工作流关联
3. 同时维护两个关联

**不推荐原因**：
- 违反了数据库设计原则
- 数据冗余
- 可能导致数据不一致

## 推荐的修复步骤

### 步骤 1: 创建 WorkflowInstance 模型

**文件**: `backend-api/app/models/workflow.py`

```python
from sqlalchemy import Column, String, DateTime, Enum as SQLEnum, JSON, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum
from app.models.base import Base


class InstanceStatus(str, enum.Enum):
    """工作流实例状态枚举"""
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"
    TERMINATED = "TERMINATED"


class WorkflowInstance(Base):
    """工作流实例模型"""
    __tablename__ = 'workflow_instances'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workflowId = Column(String, ForeignKey('workflows.id'), nullable=False)
    sampleId = Column(String, ForeignKey('samples.id'), unique=True, nullable=False)
    
    currentNodes = Column(ARRAY(String), nullable=False, default=[])
    status = Column(
        SQLEnum(InstanceStatus),
        default=InstanceStatus.RUNNING,
        nullable=False,
        index=True
    )
    variables = Column(JSON, default={}, nullable=False)
    
    startedAt = Column(DateTime, server_default=func.now(), nullable=False)
    completedAt = Column(DateTime)
    
    # 关系
    sample = relationship('Sample', back_populates='workflow_instance')
    tasks = relationship('Task', back_populates='instance', cascade='all, delete-orphan')
```

### 步骤 2: 更新 Sample 模型

**文件**: `backend-api/app/models/sample.py`

```python
# 添加关系
workflow_instance = relationship('WorkflowInstance', back_populates='sample', uselist=False)
```

### 步骤 3: 更新审核服务

**文件**: `backend-api/app/services/audit_service.py`

需要修改的方法：
1. `submit_for_audit` - 创建审核任务时需要先创建/获取 Task
2. `list_audit_tasks` - 添加 JOIN 查询
3. `get_audit_task` - 通过关联获取样品信息
4. `_format_audit_task` - 格式化时获取样品信息
5. 所有其他使用 `AuditTask.sampleId` 的方法

### 步骤 4: 测试

1. 测试审核任务列表查询
2. 测试审核任务创建
3. 测试审核任务详情
4. 测试审核任务执行
5. 测试审核任务转交

## 临时解决方案

如果需要快速让前端能够查询审核任务，可以先修复 `list_audit_tasks` 方法：

```python
async def list_audit_tasks(
    self,
    db: AsyncSession,
    query: AuditTaskQuery
) -> Dict[str, Any]:
    """查询审核任务列表"""
    from app.models.task import Task
    from app.models.workflow import WorkflowInstance
    
    # 构建基础查询
    stmt = select(AuditTask)
    
    # 如果需要按 sampleId 筛选，添加 JOIN
    if query.sampleId:
        stmt = (
            stmt
            .join(Task, AuditTask.taskId == Task.id)
            .join(WorkflowInstance, Task.instanceId == WorkflowInstance.id)
            .where(WorkflowInstance.sampleId == query.sampleId)
        )
    
    # 其他筛选条件
    if query.auditorId:
        stmt = stmt.where(AuditTask.auditorId == query.auditorId)
    if query.status:
        stmt = stmt.where(AuditTask.status == query.status)
    if query.level:
        stmt = stmt.where(AuditTask.level == query.level)
    
    # 查询总数
    count_stmt = select(func.count()).select_from(stmt.subquery())
    result = await db.execute(count_stmt)
    total = result.scalar()
    
    # 查询数据
    stmt = stmt.order_by(AuditTask.submittedAt.desc())
    stmt = stmt.offset((query.page - 1) * query.pageSize).limit(query.pageSize)
    
    result = await db.execute(stmt)
    tasks = result.scalars().all()
    
    # 格式化任务
    items = []
    for task in tasks:
        formatted_task = await self._format_audit_task(db, task)
        items.append(formatted_task)
    
    return {
        "items": items,
        "total": total,
        "page": query.page,
        "pageSize": query.pageSize
    }
```

## 估计工作量

### 完整修复（方案 1）
- **时间**: 2-4 小时
- **风险**: 中等（需要全面测试）
- **收益**: 高（符合正确的数据库结构）

### 临时修复（快速方案）
- **时间**: 30 分钟
- **风险**: 低（只修复查询功能）
- **收益**: 低（只能查询，不能创建）

## 建议

**推荐方案 1（完整修复）**，原因：
1. 符合数据库设计
2. 支持完整的工作流功能
3. 避免未来的技术债务
4. 一次性解决所有问题

**如果时间紧急**，可以先实施临时修复，让前端能够查询审核任务，然后再进行完整修复。

## 需要用户确认

1. **是否需要立即进行完整修复？**
   - 是：我将创建 WorkflowInstance 模型并更新审核服务
   - 否：我将先实施临时修复，让查询功能可用

2. **是否有现有的审核任务数据？**
   - 如果有，需要考虑数据迁移
   - 如果没有，可以直接修改

3. **工作流功能是否已经实现？**
   - 如果是，需要确保不破坏现有功能
   - 如果否，可以同时实现工作流功能

---

**创建时间**: 2026-05-08 14:15  
**状态**: 等待用户确认修复方案
