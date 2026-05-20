"""
报告生成任务

处理报告生成操作
"""
from typing import Dict, Any
from app.core.logging import logger
from app.core.database import AsyncSessionLocal
from app.services.report_service import report_service
from app.schemas.report import ReportGenerate


async def process_report_generation(
    ctx: Dict[str, Any],
    sample_id: str,
    template_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    处理报告生成任务
    
    Args:
        ctx: ARQ 上下文
        sample_id: 样品 ID
        template_id: 模板 ID
        user_id: 用户 ID
        
    Returns:
        生成结果
    """
    logger.info(f"开始处理报告生成任务", extra={
        "sample_id": sample_id,
        "template_id": template_id,
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            # 创建报告生成数据对象
            report_data = ReportGenerate(
                sampleId=sample_id,
                templateId=template_id,
                preview=False
            )
            
            # 生成报告
            result = await report_service.generate_report(
                db=db,
                data=report_data,
                user_id=user_id
            )
            
            logger.info("报告生成任务完成", extra={
                "sample_id": sample_id,
                "template_id": template_id,
                "report_id": result.report.id if result.report else None
            })
            
            return {
                "sample_id": sample_id,
                "template_id": template_id,
                "report_id": result.report.id if result.report else None,
                "report_number": result.report.reportNumber if result.report else None,
                "success": True
            }
            
        except Exception as e:
            logger.error(f"报告生成任务失败: {str(e)}", extra={
                "sample_id": sample_id,
                "template_id": template_id,
                "user_id": user_id
            })
            raise


async def process_batch_report_generation(
    ctx: Dict[str, Any],
    sample_ids: list,
    template_id: str,
    user_id: str
) -> Dict[str, Any]:
    """
    处理批量报告生成任务
    
    Args:
        ctx: ARQ 上下文
        sample_ids: 样品 ID 列表
        template_id: 模板 ID
        user_id: 用户 ID
        
    Returns:
        生成结果
    """
    logger.info(f"开始处理批量报告生成任务", extra={
        "sample_count": len(sample_ids),
        "template_id": template_id,
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            succeeded = 0
            failed = 0
            errors = []
            report_ids = []
            
            for idx, sample_id in enumerate(sample_ids):
                try:
                    # 创建报告生成数据对象
                    report_data = ReportGenerate(
                        sampleId=sample_id,
                        templateId=template_id,
                        preview=False
                    )
                    
                    # 生成单个报告
                    result = await report_service.generate_report(
                        db=db,
                        data=report_data,
                        user_id=user_id
                    )
                    
                    if result.report:
                        report_ids.append(result.report.id)
                    succeeded += 1
                    
                except Exception as e:
                    failed += 1
                    errors.append({
                        "index": idx,
                        "sample_id": sample_id,
                        "error": str(e)
                    })
                    logger.error(f"生成报告失败: {str(e)}", extra={
                        "index": idx,
                        "sample_id": sample_id
                    })
            
            await db.commit()
            
            logger.info("批量报告生成任务完成", extra={
                "template_id": template_id,
                "succeeded": succeeded,
                "failed": failed
            })
            
            return {
                "template_id": template_id,
                "processed": len(sample_ids),
                "succeeded": succeeded,
                "failed": failed,
                "report_ids": report_ids,
                "errors": errors if errors else None,
                "success": failed == 0
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"批量报告生成任务失败: {str(e)}", extra={
                "template_id": template_id,
                "user_id": user_id
            })
            raise
