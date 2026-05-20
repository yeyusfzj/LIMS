"""
任务服务测试

测试任务管理的核心功能
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.task_service import task_service
from app.schemas.task import TaskCreate, TaskUpdate, AssignTaskRequest, CompleteTaskRequest
from app.models.task import Task, TaskStatus, Priority
from app.models.workflow import WorkflowInstance
from app.models.user import User
from app.core.exceptions import NotFoundException, ConflictException, ValidationException


@pytest.fixture
def mock_db():
    """模拟数据库会话"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def sample_task():
    """示例任务"""
    return Task(
        id="task-123",
        instanceId="instance-123",
        nodeId="node-1",
        nodeName="样品登记",
        nodeType="TASK",
        assignedTo=None,
        assignedAt=None,
        status=TaskStatus.PENDING,
        priority=Priority.NORMAL,
        result=None,
        completedAt=None,
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )


@pytest.fixture
def sample_workflow_instance():
    """示例工作流实例"""
    return WorkflowInstance(
        id="instance-123",
        workflowId="workflow-123",
        sampleId="sample-123",
        currentNodes=["node-1"],
        status="RUNNING",
        variables={},
        startedAt=datetime.utcnow()
    )


@pytest.fixture
def sample_user():
    """示例用户"""
    return User(
        id="user-123",
        username="testuser",
        passwordHash="hashed_password",
        email="test@example.com",
        fullName="Test User",
        status="ACTIVE",
        createdAt=datetime.utcnow(),
        updatedAt=datetime.utcnow()
    )


class TestTaskService:
    """任务服务测试类"""

    @pytest.mark.asyncio
    async def test_create_task_success(self, mock_db, sample_workflow_instance):
        """测试创建任务成功"""
        # 准备测试数据
        task_data = TaskCreate(
            instanceId="instance-123",
            nodeId="node-1",
            nodeName="样品登记",
            nodeType="TASK",
            assignedTo=None,
            priority=Priority.NORMAL
        )

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_workflow_instance
        mock_db.execute.return_value = mock_result

        # 执行测试
        task = await task_service.create_task(mock_db, task_data, "user-123")

        # 验证结果
        assert task.instanceId == task_data.instanceId
        assert task.nodeId == task_data.nodeId
        assert task.nodeName == task_data.nodeName
        assert task.status == TaskStatus.PENDING
        assert task.priority == Priority.NORMAL

    @pytest.mark.asyncio
    async def test_create_task_with_assignment(self, mock_db, sample_workflow_instance, sample_user):
        """测试创建任务并分配"""
        # 准备测试数据
        task_data = TaskCreate(
            instanceId="instance-123",
            nodeId="node-1",
            nodeName="样品登记",
            nodeType="TASK",
            assignedTo="user-123",
            priority=Priority.HIGH
        )

        # 模拟数据库查询
        mock_instance_result = MagicMock()
        mock_instance_result.scalar_one_or_none.return_value = sample_workflow_instance
        
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = sample_user
        
        mock_db.execute.side_effect = [mock_instance_result, mock_user_result]

        # 执行测试
        task = await task_service.create_task(mock_db, task_data, "user-123")

        # 验证结果
        assert task.assignedTo == "user-123"
        assert task.status == TaskStatus.ASSIGNED
        assert task.assignedAt is not None

    @pytest.mark.asyncio
    async def test_create_task_instance_not_found(self, mock_db):
        """测试创建任务时工作流实例不存在"""
        # 准备测试数据
        task_data = TaskCreate(
            instanceId="nonexistent-instance",
            nodeId="node-1",
            nodeName="样品登记",
            nodeType="TASK"
        )

        # 模拟数据库查询返回 None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # 执行测试并验证异常
        with pytest.raises(NotFoundException) as exc_info:
            await task_service.create_task(mock_db, task_data, "user-123")
        
        assert "工作流实例不存在" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_assign_task_success(self, mock_db, sample_task, sample_user):
        """测试分配任务成功"""
        # 准备测试数据
        assign_data = AssignTaskRequest(userId="user-123")

        # 模拟数据库查询
        mock_task_result = MagicMock()
        mock_task_result.scalar_one_or_none.return_value = sample_task
        
        mock_user_result = MagicMock()
        mock_user_result.scalar_one_or_none.return_value = sample_user
        
        mock_db.execute.side_effect = [mock_task_result, mock_user_result]

        # 执行测试
        task = await task_service.assign_task(mock_db, "task-123", assign_data, "admin-123")

        # 验证结果
        assert task.assignedTo == "user-123"
        assert task.status == TaskStatus.ASSIGNED
        assert task.assignedAt is not None

    @pytest.mark.asyncio
    async def test_assign_task_already_completed(self, mock_db, sample_task):
        """测试分配已完成的任务"""
        # 设置任务为已完成状态
        sample_task.status = TaskStatus.COMPLETED
        
        # 准备测试数据
        assign_data = AssignTaskRequest(userId="user-123")

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_task
        mock_db.execute.return_value = mock_result

        # 执行测试并验证异常
        with pytest.raises(ConflictException) as exc_info:
            await task_service.assign_task(mock_db, "task-123", assign_data, "admin-123")
        
        assert "任务已完成" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_complete_task_success(self, mock_db, sample_task):
        """测试完成任务成功"""
        # 设置任务为已分配状态
        sample_task.status = TaskStatus.ASSIGNED
        sample_task.assignedTo = "user-123"
        
        # 准备测试数据
        complete_data = CompleteTaskRequest(
            result={"status": "success", "data": {"testResult": "合格"}}
        )

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_task
        mock_db.execute.return_value = mock_result

        # 执行测试
        task = await task_service.complete_task(mock_db, "task-123", complete_data, "user-123")

        # 验证结果
        assert task.status == TaskStatus.COMPLETED
        assert task.result == complete_data.result
        assert task.completedAt is not None

    @pytest.mark.asyncio
    async def test_complete_task_not_assigned_to_user(self, mock_db, sample_task):
        """测试完成未分配给当前用户的任务"""
        # 设置任务分配给其他用户
        sample_task.status = TaskStatus.ASSIGNED
        sample_task.assignedTo = "other-user"
        
        # 准备测试数据
        complete_data = CompleteTaskRequest(result={})

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_task
        mock_db.execute.return_value = mock_result

        # 执行测试并验证异常
        with pytest.raises(ValidationException) as exc_info:
            await task_service.complete_task(mock_db, "task-123", complete_data, "user-123")
        
        assert "任务未分配给当前用户" in str(exc_info.value.message)

    @pytest.mark.asyncio
    async def test_start_task_success(self, mock_db, sample_task):
        """测试开始任务成功"""
        # 设置任务为已分配状态
        sample_task.status = TaskStatus.ASSIGNED
        sample_task.assignedTo = "user-123"

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_task
        mock_db.execute.return_value = mock_result

        # 执行测试
        task = await task_service.start_task(mock_db, "task-123", "user-123")

        # 验证结果
        assert task.status == TaskStatus.IN_PROGRESS

    @pytest.mark.asyncio
    async def test_reject_task_success(self, mock_db, sample_task):
        """测试拒绝任务成功"""
        # 设置任务为已分配状态
        sample_task.status = TaskStatus.ASSIGNED
        sample_task.assignedTo = "user-123"

        # 模拟数据库查询
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_task
        mock_db.execute.return_value = mock_result

        # 执行测试
        task = await task_service.reject_task(mock_db, "task-123", "样品信息不完整", "user-123")

        # 验证结果
        assert task.status == TaskStatus.REJECTED
        assert task.result == {"reason": "样品信息不完整"}
        assert task.completedAt is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
