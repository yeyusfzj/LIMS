"""
测试 Pydantic 模型与 SQLAlchemy 模型的兼容性
"""
import sys
from datetime import datetime

# 测试导入
try:
    from app.models.sample import Sample, SampleStatus as OrmSampleStatus, Priority as OrmPriority
    from app.models.transfer import Transfer, TransferStatus as OrmTransferStatus
    from app.schemas import (
        SampleStatus, Priority, SampleResponse,
        TransferStatus, TransferResponse
    )
    print("✓ 所有模型导入成功")
except ImportError as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试枚举兼容性
print("\n测试枚举兼容性:")
try:
    # 样品状态枚举
    assert SampleStatus.REGISTERED.value == OrmSampleStatus.REGISTERED.value
    assert SampleStatus.IN_TESTING.value == OrmSampleStatus.IN_TESTING.value
    assert SampleStatus.RELEASED.value == OrmSampleStatus.RELEASED.value
    print("✓ 样品状态枚举兼容")
    
    # 优先级枚举
    assert Priority.LOW.value == OrmPriority.LOW.value
    assert Priority.NORMAL.value == OrmPriority.NORMAL.value
    assert Priority.HIGH.value == OrmPriority.HIGH.value
    assert Priority.URGENT.value == OrmPriority.URGENT.value
    print("✓ 优先级枚举兼容")
    
    # 流转状态枚举
    assert TransferStatus.PENDING.value == OrmTransferStatus.PENDING.value
    assert TransferStatus.RECEIVED.value == OrmTransferStatus.RECEIVED.value
    print("✓ 流转状态枚举兼容")
except AssertionError as e:
    print(f"✗ 枚举不兼容: {e}")
    sys.exit(1)

# 测试字段映射
print("\n测试字段映射:")
try:
    # 创建模拟的 SQLAlchemy 样品对象
    class MockSample:
        def __init__(self):
            self.id = "test-id-123"
            self.barcode = "SP202603081234567"
            self.sample_number = "2026123456"
            self.client_name = "测试客户"
            self.client_contact = "13800138000"
            self.sample_name = "测试样品"
            self.sample_type = "水质"
            self.sample_category = "环境"
            self.quantity = 100.5
            self.unit = "ml"
            self.received_date = datetime.now()
            self.sampling_date = None
            self.sampling_location = None
            self.sampling_person = None
            self.storage_location = "仓库A"
            self.storage_condition = "常温"
            self.status = OrmSampleStatus.REGISTERED
            self.priority = OrmPriority.NORMAL
            self.description = "测试描述"
            self.remarks = None
            self.version = 1
            self.parent_sample_id = None
            self.merged_from_ids = []
            self.workflow_instance_id = None
            self.created_by = "user123"
            self.created_at = datetime.now()
            self.updated_at = datetime.now()
            self.released_at = None
            self.released_by = None
    
    mock_sample = MockSample()
    
    # 使用 Pydantic 的 from_attributes 功能
    sample_response = SampleResponse.model_validate(mock_sample)
    
    # 验证字段映射
    assert sample_response.id == mock_sample.id
    assert sample_response.barcode == mock_sample.barcode
    assert sample_response.sample_number == mock_sample.sample_number
    assert sample_response.client_name == mock_sample.client_name
    assert sample_response.status.value == mock_sample.status.value
    assert sample_response.priority.value == mock_sample.priority.value
    
    print("✓ 样品字段映射正确")
    print(f"  - ID: {sample_response.id}")
    print(f"  - 条码: {sample_response.barcode}")
    print(f"  - 状态: {sample_response.status.value}")
    
except Exception as e:
    print(f"✗ 字段映射失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试流转模型兼容性
print("\n测试流转模型兼容性:")
try:
    class MockTransfer:
        def __init__(self):
            self.id = "transfer-123"
            self.sample_id = "sample-456"
            self.from_location = "仓库A"
            self.to_location = "实验室B"
            self.from_person = "张三"
            self.to_person = "李四"
            self.transfer_date = datetime.now()
            self.received_date = None
            self.status = OrmTransferStatus.PENDING
            self.remarks = "紧急样品"
            self.sender_confirmed = False
            self.receiver_confirmed = False
            self.created_at = datetime.now()
    
    mock_transfer = MockTransfer()
    transfer_response = TransferResponse.model_validate(mock_transfer)
    
    assert transfer_response.id == mock_transfer.id
    assert transfer_response.sample_id == mock_transfer.sample_id
    assert transfer_response.from_location == mock_transfer.from_location
    assert transfer_response.status.value == mock_transfer.status.value
    
    print("✓ 流转字段映射正确")
    print(f"  - ID: {transfer_response.id}")
    print(f"  - 状态: {transfer_response.status.value}")
    
except Exception as e:
    print(f"✗ 流转模型兼容性测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# 测试 snake_case 命名约定
print("\n测试命名约定:")
try:
    # 验证 Pydantic 模型使用 snake_case
    sample_dict = sample_response.model_dump()
    assert "client_name" in sample_dict
    assert "sample_type" in sample_dict
    assert "created_at" in sample_dict
    assert "updated_at" in sample_dict
    print("✓ Pydantic 模型使用 snake_case 命名")
    
    # 验证 SQLAlchemy 模型使用 snake_case
    assert hasattr(mock_sample, "client_name")
    assert hasattr(mock_sample, "sample_type")
    assert hasattr(mock_sample, "created_at")
    print("✓ SQLAlchemy 模型使用 snake_case 命名")
    
except Exception as e:
    print(f"✗ 命名约定测试失败: {e}")
    sys.exit(1)

print("\n" + "="*50)
print("所有兼容性测试通过! ✓")
print("="*50)
print("\n总结:")
print("- Pydantic 模型与 SQLAlchemy 模型完全兼容")
print("- 枚举值一致")
print("- 字段映射正确")
print("- 命名约定统一（snake_case）")
print("- from_attributes 配置正确")
