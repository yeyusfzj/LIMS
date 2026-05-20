"""
检查 workflow config 表和数据
"""
import asyncio
import sys
sys.path.insert(0, 'fastapi-backend')

from app.core.database import AsyncSessionLocal
from sqlalchemy import text

async def check_workflow_config():
    print("=== 检查 Workflow Config 表 ===\n")
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 检查表是否存在
            print("1. 检查表是否存在...")
            result = await db.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'audit_workflow_configs'
                )
            """))
            table_exists = result.scalar()
            print(f"   audit_workflow_configs 表存在: {table_exists}\n")
            
            if not table_exists:
                print("❌ 表不存在！需要创建表。")
                return
            
            # 2. 检查表结构
            print("2. 检查表结构...")
            result = await db.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'audit_workflow_configs'
                ORDER BY ordinal_position
            """))
            columns = result.fetchall()
            for col in columns:
                print(f"   - {col[0]}: {col[1]}")
            print()
            
            # 3. 检查数据数量
            print("3. 检查数据数量...")
            result = await db.execute(text("SELECT COUNT(*) FROM audit_workflow_configs"))
            count = result.scalar()
            print(f"   记录数: {count}\n")
            
            # 4. 查看前几条数据
            if count > 0:
                print("4. 查看前 5 条数据...")
                result = await db.execute(text("""
                    SELECT id, name, status, "sampleTypes", "parallelAudit"
                    FROM audit_workflow_configs
                    LIMIT 5
                """))
                rows = result.fetchall()
                for row in rows:
                    print(f"   ID: {row[0]}")
                    print(f"   名称: {row[1]}")
                    print(f"   状态: {row[2]}")
                    print(f"   样品类型: {row[3]}")
                    print(f"   并行审核: {row[4]}")
                    print()
            else:
                print("❌ 表中没有数据！")
                
        except Exception as e:
            print(f"❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_workflow_config())
