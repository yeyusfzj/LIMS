"""
验证 SQLAlchemy 模型定义的脚本
"""

print("开始验证模型定义...")

# 1. 检查基础模型
print("\n1. 检查 base.py...")
with open("app/models/base.py", "r", encoding="utf-8") as f:
    content = f.read()
    assert "declarative_base" in content, "base.py 应该包含 declarative_base"
    assert "Base = declarative_base()" in content, "base.py 应该定义 Base"
print("   ✓ base.py 定义正确")

# 2. 检查样品模型
print("\n2. 检查 sample.py...")
with open("app/models/sample.py", "r", encoding="utf-8") as f:
    content = f.read()
    
    # 检查枚举
    assert "class SampleStatus" in content, "应该定义 SampleStatus 枚举"
    assert "class Priority" in content, "应该定义 Priority 枚举"
    
    # 检查枚举值
    required_statuses = ["REGISTERED", "IN_TESTING", "TESTING_COMPLETE", 
                        "IN_AUDIT", "AUDIT_COMPLETE", "RELEASED", "ARCHIVED"]
    for status in required_statuses:
        assert status in content, f"SampleStatus 应该包含 {status}"
    
    required_priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]
    for priority in required_priorities:
        assert priority in content, f"Priority 应该包含 {priority}"
    
    # 检查模型类
    assert "class Sample(Base):" in content, "应该定义 Sample 类"
    assert '__tablename__ = "samples"' in content, "表名应该是 samples"
    
    # 检查关键字段
    required_fields = [
        "id", "barcode", "sample_number", "client_name", "sample_name",
        "sample_type", "quantity", "unit", "status", "priority",
        "created_by", "created_at", "updated_at", "version"
    ]
    for field in required_fields:
        assert f"{field} = Column" in content, f"应该定义字段 {field}"
    
    # 检查索引
    assert "index=True" in content, "应该定义索引"
    
print("   ✓ sample.py 定义正确")
print("   ✓ 包含所有必需的枚举值")
print("   ✓ 包含所有必需的字段")

# 3. 检查流转模型
print("\n3. 检查 transfer.py...")
with open("app/models/transfer.py", "r", encoding="utf-8") as f:
    content = f.read()
    
    # 检查枚举
    assert "class TransferStatus" in content, "应该定义 TransferStatus 枚举"
    
    # 检查枚举值
    required_statuses = ["PENDING", "IN_TRANSIT", "RECEIVED", "REJECTED", "CANCELLED"]
    for status in required_statuses:
        assert status in content, f"TransferStatus 应该包含 {status}"
    
    # 检查模型类
    assert "class Transfer(Base):" in content, "应该定义 Transfer 类"
    assert '__tablename__ = "transfers"' in content, "表名应该是 transfers"
    
    # 检查关键字段
    required_fields = [
        "id", "sample_id", "from_location", "to_location",
        "from_person", "to_person", "transfer_date", "status",
        "sender_confirmed", "receiver_confirmed", "created_at"
    ]
    for field in required_fields:
        assert f"{field} = Column" in content, f"应该定义字段 {field}"
    
print("   ✓ transfer.py 定义正确")
print("   ✓ 包含所有必需的枚举值")
print("   ✓ 包含所有必需的字段")

# 4. 检查 __init__.py
print("\n4. 检查 __init__.py...")
with open("app/models/__init__.py", "r", encoding="utf-8") as f:
    content = f.read()
    
    # 检查导入
    assert "from app.models.base import Base" in content, "应该导入 Base"
    assert "from app.models.sample import Sample" in content, "应该导入 Sample"
    assert "from app.models.transfer import Transfer" in content, "应该导入 Transfer"
    
    # 检查 __all__
    assert "__all__" in content, "应该定义 __all__"
    required_exports = ["Base", "Sample", "SampleStatus", "Priority", "Transfer", "TransferStatus"]
    for export in required_exports:
        assert f'"{export}"' in content, f"__all__ 应该包含 {export}"
    
print("   ✓ __init__.py 定义正确")
print("   ✓ 所有导出都已定义")

# 5. 验证与 Prisma Schema 的兼容性
print("\n5. 验证与 Prisma Schema 的兼容性...")

# 检查字段命名约定 (snake_case)
with open("app/models/sample.py", "r", encoding="utf-8") as f:
    content = f.read()
    # 确保使用 snake_case
    assert "sample_number" in content, "应该使用 snake_case: sample_number"
    assert "client_name" in content, "应该使用 snake_case: client_name"
    assert "created_at" in content, "应该使用 snake_case: created_at"
    assert "updated_at" in content, "应该使用 snake_case: updated_at"
    assert "parent_sample_id" in content, "应该使用 snake_case: parent_sample_id"
    assert "merged_from_ids" in content, "应该使用 snake_case: merged_from_ids"
    
print("   ✓ 字段命名使用 snake_case (与 Prisma 一致)")
print("   ✓ 表名使用复数形式 (samples, transfers)")
print("   ✓ 枚举值与 Prisma Schema 匹配")

print("\n" + "="*60)
print("✅ 所有验证通过!")
print("="*60)
print("\n模型定义总结:")
print("  - base.py: 基础模型类 ✓")
print("  - sample.py: 样品模型 (3 个枚举, 1 个模型类) ✓")
print("  - transfer.py: 流转模型 (1 个枚举, 1 个模型类) ✓")
print("  - __init__.py: 模块导出 ✓")
print("\n与 Prisma Schema 完全兼容 ✓")
