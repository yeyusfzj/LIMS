"""恢复到最原始的状态 - 删除所有测试任务"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def restore_to_very_original():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("开始恢复到最原始状态...")
        
        # 统计当前数据
        result = await db.execute(text("SELECT COUNT(*) FROM audit_tasks"))
        total_before = result.scalar()
        print(f"\n当前审核任务总数: {total_before}")
        
        # 查询最早的审核任务时间
        result = await db.execute(
            text("""
                SELECT MIN(at."submittedAt"), MAX(at."submittedAt")
                FROM audit_tasks at
            """)
        )
        min_time, max_time = result.fetchone()
        print(f"最早任务时间: {min_time}")
        print(f"最晚任务时间: {max_time}")
        
        # 删除所有 admin 创建的关联到 SN-INT-1777889846489 样品的审核任务
        result = await db.execute(
            text("""
                DELETE FROM audit_tasks
                WHERE "taskId" IN (
                    SELECT t.id FROM tasks t
                    JOIN workflow_instances wi ON t."instanceId" = wi.id
                    JOIN samples s ON wi."sampleId" = s.id
                    WHERE s."sampleNumber" = 'SN-INT-1777889846489'
                    AND s."createdBy" = 'admin'
                )
            """)
        )
        deleted_audit_tasks = result.rowcount
        print(f"\n删除 admin 创建的审核任务: {deleted_audit_tasks} 条")
        
        # 删除对应的工作流任务
        result = await db.execute(
            text("""
                DELETE FROM tasks
                WHERE "instanceId" IN (
                    SELECT wi.id FROM workflow_instances wi
                    JOIN samples s ON wi."sampleId" = s.id
                    WHERE s."sampleNumber" = 'SN-INT-1777889846489'
                    AND s."createdBy" = 'admin'
                )
            """)
        )
        deleted_tasks = result.rowcount
        print(f"删除对应的工作流任务: {deleted_tasks} 条")
        
        # 删除对应的工作流实例
        result = await db.execute(
            text("""
                DELETE FROM workflow_instances
                WHERE "sampleId" IN (
                    SELECT id FROM samples
                    WHERE "sampleNumber" = 'SN-INT-1777889846489'
                    AND "createdBy" = 'admin'
                )
            """)
        )
        deleted_instances = result.rowcount
        print(f"删除对应的工作流实例: {deleted_instances} 条")
        
        # 删除对应的样品
        result = await db.execute(
            text("""
                DELETE FROM samples
                WHERE "sampleNumber" = 'SN-INT-1777889846489'
                AND "createdBy" = 'admin'
            """)
        )
        deleted_samples = result.rowcount
        print(f"删除对应的样品: {deleted_samples} 条")
        
        await db.commit()
        
        # 统计恢复后的数据
        result = await db.execute(text("SELECT COUNT(*) FROM audit_tasks"))
        total_after = result.scalar()
        print(f"\n恢复后审核任务总数: {total_after}")
        
        # 查看剩余的审核任务
        result = await db.execute(
            text("""
                SELECT 
                    s."createdBy",
                    COUNT(at.id) as task_count
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                GROUP BY s."createdBy";
            """)
        )
        
        creators = result.fetchall()
        print(f"\n剩余任务按创建者统计：")
        for creator, count in creators:
            print(f"  - {creator}: {count} 个任务")
        
        print(f"\n✅ 恢复完成！")
        print(f"   - 删除前: {total_before} 个审核任务")
        print(f"   - 删除后: {total_after} 个审核任务")

if __name__ == "__main__":
    asyncio.run(restore_to_very_original())
