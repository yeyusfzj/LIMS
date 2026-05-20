#!/usr/bin/env python3
"""
数据库迁移管理脚本

该脚本提供数据库迁移的创建、执行、回滚等功能。
使用 Alembic 进行数据库版本管理。
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


def run_command(cmd: list, cwd: str = None) -> tuple:
    """
    执行命令并返回结果
    
    Args:
        cmd: 命令列表
        cwd: 工作目录
        
    Returns:
        (returncode, stdout, stderr)
    """
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd or str(project_root),
            capture_output=True,
            text=True,
            encoding='utf-8'
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)


def create_migration(message: str, autogenerate: bool = True):
    """
    创建新的迁移脚本
    
    Args:
        message: 迁移描述信息
        autogenerate: 是否自动生成迁移（基于模型变更）
    """
    print(f"📝 创建迁移: {message}")
    
    cmd = ["alembic", "revision"]
    if autogenerate:
        cmd.append("--autogenerate")
    cmd.extend(["-m", message])
    
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(f"✅ 迁移创建成功")
        print(stdout)
    else:
        print(f"❌ 迁移创建失败")
        print(stderr)
        sys.exit(1)


def upgrade_database(revision: str = "head"):
    """
    升级数据库到指定版本
    
    Args:
        revision: 目标版本，默认为 "head"（最新版本）
    """
    print(f"⬆️  升级数据库到版本: {revision}")
    
    cmd = ["alembic", "upgrade", revision]
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(f"✅ 数据库升级成功")
        print(stdout)
    else:
        print(f"❌ 数据库升级失败")
        print(stderr)
        sys.exit(1)


def downgrade_database(revision: str = "-1"):
    """
    降级数据库到指定版本
    
    Args:
        revision: 目标版本，默认为 "-1"（回退一个版本）
    """
    print(f"⬇️  降级数据库到版本: {revision}")
    
    cmd = ["alembic", "downgrade", revision]
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(f"✅ 数据库降级成功")
        print(stdout)
    else:
        print(f"❌ 数据库降级失败")
        print(stderr)
        sys.exit(1)


def show_current_version():
    """显示当前数据库版本"""
    print("📊 当前数据库版本:")
    
    cmd = ["alembic", "current"]
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(stdout)
    else:
        print(f"❌ 获取版本信息失败")
        print(stderr)


def show_history(verbose: bool = False):
    """
    显示迁移历史
    
    Args:
        verbose: 是否显示详细信息
    """
    print("📜 迁移历史:")
    
    cmd = ["alembic", "history"]
    if verbose:
        cmd.append("-v")
    
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(stdout)
    else:
        print(f"❌ 获取历史信息失败")
        print(stderr)


def show_heads():
    """显示所有头版本"""
    print("🔝 头版本:")
    
    cmd = ["alembic", "heads"]
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(stdout)
    else:
        print(f"❌ 获取头版本信息失败")
        print(stderr)


def stamp_version(revision: str):
    """
    标记数据库版本（不执行迁移）
    
    Args:
        revision: 目标版本
    """
    print(f"🏷️  标记数据库版本: {revision}")
    
    cmd = ["alembic", "stamp", revision]
    returncode, stdout, stderr = run_command(cmd)
    
    if returncode == 0:
        print(f"✅ 版本标记成功")
        print(stdout)
    else:
        print(f"❌ 版本标记失败")
        print(stderr)
        sys.exit(1)


def create_backup():
    """创建数据库备份"""
    print("💾 创建数据库备份...")
    
    # 导入备份服务
    try:
        from app.services.backup_service import BackupService
        from app.core.database import AsyncSessionLocal
        import asyncio
        
        async def do_backup():
            async with AsyncSessionLocal() as db:
                backup_service = BackupService()
                backup = await backup_service.create_backup(db)
                return backup
        
        backup = asyncio.run(do_backup())
        print(f"✅ 备份创建成功: {backup.filename}")
        return backup.id
    except Exception as e:
        print(f"❌ 备份创建失败: {str(e)}")
        return None


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description="数据库迁移管理工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 创建新迁移（自动检测模型变更）
  python scripts/db_migration.py create "添加新字段"
  
  # 创建空迁移
  python scripts/db_migration.py create "手动迁移" --no-autogenerate
  
  # 升级到最新版本
  python scripts/db_migration.py upgrade
  
  # 升级到指定版本
  python scripts/db_migration.py upgrade abc123
  
  # 回退一个版本
  python scripts/db_migration.py downgrade
  
  # 回退到指定版本
  python scripts/db_migration.py downgrade abc123
  
  # 查看当前版本
  python scripts/db_migration.py current
  
  # 查看迁移历史
  python scripts/db_migration.py history
  
  # 标记版本（不执行迁移）
  python scripts/db_migration.py stamp head
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # create 命令
    create_parser = subparsers.add_parser("create", help="创建新迁移")
    create_parser.add_argument("message", help="迁移描述信息")
    create_parser.add_argument(
        "--no-autogenerate",
        action="store_true",
        help="不自动生成迁移（创建空迁移）"
    )
    create_parser.add_argument(
        "--backup",
        action="store_true",
        help="创建迁移前先备份数据库"
    )
    
    # upgrade 命令
    upgrade_parser = subparsers.add_parser("upgrade", help="升级数据库")
    upgrade_parser.add_argument(
        "revision",
        nargs="?",
        default="head",
        help="目标版本（默认: head）"
    )
    upgrade_parser.add_argument(
        "--backup",
        action="store_true",
        help="升级前先备份数据库"
    )
    
    # downgrade 命令
    downgrade_parser = subparsers.add_parser("downgrade", help="降级数据库")
    downgrade_parser.add_argument(
        "revision",
        nargs="?",
        default="-1",
        help="目标版本（默认: -1，回退一个版本）"
    )
    downgrade_parser.add_argument(
        "--backup",
        action="store_true",
        help="降级前先备份数据库"
    )
    
    # current 命令
    subparsers.add_parser("current", help="显示当前版本")
    
    # history 命令
    history_parser = subparsers.add_parser("history", help="显示迁移历史")
    history_parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="显示详细信息"
    )
    
    # heads 命令
    subparsers.add_parser("heads", help="显示所有头版本")
    
    # stamp 命令
    stamp_parser = subparsers.add_parser("stamp", help="标记数据库版本")
    stamp_parser.add_argument("revision", help="目标版本")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # 执行命令
    if args.command == "create":
        if hasattr(args, 'backup') and args.backup:
            create_backup()
        create_migration(args.message, not args.no_autogenerate)
    
    elif args.command == "upgrade":
        if hasattr(args, 'backup') and args.backup:
            create_backup()
        upgrade_database(args.revision)
    
    elif args.command == "downgrade":
        if hasattr(args, 'backup') and args.backup:
            create_backup()
        downgrade_database(args.revision)
    
    elif args.command == "current":
        show_current_version()
    
    elif args.command == "history":
        show_history(args.verbose)
    
    elif args.command == "heads":
        show_heads()
    
    elif args.command == "stamp":
        stamp_version(args.revision)


if __name__ == "__main__":
    main()
