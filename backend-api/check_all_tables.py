"""检查数据库中的所有表"""
import asyncio
from sqlalchemy import inspect, text
from app.core.database import get_engine


async def check_tables():
    """检查数据库中的所有表"""
    engine = get_engine()
    async with engine.begin() as conn:
        # 获取所有表名
        print("=== 数据库中的所有表 ===")
        tables = await conn.run_sync(
            lambda sync_conn: inspect(sync_conn).get_table_names()
        )
        for table in sorted(tables):
            print(f"  - {table}")
        
        # 检查是否有 audit 相关的表
        print("\n=== Audit 相关的表 ===")
        audit_tables = [t for t in tables if 'audit' in t.lower()]
        for table in audit_tables:
            print(f"\n表: {table}")
            columns = await conn.run_sync(
                lambda sync_conn: inspect(sync_conn).get_columns(table)
            )
            for col in columns:
                print(f"  - {col['name']} ({col['type']})")


if __name__ == "__main__":
    asyncio.run(check_tables())
