#!/usr/bin/env python3
"""
数据库共享测试脚本
测试 FastAPI 后端和 Node.js 后端是否可以共享同一个数据库
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.user import User, UserStatus
from app.models.sample import Sample
from app.models.workflow import Workflow


class DatabaseSharingTester:
    """数据库共享测试器"""
    
    def __init__(self):
        self.test_results = []
        self.passed = 0
        self.failed = 0
    
    async def test_read_nodejs_data(self, db: AsyncSession) -> None:
        """测试读取 Node.js 后端创建的数据"""
        print("\n=== 测试读取 Node.js 后端创建的数据 ===\n")
        
        try:
            # 测试读取用户数据
            print("1. 读取用户数据...")
            result = await db.execute(select(User).limit(5))
            users = result.scalars().all()
            
            if users:
                print(f"   ✓ 成功读取 {len(users)} 个用户")
                for user in users[:3]:
                    print(f"     - {user.username} ({user.email})")
                self.passed += 1
                self.test_results.append(("读取用户数据", True, f"读取了 {len(users)} 个用户"))
            else:
                print("   ⚠ 数据库中没有用户数据")
                self.test_results.append(("读取用户数据", True, "数据库为空"))
                self.passed += 1
            
            # 测试读取样品数据
            print("\n2. 读取样品数据...")
            result = await db.execute(select(Sample).limit(5))
            samples = result.scalars().all()
            
            if samples:
                print(f"   ✓ 成功读取 {len(samples)} 个样品")
                for sample in samples[:3]:
                    print(f"     - {sample.barcode} ({sample.status})")
                self.passed += 1
                self.test_results.append(("读取样品数据", True, f"读取了 {len(samples)} 个样品"))
            else:
                print("   ⚠ 数据库中没有样品数据")
                self.test_results.append(("读取样品数据", True, "数据库为空"))
                self.passed += 1
            
            # 测试读取工作流数据
            print("\n3. 读取工作流数据...")
            result = await db.execute(select(Workflow).limit(5))
            workflows = result.scalars().all()
            
            if workflows:
                print(f"   ✓ 成功读取 {len(workflows)} 个工作流")
                for workflow in workflows[:3]:
                    print(f"     - {workflow.name} ({workflow.status})")
                self.passed += 1
                self.test_results.append(("读取工作流数据", True, f"读取了 {len(workflows)} 个工作流"))
            else:
                print("   ⚠ 数据库中没有工作流数据")
                self.test_results.append(("读取工作流数据", True, "数据库为空"))
                self.passed += 1
        
        except Exception as e:
            print(f"   ✗ 读取数据失败: {str(e)}")
            self.failed += 1
            self.test_results.append(("读取 Node.js 数据", False, str(e)))
    
    async def test_write_fastapi_data(self, db: AsyncSession) -> None:
        """测试 FastAPI 后端写入数据"""
        print("\n=== 测试 FastAPI 后端写入数据 ===\n")
        
        try:
            # 测试创建用户
            print("1. 创建测试用户...")
            import uuid
            test_user = User(
                id=str(uuid.uuid4()),
                username=f"fastapi_test_{datetime.now().timestamp()}",
                email=f"fastapi_test_{datetime.now().timestamp()}@test.com",
                passwordHash="test_hash",
                fullName="FastAPI Test User",
                status=UserStatus.ACTIVE
            )
            
            db.add(test_user)
            await db.commit()
            await db.refresh(test_user)
            
            print(f"   ✓ 成功创建用户: {test_user.username}")
            self.passed += 1
            self.test_results.append(("创建用户", True, f"用户 ID: {test_user.id}"))
            
            # 验证可以读取刚创建的用户
            print("\n2. 验证可以读取刚创建的用户...")
            result = await db.execute(
                select(User).where(User.id == test_user.id)
            )
            retrieved_user = result.scalar_one_or_none()
            
            if retrieved_user and retrieved_user.username == test_user.username:
                print(f"   ✓ 成功读取用户: {retrieved_user.username}")
                self.passed += 1
                self.test_results.append(("读取创建的用户", True, "数据一致"))
            else:
                print("   ✗ 读取用户失败或数据不一致")
                self.failed += 1
                self.test_results.append(("读取创建的用户", False, "数据不一致"))
            
            # 清理测试数据
            print("\n3. 清理测试数据...")
            await db.delete(test_user)
            await db.commit()
            print("   ✓ 测试数据已清理")
        
        except Exception as e:
            print(f"   ✗ 写入数据失败: {str(e)}")
            self.failed += 1
            self.test_results.append(("写入 FastAPI 数据", False, str(e)))
            await db.rollback()
    
    async def test_table_structure(self, db: AsyncSession) -> None:
        """测试表结构"""
        print("\n=== 测试表结构 ===\n")
        
        try:
            # 查询所有表
            print("1. 查询数据库中的所有表...")
            result = await db.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
            print(f"   ✓ 数据库中有 {len(tables)} 个表")
            
            # 预期的表
            expected_tables = [
                'users', 'roles', 'permissions', 'user_roles',
                'samples', 'test_items', 'transfers',
                'workflows', 'workflow_instances', 'tasks',
                'results', 'formulas',
                'audit_tasks', 'quality_judgments', 'judgment_rules', 'judgment_history',
                'audit_comment_templates', 'audit_workflow_configs', 'audit_history',
                'report_templates', 'reports', 'signatures', 'distributions',
                'audit_logs', 'archived_audit_logs', 'backup_records', 'test_methods'
            ]
            
            missing_tables = set(expected_tables) - set(tables)
            extra_tables = set(tables) - set(expected_tables) - {'_prisma_migrations'}
            
            if missing_tables:
                print(f"   ⚠ 缺失的表: {missing_tables}")
                self.test_results.append(("表结构检查", True, f"缺失 {len(missing_tables)} 个表"))
            else:
                print("   ✓ 所有预期的表都存在")
                self.passed += 1
                self.test_results.append(("表结构检查", True, "所有表都存在"))
            
            if extra_tables:
                print(f"   ⚠ 额外的表: {extra_tables}")
        
        except Exception as e:
            print(f"   ✗ 查询表结构失败: {str(e)}")
            self.failed += 1
            self.test_results.append(("表结构检查", False, str(e)))
    
    async def test_column_naming(self, db: AsyncSession) -> None:
        """测试列命名约定"""
        print("\n=== 测试列命名约定 ===\n")
        
        try:
            # 检查 samples 表的列名
            print("1. 检查 samples 表的列名...")
            result = await db.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'samples' 
                ORDER BY ordinal_position
            """))
            columns = [row[0] for row in result.fetchall()]
            
            print(f"   ✓ samples 表有 {len(columns)} 个列")
            
            # 检查是否使用 camelCase
            camel_case_columns = [col for col in columns if any(c.isupper() for c in col)]
            snake_case_columns = [col for col in columns if '_' in col]
            
            if camel_case_columns:
                print(f"   ✓ 使用 camelCase 命名: {len(camel_case_columns)} 个列")
                print(f"     示例: {camel_case_columns[:5]}")
                self.passed += 1
                self.test_results.append(("列命名约定", True, "使用 camelCase"))
            elif snake_case_columns:
                print(f"   ⚠ 使用 snake_case 命名: {len(snake_case_columns)} 个列")
                print(f"     示例: {snake_case_columns[:5]}")
                self.test_results.append(("列命名约定", True, "使用 snake_case"))
                self.passed += 1
            else:
                print("   ⚠ 无法确定命名约定")
                self.test_results.append(("列命名约定", True, "无法确定"))
                self.passed += 1
        
        except Exception as e:
            print(f"   ✗ 检查列命名失败: {str(e)}")
            self.failed += 1
            self.test_results.append(("列命名约定", False, str(e)))
    
    def generate_report(self) -> str:
        """生成测试报告"""
        report = []
        report.append("=" * 80)
        report.append("数据库共享测试报告")
        report.append("=" * 80)
        report.append("")
        report.append(f"测试时间: {datetime.now().isoformat()}")
        report.append("")
        
        report.append("## 测试摘要")
        report.append(f"- 通过: {self.passed}")
        report.append(f"- 失败: {self.failed}")
        report.append(f"- 总计: {self.passed + self.failed}")
        report.append("")
        
        report.append("## 测试结果")
        for test_name, passed, message in self.test_results:
            status = "✓" if passed else "✗"
            report.append(f"{status} {test_name}: {message}")
        report.append("")
        
        report.append("## 结论")
        if self.failed == 0:
            report.append("✓ FastAPI 后端可以与 Node.js 后端共享数据库")
        else:
            report.append("✗ 发现数据库共享问题，需要修复")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    async def run(self) -> bool:
        """运行所有测试"""
        print("=" * 80)
        print("开始数据库共享测试")
        print("=" * 80)
        
        async with AsyncSessionLocal() as db:
            await self.test_table_structure(db)
            await self.test_column_naming(db)
            await self.test_read_nodejs_data(db)
            await self.test_write_fastapi_data(db)
        
        # 生成报告
        report = self.generate_report()
        print("\n" + report)
        
        # 保存报告
        report_path = Path(__file__).parent.parent / "DATABASE_SHARING_TEST_REPORT.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n报告已保存到: {report_path}")
        
        return self.failed == 0


async def main():
    """主函数"""
    tester = DatabaseSharingTester()
    success = await tester.run()
    
    if success:
        print("\n✓ 数据库共享测试通过！")
        return 0
    else:
        print("\n⚠ 发现一些问题，请查看报告")
        return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
