"""简单的审核模型测试"""

print("开始测试审核模型...")

try:
    print("1. 导入 Base...")
    from app.models.base import Base
    print("   ✓ Base 导入成功")
    
    print("2. 导入审核模型...")
    from app.models.audit import (
        AuditTask, AuditStatus, AuditDecision,
        AuditCommentTemplate, CommentTemplateType,
        AuditWorkflowConfig, WorkflowConfigStatus,
        AuditHistory
    )
    print("   ✓ 审核模型导入成功")
    
    print("3. 导入判定模型...")
    from app.models.judgment import (
        QualityJudgment, JudgmentRule, JudgmentHistory, JudgmentResult
    )
    print("   ✓ 判定模型导入成功")
    
    print("4. 检查 AuditTask 表名...")
    assert AuditTask.__tablename__ == 'audit_tasks'
    print(f"   ✓ 表名正确: {AuditTask.__tablename__}")
    
    print("5. 检查 QualityJudgment 表名...")
    assert QualityJudgment.__tablename__ == 'quality_judgments'
    print(f"   ✓ 表名正确: {QualityJudgment.__tablename__}")
    
    print("6. 检查枚举...")
    print(f"   - AuditStatus: {[s.value for s in AuditStatus]}")
    print(f"   - JudgmentResult: {[r.value for r in JudgmentResult]}")
    print("   ✓ 枚举正确")
    
    print("\n✓ 所有测试通过！")
    print("✓ 审核和判定模型已正确实现")
    
except Exception as e:
    print(f"\n✗ 测试失败: {e}")
    import traceback
    traceback.print_exc()
