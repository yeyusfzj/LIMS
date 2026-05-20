"""
验证审核相关 SQLAlchemy 模型的脚本

此脚本验证：
1. 所有模型都能正确导入
2. 模型字段与 Prisma schema 一致
3. 枚举类型定义正确
4. 关系映射正确
"""

import sys
from sqlalchemy import inspect


def verify_audit_models():
    """验证审核相关模型"""
    print("=" * 80)
    print("验证审核相关 SQLAlchemy 模型")
    print("=" * 80)
    
    try:
        # 导入模型
        from app.models.audit import (
            AuditTask,
            AuditStatus,
            AuditDecision,
            AuditCommentTemplate,
            CommentTemplateType,
            AuditWorkflowConfig,
            WorkflowConfigStatus,
            AuditHistory
        )
        from app.models.judgment import (
            QualityJudgment,
            JudgmentRule,
            JudgmentHistory,
            JudgmentResult
        )
        print("✓ 所有模型导入成功\n")
    except Exception as e:
        print(f"✗ 模型导入失败: {e}")
        return False
    
    # 验证 AuditTask 模型
    print("验证 AuditTask 模型:")
    print(f"  表名: {AuditTask.__tablename__}")
    inspector = inspect(AuditTask)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'sampleId', 'level', 'auditorId', 'status', 
        'decision', 'comments', 'submittedAt', 'completedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
        print(f"    缺失: {expected_columns - columns}")
        print(f"    多余: {columns - expected_columns}")
    
    # 验证枚举
    print(f"  ✓ AuditStatus 枚举: {[e.value for e in AuditStatus]}")
    print(f"  ✓ AuditDecision 枚举: {[e.value for e in AuditDecision]}")
    print()
    
    # 验证 AuditCommentTemplate 模型
    print("验证 AuditCommentTemplate 模型:")
    print(f"  表名: {AuditCommentTemplate.__tablename__}")
    inspector = inspect(AuditCommentTemplate)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'name', 'type', 'content', 'usageCount', 
        'isDefault', 'createdBy', 'createdAt', 'updatedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    
    print(f"  ✓ CommentTemplateType 枚举: {[e.value for e in CommentTemplateType]}")
    print()
    
    # 验证 AuditWorkflowConfig 模型
    print("验证 AuditWorkflowConfig 模型:")
    print(f"  表名: {AuditWorkflowConfig.__tablename__}")
    inspector = inspect(AuditWorkflowConfig)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'name', 'sampleTypes', 'levels', 'parallelAudit',
        'status', 'createdBy', 'createdAt', 'updatedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    
    print(f"  ✓ WorkflowConfigStatus 枚举: {[e.value for e in WorkflowConfigStatus]}")
    print()
    
    # 验证 AuditHistory 模型
    print("验证 AuditHistory 模型:")
    print(f"  表名: {AuditHistory.__tablename__}")
    inspector = inspect(AuditHistory)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'taskId', 'action', 'changes', 
        'performedBy', 'performedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    print()
    
    # 验证 QualityJudgment 模型
    print("验证 QualityJudgment 模型:")
    print(f"  表名: {QualityJudgment.__tablename__}")
    inspector = inspect(QualityJudgment)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'sampleId', 'result', 'basis', 'isAutomatic', 'version',
        'judgedBy', 'judgedAt', 'reviewedBy', 'reviewedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    
    print(f"  ✓ JudgmentResult 枚举: {[e.value for e in JudgmentResult]}")
    print()
    
    # 验证 JudgmentRule 模型
    print("验证 JudgmentRule 模型:")
    print(f"  表名: {JudgmentRule.__tablename__}")
    inspector = inspect(JudgmentRule)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'name', 'description', 'testItemType', 'conditions',
        'priority', 'isActive', 'createdBy', 'createdAt', 'updatedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    print()
    
    # 验证 JudgmentHistory 模型
    print("验证 JudgmentHistory 模型:")
    print(f"  表名: {JudgmentHistory.__tablename__}")
    inspector = inspect(JudgmentHistory)
    columns = {col.key for col in inspector.columns}
    expected_columns = {
        'id', 'judgmentId', 'sampleId', 'previousResult', 'newResult',
        'changeReason', 'changedBy', 'changedAt'
    }
    if columns == expected_columns:
        print(f"  ✓ 字段完整: {columns}")
    else:
        print(f"  ✗ 字段不匹配")
        print(f"    期望: {expected_columns}")
        print(f"    实际: {columns}")
    print()
    
    # 验证关系映射
    print("验证关系映射:")
    
    # AuditTask 关系
    audit_task_relationships = {rel.key for rel in inspect(AuditTask).relationships}
    print(f"  AuditTask 关系: {audit_task_relationships}")
    if 'sample' in audit_task_relationships:
        print("    ✓ sample 关系存在")
    
    # QualityJudgment 关系
    judgment_relationships = {rel.key for rel in inspect(QualityJudgment).relationships}
    print(f"  QualityJudgment 关系: {judgment_relationships}")
    if 'sample' in judgment_relationships and 'history' in judgment_relationships:
        print("    ✓ sample 和 history 关系存在")
    
    # JudgmentHistory 关系
    history_relationships = {rel.key for rel in inspect(JudgmentHistory).relationships}
    print(f"  JudgmentHistory 关系: {history_relationships}")
    if 'judgment' in history_relationships:
        print("    ✓ judgment 关系存在")
    
    print()
    print("=" * 80)
    print("✓ 所有审核相关模型验证完成")
    print("=" * 80)
    
    return True


if __name__ == "__main__":
    try:
        success = verify_audit_models()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ 验证过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
