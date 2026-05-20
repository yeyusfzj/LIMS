"""
测试新创建的模型是否可以正确导入
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

try:
    from app.models import (
        AuditLog, 
        ArchivedAuditLog, 
        BackupRecord, 
        BackupStatus, 
        BackupType,
        TestMethod, 
        MethodStatus
    )
    
    print("✓ 所有模型导入成功")
    print(f"✓ AuditLog: {AuditLog.__tablename__}")
    print(f"✓ ArchivedAuditLog: {ArchivedAuditLog.__tablename__}")
    print(f"✓ BackupRecord: {BackupRecord.__tablename__}")
    print(f"✓ TestMethod: {TestMethod.__tablename__}")
    print(f"✓ BackupStatus 枚举值: {[s.value for s in BackupStatus]}")
    print(f"✓ BackupType 枚举值: {[t.value for t in BackupType]}")
    print(f"✓ MethodStatus 枚举值: {[s.value for s in MethodStatus]}")
    
    # 验证模型字段
    print("\n验证 AuditLog 模型字段:")
    audit_log_columns = [c.name for c in AuditLog.__table__.columns]
    print(f"  字段: {', '.join(audit_log_columns)}")
    
    print("\n验证 BackupRecord 模型字段:")
    backup_columns = [c.name for c in BackupRecord.__table__.columns]
    print(f"  字段: {', '.join(backup_columns)}")
    
    print("\n验证 TestMethod 模型字段:")
    method_columns = [c.name for c in TestMethod.__table__.columns]
    print(f"  字段: {', '.join(method_columns)}")
    
    print("\n✓ 所有模型验证通过！")
    
except Exception as e:
    print(f"✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
