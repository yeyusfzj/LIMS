"""检查数据库中的角色和权限"""
import asyncio
import asyncpg

async def check_roles():
    """检查角色和权限"""
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='password',
        database='lims_dev'
    )
    
    try:
        print("🔍 检查角色...")
        roles = await conn.fetch('SELECT id, name FROM roles')
        print(f"找到 {len(roles)} 个角色:")
        for role in roles:
            print(f"  - {role['name']} (ID: {role['id']})")
        
        print("\n🔍 检查权限...")
        permissions = await conn.fetch('SELECT id, resource, action FROM permissions LIMIT 10')
        print(f"找到权限 (显示前10个):")
        for perm in permissions:
            print(f"  - {perm['resource']}:{perm['action']} (ID: {perm['id']})")
        
        print("\n🔍 检查 role_permissions 关联...")
        role_perms = await conn.fetch('SELECT COUNT(*) as count FROM role_permissions')
        print(f"role_permissions 表中有 {role_perms[0]['count']} 条记录")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(check_roles())
