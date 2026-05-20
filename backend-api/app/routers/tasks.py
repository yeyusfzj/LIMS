"""
任务路由

实现任务管理的 API 端点
"""

from typing import Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.core.permissions import PermissionChecker
from app.models.user import User
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskQuery,
    TaskResponse,
    TaskDetailResponse,
    TaskListResponse,
    TaskStatisticsResponse,
    AssignTaskRequest,
    CompleteTaskRequest,
    RejectTaskRequest,
    BatchAssignRequest,
    BatchAssignResponse,
)
from app.schemas.assignment import (
    AutoAssignRequest,
    AutoAssignResponse,
    AssignmentContext,
)
from app.schemas.response import SuccessResponse
from app.services.task_service import task_service
from app.services.assignment_engine import assignment_engine
from app.core.exceptions import NotFoundException


router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建任务",
    description="创建新的任务"
)
async def create_task(
    data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "create"))
):
    """
    创建任务
    
    - **instanceId**: 工作流实例 ID（必填）
    - **nodeId**: 节点 ID（必填）
    - **nodeName**: 节点名称（必填）
    - **nodeType**: 节点类型（必填）
    - **assignedTo**: 分配给用户 ID（可选）
    - **priority**: 优先级（可选，默认 NORMAL）
    """
    task = await task_service.create_task(db, data, current_user.id)
    return task


@router.get(
    "",
    response_model=TaskListResponse,
    summary="查询任务列表",
    description="查询任务列表，支持分页和筛选"
)
async def list_tasks(
    instanceId: Optional[str] = Query(None, description="工作流实例 ID"),
    assignedTo: Optional[str] = Query(None, description="分配给用户 ID"),
    status: Optional[str] = Query(None, description="任务状态"),
    priority: Optional[str] = Query(None, description="优先级"),
    nodeType: Optional[str] = Query(None, description="节点类型"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "read"))
):
    """
    查询任务列表
    
    - **instanceId**: 工作流实例 ID 筛选（可选）
    - **assignedTo**: 分配给用户 ID 筛选（可选）
    - **status**: 任务状态筛选（可选）
    - **priority**: 优先级筛选（可选）
    - **nodeType**: 节点类型筛选（可选）
    - **page**: 页码（默认 1）
    - **pageSize**: 每页数量（默认 20）
    """
    query = TaskQuery(
        instanceId=instanceId,
        assignedTo=assignedTo,
        status=status,
        priority=priority,
        nodeType=nodeType,
        page=page,
        pageSize=pageSize
    )
    result = await task_service.list_tasks(db, query)
    return result


