"""
工作流路由

实现工作流模板管理的 API 端点
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.middleware.auth import get_current_user
from app.core.permissions import PermissionChecker
from app.models.user import User
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowQuery,
    WorkflowResponse,
    WorkflowListResponse,
    ValidationResult,
)
from app.schemas.response import SuccessResponse
from app.services.workflow_service import workflow_service
from app.core.exceptions import NotFoundException


router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


@router.post(
    "",
    response_model=WorkflowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建工作流模板",
    description="创建新的工作流模板，包含节点和边的配置"
)
async def create_workflow(
    data: WorkflowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    创建工作流模板
    
    - **name**: 工作流名称（必填）
    - **description**: 工作流描述（可选）
    - **config**: 工作流配置，包含节点和边（必填）
    """
    workflow = await workflow_service.create_workflow(db, data, current_user.id)
    return workflow


@router.get(
    "",
    response_model=WorkflowListResponse,
    summary="查询工作流模板列表",
    description="查询工作流模板列表，支持分页和筛选"
)
async def list_workflows(
    status: str = None,
    isActive: bool = None,
    search: str = None,
    page: int = 1,
    pageSize: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    查询工作流模板列表
    
    - **status**: 工作流状态筛选（可选）
    - **isActive**: 是否激活筛选（可选）
    - **search**: 搜索关键词（可选）
    - **page**: 页码（默认 1）
    - **pageSize**: 每页数量（默认 20）
    """
    query = WorkflowQuery(
        status=status,
        isActive=isActive,
        search=search,
        page=page,
        pageSize=pageSize
    )
    result = await workflow_service.list_workflows(db, query)
    return result


@router.get(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="获取工作流模板详情",
    description="根据 ID 获取工作流模板的详细信息"
)
async def get_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    获取工作流模板详情
    
    - **workflow_id**: 工作流 ID
    """
    workflow = await workflow_service.get_workflow(db, workflow_id)
    if not workflow:
        raise NotFoundException(message="工作流不存在")
    return workflow


@router.put(
    "/{workflow_id}",
    response_model=WorkflowResponse,
    summary="更新工作流模板",
    description="更新工作流模板的配置，如果配置有变化会创建新版本"
)
async def update_workflow(
    workflow_id: str,
    data: WorkflowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    更新工作流模板
    
    - **workflow_id**: 工作流 ID
    - **name**: 工作流名称（可选）
    - **description**: 工作流描述（可选）
    - **config**: 工作流配置（可选）
    - **status**: 工作流状态（可选）
    - **isActive**: 是否激活（可选）
    """
    workflow = await workflow_service.update_workflow(db, workflow_id, data, current_user.id)
    return workflow


@router.delete(
    "/{workflow_id}",
    response_model=SuccessResponse,
    summary="删除工作流模板",
    description="删除工作流模板（如果有关联实例则无法删除）"
)
async def delete_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    删除工作流模板
    
    - **workflow_id**: 工作流 ID
    """
    await workflow_service.delete_workflow(db, workflow_id, current_user.id)
    return SuccessResponse(message="工作流已删除")


@router.post(
    "/{workflow_id}/validate",
    response_model=ValidationResult,
    summary="验证工作流配置",
    description="验证工作流配置的有效性，检测死循环、孤立节点等问题"
)
async def validate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    验证工作流配置
    
    - **workflow_id**: 工作流 ID
    """
    workflow = await workflow_service.get_workflow(db, workflow_id)
    if not workflow:
        raise NotFoundException(message="工作流不存在")
    
    from app.schemas.workflow import WorkflowConfig
    config = WorkflowConfig(**workflow.config)
    validation_result = workflow_service.validate_workflow(config)
    return validation_result


@router.post(
    "/{workflow_id}/activate",
    response_model=WorkflowResponse,
    summary="激活工作流",
    description="激活工作流模板，同时停用其他同名工作流"
)
async def activate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    激活工作流
    
    - **workflow_id**: 工作流 ID
    """
    workflow = await workflow_service.activate_workflow(db, workflow_id, current_user.id)
    return workflow


@router.post(
    "/{workflow_id}/deactivate",
    response_model=WorkflowResponse,
    summary="停用工作流",
    description="停用工作流模板"
)
async def deactivate_workflow(
    workflow_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    停用工作流
    
    - **workflow_id**: 工作流 ID
    """
    workflow = await workflow_service.deactivate_workflow(db, workflow_id, current_user.id)
    return workflow


@router.get(
    "/versions/{name}",
    response_model=list[WorkflowResponse],
    summary="获取工作流历史版本",
    description="获取指定名称的工作流的所有历史版本"
)
async def get_workflow_versions(
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)  # 暂时禁用权限检查
):
    """
    获取工作流历史版本
    
    - **name**: 工作流名称
    """
    workflows = await workflow_service.get_workflow_versions(db, name)
    return workflows
