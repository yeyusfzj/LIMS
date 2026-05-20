"""
验证审核和判定模型与 Prisma schema 的兼容性

此脚本验证：
1. AuditTask 模型
2. AuditCommentTemplate 模型
3. AuditWorkflowConfig 模型
4. AuditHistory 模型
5. QualityJudgment 模型
6. JudgmentRule 模型
7. JudgmentHistory 模型
"""

import sys
from sqlalchemy import inspect
from app.models import (
    AuditTask,
    AuditStatus,
    AuditDecision,
    AuditCommentTemplate,
    CommentTemplateType,
    AuditWorkflowConfig,
    WorkflowConfigStatus,
    AuditHistory,
    QualityJudgment,
    JudgmentRule,
    JudgmentHistory,
    JudgmentResult,
    Sample
)


def verify_audit_task_model():
    """验证 AuditTask 模型"""
    print("\n=== 验证 AuditTask 模型 ===")
    
    # 检查表名
    assert AuditTask.__tablename__ == 'audit_tasks', "表名不匹配"
    print("✓ 表名正确: audit_tasks")
    
    # 检查字段
    inspector = inspect(AuditTask)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'sampleId', 'level', 'auditorId', 'status', 
        'decision', 'comments', 'submittedAt', 'completedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    # 检查枚举
    assert hasattr(AuditStatus, 'PENDING'), "缺少 PENDING 状态"
    assert hasattr(AuditStatus, 'IN_PROGRESS'), "缺少 IN_PROGRESS 状态"
    assert hasattr(AuditStatus, 'APPROVED'), "缺少 APPROVED 状态"
    assert hasattr(AuditStatus, 'REJECTED'), "缺少 REJECTED 状态"
    print("✓ AuditStatus 枚举正确")
    
    assert hasattr(AuditDecision, 'APPROVE'), "缺少 APPROVE 决策"
    assert hasattr(AuditDecision, 'REJECT'), "缺少 REJECT 决策"
    assert hasattr(AuditDecision, 'RETURN'), "缺少 RETURN 决策"
    print("✓ AuditDecision 枚举正确")
    
    # 检查关系
    assert hasattr(AuditTask, 'sample'), "缺少 sample 关系"
    print("✓ 关系映射正确")
    
    print("✓ AuditTask 模型验证通过")


def verify_audit_comment_template_model():
    """验证 AuditCommentTemplate 模型"""
    print("\n=== 验证 AuditCommentTemplate 模型 ===")
    
    # 检查表名
    assert AuditCommentTemplate.__tablename__ == 'audit_comment_templates', "表名不匹配"
    print("✓ 表名正确: audit_comment_templates")
    
    # 检查字段
    inspector = inspect(AuditCommentTemplate)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'name', 'type', 'content', 'usageCount', 
        'isDefault', 'createdBy', 'createdAt', 'updatedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    # 检查枚举
    assert hasattr(CommentTemplateType, 'APPROVED'), "缺少 APPROVED 类型"
    assert hasattr(CommentTemplateType, 'NEED_REVISION'), "缺少 NEED_REVISION 类型"
    assert hasattr(CommentTemplateType, 'REJECTED'), "缺少 REJECTED 类型"
    assert hasattr(CommentTemplateType, 'OTHER'), "缺少 OTHER 类型"
    print("✓ CommentTemplateType 枚举正确")
    
    print("✓ AuditCommentTemplate 模型验证通过")


def verify_audit_workflow_config_model():
    """验证 AuditWorkflowConfig 模型"""
    print("\n=== 验证 AuditWorkflowConfig 模型 ===")
    
    # 检查表名
    assert AuditWorkflowConfig.__tablename__ == 'audit_workflow_configs', "表名不匹配"
    print("✓ 表名正确: audit_workflow_configs")
    
    # 检查字段
    inspector = inspect(AuditWorkflowConfig)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'name', 'sampleTypes', 'levels', 'parallelAudit',
        'status', 'createdBy', 'createdAt', 'updatedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    # 检查枚举
    assert hasattr(WorkflowConfigStatus, 'ACTIVE'), "缺少 ACTIVE 状态"
    assert hasattr(WorkflowConfigStatus, 'INACTIVE'), "缺少 INACTIVE 状态"
    print("✓ WorkflowConfigStatus 枚举正确")
    
    print("✓ AuditWorkflowConfig 模型验证通过")


