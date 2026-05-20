# Task 3.1 完成总结：创建工作流相关的 SQLAlchemy 模型

## 任务概述

创建工作流相关的 SQLAlchemy 模型，包括 WorkflowTemplate（Workflow）、WorkflowInstance 和 Task 模型，确保与 Prisma schema 完全一致。

## 完成的工作

### 1. 创建的模型文件

#### 1.1 `app/models/workflow.py`

创建了两个核心模型：

**Workflow 模型（工作流模板）**
- 表名：`workflows`
- 字段：
  - `id`: 主键（UUID）
  - `name`: 工作流名称
  - `description`: 描述
  - `version`: 版本号
  - `config`: 工作流配置（JSON，包含节点和边）
  - `status`: 状态（DRAFT/ACTIVE/INACTIVE/ARCHIVED）
  - `isActive`: 是否激活
  - `createdBy`: 创建人
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间
  - `activatedAt`: 激活时间
- 关系：
  - `instances`: 一对多关系，关联到 WorkflowInstance

**WorkflowInstance 模型（工作流实例）**
- 表名：`workflow_instances`
- 字段：
  - `id`: 主键（UUID）
  - `workflowId`: 外键，关联到 Workflow
  - `sampleId`: 外键，关联到 Sample（一对一）
  - `currentNodes`: 当前节点数组（支持并行节点）
  - `status`: 状态（RUNNING/COMPLETED/SUSPENDED/TERMINATED）
  - `variables`: 工作流变量（JSON）
  - `startedAt`: 开始时间
  - `completedAt`: 完成时间
- 关系：
  - `workflow`: 多对一关系，关联到 Workflow
  - `tasks`: 一对多关系，关联到 Task

**枚举类型**
- `WorkflowStatus`: DRAFT, ACTIVE, INACTIVE, ARCHIVED
- `InstanceStatus`: RUNNING, COMPLETED, SUSPENDED, TERMINATED

#### 1.2 `app/models/task.py`

创建了任务模型：

**Task 模型**
- 表名：`tasks`
- 字段：
  - `id`: 主键（UUID）
  - `instanceId`: 外键，关联到 WorkflowInstance（级联删除）
  - `nodeId`: 节点 ID
  - `nodeName`: 节点名称
  - `nodeType`: 节点类型
  - `assignedTo`: 分配给谁
  - `assignedAt`: 分配时间
  - `status`: 状态（PENDING/ASSIGNED/IN_PROGRESS/COMPLETED/REJECTED）
  - `priority`: 优先级（LOW/NORMAL/HIGH/URGENT）
  - `result`: 执行结果（JSON）
  - `completedAt`: 完成时间
  - `createdAt`: 创建时间
  - `updatedAt`: 更新时间
- 关系：
  - `instance`: 多对一关系，关联到 WorkflowInstance

**枚举类型**
- `TaskStatus`: PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, REJECTED
- `Priority`: LOW, NORMAL, HIGH, URGENT

### 2. 更新的文件

#### 2.1 `app/models/__init__.py`

更新了模型导出，添加了：
- `Workflow`
- `WorkflowInstance`
- `WorkflowStatus`
- `InstanceStatus`
- `Task`
- `TaskStatus`

### 3. 创建的测试文件

#### 3.1 `tests/unit/test_workflow_models.py`

创建了完整的单元测试，包括：

**TestWorkflowModel 类**
- `test_table_name`: 测试表名
- `test_columns`: 测试字段完整性
- `test_relationships`: 测试关系映射
- `test_workflow_status_enum`: 测试枚举类型

**TestWorkflowInstanceModel 类**
- `test_table_name`: 测试表名
- `test_columns`: 测试字段完整性
- `test_relationships`: 测试关系映射
- `test_instance_status_enum`: 测试枚举类型

**TestTaskModel 类**
- `test_table_name`: 测试表名
- `test_columns`: 测试字段完整性
- `test_relationships`: 测试关系映射
- `test_task_status_enum`: 测试任务状态枚举
- `test_priority_enum`: 测试优先级枚举

