"""
测试安全功能
"""
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_password_validator():
    """测试密码验证器"""
    print("=" * 60)
    print("测试密码验证器")
    print("=" * 60)
    
    try:
        from app.utils.password_validator import PasswordValidator, validate_password_strength
        
        # 测试密码要求
        requirements = PasswordValidator.get_password_requirements()
        print(f"\n✓ 密码验证器导入成功")
        print(f"  - 最小长度: {requirements['min_length']}")
        print(f"  - 最大长度: {requirements['max_length']}")
        print(f"  - 需要大写字母: {requirements['require_uppercase']}")
        print(f"  - 需要小写字母: {requirements['require_lowercase']}")
        print(f"  - 需要数字: {requirements['require_digit']}")
        print(f"  - 需要特殊字符: {requirements['require_special']}")
        
        # 测试弱密码
        print("\n测试弱密码:")
        weak_passwords = ["123456", "password", "abc123"]
        for pwd in weak_passwords:
            is_valid, errors = PasswordValidator.validate_password(pwd)
            print(f"  - '{pwd}': {'✗ 不合格' if not is_valid else '✓ 合格'}")
            if errors:
                print(f"    错误: {errors[0]}")
        
        # 测试强密码
        print("\n测试强密码:")
        strong_passwords = ["MyP@ssw0rd123", "Secure#Pass2024", "C0mpl3x!Pwd"]
        for pwd in strong_passwords:
            is_valid, errors = PasswordValidator.validate_password(pwd)
            strength = PasswordValidator.calculate_strength(pwd)
            print(f"  - '{pwd}': {'✓ 合格' if is_valid else '✗ 不合格'} (强度: {strength})")
        
        # 测试包含用户名的密码
        print("\n测试包含用户名的密码:")
        is_valid, errors = PasswordValidator.validate_password("admin123", "admin")
        print(f"  - 'admin123' (用户名: admin): {'✗ 不合格' if not is_valid else '✓ 合格'}")
        if errors:
            print(f"    错误: {errors[0]}")
        
        print("\n✓ 密码验证器测试通过")
        return True
        
    except Exception as e:
        print(f"\n✗ 密码验证器测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_input_sanitizer():
    """测试输入清洗器"""
    print("\n" + "=" * 60)
    print("测试输入清洗器")
    print("=" * 60)
    
    try:
        from app.utils.input_sanitizer import (
            InputSanitizer,
            sanitize_html,
            escape_html,
            validate_safe_input,
            sanitize_filename
        )
        
        print("\n✓ 输入清洗器导入成功")
        
        # 测试 HTML 清洗
        print("\n测试 HTML 清洗:")
        dirty_html = '<script>alert("XSS")</script><p>Hello</p>'
        clean_html = sanitize_html(dirty_html)
        print(f"  - 原始: {dirty_html}")
        print(f"  - 清洗后: {clean_html}")
        print(f"  - {'✓ script 标签已移除' if '<script>' not in clean_html else '✗ script 标签未移除'}")
        
        # 测试 HTML 转义
        print("\n测试 HTML 转义:")
        text_with_html = '<div>Test & "quotes"</div>'
        escaped = escape_html(text_with_html)
        print(f"  - 原始: {text_with_html}")
        print(f"  - 转义后: {escaped}")
        print(f"  - {'✓ HTML 字符已转义' if '&lt;' in escaped else '✗ HTML 字符未转义'}")
        
        # 测试 SQL 注入检测
        print("\n测试 SQL 注入检测:")
        sql_injection = "'; DROP TABLE users; --"
        is_safe = InputSanitizer.validate_no_sql_injection(sql_injection)
        print(f"  - 输入: {sql_injection}")
        print(f"  - {'✗ 检测到 SQL 注入' if not is_safe else '✓ 未检测到 SQL 注入'}")
        
        # 测试 XSS 检测
        print("\n测试 XSS 检测:")
        xss_attack = '<img src=x onerror=alert(1)>'
        is_safe = InputSanitizer.validate_no_xss(xss_attack)
        print(f"  - 输入: {xss_attack}")
        print(f"  - {'✗ 检测到 XSS 攻击' if not is_safe else '✓ 未检测到 XSS 攻击'}")
        
        # 测试文件名清洗
        print("\n测试文件名清洗:")
        dangerous_filename = "../../../etc/passwd"
        safe_filename = sanitize_filename(dangerous_filename)
        print(f"  - 原始: {dangerous_filename}")
        print(f"  - 清洗后: {safe_filename}")
        print(f"  - {'✓ 危险字符已移除' if '..' not in safe_filename else '✗ 危险字符未移除'}")
        
        print("\n✓ 输入清洗器测试通过")
        return True
        
    except Exception as e:
        print(f"\n✗ 输入清洗器测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_encryption():
    """测试加密功能"""
    print("\n" + "=" * 60)
    print("测试加密功能")
    print("=" * 60)
    
    try:
        from app.core.encryption import EncryptionUtils
        
        print("\n✓ 加密工具导入成功")
        
        # 测试加密和解密
        print("\n测试数据加密和解密:")
        original_data = "这是敏感数据"
        encrypted = EncryptionUtils.encrypt(original_data)
        decrypted = EncryptionUtils.decrypt(encrypted)
        
        print(f"  - 原始数据: {original_data}")
        print(f"  - 加密后: {encrypted[:50]}...")
        print(f"  - 解密后: {decrypted}")
        print(f"  - {'✓ 加密解密成功' if original_data == decrypted else '✗ 加密解密失败'}")
        
        # 测试敏感字段加密
        print("\n测试敏感字段加密:")
        sensitive_value = "123456789012345678"
        encrypted_field = EncryptionUtils.encrypt_sensitive_field(sensitive_value)
        decrypted_field = EncryptionUtils.decrypt_sensitive_field(encrypted_field)
        
        print(f"  - 原始值: {sensitive_value}")
        print(f"  - 加密后: {encrypted_field[:50]}...")
        print(f"  - 解密后: {decrypted_field}")
        print(f"  - {'✓ 敏感字段加密成功' if sensitive_value == decrypted_field else '✗ 敏感字段加密失败'}")
        
        print("\n✓ 加密功能测试通过")
        return True
        
    except Exception as e:
        print(f"\n✗ 加密功能测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("FastAPI 后端安全功能测试")
    print("=" * 60)
    
    results = []
    
    # 运行所有测试
    results.append(("密码验证器", test_password_validator()))
    results.append(("输入清洗器", test_input_sanitizer()))
    results.append(("加密功能", test_encryption()))
    
    # 输出测试结果
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)
    
    for name, passed in results:
        status = "✓ 通过" if passed else "✗ 失败"
        print(f"{name}: {status}")
    
    all_passed = all(result[1] for result in results)
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✓ 所有测试通过!")
    else:
        print("✗ 部分测试失败")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
