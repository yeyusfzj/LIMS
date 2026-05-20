"""
检查 test_methods 表是否存在
"""
import asyncio
from app.core.database import AsyncSessionLocal
from sqlalchemy import text


async def check_table():
    """检查表是否存在"""
    async with AsyncSessionLocal() as db:
        try:
            # 检查表是否存在
            result = await db.execute(
                text("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema='public' 
                    AND table_name='test_methods'
                """)
            )
            table_exists = result.scalar() is not None
            
            print(f"test_methods 表存在: {table_exists}")
            
            if not table_exists:
                print("\n需要创建 test_methods 表")
                print("请运行数据库迁移或手动创建表")
            else:
                # 查询表结构
                result = await db.execute(
                    text("""
                        SELECT column_name, data_type 
                        FROM information_schema.columns 
                        WHERE table_name='test_methods'
                        ORDER BY ordinal_position
                    """)
                )
                columns = result.fetchall()
                
                print("\n表结构:")
                for col in columns:
                    print(f"  - {col[0]}: {col[1]}")
                
        except Exception as e:
            print(f"错误: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(check_table())
