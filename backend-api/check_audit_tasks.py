"""检查审核任务数量"""
import asyncio
from app.core.database import get_session_factory
from app.models.audit import AuditTask
from sqlalchemy import select, func

async def check_audit_tasks():
    session_factory = get_session_factory()
    async with session_factory() as db:
        # 查询总数
        result = await db.execute(select(func.count(AuditTask.id)))
        total = result.scalar()
        print(f"审核任务总数: {total}")
        
        # 查询前20条
        result = await db.execute(
            select(AuditTask)
            .order_by(AuditTask.submittedAt.desc())
            .limit(20)
        )
        tasks = result.scalars().all()
        print(f"\n前20条审核任务:")
        for i, task in enumerate(tasks, 1):
            print(f"{i}. ID: {task.id}, Level: {task.level}, Status: {task.status.value}")

if __name__ == "__main__":
    asyncio.run(check_audit_tasks())
