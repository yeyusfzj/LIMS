"""
离线安全性验证脚本

在不需要运行服务的情况下验证安全实现的代码层面检查。

使用方法:
    python verify_security_offline.py
"""

import sys
import os
from datetime import datetime
from typing import Dict, List, Any

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class OfflineSecurityVerifier:
    """离线安全性验证器"""
    
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
    
    def add_result(self, category: str, test_name: str, passed: bool, message: str = ""):
        """添加测试结果"""
        self.results.append({
            "category": category,
            "test_name": test_name,
            "passed": passed,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
    
    def print_header(self, title: str):
        """打印标题"""
        print("\n" + "=" * 80)
        print(f"  {title}")
        print("=" * 80)
    
    def print_test(self, test_name: str, passed: bool, message: str = ""):
        """打印测试结果"""
        status = "✓ 通过" if passed else "✗ 失败"
        color = "\033[92m" if passed else "\033[91m"
        reset = "\033[0m"
        
        print(f"{color}{status}{reset} - {test_name}")
        if message:
            print(f"       {message}")
    
    def verify_jwt_implementation(self):
        """验证 JWT 实现"""
        self.print_header("1. JWT 认证实现验证")
        
        # 检查 security.py 文件
        try:
            from app.core.security import SecurityService, get_password_hash, verify_password
            
            self.add_result("JWT认证", "SecurityService 类存在", True)
            self.print_test("SecurityService 类存在", True)
            
            # 检查方法存在
            security_service = SecurityService()
            has_create_access = hasattr(security_service, 'create_access_token')
            has_create_refresh = hasattr(security_service, 'create_refresh_token')
            has_verify = hasattr(security_service, 'verify_token')
            
            self.add_result("JWT认证", "JWT 方法完整性", has_create_access and has_create_refresh and has_verify)
            self.print_test("JWT 方法完整性", has_create_access and has_create_refresh and has_verify)
            
        except Exception as e:
            self.add_result("JWT认证", "JWT 实现", False, str(e))
            self.print_test("JWT 实现", False, str(e))
        
        # 检查认证中间件
        try:
            from app.middleware.auth import get_current_user
            
            self.add_result("JWT认证", "认证中间件存在", True)
            self.print_test("认证中间件存在", True)
        except Exception as e:
            self.add_result("JWT认证", "认证中间件存在", False, str(e))
            self.print_test("认证中间件存在", False, str(e))
        
        # 检查认证路由
        try:
            from app.api.v1 import auth
            
            self.add_result("JWT认证", "认证路由存在", True)
            self.print_test("认证路由存在", True)
        except Exception as e:
            self.add_result("JWT认证", "认证路由存在", False, str(e))
            self.print_test("认证路由存在", False, str(e))
    
    def verify_rbac_implementation(self):
        """验证 RBAC 实现"""
        self.print_header("2. RBAC 权限控制实现验证")
        
        # 检查权限检查器
        try:
            from app.core.permissions import PermissionChecker
            
            self.add_result("RBAC权限", "PermissionChecker 类存在", True)
            self.print_test("PermissionChecker 类存在", True)
        except Exception as e:
            self.add_result("RBAC权限", "PermissionChecker 类存在", False, str(e))
            self.print_test("PermissionChecker 类存在", False, str(e))
        
        # 检查权限服务
        try:
            from app.services.permission_service import PermissionService
            
            self.add_result("RBAC权限", "PermissionService 存在", True)
            self.print_test("PermissionService 存在", True)
        except Exception as e:
            self.add_result("RBAC权限", "PermissionService 存在", False, str(e))
            self.print_test("PermissionService 存在", False, str(e))
        
        # 检查角色服务
        try:
            from app.services.role_service import RoleService
            
            self.add_result("RBAC权限", "RoleService 存在", True)
            self.print_test("RoleService 存在", True)
        except Exception as e:
            self.add_result("RBAC权限", "RoleService 存在", False, str(e))
            self.print_test("RoleService 存在", False, str(e))
        
        # 检查用户服务
        try:
            from app.services.user_service import UserService
            
            self.add_result("RBAC权限", "UserService 存在", True)
            self.print_test("UserService 存在", True)
        except Exception as e:
            self.add_result("RBAC权限", "UserService 存在", False, str(e))
            self.print_test("UserService 存在", False, str(e))
    
    def verify_encryption_implementation(self):
        """验证加密实现"""
        self.print_header("3. 敏感数据加密实现验证")
        
        # 检查加密模块
        try:
            from app.core.encryption import encrypt_data, decrypt_data
            
            self.add_result("数据加密", "加密模块存在", True)
            self.print_test("加密模块存在", True)
            
            # 测试加密解密
            test_data = "测试数据 123"
            encrypted = encrypt_data(test_data)
            decrypted = decrypt_data(encrypted)
            
            passed = decrypted == test_data and encrypted != test_data
            self.add_result("数据加密", "加密解密功能", passed)
            self.print_test("加密解密功能正常", passed)
            
        except Exception as e:
            self.add_result("数据加密", "加密模块", False, str(e))
            self.print_test("加密模块", False, str(e))
        
        # 检查密码哈希
        try:
            from app.core.security import get_password_hash, verify_password
            
            test_password = "test_password_123"
            hashed = get_password_hash(test_password)
            
            passed = (hashed != test_password and 
                     verify_password(test_password, hashed) and
                     not verify_password("wrong_password", hashed))
            
            self.add_result("数据加密", "密码哈希功能", passed)
            self.print_test("密码哈希功能正常", passed)
            
        except Exception as e:
            self.add_result("数据加密", "密码哈希功能", False, str(e))
            self.print_test("密码哈希功能", False, str(e))
    
    def verify_rate_limit_implementation(self):
        """验证限流实现"""
        self.print_header("4. 限流保护实现验证")
        
        # 检查限流中间件
        try:
            from app.middleware.rate_limit import limiter
            
            self.add_result("限流保护", "限流中间件存在", True)
            self.print_test("限流中间件存在", True)
        except Exception as e:
            self.add_result("限流保护", "限流中间件存在", False, str(e))
            self.print_test("限流中间件存在", False, str(e))
        
        # 检查限流配置
        try:
            from app.config import settings
            
            has_redis = hasattr(settings, 'REDIS_URL')
            self.add_result("限流保护", "Redis 配置存在", has_redis)
            self.print_test("Redis 配置存在", has_redis)
        except Exception as e:
            self.add_result("限流保护", "Redis 配置", False, str(e))
            self.print_test("Redis 配置", False, str(e))
    
    def verify_audit_log_implementation(self):
        """验证审计日志实现"""
        self.print_header("5. 审计日志记录实现验证")
        
        # 检查审计日志服务
        try:
            from app.services.audit_log_service import AuditLogService
            
            self.add_result("审计日志", "AuditLogService 存在", True)
            self.print_test("AuditLogService 存在", True)
        except Exception as e:
            self.add_result("审计日志", "AuditLogService 存在", False, str(e))
            self.print_test("AuditLogService 存在", False, str(e))
        
        # 检查审计日志中间件
        try:
            from app.middleware.audit_log_middleware import audit_log_middleware
            
            self.add_result("审计日志", "审计日志中间件存在", True)
            self.print_test("审计日志中间件存在", True)
        except Exception as e:
            self.add_result("审计日志", "审计日志中间件存在", False, str(e))
            self.print_test("审计日志中间件存在", False, str(e))
        
        # 检查审计日志模型
        try:
            from app.models.audit_log import AuditLog
            
            self.add_result("审计日志", "AuditLog 模型存在", True)
            self.print_test("AuditLog 模型存在", True)
        except Exception as e:
            self.add_result("审计日志", "AuditLog 模型存在", False, str(e))
            self.print_test("AuditLog 模型存在", False, str(e))
        
        # 检查审计日志路由
        try:
            from app.routers.audit_logs import router
            
            self.add_result("审计日志", "审计日志路由存在", True)
            self.print_test("审计日志路由存在", True)
        except Exception as e:
            self.add_result("审计日志", "审计日志路由存在", False, str(e))
            self.print_test("审计日志路由存在", False, str(e))
    
    def verify_input_validation_implementation(self):
        """验证输入验证实现"""
        self.print_header("6. 输入参数验证实现验证")
        
        # 检查输入清理器
        try:
            from app.utils.input_sanitizer import sanitize_input
            
            self.add_result("输入验证", "输入清理器存在", True)
            self.print_test("输入清理器存在", True)
            
            # 测试 XSS 清理
            xss_input = "<script>alert('XSS')</script>"
            sanitized = sanitize_input(xss_input)
            
            passed = "<script>" not in sanitized
            self.add_result("输入验证", "XSS 清理功能", passed)
            self.print_test("XSS 清理功能正常", passed)
            
        except Exception as e:
            self.add_result("输入验证", "输入清理器", False, str(e))
            self.print_test("输入清理器", False, str(e))
        
        # 检查密码验证器
        try:
            from app.utils.password_validator import validate_password_strength
            
            self.add_result("输入验证", "密码验证器存在", True)
            self.print_test("密码验证器存在", True)
            
            # 测试密码强度验证
            weak_password = "123"
            strong_password = "Test123!@#"
            
            weak_result = validate_password_strength(weak_password)
            strong_result = validate_password_strength(strong_password)
            
            passed = not weak_result["valid"] and strong_result["valid"]
            self.add_result("输入验证", "密码强度验证", passed)
            self.print_test("密码强度验证功能正常", passed)
            
        except Exception as e:
            self.add_result("输入验证", "密码验证器", False, str(e))
            self.print_test("密码验证器", False, str(e))
        
        # 检查 Pydantic 模型验证
        try:
            from app.schemas.user import UserCreate
            
            self.add_result("输入验证", "Pydantic 模型验证", True)
            self.print_test("Pydantic 模型验证存在", True)
        except Exception as e:
            self.add_result("输入验证", "Pydantic 模型验证", False, str(e))
            self.print_test("Pydantic 模型验证", False, str(e))
    
    def verify_security_configuration(self):
        """验证安全配置"""
        self.print_header("7. 安全配置验证")
        
        # 检查配置文件
        try:
            from app.config import settings
            
            # 检查 JWT 配置
            has_jwt_secret = hasattr(settings, 'JWT_SECRET_KEY')
            has_jwt_algorithm = hasattr(settings, 'JWT_ALGORITHM')
            
            self.add_result("安全配置", "JWT 配置", has_jwt_secret and has_jwt_algorithm)
            self.print_test("JWT 配置完整", has_jwt_secret and has_jwt_algorithm)
            
            # 检查加密配置
            has_encryption_key = hasattr(settings, 'ENCRYPTION_KEY')
            
            self.add_result("安全配置", "加密配置", has_encryption_key)
            self.print_test("加密配置存在", has_encryption_key)
            
            # 检查 CORS 配置
            has_cors_origins = hasattr(settings, 'CORS_ORIGINS')
            
            self.add_result("安全配置", "CORS 配置", has_cors_origins)
            self.print_test("CORS 配置存在", has_cors_origins)
            
        except Exception as e:
            self.add_result("安全配置", "配置文件", False, str(e))
            self.print_test("配置文件", False, str(e))
        
        # 检查 CORS 中间件
        try:
            from app.middleware.cors import setup_cors
            
            self.add_result("安全配置", "CORS 中间件", True)
            self.print_test("CORS 中间件存在", True)
        except Exception as e:
            self.add_result("安全配置", "CORS 中间件", False, str(e))
            self.print_test("CORS 中间件", False, str(e))
        
        # 检查错误处理中间件
        try:
            from app.middleware.error_handler import error_handler_middleware
            
            self.add_result("安全配置", "错误处理中间件", True)
            self.print_test("错误处理中间件存在", True)
        except Exception as e:
            self.add_result("安全配置", "错误处理中间件", False, str(e))
            self.print_test("错误处理中间件", False, str(e))
    
    def print_summary(self):
        """打印测试摘要"""
        self.print_header("安全性验证摘要")
        
        # 按类别统计
        categories = {}
        for result in self.results:
            category = result["category"]
            if category not in categories:
                categories[category] = {"total": 0, "passed": 0}
            
            categories[category]["total"] += 1
            if result["passed"]:
                categories[category]["passed"] += 1
        
        # 打印各类别统计
        print("\n各类别测试结果:")
        for category, stats in categories.items():
            passed = stats["passed"]
            total = stats["total"]
            percentage = (passed / total * 100) if total > 0 else 0
            
            status = "✓" if passed == total else "✗"
            color = "\033[92m" if passed == total else "\033[93m"
            reset = "\033[0m"
            
            print(f"{color}{status}{reset} {category}: {passed}/{total} ({percentage:.1f}%)")
        
        # 总体统计
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r["passed"])
        percentage = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"\n总体结果: {passed_tests}/{total_tests} ({percentage:.1f}%)")
        
        # 失败的测试
        failed_tests = [r for r in self.results if not r["passed"]]
        if failed_tests:
            print("\n失败的测试:")
            for test in failed_tests:
                print(f"  ✗ {test['category']} - {test['test_name']}")
                if test["message"]:
                    print(f"    原因: {test['message']}")
        
        # 最终结论
        print("\n" + "=" * 80)
        if passed_tests == total_tests:
            print("✓ 所有安全性实现验证通过！")
        else:
            print(f"✗ 有 {total_tests - passed_tests} 个测试失败，请检查安全实现。")
        print("=" * 80 + "\n")
        
        return passed_tests == total_tests
    
    def run_all_verifications(self):
        """运行所有验证"""
        print("\n" + "=" * 80)
        print("  FastAPI 后端安全性实现验证（离线模式）")
        print("  验证时间:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("=" * 80)
        
        # 1. JWT 认证实现
        self.verify_jwt_implementation()
        
        # 2. RBAC 权限控制实现
        self.verify_rbac_implementation()
        
        # 3. 敏感数据加密实现
        self.verify_encryption_implementation()
        
        # 4. 限流保护实现
        self.verify_rate_limit_implementation()
        
        # 5. 审计日志记录实现
        self.verify_audit_log_implementation()
        
        # 6. 输入参数验证实现
        self.verify_input_validation_implementation()
        
        # 7. 安全配置
        self.verify_security_configuration()
        
        # 打印摘要
        all_passed = self.print_summary()
        
        return all_passed


def main():
    """主函数"""
    verifier = OfflineSecurityVerifier()
    
    try:
        all_passed = verifier.run_all_verifications()
        sys.exit(0 if all_passed else 1)
    except KeyboardInterrupt:
        print("\n\n验证被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n验证过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
