"""
生成并设置正确的密码
"""
import asyncio
import bcrypt
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def set_password():
    # 生成新的密码哈希
    password = "admin123"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    hashed_str = hashed.decode('utf-8')
    
    print(f"生成新密码:")
    print(f"  明文: {password}")
    print(f"  哈希: {hashed_str}")
    
    # 验证生成的哈希
    is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed)
    print(f"  验证: {'✓ 成功' if is_valid else '✗ 失败'}")
    
    if not is_valid:
        print("\n❌ 生成的哈希验证失败，停止更新")
        return
    
    # 更新数据库
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("""
                UPDATE users 
                SET "passwordHash" = :password_hash 
                WHERE username = 'admin'
                RETURNING id, username, email
            """),
            {"password_hash": hashed_str}
        )
        
        user = result.fetchone()
        
        if user:
            await db.commit()
            print(f"\n✓ 密码已更新到数据库")
            print(f"  用户ID: {user[0]}")
            print(f"  用户名: {user[1]}")
            print(f"  邮箱: {user[2]}")
            print(f"\n登录信息:")
            print(f"  用户名: admin")
            print(f"  密码: {password}")
        else:
            print("\n❌ 未找到admin用户")

if __name__ == "__main__":
    asyncio.run(set_password())
