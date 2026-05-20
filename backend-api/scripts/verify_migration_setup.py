#!/usr/bin/env python3
"""
验证迁移设置

检查所有迁移脚本和配置是否正确设置
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def check_file_exists(filepath: str, description: str) -> bool:
    """检查文件是否存在"""
    path = project_root / filepath
    if path.exists():
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ {description} 缺失: {filepath}")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("🔍 验证迁移设置")
    print("=" * 60)
    
    all_ok = True
    
    # 检查脚本文件
    print("\n📝 检查脚本文件:")
    all_ok &= check_file_exists("scripts/db_migration.py", "迁移管理工具")
    all_ok &= check_file_exists("scripts/test_migration.py", "迁移测试工具")
    all_ok &= check_file_exists("scripts/rollback_migration.py", "回滚工具")
    all_ok &= check_file_exists("scripts/create_initial_migration.py", "初始化工具")
    
    # 检查文档文件
    print("\n📚 检查文档文件:")
    all_ok &= check_file_exists("docs/DATABASE_MIGRATION_GUIDE.md", "详细指南")
    all_ok &= check_file_exists("docs/MIGRATION_QUICK_REFERENCE.md", "快速参考")
    
    # 检查配置文件
    print("\n⚙️  检查配置文件:")
    all_ok &= check_file_exists("alembic.ini", "Alembic 配置")
    all_ok &= check_file_exists("alembic/env.py", "环境配置")
    all_ok &= check_file_exists("alembic/script.py.mako", "迁移模板")
    
    # 检查目录
    print("\n📁 检查目录:")
    versions_dir = project_root / "alembic" / "versions"
    if versions_dir.exists():
        print(f"✅ 迁移版本目录: alembic/versions")
    else:
        print(f"❌ 迁移版本目录缺失: alembic/versions")
        all_ok = False
    
    # 检查依赖
    print("\n📦 检查依赖:")
    try:
        import alembic
        print(f"✅ Alembic 已安装: {alembic.__version__}")
    except ImportError:
        print("❌ Alembic 未安装")
        all_ok = False
    
    try:
        import sqlalchemy
        print(f"✅ SQLAlchemy 已安装: {sqlalchemy.__version__}")
    except ImportError:
        print("❌ SQLAlchemy 未安装")
        all_ok = False
    
    try:
        import asyncpg
        print(f"✅ asyncpg 已安装")
    except ImportError:
        print("❌ asyncpg 未安装")
        all_ok = False
    
    # 总结
    print("\n" + "=" * 60)
    if all_ok:
        print("🎉 所有检查通过！迁移设置完成。")
        print("\n后续步骤:")
        print("1. 初始化迁移:")
        print("   python scripts/create_initial_migration.py")
        print("\n2. 创建新迁移:")
        print("   python scripts/db_migration.py create '描述'")
        print("\n3. 应用迁移:")
        print("   python scripts/db_migration.py upgrade")
    else:
        print("⚠️  部分检查失败，请检查上述错误。")
    print("=" * 60)
    
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
