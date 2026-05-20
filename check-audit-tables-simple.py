"""
简单检查审核相关表
"""
import asyncio
import asyncpg

async def check_tables():
    print("=== 检查审核相关表 ===\n")
    
    try:
        # 连接数据库
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='password',
            database='lims_dev'
        )
        
        # 1. 列出所有表
        print("1. 数据库中的所有表:")
        tables = await conn.fetch("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        
        for table in tables:
            print(f"   - {table['tablename']}")
        print()
        
        # 2. 检查审核相关表
        audit_tables = [t['tablename'] for t in tables if 'audit' in t['tablename'].lower()]
        print(f"2. 审核相关表 ({len(audit_tables)} 个):")
        for table in audit_tables:
            print(f"   - {table}")
        print()
        
        # 3. 检查 workflow 相关表
        workflow_tables = [t['tablename'] for t in tables if 'workflow' in t['tablename'].lower()]
        print(f"3. Workflow 相关表 ({len(workflow_tables)} 个):")
        for table in workflow_tables:
            print(f"   - {table}")
        print()
        
        # 4. 如果有 audit_workflow_configs 表，查看数据
        if 'audit_workflow_configs' in [t['tablename'] for t in tables]:
            print("4. audit_workflow_configs 表数据:")
            count = await conn.fetchval("SELECT COUNT(*) FROM audit_workflow_configs")
            print(f"   记录数: {count}")
            
            if count > 0:
                rows = await conn.fetch("SELECT id, name, status FROM audit_workflow_configs LIMIT 5")
                for row in rows:
                    print(f"   - ID: {row['id']}, 名称: {row['name']}, 状态: {row['status']}")
        else:
            print("❌ audit_workflow_configs 表不存在！")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_tables())
