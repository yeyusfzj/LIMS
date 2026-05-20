#!/usr/bin/env python3
"""
数据库迁移回滚脚本

该脚本提供安全的数据库迁移回滚功能，包括：
1. 自动备份
2. 回滚验证
3. 回滚执行
4. 回滚后验证
"""

import sys
import os
import asyncio
from pathlib import Path
from datetime import datetime
import subprocess

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


class MigrationRollback:
    """迁移回滚管理器"""
    
    def __init__(self):
        self.backup_id = None
    
    async def get_current_version(self) -> str:
        """获取当前数据库版本"""
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("SELECT version_num FROM alembic_version")
                )
                version = result.scalar()
                return version or "无版本"
        except Exception as e:
            return f"错误: {str(e)}"
    
    async def get_migration_history(self) -> list:
        """获取迁移历史"""
        try:
            result = subprocess.run(
                ["alembic", "history"],
                cwd=str(project_root),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                return result.stdout.strip().split('\n')
            else:
                return []
        except Exception as e:
            print(f"❌ 获取迁移历史失败: {str(e)}")
            return []
    
    async def create_backup(self) -> str:
        """创建数据库备份"""
        print("💾 创建数据库备份...")
        
        try:
            from app.services.backup_service import BackupService
            
            async with AsyncSessionLocal() as db:
                backup_service = BackupService()
                backup = await backup_service.create_backup(db)
                self.backup_id = backup.id
                print(f"✅ 备份创建成功: {backup.filename}")
                print(f"   备份 ID: {backup.id}")
                print(f"   备份路径: {backup.filepath}")
                print(f"   备份大小: {backup.size / 1024 / 1024:.2f} MB")
                return backup.id
        except Exception as e:
            print(f"❌ 备份创建失败: {str(e)}")
            return None
    
    async def verify_rollback_target(self, target_version: str) -> bool:
        """验证回滚目标版本"""
        print(f"\n🔍 验证回滚目标版本: {target_version}")
        
        # 获取迁移历史
        history = await self.get_migration_history()
        
        if not history:
            print("❌ 无法获取迁移历史")
            return False
        
        # 检查目标版本是否存在
        version_found = False
        for line in history:
            if target_version in line:
                version_found = True
                print(f"✅ 找到目标版本: {line.strip()}")
                break
        
        if not version_found and target_version != "-1":
            print(f"❌ 目标版本不存在: {target_version}")
            return False
        
        return True
    
    async def execute_rollback(self, target_version: str) -> bool:
        """执行回滚"""
        print(f"\n⬇️  执行回滚到版本: {target_version}")
        
        try:
            result = subprocess.run(
                ["alembic", "downgrade", target_version],
                cwd=str(project_root),
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                print("✅ 回滚执行成功")
                print(result.stdout)
                return True
            else:
                print("❌ 回滚执行失败")
                print(result.stderr)
                return False
        except Exception as e:
            print(f"❌ 回滚执行异常: {str(e)}")
            return False
    
    async def verify_rollback(self, expected_version: str = None) -> bool:
        """验证回滚结果"""
        print("\n✓ 验证回滚结果...")
        
        try:
            # 检查数据库连接
            async with AsyncSessionLocal() as db:
                result = await db.execute(text("SELECT 1"))
                result.scalar()
            print("✅ 数据库连接正常")
            
            # 检查版本
            current_version = await self.get_current_version()
            print(f"✅ 当前版本: {current_version}")
            
            if expected_version and current_version != expected_version:
                print(f"⚠️  版本不匹配: 期望 {expected_version}, 实际 {current_version}")
            
            # 检查关键表
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("""
                        SELECT COUNT(*) 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public'
                    """)
                )
                table_count = result.scalar()
                print(f"✅ 数据库表数量: {table_count}")
            
            return True
        except Exception as e:
            print(f"❌ 验证失败: {str(e)}")
            return False
    
    async def restore_from_backup(self, backup_id: str) -> bool:
        """从备份恢复"""
        print(f"\n🔄 从备份恢复: {backup_id}")
        
        try:
            from app.services.backup_service import BackupService
            
            async with AsyncSessionLocal() as db:
                backup_service = BackupService()
                success = await backup_service.restore_backup(db, backup_id)
                
                if success:
                    print("✅ 备份恢复成功")
                    return True
                else:
                    print("❌ 备份恢复失败")
                    return False
        except Exception as e:
            print(f"❌ 备份恢复异常: {str(e)}")
            return False
    
    async def rollback_with_safety(
        self,
        target_version: str,
        create_backup: bool = True,
        auto_restore: bool = False
    ) -> bool:
        """安全回滚（带备份和验证）"""
        print("=" * 60)
        print("🔄 数据库迁移回滚")
        print("=" * 60)
        
        # 显示当前版本
        current_version = await self.get_current_version()
        print(f"\n📌 当前版本: {current_version}")
        print(f"📌 目标版本: {target_version}")
        
        # 创建备份
        if create_backup:
            backup_id = await self.create_backup()
            if not backup_id:
                print("\n❌ 备份创建失败，终止回滚")
                return False
        
        # 验证目标版本
        if not await self.verify_rollback_target(target_version):
            print("\n❌ 目标版本验证失败，终止回滚")
            return False
        
        # 确认回滚
        print("\n⚠️  即将执行回滚操作，这可能会导致数据丢失！")
        if not auto_restore:
            confirm = input("是否继续？(yes/no): ")
            if confirm.lower() != "yes":
                print("❌ 用户取消回滚")
                return False
        
        # 执行回滚
        rollback_success = await self.execute_rollback(target_version)
        
        if not rollback_success:
            print("\n❌ 回滚失败")
            
            if create_backup and self.backup_id:
                print("\n尝试从备份恢复...")
                restore_success = await self.restore_from_backup(self.backup_id)
                if restore_success:
                    print("✅ 已从备份恢复")
                else:
                    print("❌ 备份恢复失败，数据库可能处于不一致状态")
            
            return False
        
        # 验证回滚结果
        verify_success = await self.verify_rollback()
        
        if not verify_success:
            print("\n⚠️  回滚验证失败")
            
            if create_backup and self.backup_id:
                print("\n尝试从备份恢复...")
                restore_success = await self.restore_from_backup(self.backup_id)
                if restore_success:
                    print("✅ 已从备份恢复")
                else:
                    print("❌ 备份恢复失败")
            
            return False
        
        # 成功
        print("\n" + "=" * 60)
        print("🎉 回滚成功！")
        print("=" * 60)
        
        if create_backup and self.backup_id:
            print(f"\n💾 备份已保留: {self.backup_id}")
            print("   如需恢复，请使用: python scripts/rollback_migration.py restore <backup_id>")
        
        return True


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="数据库迁移回滚工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 回滚一个版本（带备份）
  python scripts/rollback_migration.py -1
  
  # 回滚到指定版本（带备份）
  python scripts/rollback_migration.py abc123
  
  # 回滚一个版本（不备份）
  python scripts/rollback_migration.py -1 --no-backup
  
  # 从备份恢复
  python scripts/rollback_migration.py restore <backup_id>
  
  # 查看当前版本
  python scripts/rollback_migration.py current
        """
    )
    
    parser.add_argument(
        "target",
        nargs="?",
        default="-1",
        help="目标版本（默认: -1，回退一个版本）或 'restore' 命令"
    )
    parser.add_argument(
        "backup_id",
        nargs="?",
        help="备份 ID（仅用于 restore 命令）"
    )
    parser.add_argument(
        "--no-backup",
        action="store_true",
        help="不创建备份（不推荐）"
    )
    parser.add_argument(
        "--auto",
        action="store_true",
        help="自动确认（用于脚本）"
    )
    
    args = parser.parse_args()
    
    rollback = MigrationRollback()
    
    # 特殊命令
    if args.target == "current":
        version = await rollback.get_current_version()
        print(f"当前版本: {version}")
        return
    
    if args.target == "restore":
        if not args.backup_id:
            print("❌ 请提供备份 ID")
            print("用法: python scripts/rollback_migration.py restore <backup_id>")
            sys.exit(1)
        
        success = await rollback.restore_from_backup(args.backup_id)
        sys.exit(0 if success else 1)
    
    # 执行回滚
    success = await rollback.rollback_with_safety(
        args.target,
        create_backup=not args.no_backup,
        auto_restore=args.auto
    )
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
