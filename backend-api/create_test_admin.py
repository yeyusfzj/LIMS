#!/usr/bin/env python3
"""创建测试管理员用户"""

import asyncio
import bcrypt
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def create_admin():
    async with AsyncSessionLocal() as db:
        # 检查是否已存在 admin 用户
        result = await db.execute(
            select(User).where(User.username == "admin")
        )
        existing_user = result.scalar_one_or_none()
        
        # 哈希密码
        hashed_password = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        if existing_user:
            print(f"✅ Admin 用户已存在")
            print(f"   用户名: {existing_user.username}")
            print(f"   邮箱: {existing_user.email}")
            
            # 更新密码为 admin123
            existing_user.password = hashed_password
            await db.commit()
            print(f"   密码已重置为: admin123")
        else:
            # 创建新用户
            new_user = User(
                username="admin",
                email="admin@example.com",
                password=hashed_password,
                realName="系统管理员",
                isActive=True
            )
            db.add(new_user)
            await db.commit()
            print(f"✅ 创建 Admin 用户成功")
            print(f"   用户名: admin")
            print(f"   密码: admin123")
            print(f"   邮箱: admin@example.com")

if __name__ == "__main__":
    asyncio.run(create_admin())
