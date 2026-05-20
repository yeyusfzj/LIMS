"""
样品管理 API 路由

实现样品的 CRUD 操作端点:
- POST /api/v1/samples - 创建样品
- GET /api/v1/samples - 查询样品列表（支持分页）
- GET /api/v1/samples/{id} - 获取样品详情
- PATCH /api/v1/samples/{id} - 更新样品
- DELETE /api/v1/samples/{id} - 删除样品
- PATCH /api/v1/samples/{id}/status - 更新状态
- GET /api/v1/samples/barcode/{barcode} - 按条码查询
- POST /api/v1/samples/batch-delete - 批量删除
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Body, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.api.deps import get_current_user, require_permission
from app.services.sample_service import SampleService
from app.schemas.sample import (
    SampleCreate,
    SampleUpdate,
    SampleResponse,
    SampleListResponse,
    SampleStatusUpdate,
    BatchDeleteRequest,
    BatchDeleteResponse
)
from app.schemas.response import SuccessResponse, PaginationInfo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/samples", tags=["samples"])


@router.post(
    "",
    response_model=SuccessResponse[SampleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建样品",
    description="创建新样品，自动生成条码和样品编号"
)
async def create_sample(
    sample_data: SampleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:create"))
):
    """
    创建新样品
    
    权限要求: sample:create
    
    请求体:
    - name: 样品名称（必填）
    - type: 样品类型（必填）
    - source: 样品来源（可选）
    - description: 样品描述（可选）
    - storage_location: 存储位置（可选）
    - retention_days: 保留天数（可选）
    - properties: 自定义属性（可选）
    
    返回:
    - 创建的样品信息，包含自动生成的条码和样品编号
    """
    service = SampleService(db)
    sample = await service.create_sample(
        sample_data=sample_data,
        created_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="样品创建成功"
    )


@router.get(
    "",
    response_model=SuccessResponse[SampleListResponse],
    summary="查询样品列表",
    description="分页查询样品列表，支持多条件过滤"
)
async def list_samples(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    barcode: Optional[str] = Query(None, description="条码（模糊匹配）"),
    sample_number: Optional[str] = Query(None, description="样品编号（模糊匹配）"),
    name: Optional[str] = Query(None, description="样品名称（模糊匹配）"),
    type: Optional[str] = Query(None, description="样品类型"),
    status: Optional[str] = Query(None, description="样品状态"),
    source: Optional[str] = Query(None, description="样品来源（模糊匹配）"),
    storage_location: Optional[str] = Query(None, description="存储位置（模糊匹配）"),
    include_archived: bool = Query(False, description="是否包含已归档样品"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read"))
):
    """
    查询样品列表
    
    权限要求: sample:read
    
    查询参数:
    - page: 页码（默认 1）
    - page_size: 每页数量（默认 20，最大 100）
    - barcode: 条码过滤（模糊匹配）
    - sample_number: 样品编号过滤（模糊匹配）
    - name: 样品名称过滤（模糊匹配）
    - type: 样品类型过滤（精确匹配）
    - status: 样品状态过滤（精确匹配）
    - source: 样品来源过滤（模糊匹配）
    - storage_location: 存储位置过滤（模糊匹配）
    - include_archived: 是否包含已归档样品（默认 false）
    
    返回:
    - items: 样品列表
    - pagination: 分页信息（total, page, page_size, total_pages）
    """
    service = SampleService(db)
    
    samples, meta = await service.get_samples(
        page=page,
        page_size=page_size,
        barcode=barcode,
        sample_number=sample_number,
        client_name=name,
        sample_type=type,
        status=status,
        exclude_archived=not include_archived
    )
    
    return SuccessResponse(
        data=SampleListResponse(
            items=[SampleResponse.model_validate(s) for s in samples],
            pagination=PaginationInfo(
                total=meta.total,
                page=meta.page,
                pageSize=meta.pageSize,
                totalPages=meta.totalPages
            )
        ),
        message="查询成功"
    )


@router.get(
    "/{sample_id}",
    response_model=SuccessResponse[SampleResponse],
    summary="获取样品详情",
    description="根据样品 ID 获取详细信息"
)
async def get_sample(
    sample_id: str = Path(..., description="样品 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read"))
):
    """
    获取样品详情
    
    权限要求: sample:read
    
    路径参数:
    - sample_id: 样品 ID
    
    返回:
    - 样品详细信息
    
    异常:
    - 404: 样品不存在
    """
    service = SampleService(db)
    sample = await service.get_sample_by_id(sample_id)
    
    if not sample:
        raise NotFoundException(f"样品不存在: {sample_id}")
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="查询成功"
    )


@router.patch(
    "/{sample_id}",
    response_model=SuccessResponse[SampleResponse],
    summary="更新样品",
    description="部分更新样品信息"
)
async def update_sample(
    sample_id: str = Path(..., description="样品 ID"),
    update_data: SampleUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:update"))
):
    """
    更新样品信息
    
    权限要求: sample:update
    
    路径参数:
    - sample_id: 样品 ID
    
    请求体:
    - name: 样品名称（可选）
    - source: 样品来源（可选）
    - description: 样品描述（可选）
    - storage_location: 存储位置（可选）
    - retention_days: 保留天数（可选）
    - properties: 自定义属性（可选）
    
    注意:
    - 只更新提供的字段
    - 受保护字段（barcode, sample_number, type, status）不可通过此接口更新
    - updated_at 自动更新
    
    返回:
    - 更新后的样品信息
    
    异常:
    - 404: 样品不存在
    - 400: 验证失败
    """
    logger.info(f"🔵 API路由 - 收到更新请求: sample_id={sample_id}")
    logger.info(f"🔵 API路由 - update_data类型: {type(update_data)}")
    logger.info(f"🔵 API路由 - update_data内容: {update_data}")
    logger.info(f"🔵 API路由 - update_data.model_dump(): {update_data.model_dump(exclude_unset=True)}")
    
    service = SampleService(db)
    sample = await service.update_sample(
        sample_id=sample_id,
        sample_data=update_data
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="样品更新成功"
    )


@router.delete(
    "/{sample_id}",
    response_model=SuccessResponse[SampleResponse],
    summary="删除样品",
    description="软删除样品（更新状态为 ARCHIVED）"
)
async def delete_sample(
    sample_id: str = Path(..., description="样品 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:delete"))
):
    """
    删除样品（软删除）
    
    权限要求: sample:delete
    
    路径参数:
    - sample_id: 样品 ID
    
    业务逻辑:
    - 将样品状态更新为 ARCHIVED
    - 不会物理删除数据库记录
    - 检查是否有关联的审核任务或报告
    - 记录审计日志
    
    返回:
    - 更新后的样品信息（状态为 ARCHIVED）
    
    异常:
    - 404: 样品不存在
    - 400: 样品已归档或有关联数据
    """
    service = SampleService(db)
    sample = await service.delete_sample(
        sample_id=sample_id,
        deleted_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="样品删除成功"
    )


@router.patch(
    "/{sample_id}/status",
    response_model=SuccessResponse[SampleResponse],
    summary="更新样品状态",
    description="更新样品状态"
)
async def update_sample_status(
    sample_id: str = Path(..., description="样品 ID"),
    status_data: SampleStatusUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:update"))
):
    """
    更新样品状态
    
    权限要求: sample:update
    
    路径参数:
    - sample_id: 样品 ID
    
    请求体:
    - status: 新状态（必填）
    - released_by: 放行人（状态为 RELEASED 时必填）
    - released_at: 放行时间（状态为 RELEASED 时可选）
    
    有效状态:
    - REGISTERED: 已登记
    - IN_TESTING: 检测中
    - TESTED: 已检测
    - RELEASED: 已放行
    - ARCHIVED: 已归档
    
    返回:
    - 更新后的样品信息
    
    异常:
    - 404: 样品不存在
    - 400: 状态值无效或缺少必填字段
    """
    service = SampleService(db)
    sample = await service.update_sample_status(
        sample_id=sample_id,
        new_status=status_data.status,
        updated_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="样品状态更新成功"
    )


@router.get(
    "/barcode/{barcode}",
    response_model=SuccessResponse[SampleResponse],
    summary="按条码查询样品",
    description="根据条码查询样品信息"
)
async def get_sample_by_barcode(
    barcode: str = Path(..., description="样品条码"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read"))
):
    """
    按条码查询样品
    
    权限要求: sample:read
    
    路径参数:
    - barcode: 样品条码
    
    返回:
    - 样品详细信息
    
    异常:
    - 404: 样品不存在
    """
    service = SampleService(db)
    sample = await service.get_sample_by_barcode(barcode)
    
    if not sample:
        raise NotFoundException(f"样品不存在: {barcode}")
    
    return SuccessResponse(
        data=SampleResponse.model_validate(sample),
        message="查询成功"
    )


@router.post(
    "/batch-delete",
    response_model=SuccessResponse[BatchDeleteResponse],
    summary="批量删除样品",
    description="批量软删除样品"
)
async def batch_delete_samples(
    request: BatchDeleteRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:delete"))
):
    """
    批量删除样品
    
    权限要求: sample:delete
    
    请求体:
    - sample_ids: 样品 ID 列表（必填）
    
    业务逻辑:
    - 遍历所有样品 ID
    - 对每个样品执行软删除
    - 记录成功和失败的样品
    - 返回统计信息
    
    返回:
    - total: 总数
    - success: 成功数量
    - failed: 失败数量
    - success_ids: 成功的样品 ID 列表
    - failed_details: 失败详情列表
    
    注意:
    - 部分成功的情况下仍返回 200 状态码
    - 通过 failed_details 查看失败原因
    """
    service = SampleService(db)
    result = await service.batch_delete_samples(
        sample_ids=request.sample_ids,
        deleted_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=BatchDeleteResponse(**result),
        message=f"批量删除完成: 成功 {result['success']} 个, 失败 {result['failed']} 个"
    )
