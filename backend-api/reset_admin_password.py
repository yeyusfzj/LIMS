"""
重置 admin 用户密码
"""
import asyncio
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import AuthService

async def reset_password():
    async with AsyncSessionLocal() as db:
        # 获取 admin 用户
        result = await db.execute(select(User).where(User.username == "admin"))
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ 未找到 admin 用户")
            return
        
        print(f"✓ 找到用户: {user.username}")
        print(f"  当前密码哈希: {user.passwordHash[:50]}...")
        
        # 重置密码为 admin123
        new_password = "admin123"
        new_hash = AuthService.hash_password(new_password)
        
        print(f"\n生成新密码哈希...")
        print(f"  新密码: {new_password}")
        print(f"  新哈希: {new_hash[:50]}...")
        
        # 更新密码
        user.passwordHash = new_hash
        await db.commit()
        
        print(f"\n✓ 密码已更新")
        
        # 验证新密码
        is_valid = AuthService.verify_password(new_password, user.passwordHash)
        print(f"\n验证新密码: {'✓ 成功' if is_valid else '✗ 失败'}")

if __name__ == "__main__":
    asyncio.run(reset_password())
