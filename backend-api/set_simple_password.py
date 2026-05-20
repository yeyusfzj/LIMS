"""
设置简单的admin密码
"""
import asyncio
from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def set_password():
    async with AsyncSessionLocal() as db:
        # 查找admin用户
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ 未找到admin用户")
            return
        
        print(f"✓ 找到用户: {user.username}")
        
        # 设置新密码
        new_password = "admin123"
        hashed = pwd_context.hash(new_password)
        
        print(f"\n设置新密码:")
        print(f"  明文密码: {new_password}")
        print(f"  哈希值: {hashed[:50]}...")
        
        # 更新密码
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(password_hash=hashed)
        )
        await db.commit()
        
        print(f"\n✓ 密码已更新")
        
        # 验证新密码
        is_valid = pwd_context.verify(new_password, hashed)
        print(f"\n验证新密码: {'✓ 成功' if is_valid else '✗ 失败'}")
        
        # 再次从数据库读取验证
        await db.refresh(user)
        is_valid_db = pwd_context.verify(new_password, user.password_hash)
        print(f"验证数据库中的密码: {'✓ 成功' if is_valid_db else '✗ 失败'}")

if __name__ == "__main__":
    asyncio.run(set_password())
