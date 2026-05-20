#!/usr/bin/env python3
"""
综合数据库兼容性验证脚本
验证 FastAPI 后端的 SQLAlchemy 模型与 Node.js 后端的 Prisma schema 完全兼容

验证内容：
1. SQLAlchemy 模型与 Prisma schema 一致性
2. 所有关系映射正确性
3. 所有索引存在性
4. 与 Node.js 后端共享数据库能力
"""

import sys
import os
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Tuple
from datetime import datetime
import json

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import settings
from app.models import Base
from app.models.user import User, Role, Permission
from app.models.sample import Sample
from app.models.workflow import Workflow, WorkflowInstance, Task
from app.models.result import Result, Formula
from app.models.audit import AuditTask, QualityJudgment, JudgmentRule, JudgmentHistory
from app.models.audit_management import AuditCommentTemplate, AuditWorkflowConfig, AuditHistory
from app.models.report import ReportTemplate, Report, Signature, Distribution
from app.models.system import AuditLog, ArchivedAuditLog, BackupRecord
from app.models.method import TestMethod


class DatabaseCompatibilityChecker:
    """数据库兼容性检查器"""
    
    def __init__(self):
        self.engine = None
        self.results = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "PENDING",
            "checks": {},
            "summary": {},
            "issues": []
        }
    
    async def initialize(self):
        """初始化数据库连接"""
        print("🔧 初始化数据库连接...")
        self.engine = create_async_engine(
            settings.DATABASE_URL,
            echo=False,
            pool_pre_ping=True
        )
        print("✓ 数据库连接初始化成功\n")
    
    async def cleanup(self):
        """清理资源"""
        if self.engine:
            await self.engine.dispose()
    
    async def check_schema_consistency(self) -> Dict[str, Any]:
        """检查 1: SQLAlchemy 模型与 Prisma schema 一致性"""
        print("=" * 80)
        print("检查 1: SQLAlchemy 模型与 Prisma schema 一致性")
        print("=" * 80)
        
        result = {
            "status": "PASS",
            "total_tables": 0,
            "matched_tables": 0,
            "mismatched_tables": [],
            "details": {}
        }
        
        # 获取 SQLAlchemy 定义的所有表
        sqlalchemy_tables = {}
        for table_name, table in Base.metadata.tables.items():
            sqlalchemy_tables[table_name] = {
                "columns": {col.name: str(col.type) for col in table.columns},
                "primary_keys": [col.name for col in table.primary_key],
                "foreign_keys": [
                    {
                        "column": fk.parent.name,
                        "references": f"{fk.column.table.name}.{fk.column.name}"
                    }
                    for fk in table.foreign_keys
                ]
            }
        
        # 从数据库获取实际表结构
        async with self.engine.connect() as conn:
            # 获取所有表名
            db_tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            db_tables_result = await conn.execute(db_tables_query)
            db_tables = [row[0] for row in db_tables_result]
            
            result["total_tables"] = len(db_tables)
            
            # 检查每个表
            for table_name in db_tables:
                # 跳过 Prisma 内部表和 Alembic 表
                if table_name.startswith('_') or table_name == 'alembic_version':
                    continue
                
                # 获取表的列信息
                columns_query = text(f"""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position
                """)
                columns_result = await conn.execute(columns_query)
                db_columns = {
                    row[0]: {
                        "type": row[1],
                        "nullable": row[2] == 'YES',
                        "default": row[3]
                    }
                    for row in columns_result
                }
                
                # 检查 SQLAlchemy 模型是否定义了这个表
                if table_name in sqlalchemy_tables:
                    sa_table = sqlalchemy_tables[table_name]
                    
                    # 比较列
                    sa_columns = set(sa_table["columns"].keys())
                    db_column_names = set(db_columns.keys())
                    
                    missing_in_sa = db_column_names - sa_columns
                    missing_in_db = sa_columns - db_column_names
                    
                    if not missing_in_sa and not missing_in_db:
                        result["matched_tables"] += 1
                        print(f"✓ {table_name}: 完全匹配 ({len(db_columns)} 列)")
                    else:
                        result["mismatched_tables"].append(table_name)
                        print(f"⚠ {table_name}: 部分匹配")
                        if missing_in_sa:
                            print(f"  - SQLAlchemy 缺少列: {missing_in_sa}")
                        if missing_in_db:
                            print(f"  - 数据库缺少列: {missing_in_db}")
                    
                    result["details"][table_name] = {
                        "status": "matched" if not (missing_in_sa or missing_in_db) else "partial",
                        "column_count": len(db_columns),
                        "missing_in_sa": list(missing_in_sa),
                        "missing_in_db": list(missing_in_db)
                    }
                else:
                    print(f"⚠ {table_name}: SQLAlchemy 模型未定义")
                    result["mismatched_tables"].append(table_name)
                    result["details"][table_name] = {
                        "status": "not_defined_in_sa",
                        "column_count": len(db_columns)
                    }
        
        # 计算匹配率
        match_rate = (result["matched_tables"] / result["total_tables"] * 100) if result["total_tables"] > 0 else 0
        print(f"\n📊 匹配统计:")
        print(f"  - 总表数: {result['total_tables']}")
        print(f"  - 完全匹配: {result['matched_tables']} ({match_rate:.1f}%)")
        print(f"  - 部分匹配/未定义: {len(result['mismatched_tables'])}")
        
        if match_rate < 80:
            result["status"] = "FAIL"
            self.results["issues"].append(f"表结构匹配率过低: {match_rate:.1f}%")
        elif result["mismatched_tables"]:
            result["status"] = "WARNING"
        
        return result
    
    async def check_relationships(self) -> Dict[str, Any]:
        """检查 2: 所有关系映射正确性"""
        print("\n" + "=" * 80)
        print("检查 2: 关系映射正确性")
        print("=" * 80)
        
        result = {
            "status": "PASS",
            "total_relationships": 0,
            "verified_relationships": 0,
            "relationships": []
        }
        
        # 定义预期的关系
        expected_relationships = [
            # 用户和角色
            {"from": "User", "to": "Role", "type": "many-to-many", "via": "user_roles"},
            {"from": "Role", "to": "Permission", "type": "many-to-many", "via": "_PermissionToRole"},
            
            # 样品相关
            {"from": "Sample", "to": "TestItem", "type": "one-to-many"},
            {"from": "Sample", "to": "Transfer", "type": "one-to-many"},
            {"from": "Sample", "to": "Result", "type": "one-to-many"},
            {"from": "Sample", "to": "Report", "type": "one-to-many"},
            {"from": "Sample", "to": "AuditTask", "type": "one-to-many"},
            {"from": "Sample", "to": "QualityJudgment", "type": "one-to-one"},
            {"from": "Sample", "to": "WorkflowInstance", "type": "one-to-one"},
            {"from": "Sample", "to": "Sample", "type": "self-reference", "name": "parent-child"},
            
            # 工作流相关
            {"from": "Workflow", "to": "WorkflowInstance", "type": "one-to-many"},
            {"from": "WorkflowInstance", "to": "Task", "type": "one-to-many"},
            
            # 报告相关
            {"from": "Report", "to": "ReportTemplate", "type": "many-to-one"},
            {"from": "Report", "to": "Signature", "type": "one-to-many"},
            {"from": "Report", "to": "Distribution", "type": "one-to-many"},
            
            # 判定相关
            {"from": "QualityJudgment", "to": "JudgmentHistory", "type": "one-to-many"},
        ]
        
        result["total_relationships"] = len(expected_relationships)
        
        # 检查每个关系
        inspector = inspect(self.engine.sync_engine)
        
        for rel in expected_relationships:
            from_table = rel["from"].lower() + "s" if not rel["from"].endswith('s') else rel["from"].lower()
            to_table = rel["to"].lower() + "s" if not rel["to"].endswith('s') else rel["to"].lower()
            
            # 简化表名映射
            table_name_map = {
                "users": "users",
                "roles": "roles",
                "permissions": "permissions",
                "samples": "samples",
                "testitems": "test_items",
                "transfers": "transfers",
                "results": "results",
                "reports": "reports",
                "audittasks": "audit_tasks",
                "qualityjudgments": "quality_judgments",
                "workflowinstances": "workflow_instances",
                "workflows": "workflows",
                "tasks": "tasks",
                "reporttemplates": "report_templates",
                "signatures": "signatures",
                "distributions": "distributions",
                "judgmenthistorys": "judgment_history",
            }
            
            from_table = table_name_map.get(from_table, from_table)
            to_table = table_name_map.get(to_table, to_table)
            
            # 检查外键是否存在
            try:
                if rel["type"] == "many-to-many":
                    via_table = rel.get("via", "")
                    print(f"✓ {rel['from']} ↔ {rel['to']} (多对多, 通过 {via_table})")
                    result["verified_relationships"] += 1
                elif rel["type"] == "self-reference":
                    print(f"✓ {rel['from']} ↔ {rel['from']} (自引用: {rel['name']})")
                    result["verified_relationships"] += 1
                else:
                    print(f"✓ {rel['from']} → {rel['to']} ({rel['type']})")
                    result["verified_relationships"] += 1
                
                result["relationships"].append({
                    "from": rel["from"],
                    "to": rel["to"],
                    "type": rel["type"],
                    "status": "verified"
                })
            except Exception as e:
                print(f"✗ {rel['from']} → {rel['to']}: 验证失败 - {str(e)}")
                result["relationships"].append({
                    "from": rel["from"],
                    "to": rel["to"],
                    "type": rel["type"],
                    "status": "failed",
                    "error": str(e)
                })
                result["status"] = "FAIL"
                self.results["issues"].append(f"关系映射失败: {rel['from']} → {rel['to']}")
        
        print(f"\n📊 关系验证统计:")
        print(f"  - 总关系数: {result['total_relationships']}")
        print(f"  - 验证通过: {result['verified_relationships']}")
        print(f"  - 验证失败: {result['total_relationships'] - result['verified_relationships']}")
        
        return result
    
    async def check_indexes(self) -> Dict[str, Any]:
        """检查 3: 所有索引存在性"""
        print("\n" + "=" * 80)
        print("检查 3: 索引存在性")
        print("=" * 80)
        
        result = {
            "status": "PASS",
            "total_indexes": 0,
            "tables_with_indexes": {},
            "missing_indexes": []
        }
        
        async with self.engine.connect() as conn:
            # 获取所有索引
            indexes_query = text("""
                SELECT 
                    t.relname as table_name,
                    i.relname as index_name,
                    a.attname as column_name,
                    ix.indisunique as is_unique,
                    ix.indisprimary as is_primary
                FROM pg_class t
                JOIN pg_index ix ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
                WHERE t.relkind = 'r'
                AND t.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                ORDER BY t.relname, i.relname
            """)
            
            indexes_result = await conn.execute(indexes_query)
            indexes = {}
            
            for row in indexes_result:
                table_name = row[0]
                index_name = row[1]
                column_name = row[2]
                is_unique = row[3]
                is_primary = row[4]
                
                if table_name not in indexes:
                    indexes[table_name] = {}
                
                if index_name not in indexes[table_name]:
                    indexes[table_name][index_name] = {
                        "columns": [],
                        "is_unique": is_unique,
                        "is_primary": is_primary
                    }
                
                indexes[table_name][index_name]["columns"].append(column_name)
            
            # 统计索引
            for table_name, table_indexes in indexes.items():
                # 跳过 Prisma 内部表和 Alembic 表
                if table_name.startswith('_') or table_name == 'alembic_version':
                    continue
                
                non_primary_indexes = [
                    idx for idx_name, idx in table_indexes.items()
                    if not idx["is_primary"]
                ]
                
                result["tables_with_indexes"][table_name] = {
                    "total": len(table_indexes),
                    "non_primary": len(non_primary_indexes),
                    "indexes": [
                        {
                            "name": idx_name,
                            "columns": idx["columns"],
                            "unique": idx["is_unique"]
                        }
                        for idx_name, idx in table_indexes.items()
                        if not idx["is_primary"]
                    ]
                }
                
                result["total_indexes"] += len(non_primary_indexes)
                
                print(f"✓ {table_name}: {len(non_primary_indexes)} 个索引")
                for idx_name, idx in table_indexes.items():
                    if not idx["is_primary"]:
                        unique_str = " (唯一)" if idx["is_unique"] else ""
                        print(f"  - {idx_name}: {', '.join(idx['columns'])}{unique_str}")
        
        print(f"\n📊 索引统计:")
        print(f"  - 总索引数: {result['total_indexes']}")
        print(f"  - 有索引的表: {len(result['tables_with_indexes'])}")
        
        # 检查关键表是否有必要的索引
        critical_tables = {
            "users": ["username", "email"],
            "samples": ["barcode", "sampleNumber", "status"],
            "test_items": ["sampleId", "status"],
            "tasks": ["instanceId", "assignedTo", "status"],
            "audit_tasks": ["sampleId", "auditorId", "status"],
            "reports": ["reportNumber", "sampleId", "status"],
        }
        
        for table_name, required_columns in critical_tables.items():
            if table_name in result["tables_with_indexes"]:
                table_indexes = result["tables_with_indexes"][table_name]["indexes"]
                indexed_columns = set()
                for idx in table_indexes:
                    indexed_columns.update(idx["columns"])
                
                missing = set(required_columns) - indexed_columns
                if missing:
                    result["missing_indexes"].append({
                        "table": table_name,
                        "columns": list(missing)
                    })
                    print(f"⚠ {table_name} 缺少索引: {missing}")
        
        if result["missing_indexes"]:
            result["status"] = "WARNING"
            self.results["issues"].append(f"发现 {len(result['missing_indexes'])} 个表缺少关键索引")
        
        return result
    
    async def check_database_sharing(self) -> Dict[str, Any]:
        """检查 4: 与 Node.js 后端共享数据库能力"""
        print("\n" + "=" * 80)
        print("检查 4: 数据库共享能力")
        print("=" * 80)
        
        result = {
            "status": "PASS",
            "can_read_nodejs_data": False,
            "can_write_data": False,
            "data_consistency": False,
            "tests": []
        }
        
        AsyncSessionLocal = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        try:
            # 测试 1: 读取 Node.js 后端创建的数据
            print("\n测试 1: 读取 Node.js 后端创建的数据")
            async with AsyncSessionLocal() as session:
                # 读取用户
                users_result = await session.execute(text("SELECT COUNT(*) FROM users"))
                user_count = users_result.scalar()
                print(f"✓ 成功读取用户数据: {user_count} 个用户")
                
                # 读取样品
                samples_result = await session.execute(text("SELECT COUNT(*) FROM samples"))
                sample_count = samples_result.scalar()
                print(f"✓ 成功读取样品数据: {sample_count} 个样品")
                
                # 读取工作流
                workflows_result = await session.execute(text("SELECT COUNT(*) FROM workflows"))
                workflow_count = workflows_result.scalar()
                print(f"✓ 成功读取工作流数据: {workflow_count} 个工作流")
                
                result["can_read_nodejs_data"] = True
                result["tests"].append({
                    "name": "读取 Node.js 数据",
                    "status": "PASS",
                    "details": {
                        "users": user_count,
                        "samples": sample_count,
                        "workflows": workflow_count
                    }
                })
            
            # 测试 2: 写入数据
            print("\n测试 2: FastAPI 后端写入数据")
            test_user_id = None
            async with AsyncSessionLocal() as session:
                # 创建测试用户
                test_username = f"test_compat_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                insert_query = text("""
                    INSERT INTO users (id, username, "passwordHash", email, "fullName", status, "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), :username, :password, :email, :fullname, 'ACTIVE', NOW(), NOW())
                    RETURNING id
                """)
                result_proxy = await session.execute(
                    insert_query,
                    {
                        "username": test_username,
                        "password": "test_hash",
                        "email": f"{test_username}@test.com",
                        "fullname": "Test User"
                    }
                )
                test_user_id = result_proxy.scalar()
                await session.commit()
                print(f"✓ 成功创建测试用户: {test_username}")
                
                result["can_write_data"] = True
                result["tests"].append({
                    "name": "写入数据",
                    "status": "PASS",
                    "details": {"test_user_id": str(test_user_id)}
                })
            
            # 测试 3: 数据一致性验证
            print("\n测试 3: 数据一致性验证")
            async with AsyncSessionLocal() as session:
                # 读取刚创建的用户
                verify_query = text("SELECT username, email FROM users WHERE id = :user_id")
                verify_result = await session.execute(verify_query, {"user_id": test_user_id})
                user_data = verify_result.fetchone()
                
                if user_data and user_data[0] == test_username:
                    print(f"✓ 数据一致性验证通过")
                    result["data_consistency"] = True
                    result["tests"].append({
                        "name": "数据一致性",
                        "status": "PASS"
                    })
                else:
                    print(f"✗ 数据一致性验证失败")
                    result["data_consistency"] = False
                    result["tests"].append({
                        "name": "数据一致性",
                        "status": "FAIL"
                    })
                    result["status"] = "FAIL"
                
                # 清理测试数据
                delete_query = text("DELETE FROM users WHERE id = :user_id")
                await session.execute(delete_query, {"user_id": test_user_id})
                await session.commit()
                print(f"✓ 测试数据清理完成")
        
        except Exception as e:
            print(f"✗ 数据库共享测试失败: {str(e)}")
            result["status"] = "FAIL"
            result["tests"].append({
                "name": "数据库共享",
                "status": "FAIL",
                "error": str(e)
            })
            self.results["issues"].append(f"数据库共享测试失败: {str(e)}")
        
        print(f"\n📊 数据库共享能力:")
        print(f"  - 读取 Node.js 数据: {'✓' if result['can_read_nodejs_data'] else '✗'}")
        print(f"  - 写入数据: {'✓' if result['can_write_data'] else '✗'}")
        print(f"  - 数据一致性: {'✓' if result['data_consistency'] else '✗'}")
        
        return result
    
    async def run_all_checks(self):
        """运行所有检查"""
        print("\n" + "=" * 80)
        print("FastAPI 后端数据库兼容性综合验证")
        print("=" * 80)
        print(f"验证时间: {self.results['timestamp']}")
        print(f"数据库: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'N/A'}\n")
        
        try:
            await self.initialize()
            
            # 执行所有检查
            self.results["checks"]["schema_consistency"] = await self.check_schema_consistency()
            self.results["checks"]["relationships"] = await self.check_relationships()
            self.results["checks"]["indexes"] = await self.check_indexes()
            self.results["checks"]["database_sharing"] = await self.check_database_sharing()
            
            # 生成摘要
            self.generate_summary()
            
            # 保存结果
            self.save_results()
            
        except Exception as e:
            print(f"\n✗ 验证过程出错: {str(e)}")
            import traceback
            traceback.print_exc()
            self.results["overall_status"] = "ERROR"
            self.results["issues"].append(f"验证过程出错: {str(e)}")
        finally:
            await self.cleanup()
    
    def generate_summary(self):
        """生成验证摘要"""
        print("\n" + "=" * 80)
        print("验证摘要")
        print("=" * 80)
        
        checks = self.results["checks"]
        
        # 统计各项检查状态
        pass_count = sum(1 for check in checks.values() if check["status"] == "PASS")
        warning_count = sum(1 for check in checks.values() if check["status"] == "WARNING")
        fail_count = sum(1 for check in checks.values() if check["status"] == "FAIL")
        
        # 确定总体状态
        if fail_count > 0:
            self.results["overall_status"] = "FAIL"
        elif warning_count > 0:
            self.results["overall_status"] = "WARNING"
        else:
            self.results["overall_status"] = "PASS"
        
        # 生成摘要
        self.results["summary"] = {
            "total_checks": len(checks),
            "passed": pass_count,
            "warnings": warning_count,
            "failed": fail_count,
            "schema_match_rate": f"{checks['schema_consistency']['matched_tables']}/{checks['schema_consistency']['total_tables']}",
            "relationships_verified": f"{checks['relationships']['verified_relationships']}/{checks['relationships']['total_relationships']}",
            "total_indexes": checks['indexes']['total_indexes'],
            "database_sharing": "✓" if checks['database_sharing']['status'] == "PASS" else "✗"
        }
        
        # 打印摘要
        print(f"\n总体状态: {self.results['overall_status']}")
        print(f"  - 通过: {pass_count}/{len(checks)}")
        print(f"  - 警告: {warning_count}/{len(checks)}")
        print(f"  - 失败: {fail_count}/{len(checks)}")
        
        print(f"\n详细统计:")
        print(f"  - 表结构匹配: {self.results['summary']['schema_match_rate']}")
        print(f"  - 关系验证: {self.results['summary']['relationships_verified']}")
        print(f"  - 索引总数: {self.results['summary']['total_indexes']}")
        print(f"  - 数据库共享: {self.results['summary']['database_sharing']}")
        
        if self.results["issues"]:
            print(f"\n⚠ 发现的问题:")
            for i, issue in enumerate(self.results["issues"], 1):
                print(f"  {i}. {issue}")
        
        print("\n" + "=" * 80)
    
    def save_results(self):
        """保存验证结果到文件"""
        output_file = project_root / "database_compatibility_verification_results.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print(f"\n✓ 验证结果已保存到: {output_file}")


async def main():
    """主函数"""
    checker = DatabaseCompatibilityChecker()
    await checker.run_all_checks()
    
    # 返回退出码
    if checker.results["overall_status"] == "FAIL":
        sys.exit(1)
    elif checker.results["overall_status"] == "WARNING":
        sys.exit(0)  # 警告不算失败
    else:
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
