"""恢复到原始的审核任务数据"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def restore_original_data():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("开始恢复原始审核任务数据...")
        
        # 1. 统计当前数据
        result = await db.execute(text("SELECT COUNT(*) FROM audit_tasks"))
        total_before = result.scalar()
        print(f"\n当前审核任务总数: {total_before}")
        
        # 2. 删除新创建的检测结果
        result = await db.execute(
            text("""
                DELETE FROM results
                WHERE "sampleId" IN (
                    SELECT id FROM samples WHERE "sampleNumber" LIKE 'SN-20260513-%'
                )
            """)
        )
        deleted_results = result.rowcount
        print(f"删除检测结果: {deleted_results} 条")
        
        # 3. 删除新创建的审核任务
        result = await db.execute(
            text("""
                DELETE FROM audit_tasks
                WHERE "taskId" IN (
                    SELECT t.id FROM tasks t
                    JOIN workflow_instances wi ON t."instanceId" = wi.id
                    JOIN samples s ON wi."sampleId" = s.id
                    WHERE s."sampleNumber" LIKE 'SN-20260513-%'
                )
            """)
        )
        deleted_audit_tasks = result.rowcount
        print(f"删除审核任务: {deleted_audit_tasks} 条")
        
        # 4. 删除新创建的工作流任务
        result = await db.execute(
            text("""
                DELETE FROM tasks
                WHERE "instanceId" IN (
                    SELECT wi.id FROM workflow_instances wi
                    JOIN samples s ON wi."sampleId" = s.id
                    WHERE s."sampleNumber" LIKE 'SN-20260513-%'
                )
            """)
        )
        deleted_tasks = result.rowcount
        print(f"删除工作流任务: {deleted_tasks} 条")
        
        # 5. 删除新创建的工作流实例
        result = await db.execute(
            text("""
                DELETE FROM workflow_instances
                WHERE "sampleId" IN (
                    SELECT id FROM samples WHERE "sampleNumber" LIKE 'SN-20260513-%'
                )
            """)
        )
        deleted_instances = result.rowcount
        print(f"删除工作流实例: {deleted_instances} 条")
        
        # 6. 删除新创建的样品
        result = await db.execute(
            text("""
                DELETE FROM samples
                WHERE "sampleNumber" LIKE 'SN-20260513-%'
            """)
        )
        deleted_samples = result.rowcount
        print(f"删除样品: {deleted_samples} 条")
        
        await db.commit()
        
        # 7. 统计恢复后的数据
        result = await db.execute(text("SELECT COUNT(*) FROM audit_tasks"))
        total_after = result.scalar()
        print(f"\n恢复后审核任务总数: {total_after}")
        
        print(f"\n✅ 数据恢复完成！")
        print(f"   - 删除前: {total_before} 个审核任务")
        print(f"   - 删除后: {total_after} 个审核任务")
        print(f"   - 已恢复到原始状态")

if __name__ == "__main__":
    asyncio.run(restore_original_data())
