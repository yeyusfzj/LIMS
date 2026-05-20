"""测试数据库连接"""
import asyncio
from sqlalchemy import select
from app.core.database import async_session_maker
from app.models.user import User

async def test():
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.username == "admin"))
        admin = result.scalar_one_or_none()
        if admin:
            print(f"✓ 数据库连接成功！找到管理员用户: {admin.username}")
        else:
            print("❌ 未找到管理员用户")

if __name__ == "__main__":
    asyncio.run(test())
