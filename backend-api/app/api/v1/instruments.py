"""
仪器管理 API 路由

实现仪器的 CRUD 操作端点:
- POST /api/v1/instruments - 创建仪器
- GET /api/v1/instruments - 查询仪器列表
- GET /api/v1/instruments/{id} - 获取仪器详情
- PATCH /api/v1/instruments/{id} - 更新仪器
- DELETE /api/v1/instruments/{id} - 删除仪器
- PATCH /api/v1/instruments/{id}/status - 更新状态
- GET /api/v1/instruments/code/{code} - 按编码查询
"""

import logging
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, Path, Body, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundException, ValidationException
from app.api.deps import get_current_user, require_permission
from app.services.instrument_service import InstrumentService
from app.schemas.instrument import (
    InstrumentCreate,
    InstrumentUpdate,
    InstrumentResponse,
    InstrumentListResponse,
    InstrumentStatusUpdate
)
from app.schemas.response import SuccessResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/instruments", tags=["instruments"])


@router.post(
    "",
    response_model=SuccessResponse[InstrumentResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建仪器",
    description="创建新仪器"
)
async def create_instrument(
    instrument_data: InstrumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:create"))
):
    """创建新仪器"""
    service = InstrumentService(db)
    instrument = await service.create_instrument(
        instrument_data=instrument_data,
        created_by=current_user["user_id"]
    )
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="仪器创建成功"
    )


@router.get(
    "",
    response_model=SuccessResponse[InstrumentListResponse],
    summary="查询仪器列表",
    description="分页查询仪器列表，支持多条件过滤"
)
async def list_instruments(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    code: Optional[str] = Query(None, description="编码（模糊匹配）"),
    name: Optional[str] = Query(None, description="名称（模糊匹配）"),
    department: Optional[str] = Query(None, description="部门"),
    status: Optional[str] = Query(None, description="状态"),
    include_disposed: bool = Query(False, description="是否包含已报废仪器"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:read"))
):
    """查询仪器列表"""
    service = InstrumentService(db)
    
    instruments, meta = await service.get_instruments(
        page=page,
        page_size=page_size,
        code=code,
        name=name,
        department=department,
        status=status,
        exclude_disposed=not include_disposed
    )
    
    return SuccessResponse(
        data=InstrumentListResponse(
            items=[InstrumentResponse.model_validate(i) for i in instruments],
            pagination={
                "total": meta.total,
                "page": meta.page,
                "page_size": meta.pageSize,
                "total_pages": meta.totalPages
            }
        ),
        message="查询成功"
    )


@router.get(
    "/{instrument_id}",
    response_model=SuccessResponse[InstrumentResponse],
    summary="获取仪器详情",
    description="根据仪器 ID 获取详细信息"
)
async def get_instrument(
    instrument_id: str = Path(..., description="仪器 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:read"))
):
    """获取仪器详情"""
    service = InstrumentService(db)
    instrument = await service.get_instrument_by_id(instrument_id)
    
    if not instrument:
        raise NotFoundException(f"仪器不存在: {instrument_id}")
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="查询成功"
    )


@router.patch(
    "/{instrument_id}",
    response_model=SuccessResponse[InstrumentResponse],
    summary="更新仪器",
    description="部分更新仪器信息"
)
async def update_instrument(
    instrument_id: str = Path(..., description="仪器 ID"),
    update_data: InstrumentUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:update"))
):
    """更新仪器信息"""
    service = InstrumentService(db)
    instrument = await service.update_instrument(
        instrument_id=instrument_id,
        instrument_data=update_data
    )
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="仪器更新成功"
    )


@router.delete(
    "/{instrument_id}",
    response_model=SuccessResponse[InstrumentResponse],
    summary="删除仪器",
    description="软删除仪器（更新状态为 DISPOSED）"
)
async def delete_instrument(
    instrument_id: str = Path(..., description="仪器 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:delete"))
):
    """删除仪器（软删除）"""
    service = InstrumentService(db)
    await service.delete_instrument(instrument_id=instrument_id)
    
    # 重新获取更新后的仪器
    instrument = await service.get_instrument_by_id(instrument_id)
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="仪器删除成功"
    )


@router.patch(
    "/{instrument_id}/status",
    response_model=SuccessResponse[InstrumentResponse],
    summary="更新仪器状态",
    description="更新仪器状态"
)
async def update_instrument_status(
    instrument_id: str = Path(..., description="仪器 ID"),
    status_data: InstrumentStatusUpdate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:update"))
):
    """更新仪器状态"""
    service = InstrumentService(db)
    instrument = await service.update_instrument_status(
        instrument_id=instrument_id,
        new_status=status_data.status,
        updated_by=current_user["user_id"]
    )
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="仪器状态更新成功"
    )


@router.get(
    "/code/{code}",
    response_model=SuccessResponse[InstrumentResponse],
    summary="按编码查询仪器",
    description="根据编码查询仪器信息"
)
async def get_instrument_by_code(
    code: str = Path(..., description="仪器编码"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("instrument:read"))
):
    """按编码查询仪器"""
    service = InstrumentService(db)
    instrument = await service.get_instrument_by_code(code)
    
    if not instrument:
        raise NotFoundException(f"仪器不存在: {code}")
    
    return SuccessResponse(
        data=InstrumentResponse.model_validate(instrument),
        message="查询成功"
    )
