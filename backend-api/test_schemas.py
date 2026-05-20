"""
测试 Pydantic 模型的基本功能
"""
import sys
from datetime import datetime
from pydantic import ValidationError

# 测试导入
try:
    from app.schemas import (
        SampleStatus, Priority,
        SampleCreate, SampleUpdate, SampleResponse,
        TransferStatus, TransferCreate, TransferResponse,
        APIResponse, ErrorDetail, HealthResponse
    )
    print("✓ 所有模型导入成功")
except ImportError as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试样品创建模型
print("\n测试 SampleCreate 模型:")
try:
    sample_data = {
        "client_name": "  测试客户  ",  # 测试字符串清洗
        "client_contact": "13800138000",
        "sample_name": "测试样品",
        "sample_type": "水质",
        "sample_category": "环境",
        "quantity": 100.5,
        "unit": "ml",
        "received_date": datetime.now(),
        "priority": "NORMAL"
    }
    sample = SampleCreate(**sample_data)
    print(f"✓ 创建成功: client_name='{sample.client_name}' (已清洗空格)")
    assert sample.client_name == "测试客户", "字符串清洗失败"
    print("✓ 字符串清洗验证通过")
except ValidationError as e:
    print(f"✗ 验证失败: {e}")
    sys.exit(1)

# 测试必填字段验证
print("\n测试必填字段验证:")
try:
    invalid_sample = SampleCreate(
        client_name="",  # 空字符串应该失败
        sample_name="测试",
        sample_type="水质",
        sample_category="环境",
        quantity=100,
        unit="ml",
        received_date=datetime.now()
    )
    print("✗ 应该抛出验证错误但没有")
    sys.exit(1)
except ValidationError as e:
    print("✓ 正确拒绝空字符串")

# 测试数量验证
print("\n测试数量验证:")
try:
    invalid_quantity = SampleCreate(
        client_name="测试客户",
        sample_name="测试样品",
        sample_type="水质",
        sample_category="环境",
        quantity=-10,  # 负数应该失败
        unit="ml",
        received_date=datetime.now()
    )
    print("✗ 应该拒绝负数数量")
    sys.exit(1)
except ValidationError as e:
    print("✓ 正确拒绝负数数量")

# 测试样品更新模型（所有字段可选）
print("\n测试 SampleUpdate 模型:")
try:
    update_data = {
        "client_name": "更新后的客户",
        "quantity": 200.0
    }
    update = SampleUpdate(**update_data)
    print(f"✓ 部分更新成功: {update.model_dump(exclude_none=True)}")
except ValidationError as e:
    print(f"✗ 验证失败: {e}")
    sys.exit(1)

# 测试流转创建模型
print("\n测试 TransferCreate 模型:")
try:
    transfer_data = {
        "from_location": "仓库A",
        "to_location": "实验室B",
        "from_person": "张三",
        "to_person": "李四",
        "remarks": "  紧急样品  "  # 测试字符串清洗
    }
    transfer = TransferCreate(**transfer_data)
    print(f"✓ 创建成功: remarks='{transfer.remarks}' (已清洗空格)")
except ValidationError as e:
    print(f"✗ 验证失败: {e}")
    sys.exit(1)

# 测试位置相同验证
print("\n测试流转位置验证:")
try:
    invalid_transfer = TransferCreate(
        from_location="仓库A",
        to_location="仓库A",  # 相同位置应该失败
        from_person="张三",
        to_person="李四"
    )
    print("✗ 应该拒绝相同的起始和目标位置")
    sys.exit(1)
except ValidationError as e:
    print("✓ 正确拒绝相同位置")

# 测试枚举验证
print("\n测试枚举验证:")
try:
    # 有效的枚举值
    status = SampleStatus.REGISTERED
    print(f"✓ 样品状态枚举: {status.value}")
    
    priority = Priority.HIGH
    print(f"✓ 优先级枚举: {priority.value}")
    
    transfer_status = TransferStatus.PENDING
    print(f"✓ 流转状态枚举: {transfer_status.value}")
except Exception as e:
    print(f"✗ 枚举测试失败: {e}")
    sys.exit(1)

# 测试响应模型
print("\n测试 APIResponse 模型:")
try:
    success_response = APIResponse(
        message="操作成功",
        data={"id": "123", "name": "测试"}
    )
    print(f"✓ 成功响应: {success_response.model_dump()}")
    
    error_response = APIResponse(
        message="操作失败",
        error=ErrorDetail(
            code="VALIDATION_ERROR",
            message="验证失败",
            details={"field": "client_name"}
        )
    )
    print(f"✓ 错误响应: {error_response.model_dump()}")
except Exception as e:
    print(f"✗ 响应模型测试失败: {e}")
    sys.exit(1)

# 测试健康检查响应
print("\n测试 HealthResponse 模型:")
try:
    health = HealthResponse(
        status="healthy",
        database="connected",
        timestamp=datetime.now(),
        version="0.1.0"
    )
    print(f"✓ 健康检查响应: {health.model_dump()}")
except Exception as e:
    print(f"✗ 健康检查模型测试失败: {e}")
    sys.exit(1)

print("\n" + "="*50)
print("所有测试通过! ✓")
print("="*50)
