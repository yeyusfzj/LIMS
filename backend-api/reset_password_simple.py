"""
简单的密码重置脚本 - 直接使用 bcrypt
"""
import asyncio
import bcrypt
from sqlalchemy import text
from app.core.database import get_db

async def reset_password():
    # 生成密码哈希
    password = "admin123"
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    print(f"新密码: {password}")
    print(f"密码哈希: {hashed}")
    
    # 更新数据库
    async for session in get_db():
        try:
            # 更新 admin 用户的密码
            result = await session.execute(
                text("UPDATE users SET \"passwordHash\" = :password WHERE username = 'admin'"),
                {"password": hashed}
            )
            await session.commit()
            print(f"✓ 已更新 admin 用户密码")
            print(f"  受影响的行数: {result.rowcount}")
            
            # 验证更新
            result = await session.execute(
                text("SELECT username, \"passwordHash\" FROM users WHERE username = 'admin'")
            )
            user = result.fetchone()
            if user:
                print(f"\n验证:")
                print(f"  用户名: {user[0]}")
                print(f"  密码哈希: {user[1][:50]}...")
                
                # 验证密码
                if bcrypt.checkpw(password.encode('utf-8'), user[1].encode('utf-8')):
                    print(f"  ✓ 密码验证成功!")
                else:
                    print(f"  ✗ 密码验证失败!")
        except Exception as e:
            print(f"✗ 错误: {e}")
            await session.rollback()
        finally:
            break

if __name__ == "__main__":
    asyncio.run(reset_password())
