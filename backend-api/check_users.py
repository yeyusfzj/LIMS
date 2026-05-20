"""检查数据库中的用户"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy import select
from sqlalchemy.orm import selectinload

async def check_users():
    session = AsyncSessionLocal()
    try:
        result = await session.execute(
            select(User).options(selectinload(User.roles)).limit(10)
        )
        users = result.scalars().all()
        
        print(f"\n数据库中的用户 (共 {len(users)} 个):")
        print("-" * 80)
        for user in users:
            roles = [role.name for role in user.roles] if user.roles else []
            print(f"用户名: {user.username:20} 角色: {', '.join(roles):30} ID: {user.id}")
        print("-" * 80)
    finally:
        await session.close()

if __name__ == "__main__":
    asyncio.run(check_users())
