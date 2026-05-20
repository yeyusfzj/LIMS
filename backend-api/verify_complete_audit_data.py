"""验证完整的审核任务数据"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def verify_complete_audit_data():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("验证完整的审核任务数据...")
        
        # 查询最近创建的5个审核任务及其关联数据
        result = await db.execute(
            text("""
                SELECT 
                    at.id as audit_task_id,
                    at.level,
                    at.status as audit_status,
                    t."nodeName" as task_name,
                    t.status as task_status,
                    s."sampleNumber" as sample_number,
                    s."sampleName" as sample_name,
                    s."clientName" as client_name,
                    wi.id as workflow_instance_id
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                WHERE s."sampleNumber" LIKE 'SN-20260513-%'
                ORDER BY at."submittedAt" DESC
                LIMIT 5;
            """)
        )
        
        rows = result.fetchall()
        
        if rows:
            print(f"\n✅ 找到 {len(rows)} 个完整的审核任务（显示最近5个）：\n")
            for i, row in enumerate(rows, 1):
                print(f"{i}. 审核任务 ID: {row[0]}")
                print(f"   审核级别: 第{row[1]}级")
                print(f"   审核状态: {row[2]}")
                print(f"   任务名称: {row[3]}")
                print(f"   任务状态: {row[4]}")
                print(f"   样品编号: {row[5]}")
                print(f"   样品名称: {row[6]}")
                print(f"   客户名称: {row[7]}")
                print(f"   工作流实例: {row[8]}")
                print()
        else:
            print("\n❌ 未找到完整的审核任务数据")
        
        # 统计数据
        result = await db.execute(
            text("""
                SELECT 
                    COUNT(DISTINCT at.id) as audit_tasks,
                    COUNT(DISTINCT t.id) as tasks,
                    COUNT(DISTINCT wi.id) as workflow_instances,
                    COUNT(DISTINCT s.id) as samples
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                WHERE s."sampleNumber" LIKE 'SN-20260513-%';
            """)
        )
        
        stats = result.fetchone()
        print("📊 新创建的数据统计：")
        print(f"   - 审核任务: {stats[0]} 个")
        print(f"   - 工作流任务: {stats[1]} 个")
        print(f"   - 工作流实例: {stats[2]} 个")
        print(f"   - 样品: {stats[3]} 个")

if __name__ == "__main__":
    asyncio.run(verify_complete_audit_data())