def verify_audit_history_model():
    """验证 AuditHistory 模型"""
    print("\n=== 验证 AuditHistory 模型 ===")
    
    # 检查表名
    assert AuditHistory.__tablename__ == 'audit_history', "表名不匹配"
    print("✓ 表名正确: audit_history")
    
    # 检查字段
    inspector = inspect(AuditHistory)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'taskId', 'action', 'changes', 'performedBy', 'performedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    print("✓ AuditHistory 模型验证通过")


def verify_quality_judgment_model():
    """验证 QualityJudgment 模型"""
    print("\n=== 验证 QualityJudgment 模型 ===")
    
    # 检查表名
    assert QualityJudgment.__tablename__ == 'quality_judgments', "表名不匹配"
    print("✓ 表名正确: quality_judgments")
    
    # 检查字段
    inspector = inspect(QualityJudgment)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'sampleId', 'result', 'basis', 'isAutomatic', 'version',
        'judgedBy', 'judgedAt', 'reviewedBy', 'reviewedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    # 检查枚举
    assert hasattr(JudgmentResult, 'QUALIFIED'), "缺少 QUALIFIED 结果"
    assert hasattr(JudgmentResult, 'UNQUALIFIED'), "缺少 UNQUALIFIED 结果"
    assert hasattr(JudgmentResult, 'PENDING'), "缺少 PENDING 结果"
    print("✓ JudgmentResult 枚举正确")
    
    # 检查关系
    assert hasattr(QualityJudgment, 'sample'), "缺少 sample 关系"
    assert hasattr(QualityJudgment, 'history'), "缺少 history 关系"
    print("✓ 关系映射正确")
    
    print("✓ QualityJudgment 模型验证通过")


def verify_judgment_rule_model():
    """验证 JudgmentRule 模型"""
    print("\n=== 验证 JudgmentRule 模型 ===")
    
    # 检查表名
    assert JudgmentRule.__tablename__ == 'judgment_rules', "表名不匹配"
    print("✓ 表名正确: judgment_rules")
    
    # 检查字段
    inspector = inspect(JudgmentRule)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'name', 'description', 'testItemType', 'conditions',
        'priority', 'isActive', 'createdBy', 'createdAt', 'updatedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    print("✓ JudgmentRule 模型验证通过")


def verify_judgment_history_model():
    """验证 JudgmentHistory 模型"""
    print("\n=== 验证 JudgmentHistory 模型 ===")
    
    # 检查表名
    assert JudgmentHistory.__tablename__ == 'judgment_history', "表名不匹配"
    print("✓ 表名正确: judgment_history")
    
    # 检查字段
    inspector = inspect(JudgmentHistory)
    columns = {col.key for col in inspector.columns}
    
    required_columns = {
        'id', 'judgmentId', 'sampleId', 'previousResult', 'newResult',
        'changeReason', 'changedBy', 'changedAt'
    }
    assert required_columns.issubset(columns), f"缺少字段: {required_columns - columns}"
    print(f"✓ 所有必需字段存在: {required_columns}")
    
    # 检查关系
    assert hasattr(JudgmentHistory, 'judgment'), "缺少 judgment 关系"
    print("✓ 关系映射正确")
    
    print("✓ JudgmentHistory 模型验证通过")


def verify_sample_relationships():
    """验证 Sample 模型的审核和判定关系"""
    print("\n=== 验证 Sample 模型关系 ===")
    
    # 检查关系
    assert hasattr(Sample, 'audit_tasks'), "Sample 缺少 audit_tasks 关系"
    assert hasattr(Sample, 'quality_judgment'), "Sample 缺少 quality_judgment 关系"
    print("✓ Sample 模型包含审核和判定关系")
    
    print("✓ Sample 关系验证通过")


def main():
    """运行所有验证"""
    print("=" * 60)
    print("开始验证审核和判定模型与 Prisma schema 的兼容性")
    print("=" * 60)
    
    try:
        verify_audit_task_model()
        verify_audit_comment_template_model()
        verify_audit_workflow_config_model()
        verify_audit_history_model()
        verify_quality_judgment_model()
        verify_judgment_rule_model()
        verify_judgment_history_model()
        verify_sample_relationships()
        
        print("\n" + "=" * 60)
        print("✓ 所有审核和判定模型验证通过！")
        print("✓ 模型与 Prisma schema 完全兼容")
        print("=" * 60)
        return 0
        
    except AssertionError as e:
        print(f"\n✗ 验证失败: {e}")
        return 1
    except Exception as e:
        print(f"\n✗ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
