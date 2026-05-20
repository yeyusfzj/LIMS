"""
工作流模型的单元测试

测试 Workflow、WorkflowInstance 和 Task 模型的定义是否正确。
"""

import pytest
from sqlalchemy import inspect
from app.models import (
    Workflow, WorkflowInstance, Task,
    WorkflowStatus, InstanceStatus, TaskStatus, Priority
)


class TestWorkflowModel:
    """测试 Workflow 模型"""
    
    def test_table_name(self):
        """测试表名"""
        assert Workflow.__tablename__ == "workflows"
    
    def test_columns(self):
        """测试字段"""
        mapper = inspect(Workflow)
        columns = {col.key for col in mapper.columns}
        
        expected_columns = {
            'id', 'name', 'description', 'version', 'config',
            'status', 'isActive', 'createdBy', 'createdAt',
            'updatedAt', 'activatedAt'
        }
        
        assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    def test_relationships(self):
        """测试关系"""
        mapper = inspect(Workflow)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'instances' in relationships
    
    def test_workflow_status_enum(self):
        """测试工作流状态枚举"""
        assert hasattr(WorkflowStatus, 'DRAFT')
        assert hasattr(WorkflowStatus, 'ACTIVE')
        assert hasattr(WorkflowStatus, 'INACTIVE')
        assert hasattr(WorkflowStatus, 'ARCHIVED')
        
        assert WorkflowStatus.DRAFT.value == "DRAFT"
        assert WorkflowStatus.ACTIVE.value == "ACTIVE"


class TestWorkflowInstanceModel:
    """测试 WorkflowInstance 模型"""
    
    def test_table_name(self):
        """测试表名"""
        assert WorkflowInstance.__tablename__ == "workflow_instances"
    
    def test_columns(self):
        """测试字段"""
        mapper = inspect(WorkflowInstance)
        columns = {col.key for col in mapper.columns}
        
        expected_columns = {
            'id', 'workflowId', 'sampleId', 'currentNodes',
            'status', 'variables', 'startedAt', 'completedAt'
        }
        
        assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    def test_relationships(self):
        """测试关系"""
        mapper = inspect(WorkflowInstance)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'workflow' in relationships
        assert 'tasks' in relationships
    
    def test_instance_status_enum(self):
        """测试实例状态枚举"""
        assert hasattr(InstanceStatus, 'RUNNING')
        assert hasattr(InstanceStatus, 'COMPLETED')
        assert hasattr(InstanceStatus, 'SUSPENDED')
        assert hasattr(InstanceStatus, 'TERMINATED')
        
        assert InstanceStatus.RUNNING.value == "RUNNING"
        assert InstanceStatus.COMPLETED.value == "COMPLETED"


class TestTaskModel:
    """测试 Task 模型"""
    
    def test_table_name(self):
        """测试表名"""
        assert Task.__tablename__ == "tasks"
    
    def test_columns(self):
        """测试字段"""
        mapper = inspect(Task)
        columns = {col.key for col in mapper.columns}
        
        expected_columns = {
            'id', 'instanceId', 'nodeId', 'nodeName', 'nodeType',
            'assignedTo', 'assignedAt', 'status', 'priority',
            'result', 'completedAt', 'createdAt', 'updatedAt'
        }
        
        assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    def test_relationships(self):
        """测试关系"""
        mapper = inspect(Task)
        relationships = {rel.key for rel in mapper.relationships}
        assert 'instance' in relationships
    
    def test_task_status_enum(self):
        """测试任务状态枚举"""
        assert hasattr(TaskStatus, 'PENDING')
        assert hasattr(TaskStatus, 'ASSIGNED')
        assert hasattr(TaskStatus, 'IN_PROGRESS')
        assert hasattr(TaskStatus, 'COMPLETED')
        assert hasattr(TaskStatus, 'REJECTED')
        
        assert TaskStatus.PENDING.value == "PENDING"
        assert TaskStatus.COMPLETED.value == "COMPLETED"
    
    def test_priority_enum(self):
        """测试优先级枚举"""
        assert hasattr(Priority, 'LOW')
        assert hasattr(Priority, 'NORMAL')
        assert hasattr(Priority, 'HIGH')
        assert hasattr(Priority, 'URGENT')
        
        assert Priority.LOW.value == "LOW"
        assert Priority.URGENT.value == "URGENT"


class TestModelRelationships:
    """测试模型关系"""
    
    def test_workflow_to_instance_relationship(self):
        """测试 Workflow -> WorkflowInstance 关系"""
        workflow_mapper = inspect(Workflow)
        instances_rel = workflow_mapper.relationships['instances']
        assert instances_rel.direction.name == 'ONETOMANY'
    
    def test_instance_to_workflow_relationship(self):
        """测试 WorkflowInstance -> Workflow 关系"""
        instance_mapper = inspect(WorkflowInstance)
        workflow_rel = instance_mapper.relationships['workflow']
        assert workflow_rel.direction.name == 'MANYTOONE'
    
    def test_instance_to_task_relationship(self):
        """测试 WorkflowInstance -> Task 关系"""
        instance_mapper = inspect(WorkflowInstance)
        tasks_rel = instance_mapper.relationships['tasks']
        assert tasks_rel.direction.name == 'ONETOMANY'
    
    def test_task_to_instance_relationship(self):
        """测试 Task -> WorkflowInstance 关系"""
        task_mapper = inspect(Task)
        instance_rel = task_mapper.relationships['instance']
        assert instance_rel.direction.name == 'MANYTOONE'
