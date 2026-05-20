#!/usr/bin/env python3
"""检查 User 表的 schema"""

import asyncio
from sqlalchemy import text
from app.core.database import AsyncSessionLocal

async def check_schema():
    async with AsyncSessionLocal() as db:
        # 检查 User 表的列
        result = await db.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'User' 
            ORDER BY ordinal_position
        """))
        
        print("User 表的列:")
        for row in result:
            print(f"  - {row[0]}: {row[1]}")
        
        # 检查 admin 用户的数据
        result = await db.execute(text("""
            SELECT username, email, "isActive", status
            FROM "User"
            WHERE username = 'admin'
        """))
        
        user = result.fetchone()
        if user:
            print(f"\nAdmin 用户信息:")
            print(f"  - username: {user[0]}")
            print(f"  - email: {user[1]}")
            print(f"  - isActive: {user[2]}")
            print(f"  - status: {user[3]}")

if __name__ == "__main__":
    asyncio.run(check_schema())
