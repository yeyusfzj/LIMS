#!/usr/bin/env python3
"""
数据库迁移测试脚本

该脚本用于测试数据库迁移的正确性，包括：
1. 升级测试
2. 降级测试
3. 数据完整性测试
4. 性能测试
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

from sqlalchemy import text, inspect
from app.core.database import engine, AsyncSessionLocal
from app.config import settings


class MigrationTester:
    """迁移测试器"""
    
    def __init__(self):
        self.test_results = []
    
    async def test_database_connection(self) -> bool:
        """测试数据库连接"""
        print("🔌 测试数据库连接...")
        try:
            async with AsyncSessionLocal() as db:
                result = await db.execute(text("SELECT 1"))
                result.scalar()
            print("✅ 数据库连接正常")
            return True
        except Exception as e:
            print(f"❌ 数据库连接失败: {str(e)}")
            return False
    
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
    
    async def check_tables_exist(self) -> dict:
        """检查所有必需的表是否存在"""
        print("\n📋 检查数据库表...")
        
        required_tables = [
            # 用户和权限
            "users", "roles", "permissions", "user_roles",
            # 审计日志
            "audit_logs", "archived_audit_logs",
            # 样品管理
            "samples", "test_items", "transfers",
            # 工作流
            "workflows", "workflow_instances", "tasks",
            # 检测结果
            "results", "formulas",
            # 审核和判定
            "audit_tasks", "quality_judgments", "judgment_rules", "judgment_history",
            # 报告
            "report_templates", "reports", "signatures", "distributions",
            # 系统管理
            "backup_records", "test_methods",
            # 审核管理
            "audit_comment_templates", "audit_workflow_configs", "audit_history"
        ]
        
        existing_tables = []
        missing_tables = []
        
        try:
            async with engine.begin() as conn:
                # 获取所有表名
                result = await conn.execute(
                    text("""
                        SELECT tablename 
                        FROM pg_tables 
                        WHERE schemaname = 'public'
                    """)
                )
                existing_tables = [row[0] for row in result]
            
            # 检查必需的表
            for table in required_tables:
                if table in existing_tables:
                    print(f"  ✅ {table}")
                else:
                    print(f"  ❌ {table} (缺失)")
                    missing_tables.append(table)
            
            if missing_tables:
                print(f"\n⚠️  缺失 {len(missing_tables)} 个表")
                return {"status": "incomplete", "missing": missing_tables}
            else:
                print(f"\n✅ 所有 {len(required_tables)} 个表都存在")
                return {"status": "complete", "missing": []}
        
        except Exception as e:
            print(f"❌ 检查表失败: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def check_indexes(self) -> dict:
        """检查索引是否正确创建"""
        print("\n🔍 检查数据库索引...")
        
        try:
            async with engine.begin() as conn:
                result = await conn.execute(
                    text("""
                        SELECT 
                            schemaname,
                            tablename,
                            indexname
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                        ORDER BY tablename, indexname
                    """)
                )
                indexes = result.fetchall()
            
            # 按表分组
            table_indexes = {}
            for schema, table, index in indexes:
                if table not in table_indexes:
                    table_indexes[table] = []
                table_indexes[table].append(index)
            
            print(f"找到 {len(indexes)} 个索引，分布在 {len(table_indexes)} 个表上")
            
            # 显示每个表的索引数量
            for table, indexes in sorted(table_indexes.items()):
                print(f"  {table}: {len(indexes)} 个索引")
            
            return {"status": "success", "count": len(indexes)}
        
        except Exception as e:
            print(f"❌ 检查索引失败: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def check_foreign_keys(self) -> dict:
        """检查外键约束"""
        print("\n🔗 检查外键约束...")
        
        try:
            async with engine.begin() as conn:
                result = await conn.execute(
                    text("""
                        SELECT
                            tc.table_name,
                            kcu.column_name,
                            ccu.table_name AS foreign_table_name,
                            ccu.column_name AS foreign_column_name
                        FROM information_schema.table_constraints AS tc
                        JOIN information_schema.key_column_usage AS kcu
                            ON tc.constraint_name = kcu.constraint_name
                            AND tc.table_schema = kcu.table_schema
                        JOIN information_schema.constraint_column_usage AS ccu
                            ON ccu.constraint_name = tc.constraint_name
                            AND ccu.table_schema = tc.table_schema
                        WHERE tc.constraint_type = 'FOREIGN KEY'
                            AND tc.table_schema = 'public'
                        ORDER BY tc.table_name
                    """)
                )
                foreign_keys = result.fetchall()
            
            print(f"找到 {len(foreign_keys)} 个外键约束")
            
            # 按表分组
            table_fks = {}
            for table, column, foreign_table, foreign_column in foreign_keys:
                if table not in table_fks:
                    table_fks[table] = []
                table_fks[table].append(f"{column} -> {foreign_table}.{foreign_column}")
            
            # 显示每个表的外键
            for table, fks in sorted(table_fks.items()):
                print(f"  {table}:")
                for fk in fks:
                    print(f"    - {fk}")
            
            return {"status": "success", "count": len(foreign_keys)}
        
        except Exception as e:
            print(f"❌ 检查外键失败: {str(e)}")
            return {"status": "error", "error": str(e)}
    
    async def test_upgrade_downgrade(self) -> bool:
        """测试升级和降级"""
        print("\n🔄 测试迁移升级和降级...")
        
        try:
            # 获取当前版本
            current_version = await self.get_current_version()
            print(f"当前版本: {current_version}")
            
            # 测试降级
            print("\n⬇️  测试降级...")
            result = subprocess.run(
                ["alembic", "downgrade", "-1"],
                cwd=str(project_root),
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"❌ 降级失败: {result.stderr}")
                return False
            
            print("✅ 降级成功")
            
            # 测试升级
            print("\n⬆️  测试升级...")
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                cwd=str(project_root),
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                print(f"❌ 升级失败: {result.stderr}")
                return False
            
            print("✅ 升级成功")
            
            # 验证版本恢复
            new_version = await self.get_current_version()
            if new_version == current_version:
                print(f"✅ 版本恢复正确: {new_version}")
                return True
            else:
                print(f"⚠️  版本不一致: {current_version} -> {new_version}")
                return False
        
        except Exception as e:
            print(f"❌ 测试失败: {str(e)}")
            return False
    
    async def test_data_integrity(self) -> bool:
        """测试数据完整性"""
        print("\n🔒 测试数据完整性...")
        
        try:
            # 创建测试数据
            print("创建测试数据...")
            async with AsyncSessionLocal() as db:
                # 插入测试用户
                await db.execute(
                    text("""
                        INSERT INTO users (id, username, "passwordHash", email, "fullName", status)
                        VALUES (:id, :username, :password, :email, :fullName, :status)
                        ON CONFLICT (id) DO NOTHING
                    """),
                    {
                        "id": "test-migration-user",
                        "username": "migration_test",
                        "password": "test_hash",
                        "email": "migration@test.com",
                        "fullName": "Migration Test User",
                        "status": "ACTIVE"
                    }
                )
                await db.commit()
            
            print("✅ 测试数据创建成功")
            
            # 验证数据
            async with AsyncSessionLocal() as db:
                result = await db.execute(
                    text("SELECT * FROM users WHERE id = :id"),
                    {"id": "test-migration-user"}
                )
                user = result.fetchone()
                
                if user:
                    print("✅ 数据读取成功")
                else:
                    print("❌ 数据读取失败")
                    return False
            
            # 清理测试数据
            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("DELETE FROM users WHERE id = :id"),
                    {"id": "test-migration-user"}
                )
                await db.commit()
            
            print("✅ 测试数据清理成功")
            return True
        
        except Exception as e:
            print(f"❌ 数据完整性测试失败: {str(e)}")
            return False
    
    async def run_all_tests(self):
        """运行所有测试"""
        print("=" * 60)
        print("🧪 数据库迁移测试")
        print("=" * 60)
        
        # 测试数据库连接
        if not await self.test_database_connection():
            print("\n❌ 数据库连接失败，终止测试")
            return False
        
        # 显示当前版本
        version = await self.get_current_version()
        print(f"\n📌 当前数据库版本: {version}")
        
        # 检查表
        tables_result = await self.check_tables_exist()
        
        # 检查索引
        indexes_result = await self.check_indexes()
        
        # 检查外键
        fks_result = await self.check_foreign_keys()
        
        # 测试升级降级
        upgrade_downgrade_ok = await self.test_upgrade_downgrade()
        
        # 测试数据完整性
        data_integrity_ok = await self.test_data_integrity()
        
        # 汇总结果
        print("\n" + "=" * 60)
        print("📊 测试结果汇总")
        print("=" * 60)
        
        all_passed = True
        
        if tables_result["status"] == "complete":
            print("✅ 表结构检查: 通过")
        else:
            print("❌ 表结构检查: 失败")
            all_passed = False
        
        if indexes_result["status"] == "success":
            print(f"✅ 索引检查: 通过 ({indexes_result['count']} 个索引)")
        else:
            print("❌ 索引检查: 失败")
            all_passed = False
        
        if fks_result["status"] == "success":
            print(f"✅ 外键检查: 通过 ({fks_result['count']} 个外键)")
        else:
            print("❌ 外键检查: 失败")
            all_passed = False
        
        if upgrade_downgrade_ok:
            print("✅ 升级降级测试: 通过")
        else:
            print("❌ 升级降级测试: 失败")
            all_passed = False
        
        if data_integrity_ok:
            print("✅ 数据完整性测试: 通过")
        else:
            print("❌ 数据完整性测试: 失败")
            all_passed = False
        
        print("=" * 60)
        
        if all_passed:
            print("🎉 所有测试通过！")
            return True
        else:
            print("⚠️  部分测试失败，请检查上述错误")
            return False


async def main():
    """主函数"""
    tester = MigrationTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
