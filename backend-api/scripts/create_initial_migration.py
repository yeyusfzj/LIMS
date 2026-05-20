#!/usr/bin/env python3
"""
创建初始迁移脚本

该脚本用于创建与 Prisma schema 兼容的初始迁移。
由于数据库已经由 Prisma 创建，我们需要标记当前状态为初始版本。
"""

import sys
import os
import asyncio
from pathlib import Path
import subprocess

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def check_alembic_version_table() -> bool:
    """检查 alembic_version 表是否存在"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'alembic_version'
                    )
                """)
            )
            exists = result.scalar()
            return exists
    except Exception as e:
        print(f"检查失败: {str(e)}")
        return False


async def check_prisma_tables() -> bool:
    """检查 Prisma 创建的表是否存在"""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                    AND table_name IN ('users', 'samples', 'workflows')
                """)
            )
            count = result.scalar()
            return count >= 3
    except Exception as e:
        print(f"检查失败: {str(e)}")
        return False


def create_initial_migration():
    """创建初始迁移"""
    print("📝 创建初始迁移...")
    
    # 创建空迁移
    result = subprocess.run(
        ["alembic", "revision", "-m", "initial_migration_from_prisma"],
        cwd=str(project_root),
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ 创建迁移失败: {result.stderr}")
        return None
    
    print("✅ 迁移创建成功")
    print(result.stdout)
    
    # 提取迁移文件路径
    for line in result.stdout.split('\n'):
        if 'Generating' in line:
            # 提取文件路径
            parts = line.split()
            if len(parts) >= 2:
                return parts[-1]
    
    return None


def stamp_database():
    """标记数据库版本"""
    print("\n🏷️  标记数据库版本为 head...")
    
    result = subprocess.run(
        ["alembic", "stamp", "head"],
        cwd=str(project_root),
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"❌ 标记失败: {result.stderr}")
        return False
    
    print("✅ 标记成功")
    print(result.stdout)
    return True


async def main():
    """主函数"""
    print("=" * 60)
    print("🚀 创建初始迁移")
    print("=" * 60)
    
    # 检查 Prisma 表是否存在
    print("\n🔍 检查数据库状态...")
    
    has_prisma_tables = await check_prisma_tables()
    has_alembic_table = await check_alembic_version_table()
    
    if not has_prisma_tables:
        print("❌ 数据库中没有 Prisma 表，请先运行 Prisma 迁移")
        print("   运行: cd backend-api && npx prisma migrate deploy")
        sys.exit(1)
    
    print("✅ 检测到 Prisma 表")
    
    if has_alembic_table:
        print("⚠️  检测到 alembic_version 表，数据库可能已经初始化")
        
        # 检查当前版本
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT version_num FROM alembic_version")
            )
            version = result.scalar()
            
            if version:
                print(f"   当前版本: {version}")
                print("\n如果需要重新初始化，请先删除 alembic_version 表")
                sys.exit(1)
    
    # 创建初始迁移
    migration_file = create_initial_migration()
    
    if not migration_file:
        print("❌ 无法确定迁移文件路径")
        sys.exit(1)
    
    # 标记数据库版本
    if not stamp_database():
        print("❌ 标记数据库版本失败")
        sys.exit(1)
    
    # 验证
    print("\n✓ 验证初始化结果...")
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            text("SELECT version_num FROM alembic_version")
        )
        version = result.scalar()
        
        if version:
            print(f"✅ 当前版本: {version}")
        else:
            print("❌ 版本标记失败")
            sys.exit(1)
    
    print("\n" + "=" * 60)
    print("🎉 初始迁移创建成功！")
    print("=" * 60)
    print("\n后续操作:")
    print("1. 当模型发生变更时，运行:")
    print("   python scripts/db_migration.py create '变更描述'")
    print("\n2. 应用迁移:")
    print("   python scripts/db_migration.py upgrade")
    print("\n3. 回滚迁移:")
    print("   python scripts/rollback_migration.py -1")


if __name__ == "__main__":
    asyncio.run(main())
