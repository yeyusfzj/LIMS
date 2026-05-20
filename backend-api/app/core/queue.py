"""
异步任务队列配置

使用 ARQ (Async Redis Queue) 作为异步任务队列
ARQ 是纯 Python 异步库，与 FastAPI 集成更好
"""
from typing import Optional
from arq import create_pool
from arq.connections import RedisSettings, ArqRedis
from app.config import settings
from app.core.logging import logger


# Redis 连接配置
redis_settings = RedisSettings(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
    database=0,
)


# 全局 ARQ 连接池
_arq_pool: Optional[ArqRedis] = None


async def get_arq_pool() -> ArqRedis:
    """
    获取 ARQ 连接池
    
    Returns:
        ARQ Redis 连接池
    """
    global _arq_pool
    if _arq_pool is None:
        _arq_pool = await create_pool(redis_settings)
        logger.info("ARQ 连接池已创建")
    return _arq_pool


async def close_arq_pool():
    """关闭 ARQ 连接池"""
    global _arq_pool
    if _arq_pool is not None:
        await _arq_pool.close()
        _arq_pool = None
        logger.info("ARQ 连接池已关闭")


# 队列配置
class QueueConfig:
    """队列配置类"""
    
    # 默认任务选项
    DEFAULT_JOB_OPTIONS = {
        "max_tries": 3,  # 最大重试次数
        "timeout": 3600,  # 任务超时时间（秒）
    }
    
    # 队列名称
    REPORT_QUEUE = "report-generation"
    BATCH_QUEUE = "batch-operations"
    EXPORT_QUEUE = "data-export"
    IMPORT_QUEUE = "data-import"
    
    # 任务类型
    TASK_REPORT_GENERATION = "report_generation"
    TASK_BATCH_IMPORT = "batch_import"
    TASK_BATCH_UPDATE = "batch_update"
    TASK_BATCH_DELETE = "batch_delete"
    TASK_DATA_EXPORT = "data_export"


# 任务状态枚举
class TaskStatus:
    """任务状态"""
    QUEUED = "queued"  # 已排队
    IN_PROGRESS = "in_progress"  # 进行中
    COMPLETE = "complete"  # 已完成
    FAILED = "failed"  # 失败
    DEFERRED = "deferred"  # 延迟


async def enqueue_task(
    task_name: str,
    *args,
    queue_name: Optional[str] = None,
    **kwargs
) -> str:
    """
    将任务加入队列
    
    Args:
        task_name: 任务名称
        *args: 任务位置参数
        queue_name: 队列名称（可选）
        **kwargs: 任务关键字参数
        
    Returns:
        任务 ID
    """
    pool = await get_arq_pool()
    
    job = await pool.enqueue_job(
        task_name,
        *args,
        _queue_name=queue_name,
        **kwargs
    )
    
    logger.info(f"任务已加入队列: {task_name}", extra={
        "job_id": job.job_id,
        "task_name": task_name,
        "queue_name": queue_name
    })
    
    return job.job_id


async def get_job_status(job_id: str) -> Optional[dict]:
    """
    获取任务状态
    
    Args:
        job_id: 任务 ID
        
    Returns:
        任务状态信息
    """
    pool = await get_arq_pool()
    
    try:
        job = await pool.job_info(job_id)
        if job:
            return {
                "job_id": job_id,
                "status": job.status,
                "result": job.result,
                "start_time": job.start_time,
                "finish_time": job.finish_time,
                "success": job.success,
            }
        return None
    except Exception as e:
        logger.error(f"获取任务状态失败: {str(e)}", extra={"job_id": job_id})
        return None


async def cancel_job(job_id: str) -> bool:
    """
    取消任务
    
    Args:
        job_id: 任务 ID
        
    Returns:
        是否成功取消
    """
    pool = await get_arq_pool()
    
    try:
        # ARQ 不直接支持取消，但可以通过删除任务实现
        # 这里我们标记任务为已取消
        await pool.set(f"cancelled:{job_id}", "1", expire=3600)
        logger.info(f"任务已取消: {job_id}")
        return True
    except Exception as e:
        logger.error(f"取消任务失败: {str(e)}", extra={"job_id": job_id})
        return False
