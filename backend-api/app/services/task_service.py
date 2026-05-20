"""
任务管理服务

实现任务的创建、查询、更新、删除、分配和执行功能
"""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, or_, func
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.models.task import Task, TaskStatus, Priority
from app.models.workflow import WorkflowInstance
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskQuery,
    AssignTaskRequest,
    CompleteTaskRequest,
    BatchAssignRequest,
)
from app.schemas.assignment import AssignmentContext
from app.core.exceptions import (
    NotFoundException,
    ValidationException,
    ConflictException,
)
from app.core.logging import logger


class TaskService:
    """任务服务类"""

    async def create_task(
        self,
        db: AsyncSession,
        data: TaskCreate,
        user_id: Optional[str] = None
    ) -> Task:
        """创建任务"""
        # 验证工作流实例是否存在
        result = await db.execute(
            select(WorkflowInstance)
            .where(WorkflowInstance.id == data.instanceId)
        )
        instance = result.scalar_one_or_none()

        if not instance:
            raise NotFoundException(message="工作流实例不存在")

        # 如果指定了分配人员，验证用户是否存在
        if data.assignedTo:
            user_result = await db.execute(
                select(User).where(User.id == data.assignedTo)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                raise NotFoundException(message="指定的用户不存在")

        # 创建任务
        task = Task(
            instanceId=data.instanceId,
            nodeId=data.nodeId,
            nodeName=data.nodeName,
            nodeType=data.nodeType,
            assignedTo=data.assignedTo,
            assignedAt=datetime.utcnow() if data.assignedTo else None,
            status=TaskStatus.ASSIGNED if data.assignedTo else TaskStatus.PENDING,
            priority=data.priority or Priority.NORMAL,
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已创建: {task.id}", extra={
            "taskId": task.id,
            "instanceId": data.instanceId,
            "nodeId": data.nodeId,
            "assignedTo": data.assignedTo
        })

        return task

    async def get_task(
        self,
        db: AsyncSession,
        task_id: str,
        include_relations: bool = True
    ) -> Optional[Task]:
        """获取任务详情"""
        query = select(Task).where(Task.id == task_id)
        
        if include_relations:
            query = query.options(
                selectinload(Task.instance)
            )
        
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        db: AsyncSession,
        query: TaskQuery
    ) -> Dict[str, Any]:
        """查询任务列表"""
        # 构建查询条件
        conditions = []

        if query.instanceId:
            conditions.append(Task.instanceId == query.instanceId)

        if query.assignedTo:
            conditions.append(Task.assignedTo == query.assignedTo)

        if query.status:
            conditions.append(Task.status == query.status)

        if query.priority:
            conditions.append(Task.priority == query.priority)

        if query.nodeType:
            conditions.append(Task.nodeType == query.nodeType)

        # 计算分页
        skip = (query.page - 1) * query.pageSize

        # 查询总数
        count_query = select(func.count(Task.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))

        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 查询数据
        data_query = select(Task).options(
            selectinload(Task.instance)
        ).order_by(
            Task.priority.desc(),  # 优先级高的在前
            Task.createdAt.desc()  # 创建时间新的在前
        )
        
        if conditions:
            data_query = data_query.where(and_(*conditions))
        
        data_query = data_query.offset(skip).limit(query.pageSize)

        result = await db.execute(data_query)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": query.page,
            "pageSize": query.pageSize,
            "totalPages": (total + query.pageSize - 1) // query.pageSize
        }

    async def update_task(
        self,
        db: AsyncSession,
        task_id: str,
        data: TaskUpdate,
        user_id: str
    ) -> Task:
        """更新任务"""
        # 获取任务
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            raise NotFoundException(message="任务不存在")

        # 检查任务状态
        if task.status == TaskStatus.COMPLETED:
            raise ConflictException(message="任务已完成，无法修改")

        # 如果更新分配人员，验证用户是否存在
        if data.assignedTo:
            user_result = await db.execute(
                select(User).where(User.id == data.assignedTo)
            )
            user = user_result.scalar_one_or_none()
            if not user:
                raise NotFoundException(message="指定的用户不存在")

        # 更新字段
        if data.assignedTo is not None:
            task.assignedTo = data.assignedTo
            if data.assignedTo and not task.assignedAt:
                task.assignedAt = datetime.utcnow()

        if data.status is not None:
            task.status = data.status

        if data.priority is not None:
            task.priority = data.priority

        if data.result is not None:
            task.result = data.result

        task.updatedAt = datetime.utcnow()

        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已更新: {task_id}", extra={
            "taskId": task_id,
            "userId": user_id,
            "updates": data.model_dump(exclude_unset=True)
        })

        return task

    async def assign_task(
        self,
        db: AsyncSession,
        task_id: str,
        data: AssignTaskRequest,
        user_id: str
    ) -> Task:
        """分配任务"""
        # 获取任务
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            raise NotFoundException(message="任务不存在")

        # 检查任务状态
        if task.status == TaskStatus.COMPLETED:
            raise ConflictException(message="任务已完成，无法重新分配")

        if task.status == TaskStatus.REJECTED:
            raise ConflictException(message="任务已拒绝，无法重新分配")

        # 验证用户是否存在
        user_result = await db.execute(
            select(User).where(User.id == data.userId)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise NotFoundException(message="用户不存在")

        # 更新任务分配
        task.assignedTo = data.userId
        task.assignedAt = datetime.utcnow()
        task.status = TaskStatus.ASSIGNED

        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已分配: {task_id}", extra={
            "taskId": task_id,
            "assignedTo": data.userId,
            "assignedBy": user_id
        })

        return task

    async def complete_task(
        self,
        db: AsyncSession,
        task_id: str,
        data: CompleteTaskRequest,
        user_id: str
    ) -> Task:
        """完成任务"""
        # 获取任务
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            raise NotFoundException(message="任务不存在")

        # 检查任务状态
        if task.status == TaskStatus.COMPLETED:
            raise ConflictException(message="任务已完成")

        if task.status == TaskStatus.REJECTED:
            raise ConflictException(message="任务已拒绝，无法完成")

        # 检查任务是否分配给当前用户
        if task.assignedTo and task.assignedTo != user_id:
            raise ValidationException(message="任务未分配给当前用户")

        # 更新任务状态为完成
        task.status = TaskStatus.COMPLETED
        task.result = data.result
        task.completedAt = datetime.utcnow()

        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已完成: {task_id}", extra={
            "taskId": task_id,
            "userId": user_id,
            "result": data.result
        })

        return task

    async def start_task(
        self,
        db: AsyncSession,
        task_id: str,
        user_id: str
    ) -> Task:
        """开始任务（将状态从 ASSIGNED 改为 IN_PROGRESS）"""
        # 获取任务
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            raise NotFoundException(message="任务不存在")

        # 检查任务状态
        if task.status not in [TaskStatus.ASSIGNED, TaskStatus.PENDING]:
            raise ConflictException(message="任务状态不正确，无法开始")

        # 检查任务是否分配给当前用户
        if task.assignedTo and task.assignedTo != user_id:
            raise ValidationException(message="任务未分配给当前用户")

        # 如果任务未分配，先分配给当前用户
        if not task.assignedTo:
            task.assignedTo = user_id
            task.assignedAt = datetime.utcnow()

        # 更新任务状态
        task.status = TaskStatus.IN_PROGRESS

        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已开始: {task_id}", extra={
            "taskId": task_id,
            "userId": user_id
        })

        return task

    async def reject_task(
        self,
        db: AsyncSession,
        task_id: str,
        reason: str,
        user_id: str
    ) -> Task:
        """拒绝任务"""
        # 获取任务
        result = await db.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()

        if not task:
            raise NotFoundException(message="任务不存在")

        # 检查任务状态
        if task.status == TaskStatus.COMPLETED:
            raise ConflictException(message="任务已完成，无法拒绝")

        if task.status == TaskStatus.REJECTED:
            raise ConflictException(message="任务已拒绝")

        # 检查任务是否分配给当前用户
        if task.assignedTo and task.assignedTo != user_id:
            raise ValidationException(message="任务未分配给当前用户")

        # 更新任务状态为拒绝
        task.status = TaskStatus.REJECTED
        task.result = {"reason": reason}
        task.completedAt = datetime.utcnow()

        await db.commit()
        await db.refresh(task)

        logger.info(f"任务已拒绝: {task_id}", extra={
            "taskId": task_id,
            "userId": user_id,
            "reason": reason
        })

        return task

    async def get_user_pending_tasks(
        self,
        db: AsyncSession,
        user_id: str,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """获取用户的待办任务"""
        skip = (page - 1) * page_size

        # 构建查询条件
        conditions = [
            Task.assignedTo == user_id,
            Task.status.in_([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS])
        ]

        # 查询总数
        count_query = select(func.count(Task.id)).where(and_(*conditions))
        total_result = await db.execute(count_query)
        total = total_result.scalar()

        # 查询数据
        data_query = select(Task).options(
            selectinload(Task.instance)
        ).where(and_(*conditions)).order_by(
            Task.priority.desc(),
            Task.createdAt.desc()
        ).offset(skip).limit(page_size)

        result = await db.execute(data_query)
        items = result.scalars().all()

        return {
            "items": items,
            "total": total,
            "page": page,
            "pageSize": page_size,
            "totalPages": (total + page_size - 1) // page_size
        }

    async def get_task_statistics(
        self,
        db: AsyncSession,
        user_id: Optional[str] = None
    ) -> Dict[str, int]:
        """获取任务统计信息"""
        # 构建基础条件
        base_conditions = []
        if user_id:
            base_conditions.append(Task.assignedTo == user_id)

        # 查询各状态的任务数
        total_query = select(func.count(Task.id))
        if base_conditions:
            total_query = total_query.where(and_(*base_conditions))

        pending_query = select(func.count(Task.id)).where(
            and_(*(base_conditions + [Task.status == TaskStatus.PENDING]))
        )

        assigned_query = select(func.count(Task.id)).where(
            and_(*(base_conditions + [Task.status == TaskStatus.ASSIGNED]))
        )

        in_progress_query = select(func.count(Task.id)).where(
            and_(*(base_conditions + [Task.status == TaskStatus.IN_PROGRESS]))
        )

        completed_query = select(func.count(Task.id)).where(
            and_(*(base_conditions + [Task.status == TaskStatus.COMPLETED]))
        )

        rejected_query = select(func.count(Task.id)).where(
            and_(*(base_conditions + [Task.status == TaskStatus.REJECTED]))
        )

        # 执行所有查询
        total_result = await db.execute(total_query)
        pending_result = await db.execute(pending_query)
        assigned_result = await db.execute(assigned_query)
        in_progress_result = await db.execute(in_progress_query)
        completed_result = await db.execute(completed_query)
        rejected_result = await db.execute(rejected_query)

        return {
            "total": total_result.scalar(),
            "pending": pending_result.scalar(),
            "assigned": assigned_result.scalar(),
            "inProgress": in_progress_result.scalar(),
            "completed": completed_result.scalar(),
            "rejected": rejected_result.scalar(),
        }

    async def batch_assign_tasks(
        self,
        db: AsyncSession,
        data: BatchAssignRequest,
        user_id: str
    ) -> int:
        """批量分配任务"""
        # 验证用户是否存在
        user_result = await db.execute(
            select(User).where(User.id == data.userId)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise NotFoundException(message="用户不存在")

        # 批量更新任务
        result = await db.execute(
            update(Task)
            .where(
                and_(
                    Task.id.in_(data.taskIds),
                    Task.status.in_([TaskStatus.PENDING, TaskStatus.ASSIGNED])
                )
            )
            .values(
                assignedTo=data.userId,
                assignedAt=datetime.utcnow(),
                status=TaskStatus.ASSIGNED
            )
        )

        await db.commit()

        count = result.rowcount

        logger.info(f"批量分配任务: {count} 个任务", extra={
            "taskIds": data.taskIds,
            "assignedTo": data.userId,
            "assignedBy": user_id,
            "count": count
        })

        return count


# 创建服务实例
task_service = TaskService()
