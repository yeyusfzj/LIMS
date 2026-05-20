#!/usr/bin/env python3
"""
数据库兼容性验证脚本
验证 SQLAlchemy 模型与 Prisma schema 的一致性
"""

import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Set
import re

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import inspect
from sqlalchemy.orm import DeclarativeMeta
from app.core.database import engine
from app.models import (
    User, Role, Permission, UserRole,
    Sample, TestItem, Transfer,
    Workflow, WorkflowInstance, Task,
    Result, Formula,
    AuditTask, QualityJudgment, JudgmentRule, JudgmentHistory,
    AuditCommentTemplate, AuditWorkflowConfig, AuditHistory,
    Report, ReportTemplate, Signature, Distribution,
    AuditLog, ArchivedAuditLog, BackupRecord, TestMethod
)


class DatabaseCompatibilityVerifier:
    """数据库兼容性验证器"""
    
    def __init__(self):
        self.models = [
            User, Role, Permission, UserRole,
            Sample, TestItem, Transfer,
            Workflow, WorkflowInstance, Task,
            Result, Formula,
            AuditTask, QualityJudgment, JudgmentRule, JudgmentHistory,
            AuditCommentTemplate, AuditWorkflowConfig, AuditHistory,
            Report, ReportTemplate, Signature, Distribution,
            AuditLog, ArchivedAuditLog, BackupRecord, TestMethod
        ]
        
        # Prisma schema 定义（从 backend-api/prisma/schema.prisma 提取）
        self.prisma_tables = {
            'users': {
                'columns': {
                    'id': 'String',
                    'username': 'String',
                    'passwordHash': 'String',
                    'email': 'String',
                    'fullName': 'String',
                    'department': 'String?',
                    'position': 'String?',
                    'phone': 'String?',
                    'status': 'UserStatus',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime',
                    'lastLoginAt': 'DateTime?'
                },
                'indexes': ['username', 'email'],
                'unique': ['username', 'email']
            },
            'roles': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'description': 'String?',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': [],
                'unique': ['name']
            },
            'permissions': {
                'columns': {
                    'id': 'String',
                    'resource': 'String',
                    'action': 'String',
                    'createdAt': 'DateTime'
                },
                'indexes': [],
                'unique': [['resource', 'action']]
            },
            'user_roles': {
                'columns': {
                    'userId': 'String',
                    'roleId': 'String',
                    'assignedAt': 'DateTime'
                },
                'indexes': [],
                'unique': []
            },
            'samples': {
                'columns': {
                    'id': 'String',
                    'barcode': 'String',
                    'sampleNumber': 'String',
                    'clientName': 'String',
                    'clientContact': 'String?',
                    'sampleName': 'String',
                    'sampleType': 'String',
                    'sampleCategory': 'String',
                    'quantity': 'Float',
                    'unit': 'String',
                    'receivedDate': 'DateTime',
                    'samplingDate': 'DateTime?',
                    'samplingLocation': 'String?',
                    'samplingPerson': 'String?',
                    'storageLocation': 'String?',
                    'storageCondition': 'String?',
                    'status': 'SampleStatus',
                    'priority': 'Priority',
                    'description': 'String?',
                    'remarks': 'String?',
                    'version': 'Int',
                    'parentSampleId': 'String?',
                    'mergedFromIds': 'String[]',
                    'workflowInstanceId': 'String?',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime',
                    'releasedAt': 'DateTime?',
                    'releasedBy': 'String?'
                },
                'indexes': ['barcode', 'sampleNumber', 'status', 'clientName'],
                'unique': ['barcode', 'sampleNumber', 'workflowInstanceId']
            },
            'test_items': {
                'columns': {
                    'id': 'String',
                    'sampleId': 'String',
                    'testMethod': 'String',
                    'testStandard': 'String?',
                    'testParameters': 'Json',
                    'status': 'TestItemStatus',
                    'assignedTo': 'String?',
                    'assignedAt': 'DateTime?',
                    'completedAt': 'DateTime?',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['sampleId', 'status'],
                'unique': []
            },
            'transfers': {
                'columns': {
                    'id': 'String',
                    'sampleId': 'String',
                    'fromLocation': 'String',
                    'toLocation': 'String',
                    'fromPerson': 'String',
                    'toPerson': 'String',
                    'transferDate': 'DateTime',
                    'receivedDate': 'DateTime?',
                    'status': 'TransferStatus',
                    'remarks': 'String?',
                    'senderConfirmed': 'Boolean',
                    'receiverConfirmed': 'Boolean',
                    'createdAt': 'DateTime'
                },
                'indexes': ['sampleId', 'transferDate'],
                'unique': []
            },
            'workflows': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'description': 'String?',
                    'version': 'Int',
                    'config': 'Json',
                    'status': 'WorkflowStatus',
                    'isActive': 'Boolean',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime',
                    'activatedAt': 'DateTime?'
                },
                'indexes': ['status', 'isActive'],
                'unique': []
            },
            'workflow_instances': {
                'columns': {
                    'id': 'String',
                    'workflowId': 'String',
                    'sampleId': 'String',
                    'currentNodes': 'String[]',
                    'status': 'InstanceStatus',
                    'variables': 'Json',
                    'startedAt': 'DateTime',
                    'completedAt': 'DateTime?'
                },
                'indexes': ['workflowId', 'status'],
                'unique': ['sampleId']
            },
            'tasks': {
                'columns': {
                    'id': 'String',
                    'instanceId': 'String',
                    'nodeId': 'String',
                    'nodeName': 'String',
                    'nodeType': 'String',
                    'assignedTo': 'String?',
                    'assignedAt': 'DateTime?',
                    'status': 'TaskStatus',
                    'priority': 'Priority',
                    'result': 'Json?',
                    'completedAt': 'DateTime?',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['instanceId', 'assignedTo', 'status'],
                'unique': []
            },
            'results': {
                'columns': {
                    'id': 'String',
                    'sampleId': 'String',
                    'testItemId': 'String',
                    'parameter': 'String',
                    'value': 'Float?',
                    'textValue': 'String?',
                    'unit': 'String?',
                    'method': 'String',
                    'version': 'Int',
                    'source': 'ResultSource',
                    'instrumentId': 'String?',
                    'formulaId': 'String?',
                    'isCalculated': 'Boolean',
                    'isAbnormal': 'Boolean',
                    'abnormalReason': 'String?',
                    'isRetest': 'Boolean',
                    'originalResultId': 'String?',
                    'retestReason': 'String?',
                    'enteredBy': 'String',
                    'enteredAt': 'DateTime',
                    'reviewedBy': 'String?',
                    'reviewedAt': 'DateTime?'
                },
                'indexes': ['sampleId', 'testItemId'],
                'unique': []
            },
            'formulas': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'description': 'String?',
                    'expression': 'String',
                    'parameters': 'Json',
                    'isActive': 'Boolean',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': [],
                'unique': []
            },
            'audit_tasks': {
                'columns': {
                    'id': 'String',
                    'sampleId': 'String',
                    'level': 'Int',
                    'auditorId': 'String',
                    'status': 'AuditStatus',
                    'decision': 'AuditDecision?',
                    'comments': 'String?',
                    'submittedAt': 'DateTime',
                    'completedAt': 'DateTime?'
                },
                'indexes': ['sampleId', 'auditorId', 'status'],
                'unique': []
            },
            'quality_judgments': {
                'columns': {
                    'id': 'String',
                    'sampleId': 'String',
                    'result': 'JudgmentResult',
                    'basis': 'String',
                    'isAutomatic': 'Boolean',
                    'version': 'Int',
                    'judgedBy': 'String',
                    'judgedAt': 'DateTime',
                    'reviewedBy': 'String?',
                    'reviewedAt': 'DateTime?'
                },
                'indexes': ['result'],
                'unique': ['sampleId']
            },
            'judgment_rules': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'description': 'String?',
                    'testItemType': 'String',
                    'conditions': 'Json',
                    'priority': 'Int',
                    'isActive': 'Boolean',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['testItemType', 'isActive'],
                'unique': []
            },
            'judgment_history': {
                'columns': {
                    'id': 'String',
                    'judgmentId': 'String',
                    'sampleId': 'String',
                    'previousResult': 'JudgmentResult',
                    'newResult': 'JudgmentResult',
                    'changeReason': 'String',
                    'changedBy': 'String',
                    'changedAt': 'DateTime'
                },
                'indexes': ['judgmentId', 'sampleId', 'changedAt'],
                'unique': []
            },
            'audit_comment_templates': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'type': 'CommentTemplateType',
                    'content': 'String',
                    'usageCount': 'Int',
                    'isDefault': 'Boolean',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['type', 'isDefault', 'createdBy'],
                'unique': ['name']
            },
            'audit_workflow_configs': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'sampleTypes': 'String[]',
                    'levels': 'Json',
                    'parallelAudit': 'Boolean',
                    'status': 'WorkflowConfigStatus',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['status', 'createdBy'],
                'unique': ['name']
            },
            'audit_history': {
                'columns': {
                    'id': 'String',
                    'taskId': 'String',
                    'action': 'String',
                    'changes': 'Json',
                    'performedBy': 'String',
                    'performedAt': 'DateTime'
                },
                'indexes': ['taskId', 'performedAt', 'performedBy'],
                'unique': []
            },
            'report_templates': {
                'columns': {
                    'id': 'String',
                    'name': 'String',
                    'description': 'String?',
                    'category': 'String',
                    'content': 'String',
                    'variables': 'Json',
                    'version': 'Int',
                    'isActive': 'Boolean',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': [],
                'unique': []
            },
            'reports': {
                'columns': {
                    'id': 'String',
                    'reportNumber': 'String',
                    'sampleId': 'String',
                    'templateId': 'String',
                    'content': 'String',
                    'status': 'ReportStatus',
                    'version': 'Int',
                    'generatedBy': 'String',
                    'generatedAt': 'DateTime',
                    'approvedAt': 'DateTime?',
                    'recalledAt': 'DateTime?',
                    'recallReason': 'String?'
                },
                'indexes': ['reportNumber', 'sampleId', 'status'],
                'unique': ['reportNumber']
            },
            'signatures': {
                'columns': {
                    'id': 'String',
                    'reportId': 'String',
                    'signerId': 'String',
                    'signerName': 'String',
                    'signerRole': 'String',
                    'signatureData': 'String',
                    'signedAt': 'DateTime'
                },
                'indexes': ['reportId'],
                'unique': []
            },
            'distributions': {
                'columns': {
                    'id': 'String',
                    'reportId': 'String',
                    'method': 'DistributionMethod',
                    'recipient': 'String',
                    'recipientEmail': 'String?',
                    'status': 'DistributionStatus',
                    'sentAt': 'DateTime?',
                    'receivedAt': 'DateTime?'
                },
                'indexes': ['reportId'],
                'unique': []
            },
            'audit_logs': {
                'columns': {
                    'id': 'String',
                    'userId': 'String',
                    'username': 'String',
                    'action': 'String',
                    'resource': 'String',
                    'resourceId': 'String',
                    'changes': 'Json?',
                    'ipAddress': 'String?',
                    'userAgent': 'String?',
                    'timestamp': 'DateTime'
                },
                'indexes': ['userId', ['resource', 'resourceId'], 'timestamp'],
                'unique': []
            },
            'archived_audit_logs': {
                'columns': {
                    'id': 'String',
                    'userId': 'String',
                    'username': 'String',
                    'action': 'String',
                    'resource': 'String',
                    'resourceId': 'String',
                    'changes': 'Json?',
                    'ipAddress': 'String?',
                    'userAgent': 'String?',
                    'timestamp': 'DateTime',
                    'archivedAt': 'DateTime'
                },
                'indexes': ['userId', ['resource', 'resourceId'], 'timestamp', 'archivedAt'],
                'unique': []
            },
            'backup_records': {
                'columns': {
                    'id': 'String',
                    'filename': 'String',
                    'filepath': 'String',
                    'size': 'Int',
                    'type': 'BackupType',
                    'status': 'BackupStatus',
                    'checksum': 'String?',
                    'error': 'String?',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'completedAt': 'DateTime?',
                    'verifiedAt': 'DateTime?'
                },
                'indexes': ['status', 'type', 'createdAt'],
                'unique': []
            },
            'test_methods': {
                'columns': {
                    'id': 'String',
                    'code': 'String',
                    'name': 'String',
                    'category': 'String',
                    'version': 'String',
                    'status': 'MethodStatus',
                    'scope': 'String?',
                    'description': 'String?',
                    'equipment': 'Json',
                    'steps': 'Json',
                    'precision': 'String?',
                    'accuracy': 'String?',
                    'detectionLimit': 'String?',
                    'measurementRange': 'String?',
                    'qualityControl': 'String?',
                    'safetyNotes': 'String?',
                    'operationNotes': 'String?',
                    'createdBy': 'String',
                    'createdAt': 'DateTime',
                    'updatedAt': 'DateTime'
                },
                'indexes': ['code', 'category', 'status'],
                'unique': ['code']
            }
        }
        
        self.issues = []
        self.warnings = []
        self.successes = []
    
    def verify_table_names(self) -> None:
        """验证表名一致性"""
        print("\n=== 验证表名一致性 ===")
        
        sqlalchemy_tables = set()
        for model in self.models:
            if hasattr(model, '__tablename__'):
                sqlalchemy_tables.add(model.__tablename__)
        
        prisma_tables = set(self.prisma_tables.keys())
        
        # 检查缺失的表
        missing_in_sqlalchemy = prisma_tables - sqlalchemy_tables
        missing_in_prisma = sqlalchemy_tables - prisma_tables
        
        if missing_in_sqlalchemy:
            self.issues.append(f"SQLAlchemy 中缺失的表: {missing_in_sqlalchemy}")
        
        if missing_in_prisma:
            self.warnings.append(f"Prisma 中缺失的表: {missing_in_prisma}")
        
        common_tables = sqlalchemy_tables & prisma_tables
        self.successes.append(f"共同的表数量: {len(common_tables)}")
        
        print(f"✓ SQLAlchemy 表数量: {len(sqlalchemy_tables)}")
        print(f"✓ Prisma 表数量: {len(prisma_tables)}")
        print(f"✓ 共同表数量: {len(common_tables)}")
        
        if missing_in_sqlalchemy:
            print(f"✗ SQLAlchemy 中缺失: {missing_in_sqlalchemy}")
        if missing_in_prisma:
            print(f"⚠ Prisma 中缺失: {missing_in_prisma}")
    
    def verify_columns(self) -> None:
        """验证字段一致性"""
        print("\n=== 验证字段一致性 ===")
        
        for model in self.models:
            if not hasattr(model, '__tablename__'):
                continue
            
            table_name = model.__tablename__
            if table_name not in self.prisma_tables:
                continue
            
            print(f"\n检查表: {table_name}")
            
            # 获取 SQLAlchemy 列
            sqlalchemy_columns = {}
            for column in model.__table__.columns:
                sqlalchemy_columns[column.name] = str(column.type)
            
            # 获取 Prisma 列
            prisma_columns = self.prisma_tables[table_name]['columns']
            
            # 对比列
            sqlalchemy_col_names = set(sqlalchemy_columns.keys())
            prisma_col_names = set(prisma_columns.keys())
            
            missing_in_sqlalchemy = prisma_col_names - sqlalchemy_col_names
            missing_in_prisma = sqlalchemy_col_names - prisma_col_names
            common_columns = sqlalchemy_col_names & prisma_col_names
            
            if missing_in_sqlalchemy:
                self.issues.append(f"{table_name}: SQLAlchemy 中缺失列 {missing_in_sqlalchemy}")
                print(f"  ✗ SQLAlchemy 中缺失: {missing_in_sqlalchemy}")
            
            if missing_in_prisma:
                self.warnings.append(f"{table_name}: Prisma 中缺失列 {missing_in_prisma}")
                print(f"  ⚠ Prisma 中缺失: {missing_in_prisma}")
            
            print(f"  ✓ 共同列数量: {len(common_columns)}/{len(prisma_col_names)}")
    
    def verify_relationships(self) -> None:
        """验证关系映射"""
        print("\n=== 验证关系映射 ===")
        
        relationship_count = 0
        for model in self.models:
            if not hasattr(model, '__tablename__'):
                continue
            
            # 获取关系
            mapper = inspect(model)
            relationships = mapper.relationships
            
            if relationships:
                print(f"\n{model.__tablename__}:")
                for rel in relationships:
                    relationship_count += 1
                    print(f"  ✓ {rel.key} -> {rel.mapper.class_.__tablename__}")
        
        self.successes.append(f"总关系数量: {relationship_count}")
        print(f"\n✓ 总关系数量: {relationship_count}")
    
    def verify_indexes(self) -> None:
        """验证索引"""
        print("\n=== 验证索引 ===")
        
        for model in self.models:
            if not hasattr(model, '__tablename__'):
                continue
            
            table_name = model.__tablename__
            if table_name not in self.prisma_tables:
                continue
            
            # 获取 SQLAlchemy 索引
            sqlalchemy_indexes = set()
            for index in model.__table__.indexes:
                for column in index.columns:
                    sqlalchemy_indexes.add(column.name)
            
            # 获取 Prisma 索引
            prisma_indexes = set(self.prisma_tables[table_name]['indexes'])
            
            if prisma_indexes:
                print(f"\n{table_name}:")
                print(f"  Prisma 索引: {prisma_indexes}")
                print(f"  SQLAlchemy 索引: {sqlalchemy_indexes}")
                
                missing = prisma_indexes - sqlalchemy_indexes
                if missing:
                    self.warnings.append(f"{table_name}: 缺失索引 {missing}")
                    print(f"  ⚠ 缺失索引: {missing}")
                else:
                    print(f"  ✓ 索引完整")
    
    def generate_report(self) -> str:
        """生成验证报告"""
        report = []
        report.append("=" * 80)
        report.append("数据库兼容性验证报告")
        report.append("=" * 80)
        report.append("")
        
        report.append("## 验证摘要")
        report.append(f"- 成功项: {len(self.successes)}")
        report.append(f"- 警告项: {len(self.warnings)}")
        report.append(f"- 错误项: {len(self.issues)}")
        report.append("")
        
        if self.successes:
            report.append("## 成功项")
            for success in self.successes:
                report.append(f"✓ {success}")
            report.append("")
        
        if self.warnings:
            report.append("## 警告项")
            for warning in self.warnings:
                report.append(f"⚠ {warning}")
            report.append("")
        
        if self.issues:
            report.append("## 错误项")
            for issue in self.issues:
                report.append(f"✗ {issue}")
            report.append("")
        
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def run(self) -> bool:
        """运行所有验证"""
        print("开始数据库兼容性验证...")
        
        self.verify_table_names()
        self.verify_columns()
        self.verify_relationships()
        self.verify_indexes()
        
        # 生成报告
        report = self.generate_report()
        print("\n" + report)
        
        # 保存报告
        report_path = Path(__file__).parent.parent / "DATABASE_COMPATIBILITY_REPORT.md"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\n报告已保存到: {report_path}")
        
        # 返回验证结果
        return len(self.issues) == 0


def main():
    """主函数"""
    verifier = DatabaseCompatibilityVerifier()
    success = verifier.run()
    
    if success:
        print("\n✓ 数据库兼容性验证通过！")
        sys.exit(0)
    else:
        print("\n✗ 数据库兼容性验证失败！")
        sys.exit(1)


if __name__ == "__main__":
    main()
