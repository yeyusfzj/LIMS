"""
ARQ Worker 配置

定义 ARQ worker 的任务函数和配置
"""
from arq import cron
from arq.connections import RedisSettings
from app.config import settings
from app.tasks.import_tasks import (
    process_batch_import,
    process_batch_update,
    process_batch_delete
)
from app.tasks.export_tasks import (
    process_data_export,
    process_report_export
)
from app.tasks.report_tasks import (
    process_report_generation,
    process_batch_report_generation
)


# Worker 配置类
class WorkerSettings:
    """ARQ Worker 配置"""
    
    # Redis 连接配置
    redis_settings = RedisSettings(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
        database=0,
    )
    
    # 注册任务函数
    functions = [
        # 导入任务
        process_batch_import,
        process_batch_update,
        process_batch_delete,
        
        # 导出任务
        process_data_export,
        process_report_export,
        
        # 报告生成任务
        process_report_generation,
        process_batch_report_generation,
    ]
    
    # Worker 配置
    max_jobs = 10  # 最大并发任务数
    job_timeout = 3600  # 任务超时时间（秒）
    keep_result = 3600  # 保留结果时间（秒）
    
    # 定时任务（可选）
    # cron_jobs = [
    #     cron(func=cleanup_old_jobs, hour=2, minute=0),  # 每天凌晨 2 点清理旧任务
    # ]


# 启动 worker 的函数
async def startup(ctx):
    """Worker 启动时执行"""
    print("ARQ Worker 启动中...")
    print(f"Redis: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
    print(f"最大并发任务数: {WorkerSettings.max_jobs}")


async def shutdown(ctx):
    """Worker 关闭时执行"""
    print("ARQ Worker 关闭中...")


# 添加启动和关闭钩子
WorkerSettings.on_startup = startup
WorkerSettings.on_shutdown = shutdown
