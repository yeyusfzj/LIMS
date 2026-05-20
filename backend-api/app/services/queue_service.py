"""
队列管理服务

提供任务队列的创建、查询、取消功能
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.queue import (
    get_arq_pool,
    enqueue_task,
    get_job_status as get_arq_job_status,
    cancel_job as cancel_arq_job,
    QueueConfig,
    TaskStatus
)
from app.core.logging import logger
from app.core.exceptions import NotFoundException, InternalServerException


class QueueService:
    """队列服务类"""
    
    async def create_report_generation_task(
        self,
        sample_id: str,
        template_id: str,
        user_id: str
    ) -> str:
        """
        创建报告生成任务
        
        Args:
            sample_id: 样品 ID
            template_id: 模板 ID
            user_id: 用户 ID
            
        Returns:
            任务 ID
        """
        try:
            job_id = await enqueue_task(
                QueueConfig.TASK_REPORT_GENERATION,
                sample_id=sample_id,
                template_id=template_id,
                user_id=user_id,
                queue_name=QueueConfig.REPORT_QUEUE
            )
            
            logger.info("报告生成任务已创建", extra={
                "job_id": job_id,
                "sample_id": sample_id,
                "template_id": template_id
            })
            
            return job_id
        except Exception as e:
            logger.error(f"创建报告生成任务失败: {str(e)}")
            raise InternalServerException(
                message="创建报告生成任务失败",
                details=str(e)
            )
    
    async def create_batch_import_task(
        self,
        operation: str,
        data_type: str,
        file_data: Any,
        user_id: str
    ) -> str:
        """
        创建批量导入任务
        
        Args:
            operation: 操作类型 (import)
            data_type: 数据类型 (results, samples)
            file_data: 文件数据
            user_id: 用户 ID
            
        Returns:
            任务 ID
        """
        try:
            job_id = await enqueue_task(
                QueueConfig.TASK_BATCH_IMPORT,
                operation=operation,
                data_type=data_type,
                file_data=file_data,
                user_id=user_id,
                queue_name=QueueConfig.BATCH_QUEUE
            )
            
            logger.info("批量导入任务已创建", extra={
                "job_id": job_id,
                "operation": operation,
                "data_type": data_type
            })
            
            return job_id
        except Exception as e:
            logger.error(f"创建批量导入任务失败: {str(e)}")
            raise InternalServerException(
                message="创建批量导入任务失败",
                details=str(e)
            )
    
    async def create_batch_update_task(
        self,
        data_type: str,
        updates: List[Dict[str, Any]],
        user_id: str
    ) -> str:
        """
        创建批量更新任务
        
        Args:
            data_type: 数据类型 (samples, results)
            updates: 更新数据列表
            user_id: 用户 ID
            
        Returns:
            任务 ID
        """
        try:
            job_id = await enqueue_task(
                QueueConfig.TASK_BATCH_UPDATE,
                operation="update",
                data_type=data_type,
                updates=updates,
                user_id=user_id,
                queue_name=QueueConfig.BATCH_QUEUE
            )
            
            logger.info("批量更新任务已创建", extra={
                "job_id": job_id,
                "data_type": data_type,
                "count": len(updates)
            })
            
            return job_id
        except Exception as e:
            logger.error(f"创建批量更新任务失败: {str(e)}")
            raise InternalServerException(
                message="创建批量更新任务失败",
                details=str(e)
            )
    
    async def create_batch_delete_task(
        self,
        data_type: str,
        ids: List[str],
        user_id: str
    ) -> str:
        """
        创建批量删除任务
        
        Args:
            data_type: 数据类型 (samples, results)
            ids: ID 列表
            user_id: 用户 ID
            
        Returns:
            任务 ID
        """
        try:
            job_id = await enqueue_task(
                QueueConfig.TASK_BATCH_DELETE,
                operation="delete",
                data_type=data_type,
                ids=ids,
                user_id=user_id,
                queue_name=QueueConfig.BATCH_QUEUE
            )
            
            logger.info("批量删除任务已创建", extra={
                "job_id": job_id,
                "data_type": data_type,
                "count": len(ids)
            })
            
            return job_id
        except Exception as e:
            logger.error(f"创建批量删除任务失败: {str(e)}")
            raise InternalServerException(
                message="创建批量删除任务失败",
                details=str(e)
            )
    
    async def create_data_export_task(
        self,
        export_type: str,
        export_format: str,
        query: Dict[str, Any],
        user_id: str
    ) -> str:
        """
        创建数据导出任务
        
        Args:
            export_type: 导出类型 (samples, results, reports, statistics)
            export_format: 导出格式 (csv, excel)
            query: 查询条件
            user_id: 用户 ID
            
        Returns:
            任务 ID
        """
        try:
            job_id = await enqueue_task(
                QueueConfig.TASK_DATA_EXPORT,
                export_type=export_type,
                export_format=export_format,
                query=query,
                user_id=user_id,
                queue_name=QueueConfig.EXPORT_QUEUE
            )
            
            logger.info("数据导出任务已创建", extra={
                "job_id": job_id,
                "export_type": export_type,
                "export_format": export_format
            })
            
            return job_id
        except Exception as e:
            logger.error(f"创建数据导出任务失败: {str(e)}")
            raise InternalServerException(
                message="创建数据导出任务失败",
                details=str(e)
            )
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        获取任务状态
        
        Args:
            task_id: 任务 ID
            
        Returns:
            任务状态信息
        """
        try:
            status = await get_arq_job_status(task_id)
            
            if not status:
                raise NotFoundException(
                    message="任务不存在",
                    details=f"任务 ID: {task_id}"
                )
            
            return {
                "id": task_id,
                "status": status.get("status", TaskStatus.QUEUED),
                "result": status.get("result"),
                "startTime": status.get("start_time"),
                "finishTime": status.get("finish_time"),
                "success": status.get("success", False)
            }
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"获取任务状态失败: {str(e)}", extra={"task_id": task_id})
            raise InternalServerException(
                message="获取任务状态失败",
                details=str(e)
            )
    
    async def cancel_task(self, task_id: str) -> bool:
        """
        取消任务
        
        Args:
            task_id: 任务 ID
            
        Returns:
            是否成功取消
        """
        try:
            # 先检查任务是否存在
            status = await get_arq_job_status(task_id)
            if not status:
                raise NotFoundException(
                    message="任务不存在",
                    details=f"任务 ID: {task_id}"
                )
            
            # 取消任务
            success = await cancel_arq_job(task_id)
            
            if success:
                logger.info(f"任务已取消: {task_id}")
            else:
                logger.warning(f"任务取消失败: {task_id}")
            
            return success
        except NotFoundException:
            raise
        except Exception as e:
            logger.error(f"取消任务失败: {str(e)}", extra={"task_id": task_id})
            raise InternalServerException(
                message="取消任务失败",
                details=str(e)
            )
    
    async def get_queue_stats(self, queue_name: str) -> Dict[str, Any]:
        """
        获取队列统计信息
        
        Args:
            queue_name: 队列名称
            
        Returns:
            队列统计信息
        """
        try:
            pool = await get_arq_pool()
            
            # ARQ 不直接提供队列统计，这里返回基本信息
            # 实际生产环境可以通过 Redis 命令获取更详细的统计
            return {
                "queueName": queue_name,
                "status": "active",
                "message": "队列运行正常"
            }
        except Exception as e:
            logger.error(f"获取队列统计失败: {str(e)}", extra={"queue_name": queue_name})
            raise InternalServerException(
                message="获取队列统计失败",
                details=str(e)
            )


# 创建服务实例
queue_service = QueueService()
