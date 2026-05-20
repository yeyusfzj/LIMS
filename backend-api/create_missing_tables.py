"""创建缺失的数据库表"""
import asyncio
import asyncpg

async def create_missing_tables():
    """创建缺失的表"""
    # 连接数据库
    conn = await asyncpg.connect(
        host='localhost',
        port=5432,
        user='postgres',
        password='password',
        database='lims_dev'
    )
    
    try:
        print("🔍 检查 role_permissions 表是否存在...")
        
        # 检查表是否存在
        exists = await conn.fetchval("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'role_permissions'
            )
        """)
        
        if exists:
            print("✅ role_permissions 表已存在")
        else:
            print("📝 创建 role_permissions 表...")
            
            # 创建表
            await conn.execute("""
                CREATE TABLE role_permissions (
                    "roleId" VARCHAR NOT NULL,
                    "permissionId" VARCHAR NOT NULL,
                    PRIMARY KEY ("roleId", "permissionId"),
                    FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE,
                    FOREIGN KEY ("permissionId") REFERENCES permissions(id) ON DELETE CASCADE
                )
            """)
            
            # 创建索引
            await conn.execute("""
                CREATE INDEX idx_role_permissions_role_id ON role_permissions("roleId")
            """)
            
            await conn.execute("""
                CREATE INDEX idx_role_permissions_permission_id ON role_permissions("permissionId")
            """)
            
            print("✅ role_permissions 表创建成功")
        
        # 检查是否有数据
        count = await conn.fetchval('SELECT COUNT(*) FROM role_permissions')
        print(f"📊 role_permissions 表中有 {count} 条记录")
        
        # 如果没有数据，为 admin 角色添加所有权限
        if count == 0:
            print("📝 为 admin 角色添加权限...")
            
            # 获取 admin 角色 ID
            admin_role = await conn.fetchrow("""
                SELECT id FROM roles WHERE name = 'ADMIN' LIMIT 1
            """)
            
            if admin_role:
                # 获取所有权限
                permissions = await conn.fetch('SELECT id FROM permissions')
                
                # 为 admin 角色添加所有权限
                for perm in permissions:
                    await conn.execute("""
                        INSERT INTO role_permissions ("roleId", "permissionId")
                        VALUES ($1, $2)
                        ON CONFLICT DO NOTHING
                    """, admin_role['id'], perm['id'])
                
                print(f"✅ 为 admin 角色添加了 {len(permissions)} 个权限")
            else:
                print("⚠️  未找到 admin 角色")
        
    finally:
        await conn.close()
    
    print("\n✅ 数据库表创建完成")

if __name__ == '__main__':
    asyncio.run(create_missing_tables())
