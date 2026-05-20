"""检查数据库中的工作流"""
import asyncio
from app.core.database import get_session_factory
from sqlalchemy import text

async def check_workflows():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("检查数据库中的工作流...")
        
        # 查询所有工作流
        result = await db.execute(
            text("""
                SELECT id, name, status, "isActive"
                FROM workflows
                ORDER BY "createdAt" DESC
                LIMIT 10;
            """)
        )
        
        rows = result.fetchall()
        
        if rows:
            print(f"\n找到 {len(rows)} 个工作流：")
            for row in rows:
                print(f"  - ID: {row[0]}")
                print(f"    名称: {row[1]}")
                print(f"    状态: {row[2]}")
                print(f"    激活: {row[3]}")
                print()
        else:
            print("\n未找到任何工作流")

if __name__ == "__main__":
    asyncio.run(check_workflows())
