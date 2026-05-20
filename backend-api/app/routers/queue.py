"""
队列管理路由

提供任务队列的 API 端点
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Body
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.queue_service import queue_service
from app.core.exceptions import ValidationException
from app.schemas.response import SuccessResponse
from pydantic import BaseModel, Field


router = APIRouter(prefix="/queue", tags=["队列管理"])


# ==================== Pydantic 模型 ====================

class TaskStatusResponse(BaseModel):
    """任务状态响应"""
    id: str = Field(..., description="任务 ID")
    status: str = Field(..., description="任务状态")
    result: Optional[dict] = Field(None, description="任务结果")
    startTime: Optional[str] = Field(None, description="开始时间")
    finishTime: Optional[str] = Field(None, description="完成时间")
    success: bool = Field(..., description="是否成功")


class TaskListResponse(BaseModel):
    """任务列表响应"""
    tasks: List[TaskStatusResponse] = Field(..., description="任务列表")
    total: int = Field(..., description="总数")


class CancelTaskRequest(BaseModel):
    """取消任务请求"""
    reason: Optional[str] = Field(None, description="取消原因")


# ==================== API 端点 ====================

@router.get("/tasks", response_model=SuccessResponse)
async def get_tasks(
    status: Optional[str] = Query(None, description="任务状态"),
    queue_type: Optional[str] = Query(None, description="队列类型"),
    skip: int = Query(0, ge=0, description="跳过数量"),
    limit: int = Query(10, ge=1, le=100, description="返回数量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    查询任务列表
    
    - **status**: 任务状态（可选）
    - **queue_type**: 队列类型（可选）
    - **skip**: 跳过数量
    - **limit**: 返回数量
    """
    # 注意：ARQ 不直接支持列表查询，这里返回基本信息
    # 实际生产环境需要维护任务记录表
    return SuccessResponse(
        data={
            "tasks": [],
            "total": 0,
            "message": "任务列表查询功能需要配合任务记录表实现"
        }
    )


@router.get("/tasks/{task_id}", response_model=SuccessResponse)
async def get_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    查询任务状态
    
    - **task_id**: 任务 ID
    """
    task_status = await queue_service.get_task_status(task_id)
    
    return SuccessResponse(data=task_status)


@router.post("/tasks/{task_id}/cancel", response_model=SuccessResponse)
async def cancel_task(
    task_id: str,
    request: CancelTaskRequest = Body(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    取消任务
    
    - **task_id**: 任务 ID
    - **reason**: 取消原因（可选）
    """
    success = await queue_service.cancel_task(task_id)
    
    if not success:
        raise ValidationException(
            message="取消任务失败",
            details=f"任务 ID: {task_id}"
        )
    
    return SuccessResponse(
        data={
            "task_id": task_id,
            "cancelled": True,
            "reason": request.reason
        },
        message="任务已取消"
    )


@router.get("/stats/{queue_name}", response_model=SuccessResponse)
async def get_queue_stats(
    queue_name: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    获取队列统计信息
    
    - **queue_name**: 队列名称
    """
    # 验证队列名称
    valid_queues = ["report-generation", "batch-operations", "data-export"]
    if queue_name not in valid_queues:
        raise ValidationException(
            message="无效的队列名称",
            details=f"支持的队列: {', '.join(valid_queues)}"
        )
    
    stats = await queue_service.get_queue_stats(queue_name)
    
    return SuccessResponse(data=stats)


# ==================== 任务创建端点（供其他服务调用）====================

class ReportGenerationRequest(BaseModel):
    """报告生成请求"""
    sampleId: str = Field(..., description="样品 ID")
    templateId: str = Field(..., description="模板 ID")


class BatchImportRequest(BaseModel):
    """批量导入请求"""
    operation: str = Field(..., description="操作类型")
    dataType: str = Field(..., description="数据类型")
    fileData: dict = Field(..., description="文件数据")


class BatchUpdateRequest(BaseModel):
    """批量更新请求"""
    dataType: str = Field(..., description="数据类型")
    updates: List[dict] = Field(..., description="更新数据列表")


class BatchDeleteRequest(BaseModel):
    """批量删除请求"""
    dataType: str = Field(..., description="数据类型")
    ids: List[str] = Field(..., description="ID 列表")


class DataExportRequest(BaseModel):
    """数据导出请求"""
    exportType: str = Field(..., description="导出类型")
    exportFormat: str = Field(..., description="导出格式")
    query: dict = Field(..., description="查询条件")


@router.post("/tasks/report-generation", response_model=SuccessResponse)
async def create_report_generation_task(
    request: ReportGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建报告生成任务
    
    - **sampleId**: 样品 ID
    - **templateId**: 模板 ID
    """
    task_id = await queue_service.create_report_generation_task(
        sample_id=request.sampleId,
        template_id=request.templateId,
        user_id=current_user.id
    )
    
    return SuccessResponse(
        data={"taskId": task_id},
        message="报告生成任务已创建"
    )


@router.post("/tasks/batch-import", response_model=SuccessResponse)
async def create_batch_import_task(
    request: BatchImportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建批量导入任务
    
    - **operation**: 操作类型
    - **dataType**: 数据类型
    - **fileData**: 文件数据
    """
    task_id = await queue_service.create_batch_import_task(
        operation=request.operation,
        data_type=request.dataType,
        file_data=request.fileData,
        user_id=current_user.id
    )
    
    return SuccessResponse(
        data={"taskId": task_id},
        message="批量导入任务已创建"
    )


@router.post("/tasks/batch-update", response_model=SuccessResponse)
async def create_batch_update_task(
    request: BatchUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建批量更新任务
    
    - **dataType**: 数据类型
    - **updates**: 更新数据列表
    """
    task_id = await queue_service.create_batch_update_task(
        data_type=request.dataType,
        updates=request.updates,
        user_id=current_user.id
    )
    
    return SuccessResponse(
        data={"taskId": task_id},
        message="批量更新任务已创建"
    )


@router.post("/tasks/batch-delete", response_model=SuccessResponse)
async def create_batch_delete_task(
    request: BatchDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建批量删除任务
    
    - **dataType**: 数据类型
    - **ids**: ID 列表
    """
    task_id = await queue_service.create_batch_delete_task(
        data_type=request.dataType,
        ids=request.ids,
        user_id=current_user.id
    )
    
    return SuccessResponse(
        data={"taskId": task_id},
        message="批量删除任务已创建"
    )


@router.post("/tasks/data-export", response_model=SuccessResponse)
async def create_data_export_task(
    request: DataExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    创建数据导出任务
    
    - **exportType**: 导出类型
    - **exportFormat**: 导出格式
    - **query**: 查询条件
    """
    task_id = await queue_service.create_data_export_task(
        export_type=request.exportType,
        export_format=request.exportFormat,
        query=request.query,
        user_id=current_user.id
    )
    
    return SuccessResponse(
        data={"taskId": task_id},
        message="数据导出任务已创建"
    )
