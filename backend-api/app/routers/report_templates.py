"""
报告模板路由
"""

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.core.security import JWTPayload
from app.schemas.report_template import (
    ReportTemplateCreate,
    ReportTemplateUpdate,
    ReportTemplateResponse,
    ReportTemplateQuery,
    ReportTemplateVersionInfo
)
from app.schemas.response import SuccessResponse, PaginatedResponse, PaginatedData
from app.services.report_template_service import report_template_service
from app.core.logging import logger


router = APIRouter(prefix="/api/v1/report-templates", tags=["report-templates"])


@router.post(
    "",
    response_model=SuccessResponse[ReportTemplateResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建报告模板",
    description="创建新的报告模板，包括模板内容和变量定义"
)
async def create_template(
    data: ReportTemplateCreate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    创建报告模板
    
    - **name**: 模板名称（必填）
    - **description**: 模板描述
    - **category**: 模板分类（必填）
    - **content**: 模板内容，HTML格式（必填）
    - **variables**: 模板变量定义列表（必填）
    """
    template = await report_template_service.create_template(
        db=db,
        data=data,
        user_id=current_user["userId"]
    )
    
    return SuccessResponse(
        message="报告模板创建成功",
        data=ReportTemplateResponse.model_validate(template)
    )


@router.get(
    "",
    response_model=PaginatedResponse[ReportTemplateResponse],
    summary="查询报告模板列表",
    description="分页查询报告模板列表，支持按分类、状态和关键词筛选"
)
async def list_templates(
    category: Optional[str] = Query(None, description="模板分类"),
    isActive: Optional[bool] = Query(None, description="是否激活"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    pageSize: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    查询报告模板列表
    
    - **category**: 按分类筛选
    - **isActive**: 按激活状态筛选
    - **search**: 按名称或描述搜索
    - **page**: 页码
    - **pageSize**: 每页数量
    """
    query = ReportTemplateQuery(
        category=category,
        isActive=isActive,
        search=search,
        page=page,
        pageSize=pageSize
    )
    
    result = await report_template_service.list_templates(db=db, query=query)
    
    return PaginatedResponse(
        data=PaginatedData(
            items=result.items,
            total=result.total,
            page=result.page,
            pageSize=result.pageSize,
            totalPages=result.totalPages
        )
    )


@router.get(
    "/{template_id}",
    response_model=SuccessResponse[ReportTemplateResponse],
    summary="获取报告模板详情",
    description="根据ID获取报告模板的详细信息"
)
async def get_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    获取报告模板详情
    
    - **template_id**: 模板ID
    """
    template = await report_template_service.get_template(
        db=db,
        template_id=template_id
    )
    
    return SuccessResponse(
        data=ReportTemplateResponse.model_validate(template)
    )


@router.put(
    "/{template_id}",
    response_model=SuccessResponse[ReportTemplateResponse],
    summary="更新报告模板",
    description="更新报告模板信息，如果更新内容或变量会创建新版本"
)
async def update_template(
    template_id: str,
    data: ReportTemplateUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    更新报告模板
    
    - **template_id**: 模板ID
    - **data**: 更新数据（所有字段可选）
    
    注意：如果更新了 content 或 variables，会自动创建新版本
    """
    template = await report_template_service.update_template(
        db=db,
        template_id=template_id,
        data=data,
        user_id=current_user["userId"]
    )
    
    return SuccessResponse(
        message="报告模板更新成功",
        data=ReportTemplateResponse.model_validate(template)
    )


@router.post(
    "/{template_id}/activate",
    response_model=SuccessResponse[ReportTemplateResponse],
    summary="激活报告模板",
    description="将报告模板设置为激活状态"
)
async def activate_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    激活报告模板
    
    - **template_id**: 模板ID
    """
    template = await report_template_service.activate_template(
        db=db,
        template_id=template_id,
        user_id=current_user["userId"]
    )
    
    return SuccessResponse(
        message="模板已激活",
        data=ReportTemplateResponse.model_validate(template)
    )


@router.post(
    "/{template_id}/deactivate",
    response_model=SuccessResponse[ReportTemplateResponse],
    summary="停用报告模板",
    description="将报告模板设置为停用状态"
)
async def deactivate_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    停用报告模板
    
    - **template_id**: 模板ID
    """
    template = await report_template_service.deactivate_template(
        db=db,
        template_id=template_id,
        user_id=current_user["userId"]
    )
    
    return SuccessResponse(
        message="模板已停用",
        data=ReportTemplateResponse.model_validate(template)
    )


@router.delete(
    "/{template_id}",
    response_model=SuccessResponse[None],
    summary="删除报告模板",
    description="删除报告模板（仅当模板未被使用时）"
)
async def delete_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    删除报告模板
    
    - **template_id**: 模板ID
    
    注意：如果模板已被使用，无法删除，需要先停用
    """
    await report_template_service.delete_template(
        db=db,
        template_id=template_id,
        user_id=current_user["userId"]
    )
    
    return SuccessResponse(
        message="模板已删除"
    )


@router.get(
    "/{template_id}/versions",
    response_model=SuccessResponse[ReportTemplateVersionInfo],
    summary="获取模板版本信息",
    description="获取报告模板的版本信息"
)
async def get_template_versions(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: JWTPayload = Depends(get_current_user)
):
    """
    获取模板版本信息
    
    - **template_id**: 模板ID
    """
    versions = await report_template_service.get_template_versions(
        db=db,
        template_id=template_id
    )
    
    return SuccessResponse(
        data=versions
    )
