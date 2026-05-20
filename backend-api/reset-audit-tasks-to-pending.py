"""
将前几个审核任务的状态重置为待审核（PENDING）

用于测试和演示目的
"""
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.audit import AuditTask, AuditStatus
from app.models.sample import Sample, SampleStatus
from datetime import datetime

# 数据库连接配置
DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/lims_dev"

async def reset_audit_tasks():
    """重置前10个审核任务为待审核状态"""
    
    # 创建异步引擎
    engine = create_async_engine(DATABASE_URL, echo=True)
    
    # 创建异步会话工厂
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        try:
            # 1. 查询前10个审核任务（按提交时间排序）
            result = await session.execute(
                select(AuditTask)
                .order_by(AuditTask.submittedAt.desc())
                .limit(10)
            )
            tasks = result.scalars().all()
            
            print(f"\n找到 {len(tasks)} 个审核任务")
            print("=" * 80)
            
            # 2. 重置每个任务的状态
            for task in tasks:
                print(f"\n任务 ID: {task.id}")
                print(f"  样品 ID: {task.sampleId}")
                print(f"  级别: {task.level}")
                print(f"  当前状态: {task.status}")
                print(f"  当前决策: {task.decision}")
                
                # 重置任务状态
                task.status = AuditStatus.PENDING
                task.decision = None
                task.comments = None
                task.completedAt = None
                
                print(f"  ✅ 已重置为: PENDING")
                
                # 3. 更新对应样品的状态为审核中
                sample_result = await session.execute(
                    select(Sample).where(Sample.id == task.sampleId)
                )
                sample = sample_result.scalar_one_or_none()
                
                if sample:
                    old_status = sample.status
                    sample.status = SampleStatus.IN_AUDIT
                    print(f"  样品状态: {old_status} -> IN_AUDIT")
            
            # 4. 提交更改
            await session.commit()
            
            print("\n" + "=" * 80)
            print(f"✅ 成功重置 {len(tasks)} 个审核任务为待审核状态")
            print("=" * 80)
            
        except Exception as e:
            print(f"\n❌ 错误: {str(e)}")
            await session.rollback()
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    print("🔄 开始重置审核任务状态...")
    asyncio.run(reset_audit_tasks())
    print("\n✅ 完成！")
