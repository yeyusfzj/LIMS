"""
数据库连接测试脚本

快速验证数据库连接配置是否正确。
"""
import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.core.database import check_database_connection, get_db
from app.config import settings
from sqlalchemy import text


async def test_connection():
    """测试数据库连接"""
    print("=" * 60)
    print("数据库连接测试")
    print("=" * 60)
    print()
    
    # 显示配置
    print("配置信息:")
    print(f"  DATABASE_URL: {settings.DATABASE_URL}")
    print(f"  POOL_SIZE: {settings.DATABASE_POOL_SIZE}")
    print(f"  MAX_OVERFLOW: {settings.DATABASE_MAX_OVERFLOW}")
    print(f"  TESTING: {settings.TESTING}")
    print()
    
    # 测试 1: 基础连接检查
    print("测试 1: 基础连接检查")
    try:
        result = await check_database_connection()
        if result:
            print("  ✓ 数据库连接成功")
        else:
            print("  ✗ 数据库连接失败")
            return False
    except Exception as e:
        print(f"  ✗ 连接检查异常: {str(e)}")
        return False
    print()
    
    # 测试 2: 会话创建和查询
    print("测试 2: 会话创建和查询")
    try:
        async for session in get_db():
            # 执行简单查询
            result = await session.execute(text("SELECT 1 as num, NOW() as current_time"))
            row = result.fetchone()
            
            print(f"  ✓ 查询成功")
            print(f"    - 查询结果: num={row[0]}, current_time={row[1]}")
    except Exception as e:
        print(f"  ✗ 查询失败: {str(e)}")
        return False
    print()
    
    # 测试 3: 数据库版本
    print("测试 3: 数据库版本信息")
    try:
        async for session in get_db():
            result = await session.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"  ✓ PostgreSQL 版本:")
            print(f"    {version}")
    except Exception as e:
        print(f"  ✗ 获取版本失败: {str(e)}")
        return False
    print()
    
    # 测试 4: 表列表
    print("测试 4: 数据库表列表")
    try:
        async for session in get_db():
            result = await session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
                LIMIT 10
            """))
            tables = result.fetchall()
            
            if tables:
                print(f"  ✓ 找到 {len(tables)} 个表:")
                for table in tables:
                    print(f"    - {table[0]}")
            else:
                print("  ⚠ 未找到任何表（数据库可能为空）")
    except Exception as e:
        print(f"  ✗ 查询表列表失败: {str(e)}")
        return False
    print()
    
    print("=" * 60)
    print("所有测试通过！数据库连接配置正确。")
    print("=" * 60)
    return True


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
