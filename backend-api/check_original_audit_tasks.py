"""检查原始审核任务数据"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def check_original_tasks():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("检查审核任务数据...")
        
        # 查询所有审核任务，按创建时间排序
        result = await db.execute(
            text("""
                SELECT 
                    at.id,
                    at."submittedAt",
                    s."sampleNumber",
                    s."createdBy"
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                ORDER BY at."submittedAt" DESC
                LIMIT 20;
            """)
        )
        
        rows = result.fetchall()
        
        print(f"\n最近的 20 个审核任务：\n")
        for i, row in enumerate(rows, 1):
            print(f"{i}. ID: {row[0][:8]}... | 提交时间: {row[1]} | 样品: {row[2]} | 创建者: {row[3]}")
        
        # 统计不同创建者的任务数量
        result = await db.execute(
            text("""
                SELECT 
                    s."createdBy",
                    COUNT(at.id) as task_count
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                GROUP BY s."createdBy"
                ORDER BY task_count DESC;
            """)
        )
        
        creators = result.fetchall()
        
        print(f"\n按创建者统计：\n")
        for creator, count in creators:
            print(f"  - {creator}: {count} 个任务")
        
        # 查询是否有 system 创建的简单任务
        result = await db.execute(
            text("""
                SELECT COUNT(*)
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                WHERE t.id NOT IN (
                    SELECT t2.id FROM tasks t2
                    JOIN workflow_instances wi ON t2."instanceId" = wi.id
                );
            """)
        )
        
        orphan_count = result.scalar()
        print(f"\n没有关联样品的任务: {orphan_count} 个")

if __name__ == "__main__":
    asyncio.run(check_original_tasks())
