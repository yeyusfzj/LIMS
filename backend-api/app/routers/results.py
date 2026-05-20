"""
检测结果路由

处理结果相关的 HTTP 请求
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.result import ResultSource
from app.schemas.result import (
    ResultCreate,
    ResultUpdate,
    ResultResponse,
    ResultListResponse,
    ResultReview
)
from app.schemas.response import SuccessResponse, ErrorResponse
from app.services.result_service import result_service
from app.core.exceptions import NotFoundException, ValidationException
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/results", tags=["results"])


@router.post(
    "",
    response_model=SuccessResponse[ResultResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建检测结果",
    description="创建新的检测结果记录"
)
async def create_result(
    data: ResultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建检测结果
    
    - **sample_id**: 样品 ID
    - **test_item_id**: 检测项 ID
    - **parameter**: 检测参数名称
    - **value**: 数值型结果（可选）
    - **text_value**: 文本型结果（可选）
    - **unit**: 单位（可选）
    - **method**: 检测方法
    - **source**: 结果来源（MANUAL/INSTRUMENT/CALCULATED）
    - **entered_by**: 录入人
    """
    try:
        result = await result_service.create_result(db, data)
        return SuccessResponse(
            data=result,
            message="结果创建成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Create result failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "创建结果失败"}
        )


@router.get(
    "",
    response_model=SuccessResponse[ResultListResponse],
    summary="查询结果列表",
    description="根据条件查询检测结果列表，支持分页"
)
async def list_results(
    sample_id: Optional[str] = Query(None, description="样品 ID"),
    test_item_id: Optional[str] = Query(None, description="检测项 ID"),
    parameter: Optional[str] = Query(None, description="参数名称（模糊匹配）"),
    source: Optional[ResultSource] = Query(None, description="结果来源"),
    is_abnormal: Optional[bool] = Query(None, description="是否异常"),
    is_retest: Optional[bool] = Query(None, description="是否复测"),
    entered_by: Optional[str] = Query(None, description="录入人"),
    start_date: Optional[datetime] = Query(None, description="开始日期"),
    end_date: Optional[datetime] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    查询结果列表
    
    支持多种筛选条件：
    - 样品 ID
    - 检测项 ID
    - 参数名称（模糊匹配）
    - 结果来源
    - 是否异常
    - 是否复测
    - 录入人
    - 日期范围
    """
    try:
        results = await result_service.list_results(
            db=db,
            sample_id=sample_id,
            test_item_id=test_item_id,
            parameter=parameter,
            source=source,
            is_abnormal=is_abnormal,
            is_retest=is_retest,
            entered_by=entered_by,
            start_date=start_date,
            end_date=end_date,
            page=page,
            page_size=page_size
        )
        return SuccessResponse(data=results)
    except Exception as e:
        logger.error(f"List results failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "查询结果列表失败"}
        )


@router.get(
    "/{result_id}",
    response_model=SuccessResponse[ResultResponse],
    summary="获取结果详情",
    description="根据 ID 获取检测结果详情"
)
async def get_result(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取结果详情
    
    - **result_id**: 结果 ID
    """
    try:
        result = await result_service.get_result_by_id(db, result_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "RESULT_NOT_FOUND", "message": "结果不存在"}
            )
        
        return SuccessResponse(data=result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get result failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "获取结果详情失败"}
        )


@router.put(
    "/{result_id}",
    response_model=SuccessResponse[ResultResponse],
    summary="更新结果",
    description="更新检测结果信息"
)
async def update_result(
    result_id: str,
    data: ResultUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新结果
    
    - **result_id**: 结果 ID
    - 可更新字段：value, text_value, unit, method, source, instrument_id, is_abnormal, abnormal_reason
    """
    try:
        result = await result_service.update_result(db, result_id, data)
        return SuccessResponse(
            data=result,
            message="结果更新成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Update result failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "更新结果失败"}
        )


@router.delete(
    "/{result_id}",
    response_model=SuccessResponse[None],
    summary="删除结果",
    description="删除检测结果"
)
async def delete_result(
    result_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除结果
    
    - **result_id**: 结果 ID
    """
    try:
        await result_service.delete_result(db, result_id)
        return SuccessResponse(
            data=None,
            message="结果删除成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Delete result failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "删除结果失败"}
        )


@router.post(
    "/{result_id}/review",
    response_model=SuccessResponse[ResultResponse],
    summary="审核结果",
    description="对检测结果进行审核"
)
async def review_result(
    result_id: str,
    review: ResultReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    审核结果
    
    - **result_id**: 结果 ID
    - **reviewed_by**: 审核人
    - **is_approved**: 是否通过审核
    - **review_comment**: 审核意见（可选）
    """
    try:
        result = await result_service.review_result(db, result_id, review)
        return SuccessResponse(
            data=result,
            message="结果审核成功"
        )
    except NotFoundException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": e.message}
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_ERROR", "message": e.message}
        )
    except Exception as e:
        logger.error(f"Review result failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "审核结果失败"}
        )


@router.post(
    "/import",
    response_model=SuccessResponse,
    summary="批量导入检测结果",
    description="从 Excel 或 CSV 文件批量导入检测结果"
)
async def import_results(
    file: UploadFile = File(..., description="Excel 或 CSV 文件"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    批量导入检测结果
    
    支持的文件格式：
    - Excel (.xlsx, .xls)
    - CSV (.csv)
    
    文件应包含以下列：
    - sampleId: 样品 ID（必填）
    - testItemId: 检测项 ID（必填）
    - parameter: 检测参数（必填）
    - value: 数值结果（可选）
    - textValue: 文本结果（可选）
    - unit: 单位（可选）
    - method: 检测方法（必填）
    - instrumentId: 仪器 ID（可选）
    
    返回导入结果统计和错误详情
    """
    try:
        # 验证文件类型
        filename = file.filename
        if not filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_FILE", "message": "文件名不能为空"}
            )
        
        ext = filename.lower().split('.')[-1]
        if ext not in ['csv', 'xlsx', 'xls']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_FILE_TYPE", "message": "不支持的文件格式，仅支持 CSV 和 Excel"}
            )
        
        # 读取文件内容
        content = await file.read()
        
        # 验证文件大小（最大 10MB）
        if len(content) > 10 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "FILE_TOO_LARGE", "message": "文件大小不能超过 10MB"}
            )
        
        # 导入结果
        from app.services.import_service import import_service
        
        result = await import_service.import_results(
            db=db,
            content=content,
            filename=filename,
            entered_by=current_user.id
        )
        
        return SuccessResponse(
            data=result,
            message=f"导入完成：成功 {result.success_count} 条，失败 {result.failure_count} 条"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import results failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": f"导入失败: {str(e)}"}
        )


@router.get(
    "/import/{task_id}",
    response_model=SuccessResponse,
    summary="查询导入任务状态",
    description="根据任务 ID 查询批量导入任务的状态"
)
async def get_import_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    查询导入任务状态
    
    - **task_id**: 任务 ID
    
    返回任务状态、进度和结果
    """
    try:
        from app.services.import_service import import_service
        
        task_status = await import_service.get_import_task_status(task_id)
        
        if not task_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "TASK_NOT_FOUND", "message": "导入任务不存在"}
            )
        
        return SuccessResponse(data=task_status)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get import task status failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "INTERNAL_ERROR", "message": "查询任务状态失败"}
        )
