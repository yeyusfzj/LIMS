import asyncio
from sqlalchemy import text
from app.core.database import get_db

async def check_columns():
    async for session in get_db():
        try:
            result = await session.execute(
                text("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
            )
            columns = [row[0] for row in result]
            print("users 表的列:")
            for col in columns:
                print(f"  - {col}")
        finally:
            break

asyncio.run(check_columns())
