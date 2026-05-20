"""
导出任务

处理数据导出操作，包括样品导出、结果导出、报告导出、统计数据导出等
"""
from typing import Dict, Any
from app.core.logging import logger
from app.core.database import AsyncSessionLocal
from app.services.export_service import export_service, ExportFormat


async def process_data_export(
    ctx: Dict[str, Any],
    export_type: str,
    export_format: str,
    query: Dict[str, Any],
    user_id: str
) -> Dict[str, Any]:
    """
    处理数据导出任务
    
    Args:
        ctx: ARQ 上下文
        export_type: 导出类型 (samples, results, reports, statistics)
        export_format: 导出格式 (csv, excel)
        query: 查询条件
        user_id: 用户 ID
        
    Returns:
        导出结果
    """
    logger.info(f"开始处理数据导出任务", extra={
        "export_type": export_type,
        "export_format": export_format,
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            # 使用 export_service 创建导出任务
            format_enum = ExportFormat.EXCEL if export_format == "excel" else ExportFormat.CSV
            
            task = await export_service.create_export_task(
                db=db,
                export_type=export_type,
                format=format_enum,
                filters=query,
                user_id=user_id
            )
            
            logger.info("数据导出任务完成", extra={
                "export_type": export_type,
                "export_format": export_format,
                "task_id": task.task_id,
                "file_path": task.file_path
            })
            
            return {
                "export_type": export_type,
                "export_format": export_format,
                "file_path": task.file_path,
                "task_id": task.task_id,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"数据导出任务失败: {str(e)}", extra={
                "export_type": export_type,
                "export_format": export_format,
                "user_id": user_id
            })
            raise


async def process_report_export(
    ctx: Dict[str, Any],
    report_id: str,
    export_format: str,
    user_id: str
) -> Dict[str, Any]:
    """
    处理报告导出任务
    
    Args:
        ctx: ARQ 上下文
        report_id: 报告 ID
        export_format: 导出格式 (pdf, word)
        user_id: 用户 ID
        
    Returns:
        导出结果
    """
    logger.info(f"开始处理报告导出任务", extra={
        "report_id": report_id,
        "export_format": export_format,
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            # 使用 export_service 创建导出任务
            format_enum = ExportFormat.EXCEL  # 暂时使用 Excel，实际应支持 PDF
            
            task = await export_service.create_export_task(
                db=db,
                export_type="reports",
                format=format_enum,
                filters={"report_id": report_id},
                user_id=user_id
            )
            
            logger.info("报告导出任务完成", extra={
                "report_id": report_id,
                "export_format": export_format,
                "file_path": task.file_path
            })
            
            return {
                "report_id": report_id,
                "export_format": export_format,
                "file_path": task.file_path,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"报告导出任务失败: {str(e)}", extra={
                "report_id": report_id,
                "export_format": export_format,
                "user_id": user_id
            })
            raise
