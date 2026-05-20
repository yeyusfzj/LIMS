"""创建测试审核任务数据"""
import asyncio
import uuid
from datetime import datetime, timedelta
from app.core.database import get_session_factory
from app.models.audit import AuditTask, AuditStatus
from app.models.task import Task
from sqlalchemy import select

async def create_test_audit_tasks():
    session_factory = get_session_factory()
    async with session_factory() as db:
        # 获取现有的任务
        result = await db.execute(select(Task).limit(1))
        existing_task = result.scalar_one_or_none()
        
        if not existing_task:
            print("没有找到任务，无法创建审核任务")
            return
        
        print(f"使用任务: {existing_task.nodeName} ({existing_task.id})")
        
        # 创建50个审核任务
        created_count = 0
        for i in range(50):
            # 创建审核任务
            audit_task = AuditTask(
                id=str(uuid.uuid4()),
                taskId=existing_task.id,  # 使用同一个任务ID
                level=(i % 4) + 1,
                auditorId=f"auditor_{i % 3}",
                status=AuditStatus.APPROVED if i % 4 == 0 else (
                    AuditStatus.IN_PROGRESS if i % 4 == 1 else AuditStatus.PENDING
                ),
                submittedAt=datetime.utcnow() - timedelta(days=i % 10, hours=i % 24)
            )
            db.add(audit_task)
            created_count += 1
        
        await db.commit()
        print(f"成功创建 {created_count} 个测试审核任务")

if __name__ == "__main__":
    asyncio.run(create_test_audit_tasks())
