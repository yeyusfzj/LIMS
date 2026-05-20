"""
导入任务

处理批量导入操作，包括样品导入、结果导入等
"""
from typing import Dict, Any, List
from app.core.logging import logger
from app.core.database import AsyncSessionLocal
from app.services.import_service import import_service
from app.services.result_service import result_service
from app.services.sample_service import sample_service


async def process_batch_import(
    ctx: Dict[str, Any],
    operation: str,
    data_type: str,
    file_data: Any,
    user_id: str
) -> Dict[str, Any]:
    """
    处理批量导入任务
    
    Args:
        ctx: ARQ 上下文
        operation: 操作类型 (import)
        data_type: 数据类型 (results, samples)
        file_data: 文件数据
        user_id: 用户 ID
        
    Returns:
        导入结果
    """
    logger.info(f"开始处理批量导入任务", extra={
        "operation": operation,
        "data_type": data_type,
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            if data_type == "results":
                # 批量导入检测结果
                # 假设 file_data 包含 content 和 filename
                content = file_data.get("content", b"")
                filename = file_data.get("filename", "import.xlsx")
                
                result = await import_service.import_results(
                    db=db,
                    content=content,
                    filename=filename,
                    entered_by=user_id
                )
                
                logger.info("批量导入结果完成", extra={
                    "total": result.total_records,
                    "success": result.success_count,
                    "failed": result.failure_count
                })
                
                return {
                    "operation": "import",
                    "data_type": data_type,
                    "processed": result.total_records,
                    "succeeded": result.success_count,
                    "failed": result.failure_count,
                    "errors": [{"row": e.row, "message": e.message} for e in result.errors] if result.errors else [],
                    "success": result.success
                }
            
            elif data_type == "samples":
                # 批量导入样品（如果需要实现）
                logger.warning("批量导入样品功能尚未实现")
                return {
                    "operation": "import",
                    "data_type": data_type,
                    "processed": 0,
                    "succeeded": 0,
                    "failed": 0,
                    "errors": ["批量导入样品功能尚未实现"],
                    "success": False
                }
            
            else:
                raise ValueError(f"不支持的数据类型: {data_type}")
                
        except Exception as e:
            logger.error(f"批量导入任务失败: {str(e)}", extra={
                "data_type": data_type,
                "user_id": user_id
            })
            raise


async def process_batch_update(
    ctx: Dict[str, Any],
    operation: str,
    data_type: str,
    updates: List[Dict[str, Any]],
    user_id: str
) -> Dict[str, Any]:
    """
    处理批量更新任务
    
    Args:
        ctx: ARQ 上下文
        operation: 操作类型 (update)
        data_type: 数据类型 (samples, results)
        updates: 更新数据列表
        user_id: 用户 ID
        
    Returns:
        更新结果
    """
    logger.info(f"开始处理批量更新任务", extra={
        "operation": operation,
        "data_type": data_type,
        "count": len(updates),
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            succeeded = 0
            failed = 0
            errors = []
            
            for idx, update in enumerate(updates):
                try:
                    item_id = update.get("id")
                    item_data = update.get("data", {})
                    
                    if data_type == "samples":
                        await sample_service.update_sample(
                            db=db,
                            sample_id=item_id,
                            sample_data=item_data
                        )
                    elif data_type == "results":
                        await result_service.update_result(
                            db=db,
                            result_id=item_id,
                            result_data=item_data
                        )
                    else:
                        raise ValueError(f"不支持的数据类型: {data_type}")
                    
                    succeeded += 1
                    
                except Exception as e:
                    failed += 1
                    errors.append({
                        "index": idx,
                        "id": update.get("id"),
                        "error": str(e)
                    })
                    logger.error(f"更新项目失败: {str(e)}", extra={
                        "index": idx,
                        "id": update.get("id")
                    })
            
            await db.commit()
            
            logger.info("批量更新任务完成", extra={
                "data_type": data_type,
                "succeeded": succeeded,
                "failed": failed
            })
            
            return {
                "operation": "update",
                "data_type": data_type,
                "processed": len(updates),
                "succeeded": succeeded,
                "failed": failed,
                "errors": errors if errors else None,
                "success": failed == 0
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"批量更新任务失败: {str(e)}", extra={
                "data_type": data_type,
                "user_id": user_id
            })
            raise


async def process_batch_delete(
    ctx: Dict[str, Any],
    operation: str,
    data_type: str,
    ids: List[str],
    user_id: str
) -> Dict[str, Any]:
    """
    处理批量删除任务
    
    Args:
        ctx: ARQ 上下文
        operation: 操作类型 (delete)
        data_type: 数据类型 (samples, results)
        ids: ID 列表
        user_id: 用户 ID
        
    Returns:
        删除结果
    """
    logger.info(f"开始处理批量删除任务", extra={
        "operation": operation,
        "data_type": data_type,
        "count": len(ids),
        "user_id": user_id
    })
    
    async with AsyncSessionLocal() as db:
        try:
            succeeded = 0
            failed = 0
            errors = []
            
            for idx, item_id in enumerate(ids):
                try:
                    if data_type == "samples":
                        await sample_service.delete_sample(
                            db=db,
                            sample_id=item_id
                        )
                    elif data_type == "results":
                        await result_service.delete_result(
                            db=db,
                            result_id=item_id
                        )
                    else:
                        raise ValueError(f"不支持的数据类型: {data_type}")
                    
                    succeeded += 1
                    
                except Exception as e:
                    failed += 1
                    errors.append({
                        "index": idx,
                        "id": item_id,
                        "error": str(e)
                    })
                    logger.error(f"删除项目失败: {str(e)}", extra={
                        "index": idx,
                        "id": item_id
                    })
            
            await db.commit()
            
            logger.info("批量删除任务完成", extra={
                "data_type": data_type,
                "succeeded": succeeded,
                "failed": failed
            })
            
            return {
                "operation": "delete",
                "data_type": data_type,
                "processed": len(ids),
                "succeeded": succeeded,
                "failed": failed,
                "errors": errors if errors else None,
                "success": failed == 0
            }
            
        except Exception as e:
            await db.rollback()
            logger.error(f"批量删除任务失败: {str(e)}", extra={
                "data_type": data_type,
                "user_id": user_id
            })
            raise
