"""
直接在数据库中设置admin密码
使用预先生成的bcrypt哈希
"""
import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def set_password():
    # 使用在线bcrypt工具生成的哈希
    # 密码: admin123
    # 使用 https://bcrypt-generator.com/ 生成
    # Rounds: 12
    password_hash = "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIq.Zu6W8u"
    
    async with AsyncSessionLocal() as db:
        # 更新admin用户的密码
        result = await db.execute(
            text("""
                UPDATE users 
                SET "passwordHash" = :password_hash 
                WHERE username = 'admin'
                RETURNING id, username, email
            """),
            {"password_hash": password_hash}
        )
        
        user = result.fetchone()
        
        if user:
            await db.commit()
            print(f"✓ 密码已更新")
            print(f"  用户ID: {user[0]}")
            print(f"  用户名: {user[1]}")
            print(f"  邮箱: {user[2]}")
            print(f"\n登录信息:")
            print(f"  用户名: admin")
            print(f"  密码: admin123")
        else:
            print("❌ 未找到admin用户")

if __name__ == "__main__":
    asyncio.run(set_password())
