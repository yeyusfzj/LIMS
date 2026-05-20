"""
测试密码验证
"""
import asyncio
import bcrypt
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def test_password():
    async with AsyncSessionLocal() as db:
        # 获取admin用户
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        user = result.scalar_one_or_none()
        
        if not user:
            print("❌ 未找到admin用户")
            return
        
        print(f"✓ 找到用户: {user.username}")
        print(f"  密码哈希: {user.passwordHash[:50]}...")
        
        # 测试密码
        test_passwords = ["admin123", "Admin123!@#", "admin", "password"]
        
        print(f"\n测试密码验证:")
        for pwd in test_passwords:
            try:
                is_valid = bcrypt.checkpw(
                    pwd.encode('utf-8'),
                    user.passwordHash.encode('utf-8')
                )
                status = "✓ 成功" if is_valid else "✗ 失败"
                print(f"  {pwd:20s} -> {status}")
                
                if is_valid:
                    print(f"\n✓✓✓ 正确密码是: {pwd}")
                    break
            except Exception as e:
                print(f"  {pwd:20s} -> ✗ 错误: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_password())
