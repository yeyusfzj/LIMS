"""检查数据库中的枚举类型"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def check_enum_types():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("检查数据库中的枚举类型...")
        
        # 查询所有枚举类型
        result = await db.execute(
            text("""
                SELECT t.typname as enum_name, 
                       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as enum_values
                FROM pg_type t 
                JOIN pg_enum e ON t.oid = e.enumtypid  
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
                WHERE n.nspname = 'public'
                GROUP BY t.typname
                ORDER BY t.typname;
            """)
        )
        
        rows = result.fetchall()
        
        if rows:
            print("\n找到以下枚举类型：")
            for row in rows:
                print(f"  - {row[0]}: {row[1]}")
        else:
            print("\n未找到任何枚举类型")
        
        # 检查 workflow_instances 表结构
        print("\n检查 workflow_instances 表结构...")
        result = await db.execute(
            text("""
                SELECT column_name, data_type, udt_name
                FROM information_schema.columns
                WHERE table_name = 'workflow_instances'
                ORDER BY ordinal_position;
            """)
        )
        
        rows = result.fetchall()
        if rows:
            print("\nworkflow_instances 表字段：")
            for row in rows:
                print(f"  - {row[0]}: {row[1]} ({row[2]})")
        else:
            print("\nworkflow_instances 表不存在")

if __name__ == "__main__":
    asyncio.run(check_enum_types())
