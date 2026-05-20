import asyncio
import asyncpg

async def check_admin():
    conn = await asyncpg.connect(
        "postgresql://postgres:password@localhost:5432/lims_dev"
    )
    
    # 检查 admin 用户
    row = await conn.fetchrow(
        'SELECT username, "passwordHash", LENGTH("passwordHash") as hash_length FROM users WHERE username = $1',
        'admin'
    )
    
    if row:
        print(f"用户名: {row['username']}")
        print(f"密码哈希长度: {row['hash_length']}")
        print(f"密码哈希前 50 个字符: {row['passwordHash'][:50]}")
    else:
        print("未找到 admin 用户")
    
    await conn.close()

asyncio.run(check_admin())
