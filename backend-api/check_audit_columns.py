"""检查 audit_tasks 表的列名"""
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check_columns():
    async with engine.begin() as conn:
        result = await conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'audit_tasks' "
            "ORDER BY ordinal_position"
        ))
        columns = [row[0] for row in result]
        print("audit_tasks 表的列名:")
        for col in columns:
            print(f"  - {col}")

if __name__ == "__main__":
    asyncio.run(check_columns())
