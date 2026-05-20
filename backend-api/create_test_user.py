"""
创建测试用户
"""
import asyncio
import bcrypt
from sqlalchemy import text
from app.core.database import get_engine

async def create_test_user():
    """创建或更新测试用户"""
    # 生成密码哈希
    password = "password123"
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    password_hash = hashed.decode('utf-8')
    
    print(f"密码: {password}")
    print(f"哈希: {password_hash}")
    
    # 更新数据库
    engine = get_engine()
    async with engine.connect() as conn:
        # 更新 testuser 的密码
        await conn.execute(
            text('UPDATE users SET "passwordHash" = :hash WHERE username = :username'),
            {"hash": password_hash, "username": "testuser"}
        )
        await conn.commit()
        print("✓ 测试用户密码已更新")

if __name__ == "__main__":
    asyncio.run(create_test_user())
