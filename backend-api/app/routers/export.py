"""
数据导出路由

提供数据导出为 Excel 和 CSV 格式的 API 端点
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.export_service import ExportService, ExportFormat
from app.core.logging import logger

router = APIRouter(prefix="/api/v1/export", tags=["export"])


class ExportExcelRequest(BaseModel):
    """导出 Excel 请求"""
    data: List[Dict[str, Any]] = Field(..., description="要导出的数据")
    columns: Optional[List[str]] = Field(None, description="列名列表（可选）")
    filename: Optional[str] = Field(None, description="文件名（可选）")


class ExportCSVRequest(BaseModel):
    """导出 CSV 请求"""
    data: List[Dict[str, Any]] = Field(..., description="要导出的数据")
    columns: Optional[List[str]] = Field(None, description="列名列表（可选）")
    filename: Optional[str] = Field(None, description="文件名（可选）")


@router.post("/excel")
async def export_to_excel(
    request: ExportExcelRequest,
    current_user: User = Depends(get_current_user)
):
    """
    导出数据为 Excel 格式
    
    创建一个异步导出任务，返回任务 ID
    """
    try:
        # 创建导出任务
        task = await ExportService.create_export_task(
            format=ExportFormat.EXCEL,
            data=request.data,
            columns=request.columns,
            filename=request.filename
        )
        
        return {
            "message": "导出任务已创建",
            "data": task.to_dict()
        }
        
    except Exception as e:
        logger.error(f"Failed to create Excel export task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "创建导出任务失败"
            }
        )


@router.post("/csv")
async def export_to_csv(
    request: ExportCSVRequest,
    current_user: User = Depends(get_current_user)
):
    """
    导出数据为 CSV 格式
    
    创建一个异步导出任务，返回任务 ID
    """
    try:
        # 创建导出任务
        task = await ExportService.create_export_task(
            format=ExportFormat.CSV,
            data=request.data,
            columns=request.columns,
            filename=request.filename
        )
        
        return {
            "message": "导出任务已创建",
            "data": task.to_dict()
        }
        
    except Exception as e:
        logger.error(f"Failed to create CSV export task: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "创建导出任务失败"
            }
        )


@router.get("/{task_id}")
async def get_export_task_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    查询导出任务状态
    
    返回任务的当前状态、下载链接等信息
    """
    try:
        # 获取任务
        task = await ExportService.get_export_task(task_id)
        
        if not task:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": "导出任务不存在"
                }
            )
        
        return {
            "message": "获取导出任务状态成功",
            "data": task.to_dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get export task status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "获取导出任务状态失败"
            }
        )


@router.get("/download/{filename}")
async def download_export_file(
    filename: str,
    current_user: User = Depends(get_current_user)
):
    """
    下载导出文件
    
    根据文件名下载导出的文件
    """
    try:
        # 获取文件路径
        file_path = await ExportService.get_export_file(filename)
        
        if not file_path:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "NOT_FOUND",
                    "message": "文件不存在或已过期"
                }
            )
        
        # 确定媒体类型
        if filename.endswith('.xlsx'):
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif filename.endswith('.csv'):
            media_type = "text/csv"
        else:
            media_type = "application/octet-stream"
        
        # 返回文件
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type=media_type
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download export file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "下载文件失败"
            }
        )


@router.delete("/cleanup")
async def cleanup_expired_files(
    current_user: User = Depends(get_current_user)
):
    """
    清理过期文件
    
    删除超过 24 小时的导出文件
    需要管理员权限
    """
    try:
        # TODO: 添加权限检查，确保只有管理员可以清理文件
        
        deleted_count = await ExportService.cleanup_expired_files()
        
        return {
            "message": f"成功清理 {deleted_count} 个过期文件",
            "data": {
                "count": deleted_count
            }
        }
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired files: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "code": "INTERNAL_ERROR",
                "message": "清理过期文件失败"
            }
        )
