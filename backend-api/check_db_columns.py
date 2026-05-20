"""检查数据库表的实际列名"""
import asyncio
from sqlalchemy import inspect, text
from app.core.database import get_engine


async def check_columns():
    """检查 audit_tasks 表的列名"""
    engine = get_engine()
    async with engine.begin() as conn:
        # 方法 1: 使用 inspect
        print("=== 使用 inspect 检查列名 ===")
        columns = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_columns('audit_tasks')
        )
        for col in columns:
            print(f"  - {col['name']} ({col['type']})")
        
        # 方法 2: 直接查询
        print("\n=== 使用 SQL 查询检查列名 ===")
        result = await conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'audit_tasks'
            ORDER BY ordinal_position
        """))
        rows = result.fetchall()
        for row in rows:
            print(f"  - {row[0]} ({row[1]})")


if __name__ == "__main__":
    asyncio.run(check_columns())
