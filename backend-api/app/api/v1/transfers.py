"""
样品流转和分样合样 API 路由

实现流转和分样合样操作端点:
- GET /api/v1/samples/transfers - 获取流转记录列表
- POST /api/v1/samples/{id}/transfer - 创建流转
- GET /api/v1/samples/{id}/chain-of-custody - 监管链
- POST /api/v1/transfers/{id}/confirm - 确认流转
- POST /api/v1/samples/{id}/split - 分样
- POST /api/v1/samples/merge - 合样
"""

from typing import List, Dict, Any, Optional
from datetime import date
from fastapi import APIRouter, Depends, Path, Body, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import NotFoundException
from app.api.deps import get_current_user, require_permission
from app.services.transfer_service import TransferService
from app.services.sample_service import SampleService
from app.schemas.transfer import (
    TransferCreate,
    TransferResponse,
    TransferConfirmRequest,
    ChainOfCustodyResponse,
    TransferListResponse
)
from app.schemas.sample import (
    SampleSplitRequest,
    SampleMergeRequest,
    SampleResponse
)
from app.schemas.response import SuccessResponse

router = APIRouter(tags=["transfers"])


@router.get(
    "/samples/transfers",
    response_model=SuccessResponse[TransferListResponse],
    summary="获取流转记录列表",
    description="获取所有流转记录列表，支持分页和筛选"
)
async def get_transfers_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    sample_number: Optional[str] = Query(None, description="样品编号（模糊搜索）"),
    status: Optional[str] = Query(None, description="流转状态"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read"))
):
    """
    获取流转记录列表
    
    权限要求: sample:read
    
    查询参数:
    - page: 页码（默认 1）
    - page_size: 每页数量（默认 20，最大 100）
    - sample_number: 样品编号（可选，模糊搜索）
    - status: 流转状态（可选，PENDING/IN_TRANSIT/RECEIVED/CANCELLED）
    - start_date: 开始日期（可选，格式 YYYY-MM-DD）
    - end_date: 结束日期（可选，格式 YYYY-MM-DD）
    
    返回:
    - items: 流转记录列表
    - pagination: 分页信息
      - total: 总记录数
      - page: 当前页码
      - page_size: 每页数量
      - total_pages: 总页数
    
    异常:
    - 400: 参数验证失败
    """
    service = TransferService(db)
    result = await service.get_transfers_list(
        page=page,
        page_size=page_size,
        sample_number=sample_number,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    
    return SuccessResponse(
        data=result,
        message="查询成功"
    )


@router.post(
    "/samples/{sample_id}/transfer",
    response_model=SuccessResponse[TransferResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建样品流转",
    description="创建样品流转记录并更新样品存储位置"
)
async def create_transfer(
    sample_id: str = Path(..., description="样品 ID"),
    transfer_data: TransferCreate = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:transfer"))
):
    """
    创建样品流转
    
    权限要求: sample:transfer
    
    路径参数:
    - sample_id: 样品 ID
    
    请求体:
    - from_location: 发送位置（必填）
    - to_location: 接收位置（必填）
    - from_person: 发送人（必填）
    - to_person: 接收人（必填）
    - transfer_reason: 流转原因（可选）
    - remarks: 备注（可选）
    
    业务逻辑:
    - 验证样品存在
    - 创建流转记录（状态为 IN_TRANSIT）
    - 更新样品存储位置为接收位置
    - 使用事务确保原子性
    
    返回:
    - 创建的流转记录
    
    异常:
    - 404: 样品不存在
    - 400: 验证失败
    """
    service = TransferService(db)
    transfer = await service.create_transfer(
        sample_id=sample_id,
        transfer_data=transfer_data,
        created_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=TransferResponse.model_validate(transfer),
        message="流转创建成功"
    )


@router.get(
    "/samples/{sample_id}/chain-of-custody",
    response_model=SuccessResponse[ChainOfCustodyResponse],
    summary="查询样品监管链",
    description="查询样品的完整流转历史记录"
)
async def get_chain_of_custody(
    sample_id: str = Path(..., description="样品 ID"),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:read"))
):
    """
    查询样品监管链
    
    权限要求: sample:read
    
    路径参数:
    - sample_id: 样品 ID
    
    返回:
    - sample_id: 样品 ID
    - transfers: 流转记录列表（按时间顺序）
    
    异常:
    - 404: 样品不存在
    """
    service = TransferService(db)
    transfers = await service.get_chain_of_custody(sample_id)
    
    return SuccessResponse(
        data=ChainOfCustodyResponse(
            sample_id=sample_id,
            transfers=[TransferResponse.model_validate(t) for t in transfers]
        ),
        message="查询成功"
    )


@router.post(
    "/transfers/{transfer_id}/confirm",
    response_model=SuccessResponse[TransferResponse],
    summary="确认流转",
    description="发送方或接收方确认流转"
)
async def confirm_transfer(
    transfer_id: str = Path(..., description="流转记录 ID"),
    confirm_data: TransferConfirmRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:transfer"))
):
    """
    确认流转
    
    权限要求: sample:transfer
    
    路径参数:
    - transfer_id: 流转记录 ID
    
    请求体:
    - confirm_type: 确认类型（"sender" 或 "receiver"）
    - remarks: 备注（可选）
    
    业务逻辑:
    - 验证流转记录存在
    - 根据确认类型更新相应字段
    - 如果双方都确认，更新状态为 RECEIVED
    
    返回:
    - 更新后的流转记录
    
    异常:
    - 404: 流转记录不存在
    - 400: 已确认或验证失败
    """
    service = TransferService(db)
    
    if confirm_data.confirm_type == "sender":
        transfer = await service.confirm_by_sender(
            transfer_id=transfer_id,
            confirmed_by=current_user.user_id,
            remarks=confirm_data.remarks
        )
    else:  # receiver
        transfer = await service.confirm_by_receiver(
            transfer_id=transfer_id,
            confirmed_by=current_user.user_id,
            remarks=confirm_data.remarks
        )
    
    return SuccessResponse(
        data=TransferResponse.model_validate(transfer),
        message="流转确认成功"
    )


@router.post(
    "/samples/{sample_id}/split",
    response_model=SuccessResponse[List[SampleResponse]],
    status_code=status.HTTP_201_CREATED,
    summary="分样操作",
    description="将样品分成多个子样品"
)
async def split_sample(
    sample_id: str = Path(..., description="样品 ID"),
    split_data: SampleSplitRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:split"))
):
    """
    分样操作
    
    权限要求: sample:split
    
    路径参数:
    - sample_id: 母样品 ID
    
    请求体:
    - sub_samples: 子样品列表（至少 2 个）
      - 每个子样品包含: quantity, unit, 以及其他可选字段
    
    业务逻辑:
    - 验证母样品存在
    - 为每个子样品生成条码和编号
    - 建立父子关系（parent_sample_id）
    - 使用事务确保原子性
    
    返回:
    - 创建的子样品列表
    
    异常:
    - 404: 母样品不存在
    - 400: 验证失败（子样品数量不足等）
    """
    service = SampleService(db)
    sub_samples = await service.split_sample(
        parent_sample_id=sample_id,
        sub_samples_data=split_data.sub_samples,
        created_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=[SampleResponse.model_validate(s) for s in sub_samples],
        message=f"分样成功，创建了 {len(sub_samples)} 个子样品"
    )


@router.post(
    "/samples/merge",
    response_model=SuccessResponse[SampleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="合样操作",
    description="将多个样品合并为一个新样品"
)
async def merge_samples(
    merge_data: SampleMergeRequest = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
    _: None = Depends(require_permission("sample:merge"))
):
    """
    合样操作
    
    权限要求: sample:merge
    
    请求体:
    - source_sample_ids: 来源样品 ID 列表（至少 2 个）
    - merged_sample: 合并后的样品信息
    
    业务逻辑:
    - 验证所有来源样品存在且未归档
    - 生成新样品的条码和编号
    - 记录来源样品 ID 列表（merged_from_ids）
    - 使用事务确保原子性
    
    返回:
    - 创建的合并样品
    
    异常:
    - 404: 来源样品不存在
    - 400: 验证失败（样品数量不足、已归档等）
    """
    service = SampleService(db)
    merged_sample = await service.merge_samples(
        source_sample_ids=merge_data.source_sample_ids,
        merged_sample_data=merge_data.merged_sample,
        created_by=current_user.user_id
    )
    
    return SuccessResponse(
        data=SampleResponse.model_validate(merged_sample),
        message=f"合样成功，合并了 {len(merge_data.source_sample_ids)} 个样品"
    )
