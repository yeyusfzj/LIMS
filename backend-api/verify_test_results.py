"""验证检测结果数据"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def verify_test_results():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("验证检测结果数据...")
        
        # 查询一个样品的检测结果
        result = await db.execute(
            text("""
                SELECT 
                    s."sampleName",
                    s."sampleType",
                    r.parameter,
                    r.value,
                    r.unit,
                    r.method,
                    r.source,
                    r."isAbnormal",
                    r."enteredBy"
                FROM samples s
                JOIN results r ON s.id = r."sampleId"
                WHERE s."sampleNumber" LIKE 'SN-20260513-%'
                LIMIT 10;
            """)
        )
        
        rows = result.fetchall()
        
        if rows:
            print(f"\n找到 {len(rows)} 条检测结果（显示前10条）：\n")
            for i, row in enumerate(rows, 1):
                print(f"{i}. 样品: {row[0]} ({row[1]})")
                print(f"   参数: {row[2]}")
                print(f"   结果: {row[3]} {row[4]}")
                print(f"   方法: {row[5]}")
                print(f"   来源: {row[6]}")
                print(f"   异常: {'是' if row[7] else '否'}")
                print(f"   操作人: {row[8]}")
                print()
        else:
            print("\n未找到检测结果")

if __name__ == "__main__":
    asyncio.run(verify_test_results())
