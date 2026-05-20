"""
密码强度验证工具

提供密码强度验证功能,确保用户密码符合安全要求。

密码强度要求:
- 最小长度: 8 个字符
- 必须包含至少一个大写字母
- 必须包含至少一个小写字母
- 必须包含至少一个数字
- 必须包含至少一个特殊字符 (!@#$%^&*()_+-=[]{}|;:,.<>?)
- 不能包含常见弱密码
"""

import re
from typing import List, Tuple
from app.core.exceptions import ValidationException


class PasswordStrength:
    """密码强度等级"""
    WEAK = "weak"
    MEDIUM = "medium"
    STRONG = "strong"
    VERY_STRONG = "very_strong"


class PasswordValidator:
    """密码验证器"""
    
    # 密码要求配置
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_DIGIT = True
    REQUIRE_SPECIAL = True
    
    # 特殊字符集合
    SPECIAL_CHARS = "!@#$%^&*()_+-=[]{}|;:,.<>?"
    
    # 常见弱密码列表
    COMMON_PASSWORDS = {
        "password", "12345678", "123456789", "qwerty", "abc123",
        "password123", "admin123", "letmein", "welcome", "monkey",
        "1234567890", "password1", "qwerty123", "admin", "root",
        "test123", "user123", "pass123", "demo123", "temp123"
    }
    
    @staticmethod
    def validate_password(password: str, username: str = None) -> Tuple[bool, List[str]]:
        """
        验证密码强度
        
        Args:
            password: 要验证的密码
            username: 用户名(可选),用于检查密码是否包含用户名
            
        Returns:
            Tuple[bool, List[str]]: (是否有效, 错误消息列表)
        """
        errors = []
        
        # 检查密码长度
        if len(password) < PasswordValidator.MIN_LENGTH:
            errors.append(f"密码长度至少为 {PasswordValidator.MIN_LENGTH} 个字符")
        
        if len(password) > PasswordValidator.MAX_LENGTH:
            errors.append(f"密码长度不能超过 {PasswordValidator.MAX_LENGTH} 个字符")
        
        # 检查是否包含大写字母
        if PasswordValidator.REQUIRE_UPPERCASE and not re.search(r'[A-Z]', password):
            errors.append("密码必须包含至少一个大写字母")
        
        # 检查是否包含小写字母
        if PasswordValidator.REQUIRE_LOWERCASE and not re.search(r'[a-z]', password):
            errors.append("密码必须包含至少一个小写字母")
        
        # 检查是否包含数字
        if PasswordValidator.REQUIRE_DIGIT and not re.search(r'\d', password):
            errors.append("密码必须包含至少一个数字")
        
        # 检查是否包含特殊字符
        if PasswordValidator.REQUIRE_SPECIAL:
            special_pattern = f"[{re.escape(PasswordValidator.SPECIAL_CHARS)}]"
            if not re.search(special_pattern, password):
                errors.append(f"密码必须包含至少一个特殊字符 ({PasswordValidator.SPECIAL_CHARS})")
        
        # 检查是否为常见弱密码
        if password.lower() in PasswordValidator.COMMON_PASSWORDS:
            errors.append("密码过于简单,请使用更复杂的密码")
        
        # 检查是否包含用户名
        if username and username.lower() in password.lower():
            errors.append("密码不能包含用户名")
        
        # 检查是否为连续字符
        if PasswordValidator._has_sequential_chars(password):
            errors.append("密码不能包含连续的字符序列(如 abc, 123)")
        
        # 检查是否为重复字符
        if PasswordValidator._has_repeated_chars(password):
            errors.append("密码不能包含过多重复字符")
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    @staticmethod
    def _has_sequential_chars(password: str, min_length: int = 3) -> bool:
        """
        检查是否包含连续字符序列
        
        Args:
            password: 密码
            min_length: 最小连续长度
            
        Returns:
            bool: 是否包含连续字符
        """
        # 检查连续数字 (123, 234, 345, ...)
        for i in range(len(password) - min_length + 1):
            substr = password[i:i + min_length]
            if substr.isdigit():
                digits = [int(d) for d in substr]
                if all(digits[j] + 1 == digits[j + 1] for j in range(len(digits) - 1)):
                    return True
                if all(digits[j] - 1 == digits[j + 1] for j in range(len(digits) - 1)):
                    return True
        
        # 检查连续字母 (abc, bcd, xyz, ...)
        for i in range(len(password) - min_length + 1):
            substr = password[i:i + min_length].lower()
            if substr.isalpha():
                chars = [ord(c) for c in substr]
                if all(chars[j] + 1 == chars[j + 1] for j in range(len(chars) - 1)):
                    return True
                if all(chars[j] - 1 == chars[j + 1] for j in range(len(chars) - 1)):
                    return True
        
        return False
    
    @staticmethod
    def _has_repeated_chars(password: str, max_repeat: int = 3) -> bool:
        """
        检查是否包含过多重复字符
        
        Args:
            password: 密码
            max_repeat: 最大重复次数
            
        Returns:
            bool: 是否包含过多重复字符
        """
        for i in range(len(password) - max_repeat + 1):
            if len(set(password[i:i + max_repeat])) == 1:
                return True
        return False
    
    @staticmethod
    def calculate_strength(password: str) -> str:
        """
        计算密码强度
        
        Args:
            password: 密码
            
        Returns:
            str: 密码强度等级 (weak, medium, strong, very_strong)
        """
        score = 0
        
        # 长度评分
        if len(password) >= 8:
            score += 1
        if len(password) >= 12:
            score += 1
        if len(password) >= 16:
            score += 1
        
        # 字符类型评分
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(f"[{re.escape(PasswordValidator.SPECIAL_CHARS)}]", password):
            score += 1
        
        # 复杂度评分
        char_types = sum([
            bool(re.search(r'[a-z]', password)),
            bool(re.search(r'[A-Z]', password)),
            bool(re.search(r'\d', password)),
            bool(re.search(f"[{re.escape(PasswordValidator.SPECIAL_CHARS)}]", password))
        ])
        if char_types >= 3:
            score += 1
        if char_types == 4:
            score += 1
        
        # 根据评分返回强度等级
        if score <= 3:
            return PasswordStrength.WEAK
        elif score <= 5:
            return PasswordStrength.MEDIUM
        elif score <= 7:
            return PasswordStrength.STRONG
        else:
            return PasswordStrength.VERY_STRONG
    
    @staticmethod
    def validate_and_raise(password: str, username: str = None) -> None:
        """
        验证密码强度,如果不符合要求则抛出异常
        
        Args:
            password: 要验证的密码
            username: 用户名(可选)
            
        Raises:
            ValidationException: 密码不符合强度要求
        """
        is_valid, errors = PasswordValidator.validate_password(password, username)
        
        if not is_valid:
            raise ValidationException(
                message="密码强度不符合要求",
                error_code="WEAK_PASSWORD",
                details={"errors": errors}
            )
    
    @staticmethod
    def get_password_requirements() -> dict:
        """
        获取密码要求说明
        
        Returns:
            dict: 密码要求字典
        """
        return {
            "min_length": PasswordValidator.MIN_LENGTH,
            "max_length": PasswordValidator.MAX_LENGTH,
            "require_uppercase": PasswordValidator.REQUIRE_UPPERCASE,
            "require_lowercase": PasswordValidator.REQUIRE_LOWERCASE,
            "require_digit": PasswordValidator.REQUIRE_DIGIT,
            "require_special": PasswordValidator.REQUIRE_SPECIAL,
            "special_chars": PasswordValidator.SPECIAL_CHARS,
            "description": [
                f"密码长度: {PasswordValidator.MIN_LENGTH}-{PasswordValidator.MAX_LENGTH} 个字符",
                "必须包含大写字母",
                "必须包含小写字母",
                "必须包含数字",
                f"必须包含特殊字符 ({PasswordValidator.SPECIAL_CHARS})",
                "不能使用常见弱密码",
                "不能包含用户名",
                "不能包含连续字符序列",
                "不能包含过多重复字符"
            ]
        }


def validate_password_strength(password: str, username: str = None) -> None:
    """
    验证密码强度的便捷函数
    
    Args:
        password: 要验证的密码
        username: 用户名(可选)
        
    Raises:
        ValidationException: 密码不符合强度要求
    """
    PasswordValidator.validate_and_raise(password, username)


def get_password_strength(password: str) -> str:
    """
    获取密码强度等级的便捷函数
    
    Args:
        password: 密码
        
    Returns:
        str: 密码强度等级
    """
    return PasswordValidator.calculate_strength(password)
