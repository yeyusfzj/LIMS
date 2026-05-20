"""
数据验证器工具

提供额外的数据验证功能，用于 Pydantic 模型和业务逻辑。
"""
import re
from typing import Any, Optional
from datetime import datetime


def validate_barcode_format(barcode: str) -> bool:
    """
    验证条码格式
    
    格式: SP{YYYYMMDD}{6位序列号}
    例如: SP202603081234567
    
    Args:
        barcode: 条码字符串
        
    Returns:
        bool: 格式是否有效
    """
    pattern = r'^SP\d{8}\d{6}$'
    return bool(re.match(pattern, barcode))


def validate_sample_number_format(sample_number: str) -> bool:
    """
    验证样品编号格式
    
    格式: {YYYY}{6位序列号}
    例如: 2026123456
    
    Args:
        sample_number: 样品编号字符串
        
    Returns:
        bool: 格式是否有效
    """
    pattern = r'^\d{4}\d{6}$'
    return bool(re.match(pattern, sample_number))


def validate_date_range(start_date: Optional[datetime], end_date: Optional[datetime]) -> bool:
    """
    验证日期范围
    
    Args:
        start_date: 开始日期
        end_date: 结束日期
        
    Returns:
        bool: 日期范围是否有效
    """
    if start_date is None or end_date is None:
        return True
    return start_date <= end_date


def sanitize_string(value: Any) -> Optional[str]:
    """
    清洗字符串输入
    
    - 去除首尾空格
    - 空字符串转换为 None
    - 非字符串类型返回原值
    
    Args:
        value: 输入值
        
    Returns:
        清洗后的字符串或 None
    """
    if not isinstance(value, str):
        return value
    
    cleaned = value.strip()
    return cleaned if cleaned else None


def validate_quantity(quantity: float, unit: str) -> bool:
    """
    验证数量和单位的有效性
    
    Args:
        quantity: 数量
        unit: 单位
        
    Returns:
        bool: 是否有效
    """
    if quantity <= 0:
        return False
    
    if not unit or not unit.strip():
        return False
    
    return True


def validate_phone_number(phone: Optional[str]) -> bool:
    """
    验证电话号码格式（中国）
    
    支持格式:
    - 手机号: 11位数字
    - 固定电话: 区号-号码 或 区号号码
    
    Args:
        phone: 电话号码
        
    Returns:
        bool: 格式是否有效
    """
    if not phone:
        return True  # 可选字段
    
    # 手机号: 1开头的11位数字
    mobile_pattern = r'^1[3-9]\d{9}$'
    if re.match(mobile_pattern, phone):
        return True
    
    # 固定电话: 区号-号码
    landline_pattern = r'^0\d{2,3}-?\d{7,8}$'
    if re.match(landline_pattern, phone):
        return True
    
    return False


def validate_email(email: Optional[str]) -> bool:
    """
    验证电子邮件格式
    
    Args:
        email: 电子邮件地址
        
    Returns:
        bool: 格式是否有效
    """
    if not email:
        return True  # 可选字段
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_status_transition(current_status: str, new_status: str) -> bool:
    """
    验证样品状态转换是否合法
    
    状态转换规则:
    - REGISTERED -> IN_TESTING
    - IN_TESTING -> TESTING_COMPLETE
    - TESTING_COMPLETE -> IN_AUDIT
    - IN_AUDIT -> AUDIT_COMPLETE
    - AUDIT_COMPLETE -> RELEASED
    - 任何状态 -> ARCHIVED
    
    Args:
        current_status: 当前状态
        new_status: 新状态
        
    Returns:
        bool: 转换是否合法
    """
    # 允许归档任何状态的样品
    if new_status == "ARCHIVED":
        return True
    
    # 定义合法的状态转换
    valid_transitions = {
        "REGISTERED": ["IN_TESTING"],
        "IN_TESTING": ["TESTING_COMPLETE"],
        "TESTING_COMPLETE": ["IN_AUDIT"],
        "IN_AUDIT": ["AUDIT_COMPLETE"],
        "AUDIT_COMPLETE": ["RELEASED"],
        "RELEASED": [],  # 已放行的样品不能再转换状态（除了归档）
        "ARCHIVED": [],  # 已归档的样品不能再转换状态
    }
    
    allowed_statuses = valid_transitions.get(current_status, [])
    return new_status in allowed_statuses


def validate_priority(priority: str) -> bool:
    """
    验证优先级值
    
    Args:
        priority: 优先级
        
    Returns:
        bool: 是否有效
    """
    valid_priorities = ["LOW", "NORMAL", "HIGH", "URGENT"]
    return priority in valid_priorities


def clean_dict_values(data: dict) -> dict:
    """
    清洗字典中的字符串值
    
    Args:
        data: 输入字典
        
    Returns:
        清洗后的字典
    """
    cleaned = {}
    for key, value in data.items():
        if isinstance(value, str):
            cleaned[key] = sanitize_string(value)
        else:
            cleaned[key] = value
    return cleaned
