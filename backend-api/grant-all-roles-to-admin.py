"""
为admin用户授予所有角色
通过user_roles关联表操作
"""

import asyncpg
import asyncio
import os
import uuid
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 从环境变量获取数据库连接信息
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/laboratory_db")

# 转换为asyncpg格式
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
if DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")


async def grant_all_roles():
    """为admin用户授予所有角色"""
    
    try:
        # 连接数据库
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("="*60)
        print("为Admin用户授予所有角色")
        print("="*60)
        print()
        
        # 1. 查询admin用户
        admin_user = await conn.fetchrow(
            'SELECT id, username, email, "fullName" FROM users WHERE username = $1',
            "admin"
        )
        
        if not admin_user:
            print("❌ 未找到admin用户")
            await conn.close()
            return False
        
        admin_id = admin_user['id']
        print(f"✓ 找到admin用户:")
        print(f"  ID: {admin_id}")
        print(f"  用户名: {admin_user['username']}")
        print(f"  邮箱: {admin_user['email']}")
        print(f"  全名: {admin_user['fullName']}")
        print()
        
        # 2. 查询当前角色
        current_roles = await conn.fetch(
            '''
            SELECT r.id, r.name, r.description
            FROM roles r
            JOIN user_roles ur ON r.id = ur."roleId"
            WHERE ur."userId" = $1
            ORDER BY r.name
            ''',
            admin_id
        )
        
        print(f"✓ 当前角色 ({len(current_roles)} 个):")
        for role in current_roles:
            print(f"  - {role['name']}: {role['description']}")
        print()
        
        # 3. 查询所有可用角色
        all_roles = await conn.fetch(
            'SELECT id, name, description FROM roles ORDER BY name'
        )
        
        print(f"✓ 系统中所有角色 ({len(all_roles)} 个):")
        for role in all_roles:
            print(f"  - {role['name']}: {role['description']}")
        print()
        
        # 4. 删除admin用户的所有现有角色关联
        await conn.execute(
            'DELETE FROM user_roles WHERE "userId" = $1',
            admin_id
        )
        print("✓ 已清除admin用户的现有角色关联")
        print()
        
        # 5. 为admin用户添加所有角色
        added_count = 0
        for role in all_roles:
            await conn.execute(
                'INSERT INTO user_roles ("userId", "roleId") VALUES ($1, $2)',
                admin_id,
                role['id']
            )
            added_count += 1
        
        print(f"✓ 已为admin用户添加 {added_count} 个角色")
        print()
        
        # 6. 验证更新结果
        updated_roles = await conn.fetch(
            '''
            SELECT r.id, r.name, r.description
            FROM roles r
            JOIN user_roles ur ON r.id = ur."roleId"
            WHERE ur."userId" = $1
            ORDER BY r.name
            ''',
            admin_id
        )
        
        print("="*60)
        print("✓✓✓ 更新成功 ✓✓✓")
        print("="*60)
        print()
        print(f"Admin用户现在拥有 {len(updated_roles)} 个角色:")
        for i, role in enumerate(updated_roles, 1):
            print(f"  {i}. {role['name']}")
        print()
        print("登录信息:")
        print("  用户名: admin")
        print("  密码: admin123")
        print(f"  角色数: {len(updated_roles)}")
        print()
        
        await conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 操作失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    asyncio.run(grant_all_roles())
