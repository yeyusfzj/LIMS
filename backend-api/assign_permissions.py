"""为角色分配权限"""
import asyncio
import asyncpg

async def assign_permissions():
    """为角色分配权限"""
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='password',
        database='lims_dev'
    )
    
    try:
        print("📝 为 admin 角色添加所有权限...")
        
        # 获取 admin 角色 ID
        admin_role = await conn.fetchrow("""
            SELECT id FROM roles WHERE name = 'admin' LIMIT 1
        """)
        
        if not admin_role:
            print("❌ 未找到 admin 角色")
            return
        
        print(f"✅ 找到 admin 角色: {admin_role['id']}")
        
        # 获取所有权限
        permissions = await conn.fetch('SELECT id, resource, action FROM permissions')
        print(f"📊 找到 {len(permissions)} 个权限")
        
        # 为 admin 角色添加所有权限
        added = 0
        for perm in permissions:
            try:
                await conn.execute("""
                    INSERT INTO role_permissions ("roleId", "permissionId")
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                """, admin_role['id'], perm['id'])
                added += 1
            except Exception as e:
                print(f"⚠️  添加权限失败 {perm['resource']}:{perm['action']}: {e}")
        
        print(f"✅ 为 admin 角色添加了 {added} 个权限")
        
        # 验证
        count = await conn.fetchval("""
            SELECT COUNT(*) FROM role_permissions WHERE "roleId" = $1
        """, admin_role['id'])
        print(f"📊 admin 角色现在有 {count} 个权限")
        
    finally:
        await conn.close()

if __name__ == '__main__':
    asyncio.run(assign_permissions())
