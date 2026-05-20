"""
直接通过SQL更新admin用户的角色
"""

import asyncpg
import asyncio
import os
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


async def update_admin_roles():
    """更新admin用户的角色"""
    
    try:
        # 连接数据库
        conn = await asyncpg.connect(DATABASE_URL)
        
        print("="*50)
        print("更新Admin用户角色")
        print("="*50)
        print()
        
        # 查询admin用户
        admin_user = await conn.fetchrow(
            'SELECT id, username, email, "fullName", roles FROM users WHERE username = $1',
            "admin"
        )
        
        if not admin_user:
            print("❌ 未找到admin用户")
            await conn.close()
            return False
        
        print(f"✓ 找到admin用户:")
        print(f"  ID: {admin_user['id']}")
        print(f"  用户名: {admin_user['username']}")
        print(f"  邮箱: {admin_user['email']}")
        print(f"  全名: {admin_user['fullName']}")
        print(f"  当前角色: {admin_user['roles']}")
        print()
        
        # 定义所有角色
        all_roles = [
            "admin",
            "auditor",
            "senior_auditor",
            "audit_supervisor",
            "lab_manager",
            "technician",
            "analyst",
            "quality_manager",
            "report_reviewer",
            "sample_manager",
            "user"
        ]
        
        # 更新角色
        await conn.execute(
            "UPDATE users SET roles = $1 WHERE username = $2",
            all_roles,
            "admin"
        )
        
        print("✓ 已更新admin用户角色:")
        for i, role in enumerate(all_roles, 1):
            print(f"  {i}. {role}")
        print()
        
        # 验证更新
        updated_user = await conn.fetchrow(
            "SELECT id, username, roles FROM users WHERE username = $1",
            "admin"
        )
        
        print("✓ 验证更新结果:")
        print(f"  用户名: {updated_user['username']}")
        print(f"  角色数量: {len(updated_user['roles'])}")
        print(f"  角色列表: {updated_user['roles']}")
        print()
        
        await conn.close()
        
        print("="*50)
        print("✓✓✓ 更新成功 ✓✓✓")
        print("="*50)
        print()
        print("登录信息:")
        print("  用户名: admin")
        print("  密码: admin123")
        print(f"  角色: {len(all_roles)} 个")
        
        return True
        
    except Exception as e:
        print(f"❌ 更新失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    asyncio.run(update_admin_roles())
