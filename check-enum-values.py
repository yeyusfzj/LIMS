"""
检查枚举类型的有效值
"""
import asyncio
import asyncpg

async def check_enums():
    print("=== 检查枚举类型 ===\n")
    
    try:
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='password',
            database='lims_dev'
        )
        
        # 查询 WorkflowConfigStatus 枚举值
        print("1. WorkflowConfigStatus 枚举值:")
        rows = await conn.fetch("""
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'WorkflowConfigStatus'
            ORDER BY e.enumsortorder
        """)
        
        for row in rows:
            print(f"   - {row['enumlabel']}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 错误: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_enums())
