"""
测试数据验证器工具
"""
import sys
from datetime import datetime, timedelta

try:
    from app.utils.validators import (
        validate_barcode_format,
        validate_sample_number_format,
        validate_date_range,
        sanitize_string,
        validate_quantity,
        validate_phone_number,
        validate_email,
        validate_status_transition,
        validate_priority,
        clean_dict_values
    )
    print("✓ 验证器导入成功")
except ImportError as e:
    print(f"✗ 导入失败: {e}")
    sys.exit(1)

# 测试条码格式验证
print("\n测试条码格式验证:")
valid_barcodes = [
    "SP20260308123456",  # SP + 8位日期 + 6位序列号
    "SP20261231000001",
    "SP20260101999999"
]
invalid_barcodes = [
    "SP2026030812345",  # 太短
    "SP202603081234567",  # 太长
    "SP2026030812345a",  # 包含字母
    "202603081234567",  # 缺少前缀
    "SP20260308-12345"  # 包含特殊字符
]

for barcode in valid_barcodes:
    assert validate_barcode_format(barcode), f"应该接受: {barcode}"
print(f"✓ 接受所有有效条码 ({len(valid_barcodes)} 个)")

for barcode in invalid_barcodes:
    assert not validate_barcode_format(barcode), f"应该拒绝: {barcode}"
print(f"✓ 拒绝所有无效条码 ({len(invalid_barcodes)} 个)")

# 测试样品编号格式验证
print("\n测试样品编号格式验证:")
valid_numbers = [
    "2026123456",
    "2026000001",
    "2026999999"
]
invalid_numbers = [
    "202612345",  # 太短
    "20261234567",  # 太长
    "2026a23456",  # 包含字母
    "123456"  # 太短
]

for number in valid_numbers:
    assert validate_sample_number_format(number), f"应该接受: {number}"
print(f"✓ 接受所有有效样品编号 ({len(valid_numbers)} 个)")

for number in invalid_numbers:
    assert not validate_sample_number_format(number), f"应该拒绝: {number}"
print(f"✓ 拒绝所有无效样品编号 ({len(invalid_numbers)} 个)")

# 测试日期范围验证
print("\n测试日期范围验证:")
now = datetime.now()
yesterday = now - timedelta(days=1)
tomorrow = now + timedelta(days=1)

assert validate_date_range(yesterday, now), "昨天到今天应该有效"
assert validate_date_range(yesterday, tomorrow), "昨天到明天应该有效"
assert not validate_date_range(tomorrow, yesterday), "明天到昨天应该无效"
assert validate_date_range(None, now), "None 开始日期应该有效"
assert validate_date_range(now, None), "None 结束日期应该有效"
print("✓ 日期范围验证正确")

# 测试字符串清洗
print("\n测试字符串清洗:")
test_cases = [
    ("  测试  ", "测试"),
    ("测试", "测试"),
    ("  ", None),
    ("", None),
    (None, None),
    (123, 123)  # 非字符串
]

for input_val, expected in test_cases:
    result = sanitize_string(input_val)
    assert result == expected, f"输入 {repr(input_val)} 应该返回 {repr(expected)}, 实际返回 {repr(result)}"
print(f"✓ 字符串清洗正确 ({len(test_cases)} 个测试用例)")

# 测试数量验证
print("\n测试数量验证:")
assert validate_quantity(100.5, "ml"), "正数和有效单位应该通过"
assert validate_quantity(0.1, "kg"), "小数应该通过"
assert not validate_quantity(0, "ml"), "零应该失败"
assert not validate_quantity(-10, "ml"), "负数应该失败"
assert not validate_quantity(100, ""), "空单位应该失败"
assert not validate_quantity(100, "  "), "空格单位应该失败"
print("✓ 数量验证正确")

# 测试电话号码验证
print("\n测试电话号码验证:")
valid_phones = [
    "13800138000",
    "15912345678",
    "010-12345678",
    "02012345678",
    None  # 可选字段
]
invalid_phones = [
    "12345678901",  # 不是1开头
    "138001380",  # 太短
    "abc12345678",  # 包含字母
]

for phone in valid_phones:
    assert validate_phone_number(phone), f"应该接受: {phone}"
print(f"✓ 接受所有有效电话 ({len(valid_phones)} 个)")

for phone in invalid_phones:
    assert not validate_phone_number(phone), f"应该拒绝: {phone}"
print(f"✓ 拒绝所有无效电话 ({len(invalid_phones)} 个)")

# 测试邮箱验证
print("\n测试邮箱验证:")
valid_emails = [
    "test@example.com",
    "user.name@domain.co.uk",
    "user+tag@example.com",
    None  # 可选字段
]
invalid_emails = [
    "invalid",
    "@example.com",
    "user@",
    "user@domain"
]

for email in valid_emails:
    assert validate_email(email), f"应该接受: {email}"
print(f"✓ 接受所有有效邮箱 ({len(valid_emails)} 个)")

for email in invalid_emails:
    assert not validate_email(email), f"应该拒绝: {email}"
print(f"✓ 拒绝所有无效邮箱 ({len(invalid_emails)} 个)")

# 测试状态转换验证
print("\n测试状态转换验证:")
valid_transitions = [
    ("REGISTERED", "IN_TESTING"),
    ("IN_TESTING", "TESTING_COMPLETE"),
    ("TESTING_COMPLETE", "IN_AUDIT"),
    ("IN_AUDIT", "AUDIT_COMPLETE"),
    ("AUDIT_COMPLETE", "RELEASED"),
    ("REGISTERED", "ARCHIVED"),  # 任何状态都可以归档
    ("RELEASED", "ARCHIVED"),
]
invalid_transitions = [
    ("REGISTERED", "RELEASED"),  # 跳过中间状态
    ("IN_TESTING", "IN_AUDIT"),  # 跳过状态
    ("RELEASED", "IN_TESTING"),  # 已放行不能回退
    ("ARCHIVED", "REGISTERED"),  # 已归档不能恢复
]

for current, new in valid_transitions:
    assert validate_status_transition(current, new), f"应该允许: {current} -> {new}"
print(f"✓ 接受所有有效状态转换 ({len(valid_transitions)} 个)")

for current, new in invalid_transitions:
    assert not validate_status_transition(current, new), f"应该拒绝: {current} -> {new}"
print(f"✓ 拒绝所有无效状态转换 ({len(invalid_transitions)} 个)")

# 测试优先级验证
print("\n测试优先级验证:")
valid_priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]
invalid_priorities = ["MEDIUM", "CRITICAL", "low", ""]

for priority in valid_priorities:
    assert validate_priority(priority), f"应该接受: {priority}"
print(f"✓ 接受所有有效优先级 ({len(valid_priorities)} 个)")

for priority in invalid_priorities:
    assert not validate_priority(priority), f"应该拒绝: {priority}"
print(f"✓ 拒绝所有无效优先级 ({len(invalid_priorities)} 个)")

# 测试字典值清洗
print("\n测试字典值清洗:")
dirty_dict = {
    "name": "  测试  ",
    "value": 123,
    "empty": "  ",
    "normal": "正常"
}
cleaned = clean_dict_values(dirty_dict)
assert cleaned["name"] == "测试", "应该清洗空格"
assert cleaned["value"] == 123, "数字应该保持不变"
assert cleaned["empty"] is None, "空字符串应该变为 None"
assert cleaned["normal"] == "正常", "正常字符串应该保持不变"
print("✓ 字典值清洗正确")

print("\n" + "="*50)
print("所有验证器测试通过! ✓")
print("="*50)
