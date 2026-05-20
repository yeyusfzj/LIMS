"""
验证工作流相关的 SQLAlchemy 模型

此脚本验证：
1. 模型可以正确导入
2. 模型字段与 Prisma schema 一致
3. 模型关系映射正确
4. 枚举类型定义正确
"""

import sys
from app.models import (
    Workflow, WorkflowInstance, Task,
    WorkflowStatus, InstanceStatus, TaskStatus, Priority
)
from sqlalchemy import inspect


def verify_workflow_model():
    """验证 Workflow 模型"""
    print("验证 Workflow 模型...")
    
    # 检查表名
    assert Workflow.__tablename__ == "workflows", "表名不匹配"
    
    # 检查字段
    mapper = inspect(Workflow)
    columns = {col.key for col in mapper.columns}
    
    expected_columns = {
        'id', 'name', 'description', 'version', 'config',
        'status', 'isActive', 'createdBy', 'createdAt',
        'updatedAt', 'activatedAt'
    }
    
    assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    # 检查关系
    relationships = {rel.key for rel in mapper.relationships}
    assert 'instances' in relationships, "缺少 instances 关系"
    
    print("✓ Workflow 模型验证通过")


def verify_workflow_instance_model():
    """验证 WorkflowInstance 模型"""
    print("验证 WorkflowInstance 模型...")
    
    # 检查表名
    assert WorkflowInstance.__tablename__ == "workflow_instances", "表名不匹配"
    
    # 检查字段
    mapper = inspect(WorkflowInstance)
    columns = {col.key for col in mapper.columns}
    
    expected_columns = {
        'id', 'workflowId', 'sampleId', 'currentNodes',
        'status', 'variables', 'startedAt', 'completedAt'
    }
    
    assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    # 检查关系
    relationships = {rel.key for rel in mapper.relationships}
    assert 'workflow' in relationships, "缺少 workflow 关系"
    assert 'tasks' in relationships, "缺少 tasks 关系"
    
    print("✓ WorkflowInstance 模型验证通过")


def verify_task_model():
    """验证 Task 模型"""
    print("验证 Task 模型...")
    
    # 检查表名
    assert Task.__tablename__ == "tasks", "表名不匹配"
    
    # 检查字段
    mapper = inspect(Task)
    columns = {col.key for col in mapper.columns}
    
    expected_columns = {
        'id', 'instanceId', 'nodeId', 'nodeName', 'nodeType',
        'assignedTo', 'assignedAt', 'status', 'priority',
        'result', 'completedAt', 'createdAt', 'updatedAt'
    }
    
    assert expected_columns.issubset(columns), f"缺少字段: {expected_columns - columns}"
    
    # 检查关系
    relationships = {rel.key for rel in mapper.relationships}
    assert 'instance' in relationships, "缺少 instance 关系"
    
    print("✓ Task 模型验证通过")


def verify_enums():
    """验证枚举类型"""
    print("验证枚举类型...")
    
    # 验证 WorkflowStatus
    assert hasattr(WorkflowStatus, 'DRAFT'), "缺少 DRAFT 状态"
    assert hasattr(WorkflowStatus, 'ACTIVE'), "缺少 ACTIVE 状态"
    assert hasattr(WorkflowStatus, 'INACTIVE'), "缺少 INACTIVE 状态"
    assert hasattr(WorkflowStatus, 'ARCHIVED'), "缺少 ARCHIVED 状态"
    
    # 验证 InstanceStatus
    assert hasattr(InstanceStatus, 'RUNNING'), "缺少 RUNNING 状态"
    assert hasattr(InstanceStatus, 'COMPLETED'), "缺少 COMPLETED 状态"
    assert hasattr(InstanceStatus, 'SUSPENDED'), "缺少 SUSPENDED 状态"
    assert hasattr(InstanceStatus, 'TERMINATED'), "缺少 TERMINATED 状态"
    
    # 验证 TaskStatus
    assert hasattr(TaskStatus, 'PENDING'), "缺少 PENDING 状态"
    assert hasattr(TaskStatus, 'ASSIGNED'), "缺少 ASSIGNED 状态"
    assert hasattr(TaskStatus, 'IN_PROGRESS'), "缺少 IN_PROGRESS 状态"
    assert hasattr(TaskStatus, 'COMPLETED'), "缺少 COMPLETED 状态"
    assert hasattr(TaskStatus, 'REJECTED'), "缺少 REJECTED 状态"
    
    # 验证 Priority
    assert hasattr(Priority, 'LOW'), "缺少 LOW 优先级"
    assert hasattr(Priority, 'NORMAL'), "缺少 NORMAL 优先级"
    assert hasattr(Priority, 'HIGH'), "缺少 HIGH 优先级"
    assert hasattr(Priority, 'URGENT'), "缺少 URGENT 优先级"
    
    print("✓ 枚举类型验证通过")


def verify_relationships():
    """验证模型关系"""
    print("验证模型关系...")
    
    # 验证 Workflow -> WorkflowInstance (一对多)
    workflow_mapper = inspect(Workflow)
    instances_rel = workflow_mapper.relationships['instances']
    assert instances_rel.direction.name == 'ONETOMANY', "Workflow -> WorkflowInstance 应该是一对多关系"
    
    # 验证 WorkflowInstance -> Workflow (多对一)
    instance_mapper = inspect(WorkflowInstance)
    workflow_rel = instance_mapper.relationships['workflow']
    assert workflow_rel.direction.name == 'MANYTOONE', "WorkflowInstance -> Workflow 应该是多对一关系"
    
    # 验证 WorkflowInstance -> Task (一对多)
    tasks_rel = instance_mapper.relationships['tasks']
    assert tasks_rel.direction.name == 'ONETOMANY', "WorkflowInstance -> Task 应该是一对多关系"
    
    # 验证 Task -> WorkflowInstance (多对一)
    task_mapper = inspect(Task)
    instance_rel = task_mapper.relationships['instance']
    assert instance_rel.direction.name == 'MANYTOONE', "Task -> WorkflowInstance 应该是多对一关系"
    
    print("✓ 模型关系验证通过")


def main():
    """主函数"""
    print("=" * 60)
    print("开始验证工作流相关的 SQLAlchemy 模型")
    print("=" * 60)
    print()
    
    try:
        verify_workflow_model()
        verify_workflow_instance_model()
        verify_task_model()
        verify_enums()
        verify_relationships()
        
        print()
        print("=" * 60)
        print("✓ 所有验证通过！")
        print("=" * 60)
        return 0
        
    except AssertionError as e:
        print()
        print("=" * 60)
        print(f"✗ 验证失败: {e}")
        print("=" * 60)
        return 1
    except Exception as e:
        print()
        print("=" * 60)
        print(f"✗ 发生错误: {e}")
        print("=" * 60)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
