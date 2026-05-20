"""检查reports表结构"""
import asyncio
from app.core.database import get_engine
from sqlalchemy import text

async def check_table():
    engine = get_engine()
    async with engine.connect() as conn:
        result = await conn.execute(
            text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'reports' ORDER BY ordinal_position")
        )
        print("Reports表字段:")
        print("=" * 50)
        for row in result:
            print(f"{row[0]}: {row[1]}")

asyncio.run(check_table())
