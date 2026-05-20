"""检查审核任务的详细信息"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def check_audit_task_details():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("检查审核任务的详细信息...")
        
        # 查询一个审核任务的完整信息
        result = await db.execute(
            text("""
                SELECT 
                    at.id as audit_task_id,
                    at.level,
                    at.status as audit_status,
                    at.decision,
                    at.comments,
                    at."auditorId",
                    t.id as task_id,
                    t."nodeName",
                    t."nodeType",
                    t.status as task_status,
                    t.result,
                    wi.id as instance_id,
                    s.id as sample_id,
                    s."sampleName",
                    s."sampleType",
                    COUNT(r.id) as result_count
                FROM audit_tasks at
                JOIN tasks t ON at."taskId" = t.id
                JOIN workflow_instances wi ON t."instanceId" = wi.id
                JOIN samples s ON wi."sampleId" = s.id
                LEFT JOIN results r ON r."sampleId" = s.id
                WHERE s."sampleNumber" LIKE 'SN-20260513-%'
                GROUP BY at.id, t.id, wi.id, s.id
                LIMIT 5;
            """)
        )
        
        rows = result.fetchall()
        
        if rows:
            print(f"\n找到 {len(rows)} 个审核任务：\n")
            for i, row in enumerate(rows, 1):
                print(f"{i}. 审核任务 ID: {row[0]}")
                print(f"   审核级别: 第{row[1]}级")
                print(f"   审核状态: {row[2]}")
                print(f"   审核决策: {row[3]}")
                print(f"   审核意见: {row[4]}")
                print(f"   审核人: {row[5]}")
                print(f"   任务名称: {row[7]}")
                print(f"   任务类型: {row[8]}")
                print(f"   任务状态: {row[9]}")
                print(f"   任务结果: {row[10]}")
                print(f"   样品名称: {row[13]}")
                print(f"   样品类型: {row[14]}")
                print(f"   检测结果数量: {row[15]}")
                print()
        else:
            print("\n未找到审核任务")

if __name__ == "__main__":
    asyncio.run(check_audit_task_details())
