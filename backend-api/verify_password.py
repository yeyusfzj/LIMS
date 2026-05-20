"""
验证用户密码
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import AuthService

async def verify_password():
    async with AsyncSessionLocal() as db:
        # 获取 admin 用户
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ 未找到 admin 用户")
            return
        
        print(f"✓ 找到用户: {user.username}")
        print(f"  邮箱: {user.email}")
        print(f"  密码哈希: {user.passwordHash[:50]}...")
        
        # 测试密码
        passwords_to_test = ["admin123", "Admin@123", "admin", "password"]
        
        print("\n测试密码:")
        for password in passwords_to_test:
            is_valid = AuthService.verify_password(password, user.passwordHash)
            status = "✓" if is_valid else "✗"
            print(f"  {status} {password}: {'正确' if is_valid else '错误'}")

if __name__ == "__main__":
    asyncio.run(verify_password())
