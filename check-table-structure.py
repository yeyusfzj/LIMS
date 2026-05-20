"""
检查 audit_workflow_configs 表结构
"""
import asyncio
import asyncpg

async def check_structure():
    print("=== 检查表结构 ===\n")
    
    try:
        conn = await asyncpg.connect(
            host='localhost',
            port=5432,
            user='postgres',
            password='password',
            database='lims_dev'
        )
        
        # 查询表结构
        rows = await conn.fetch("""
            SELECT 
                column_name, 
                data_type, 
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = 'audit_workflow_configs'
            ORDER BY ordinal_position
        """)
        
        print("audit_workflow_configs 表结构:")
        for row in rows:
            nullable = "NULL" if row['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {row['column_default']}" if row['column_default'] else ""
            print(f"   {row['column_name']}: {row['data_type']} {nullable}{default}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ 错误: {str(e)}")

if __name__ == "__main__":
    asyncio.run(check_structure())
