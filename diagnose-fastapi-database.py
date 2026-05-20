"""
诊断 FastAPI 后端数据库连接问题
"""

import asyncio
import sys
from pathlib import Path

# 添加 FastAPI 后端到 Python 路径
sys.path.insert(0, str(Path(__file__).parent / "fastapi-backend"))

from sqlalchemy import text
from app.core.database import get_engine, AsyncSessionLocal


async def test_database_connection():
    """测试数据库连接"""
    print("=" * 60)
    print("FastAPI 后端数据库连接诊断")
    print("=" * 60)
    
    try:
        # 1. 测试基本连接
        print("\n1. 测试数据库连接...")
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print("✓ 数据库连接成功")
        
        # 2. 检查数据库版本
        print("\n2. 检查 PostgreSQL 版本...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✓ PostgreSQL 版本: {version}")
        
        # 3. 检查当前数据库
        print("\n3. 检查当前数据库...")
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT current_database()"))
            db_name = result.scalar()
            print(f"✓ 当前数据库: {db_name}")
        
        # 4. 列出所有表
        print("\n4. 列出数据库中的所有表...")
        async with engine.connect() as conn:
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = result.fetchall()
            print(f"✓ 找到 {len(tables)} 个表:")
            for table in tables:
                print(f"  - {table[0]}")
        
        # 5. 检查 report_templates 表
        print("\n5. 检查 report_templates 表...")
        async with engine.connect() as conn:
            # 检查表是否存在
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'report_templates'
                )
            """))
            exists = result.scalar()
            
            if exists:
                print("✓ report_templates 表存在")
                
                # 检查表结构
                result = await conn.execute(text("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = 'report_templates'
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                print(f"  表结构 ({len(columns)} 列):")
                for col in columns:
                    print(f"    - {col[0]}: {col[1]} (nullable: {col[2]})")
                
                # 检查记录数
                result = await conn.execute(text("SELECT COUNT(*) FROM report_templates"))
                count = result.scalar()
                print(f"  记录数: {count}")
            else:
                print("✗ report_templates 表不存在")
        
        # 6. 测试 SQLAlchemy 会话
        print("\n6. 测试 SQLAlchemy 会话...")
        async with AsyncSessionLocal() as session:
            result = await session.execute(text("SELECT 1"))
            print("✓ SQLAlchemy 会话创建成功")
        
        # 7. 测试查询 report_templates
        print("\n7. 测试查询 report_templates...")
        async with AsyncSessionLocal() as session:
            try:
                result = await session.execute(text("SELECT * FROM report_templates LIMIT 1"))
                row = result.fetchone()
                if row:
                    print(f"✓ 成功查询到记录: {dict(row._mapping)}")
                else:
                    print("✓ 查询成功，但表为空")
            except Exception as e:
                print(f"✗ 查询失败: {str(e)}")
        
        print("\n" + "=" * 60)
        print("诊断完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 错误: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_database_connection())