@router.get(
    "/pending",
    response_model=TaskListResponse,
    summary="获取当前用户的待办任务",
    description="获取当前用户的待办任务列表"
)
async def get_user_pending_tasks(
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取当前用户的待办任务
    
    - **page**: 页码（默认 1）
    - **pageSize**: 每页数量（默认 20）
    """
    result = await task_service.get_user_pending_tasks(
        db,
        current_user.id,
        page,
        pageSize
    )
    return result


@router.get(
    "/statistics",
    response_model=TaskStatisticsResponse,
    summary="获取任务统计信息",
    description="获取任务统计信息，可按用户筛选"
)
async def get_task_statistics(
    userId: Optional[str] = Query(None, description="用户 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "read"))
):
    """
    获取任务统计信息
    
    - **userId**: 用户 ID（可选，不传则统计所有任务）
    """
    statistics = await task_service.get_task_statistics(db, userId)
    return statistics


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="获取任务详情",
    description="根据 ID 获取任务的详细信息"
)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "read"))
):
    """
    获取任务详情
    
    - **task_id**: 任务 ID
    """
    task = await task_service.get_task(db, task_id)
    if not task:
        raise NotFoundException(message="任务不存在")
    return task


@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="更新任务",
    description="更新任务信息"
)
async def update_task(
    task_id: str,
    data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "update"))
):
    """
    更新任务
    
    - **task_id**: 任务 ID
    - **assignedTo**: 分配给用户 ID（可选）
    - **status**: 任务状态（可选）
    - **priority**: 优先级（可选）
    - **result**: 任务结果（可选）
    """
    task = await task_service.update_task(db, task_id, data, current_user.id)
    return task


@router.post(
    "/{task_id}/assign",
    response_model=TaskResponse,
    summary="分配任务",
    description="将任务分配给指定用户"
)
async def assign_task(
    task_id: str,
    data: AssignTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "assign"))
):
    """
    分配任务
    
    - **task_id**: 任务 ID
    - **userId**: 用户 ID
    """
    task = await task_service.assign_task(db, task_id, data, current_user.id)
    return task


@router.post(
    "/{task_id}/start",
    response_model=TaskResponse,
    summary="开始任务",
    description="开始执行任务（将状态从 ASSIGNED 改为 IN_PROGRESS）"
)
async def start_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    开始任务
    
    - **task_id**: 任务 ID
    """
    task = await task_service.start_task(db, task_id, current_user.id)
    return task


@router.post(
    "/{task_id}/complete",
    response_model=TaskResponse,
    summary="完成任务",
    description="标记任务为已完成"
)
async def complete_task(
    task_id: str,
    data: CompleteTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    完成任务
    
    - **task_id**: 任务 ID
    - **result**: 任务执行结果（可选）
    """
    task = await task_service.complete_task(db, task_id, data, current_user.id)
    return task


@router.post(
    "/{task_id}/reject",
    response_model=TaskResponse,
    summary="拒绝任务",
    description="拒绝执行任务"
)
async def reject_task(
    task_id: str,
    data: RejectTaskRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    拒绝任务
    
    - **task_id**: 任务 ID
    - **reason**: 拒绝原因
    """
    task = await task_service.reject_task(db, task_id, data.reason, current_user.id)
    return task


@router.post(
    "/batch-assign",
    response_model=BatchAssignResponse,
    summary="批量分配任务",
    description="批量将任务分配给指定用户"
)
async def batch_assign_tasks(
    data: BatchAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "assign"))
):
    """
    批量分配任务
    
    - **taskIds**: 任务 ID 列表
    - **userId**: 用户 ID
    """
    count = await task_service.batch_assign_tasks(db, data, current_user.id)
    return BatchAssignResponse(
        count=count,
        message=f"成功分配 {count} 个任务"
    )


@router.post(
    "/{task_id}/auto-assign",
    response_model=AutoAssignResponse,
    summary="自动分配任务",
    description="使用自动分配引擎根据规则自动分配任务"
)
async def auto_assign_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(PermissionChecker("task", "assign"))
):
    """
    自动分配任务
    
    根据配置的派工规则（技能匹配、负载均衡、轮询等）自动选择最合适的用户分配任务。
    
    - **task_id**: 任务 ID
    
    返回分配结果，包括：
    - 是否成功
    - 分配给的用户信息
    - 候选人列表及其匹配分数
    - 使用的派工策略
    """
    # 获取任务详情
    task = await task_service.get_task(db, task_id)
    if not task:
        raise NotFoundException(message="任务不存在")
    
    # 检查任务是否已分配
    if task.status not in [TaskStatus.PENDING, TaskStatus.ASSIGNED]:
        return AutoAssignResponse(
            success=False,
            message="任务状态不正确，无法自动分配",
            result=None
        )
    
    # 构建派工上下文
    context = AssignmentContext(
        taskId=task.id,
        nodeType=task.nodeType,
        nodeName=task.nodeName,
        priority=task.priority.value,
        instanceId=task.instanceId,
        sampleId=None,  # 如果需要，可以从工作流实例中获取
        sampleType=None,
        sampleCategory=None,
        testMethod=None,
        workflowId=None
    )
    
    # 执行自动分配
    result = await assignment_engine.auto_assign(db, context)
    
    if result.success:
        return AutoAssignResponse(
            success=True,
            message=f"任务已自动分配给 {result.assignedUser['username']}",
            result=result
        )
    else:
        return AutoAssignResponse(
            success=False,
            message=result.reason or "自动分配失败",
            result=result
        )