**TestModelRelationships 类**
- `test_workflow_to_instance_relationship`: 测试 Workflow -> WorkflowInstance（一对多）
- `test_instance_to_workflow_relationship`: 测试 WorkflowInstance -> Workflow（多对一）
- `test_instance_to_task_relationship`: 测试 WorkflowInstance -> Task（一对多）
- `test_task_to_instance_relationship`: 测试 Task -> WorkflowInstance（多对一）

#### 3.2 验证脚本

- `verify_workflow_models.py`: 独立的验证脚本
- `test_workflow_import.py`: 简单的导入测试脚本

## 与 Prisma Schema 的兼容性

### 完全一致的方面

1. **表名**：使用与 Prisma 相同的表名（workflows, workflow_instances, tasks）
2. **字段名**：使用与 Prisma 相同的字段名（驼峰命名）
3. **字段类型**：
   - String → String
   - Int → Integer
   - Boolean → Boolean
   - DateTime → DateTime
   - Json → JSON
   - Array → ARRAY
4. **枚举类型**：所有枚举值与 Prisma 完全一致
5. **关系映射**：
   - 一对多：Workflow -> WorkflowInstance
   - 一对多：WorkflowInstance -> Task
   - 多对一：WorkflowInstance -> Workflow
   - 多对一：Task -> WorkflowInstance
6. **索引**：在关键字段上添加了索引（status, workflowId, instanceId, assignedTo）
7. **级联删除**：Task 模型的 instanceId 外键设置了 CASCADE 删除

## 关键设计决策

### 1. 字段命名约定

使用驼峰命名（camelCase）而不是蛇形命名（snake_case），与 Prisma schema 保持一致：
- `workflowId` 而不是 `workflow_id`
- `createdAt` 而不是 `created_at`
- `isActive` 而不是 `is_active`

### 2. 默认值处理

- 使用 `server_default=func.now()` 而不是 `default=datetime.utcnow`，确保时间戳由数据库生成
- 使用 `onupdate=func.now()` 自动更新 `updatedAt` 字段
- JSON 字段使用 `default=dict` 或 `default=list`

### 3. 关系映射

- 使用 `back_populates` 建立双向关系
- 使用 `cascade='all, delete-orphan'` 确保级联删除
- 在外键上使用 `ondelete='CASCADE'` 确保数据库级别的级联删除

### 4. 枚举类型

- 继承 `str` 和 `enum.Enum`，确保枚举值可以序列化为字符串
- 枚举值与 Prisma schema 完全一致

### 5. UUID 生成

使用 `default=lambda: str(uuid.uuid4())` 在应用层生成 UUID，与 Prisma 的 `@default(uuid())` 行为一致。

## 验证方法

### 运行单元测试

```bash
cd fastapi-backend
pytest tests/unit/test_workflow_models.py -v
```

### 运行验证脚本

```bash
cd fastapi-backend
python verify_workflow_models.py
```

### 测试导入

```bash
cd fastapi-backend
python test_workflow_import.py
```

## 下一步工作

根据任务列表，下一步应该是：

**Task 3.2**: 实现工作流模板服务和 API
- 创建 `app/services/workflow_service.py`
- 创建 `app/routers/workflows.py`
- 实现工作流模板的 CRUD 操作
- 实现节点配置管理和验证

## 需求覆盖

本任务完成了以下需求：

- **需求 9.2**: 使用 SQLAlchemy 模型映射 Prisma schema 定义的所有表 ✓
- **需求 9.3**: 支持所有 Prisma 定义的关系映射 ✓
- **需求 9.4**: 使用与 Prisma 相同的字段类型和约束 ✓
- **需求 9.5**: 支持 Prisma 定义的所有索引 ✓

## 总结

成功创建了工作流相关的 SQLAlchemy 模型，包括：
- ✅ Workflow 模型（工作流模板）
- ✅ WorkflowInstance 模型（工作流实例）
- ✅ Task 模型（任务）
- ✅ 所有相关的枚举类型
- ✅ 完整的关系映射（一对多、多对一）
- ✅ 与 Prisma schema 完全兼容
- ✅ 完整的单元测试覆盖

所有模型定义都与 Prisma schema 完全一致，确保了 FastAPI 后端与 Node.js 后端共享同一个数据库时的兼容性。
