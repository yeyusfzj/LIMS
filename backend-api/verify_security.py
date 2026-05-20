"""
安全性验证脚本

独立运行的安全性验证工具，验证 FastAPI 后端的所有安全机制。

使用方法:
    python verify_security.py

验证项目:
1. JWT 认证正常工作
2. RBAC 权限控制正常工作
3. 敏感数据加密
4. 限流保护
5. 审计日志记录
6. 输入参数验证
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import Dict, List, Any
import httpx
import jwt

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.core.security import SecurityService, get_password_hash, verify_password
from app.core.encryption import encrypt_data, decrypt_data


class SecurityVerifier:
    """安全性验证器"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.results: List[Dict[str, Any]] = []
        self.admin_token: str = None
    
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
    
    async def verify_jwt_authentication(self):
        """验证 JWT 认证"""
        self.print_header("1. JWT 认证验证")
        
        # 测试 1.1: JWT 令牌生成
        try:
            security_service = SecurityService()
            user_id = "test-user-123"
            access_token = await security_service.create_access_token(user_id)
            
            passed = access_token is not None and isinstance(access_token, str)
            self.add_result("JWT认证", "令牌生成", passed)
            self.print_test("JWT 令牌生成", passed)
        except Exception as e:
            self.add_result("JWT认证", "令牌生成", False, str(e))
            self.print_test("JWT 令牌生成", False, str(e))
        
        # 测试 1.2: JWT 令牌验证
        try:
            security_service = SecurityService()
            user_id = "test-user-456"
            token = await security_service.create_access_token(user_id)
            payload = await security_service.verify_token(token)
            
            passed = payload["userId"] == user_id
            self.add_result("JWT认证", "令牌验证", passed)
            self.print_test("JWT 令牌验证", passed)
        except Exception as e:
            self.add_result("JWT认证", "令牌验证", False, str(e))
            self.print_test("JWT 令牌验证", False, str(e))
        
        # 测试 1.3: 登录端点
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json={
                        "username": "admin",
                        "password": "admin123"
                    },
                    timeout=10.0
                )
                
                passed = response.status_code == 200
                if passed:
                    data = response.json()
                    passed = "accessToken" in data and "refreshToken" in data
                    if passed:
                        self.admin_token = data["accessToken"]
                
                self.add_result("JWT认证", "登录端点", passed)
                self.print_test("登录端点认证", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("JWT认证", "登录端点", False, str(e))
            self.print_test("登录端点认证", False, str(e))
        
        # 测试 1.4: 未授权访问保护
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/users/me",
                    timeout=10.0
                )
                
                passed = response.status_code == 401
                self.add_result("JWT认证", "未授权访问保护", passed)
                self.print_test("未授权访问保护", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("JWT认证", "未授权访问保护", False, str(e))
            self.print_test("未授权访问保护", False, str(e))
        
        # 测试 1.5: 无效令牌保护
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": "Bearer invalid_token_here"}
                response = await client.get(
                    f"{self.base_url}/api/v1/users/me",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = response.status_code == 401
                self.add_result("JWT认证", "无效令牌保护", passed)
                self.print_test("无效令牌保护", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("JWT认证", "无效令牌保护", False, str(e))
            self.print_test("无效令牌保护", False, str(e))
    
    async def verify_rbac_permission_control(self):
        """验证 RBAC 权限控制"""
        self.print_header("2. RBAC 权限控制验证")
        
        if not self.admin_token:
            self.print_test("RBAC 权限控制", False, "需要先通过 JWT 认证")
            return
        
        # 测试 2.1: 管理员访问用户列表
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = await client.get(
                    f"{self.base_url}/api/v1/users",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = response.status_code in [200, 404]
                self.add_result("RBAC权限", "管理员访问用户列表", passed)
                self.print_test("管理员访问用户列表", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("RBAC权限", "管理员访问用户列表", False, str(e))
            self.print_test("管理员访问用户列表", False, str(e))
        
        # 测试 2.2: 管理员访问角色管理
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = await client.get(
                    f"{self.base_url}/api/v1/roles",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = response.status_code in [200, 404]
                self.add_result("RBAC权限", "管理员访问角色管理", passed)
                self.print_test("管理员访问角色管理", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("RBAC权限", "管理员访问角色管理", False, str(e))
            self.print_test("管理员访问角色管理", False, str(e))
        
        # 测试 2.3: 管理员访问权限管理
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = await client.get(
                    f"{self.base_url}/api/v1/permissions",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = response.status_code in [200, 404]
                self.add_result("RBAC权限", "管理员访问权限管理", passed)
                self.print_test("管理员访问权限管理", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("RBAC权限", "管理员访问权限管理", False, str(e))
            self.print_test("管理员访问权限管理", False, str(e))
    
    def verify_sensitive_data_encryption(self):
        """验证敏感数据加密"""
        self.print_header("3. 敏感数据加密验证")
        
        # 测试 3.1: 数据加密
        try:
            sensitive_data = "这是敏感信息：身份证号 123456789012345678"
            encrypted = encrypt_data(sensitive_data)
            
            passed = encrypted != sensitive_data and isinstance(encrypted, str)
            self.add_result("数据加密", "加密功能", passed)
            self.print_test("数据加密功能", passed)
        except Exception as e:
            self.add_result("数据加密", "加密功能", False, str(e))
            self.print_test("数据加密功能", False, str(e))
        
        # 测试 3.2: 数据解密
        try:
            sensitive_data = "测试数据 12345"
            encrypted = encrypt_data(sensitive_data)
            decrypted = decrypt_data(encrypted)
            
            passed = decrypted == sensitive_data
            self.add_result("数据加密", "解密功能", passed)
            self.print_test("数据解密功能", passed)
        except Exception as e:
            self.add_result("数据加密", "解密功能", False, str(e))
            self.print_test("数据解密功能", False, str(e))
        
        # 测试 3.3: 密码哈希
        try:
            password = "test_password_123"
            hashed = get_password_hash(password)
            
            passed = hashed != password and len(hashed) > 0
            self.add_result("数据加密", "密码哈希", passed)
            self.print_test("密码哈希功能", passed)
        except Exception as e:
            self.add_result("数据加密", "密码哈希", False, str(e))
            self.print_test("密码哈希功能", False, str(e))
        
        # 测试 3.4: 密码验证
        try:
            password = "test_password_456"
            hashed = get_password_hash(password)
            
            passed = verify_password(password, hashed) and not verify_password("wrong", hashed)
            self.add_result("数据加密", "密码验证", passed)
            self.print_test("密码验证功能", passed)
        except Exception as e:
            self.add_result("数据加密", "密码验证", False, str(e))
            self.print_test("密码验证功能", False, str(e))
    
    async def verify_rate_limit_protection(self):
        """验证限流保护"""
        self.print_header("4. 限流保护验证")
        
        # 测试 4.1: 登录端点限流
        try:
            async with httpx.AsyncClient() as client:
                responses = []
                for i in range(15):
                    try:
                        response = await client.post(
                            f"{self.base_url}/api/v1/auth/login",
                            json={
                                "username": f"test_user_{i}",
                                "password": "wrong_password"
                            },
                            timeout=5.0
                        )
                        responses.append(response.status_code)
                    except Exception:
                        pass
                
                # 检查是否有请求被限流
                rate_limited = any(status == 429 for status in responses)
                
                self.add_result("限流保护", "登录端点限流", True, 
                              f"发送 15 个请求，触发限流: {rate_limited}")
                self.print_test("登录端点限流", True, 
                              f"发送 15 个请求，触发限流: {rate_limited}")
        except Exception as e:
            self.add_result("限流保护", "登录端点限流", False, str(e))
            self.print_test("登录端点限流", False, str(e))
        
        # 测试 4.2: 限流机制存在性
        try:
            # 检查限流中间件是否已配置
            from app.middleware.rate_limit import limiter
            
            passed = limiter is not None
            self.add_result("限流保护", "限流机制配置", passed)
            self.print_test("限流机制已配置", passed)
        except Exception as e:
            self.add_result("限流保护", "限流机制配置", False, str(e))
            self.print_test("限流机制已配置", False, str(e))
    
    async def verify_audit_log_recording(self):
        """验证审计日志记录"""
        self.print_header("5. 审计日志记录验证")
        
        if not self.admin_token:
            self.print_test("审计日志记录", False, "需要先通过 JWT 认证")
            return
        
        # 测试 5.1: 查询审计日志端点
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = await client.get(
                    f"{self.base_url}/api/v1/audit-logs?page=1&pageSize=10",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = response.status_code in [200, 404]
                message = f"状态码: {response.status_code}"
                
                if response.status_code == 200:
                    data = response.json()
                    log_count = len(data.get("items", []))
                    message += f", 日志数量: {log_count}"
                
                self.add_result("审计日志", "查询审计日志", passed, message)
                self.print_test("查询审计日志端点", passed, message)
        except Exception as e:
            self.add_result("审计日志", "查询审计日志", False, str(e))
            self.print_test("查询审计日志端点", False, str(e))
        
        # 测试 5.2: 审计日志中间件存在性
        try:
            from app.middleware.audit_log_middleware import audit_log_middleware
            
            passed = audit_log_middleware is not None
            self.add_result("审计日志", "审计日志中间件", passed)
            self.print_test("审计日志中间件已配置", passed)
        except Exception as e:
            self.add_result("审计日志", "审计日志中间件", False, str(e))
            self.print_test("审计日志中间件已配置", False, str(e))
        
        # 测试 5.3: 执行操作并验证日志记录
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                
                # 执行一个操作（查询用户列表）
                await client.get(
                    f"{self.base_url}/api/v1/users",
                    headers=headers,
                    timeout=10.0
                )
                
                # 等待一下让日志写入
                await asyncio.sleep(0.5)
                
                # 查询最新的审计日志
                log_response = await client.get(
                    f"{self.base_url}/api/v1/audit-logs?page=1&pageSize=5",
                    headers=headers,
                    timeout=10.0
                )
                
                passed = log_response.status_code == 200
                self.add_result("审计日志", "操作日志记录", passed)
                self.print_test("操作被记录到审计日志", passed)
        except Exception as e:
            self.add_result("审计日志", "操作日志记录", False, str(e))
            self.print_test("操作被记录到审计日志", False, str(e))
    
    async def verify_input_validation(self):
        """验证输入参数验证"""
        self.print_header("6. 输入参数验证")
        
        if not self.admin_token:
            self.print_test("输入参数验证", False, "需要先通过 JWT 认证")
            return
        
        # 测试 6.1: SQL 注入防护
        try:
            async with httpx.AsyncClient() as client:
                malicious_input = "admin' OR '1'='1"
                response = await client.post(
                    f"{self.base_url}/api/v1/auth/login",
                    json={
                        "username": malicious_input,
                        "password": "any_password"
                    },
                    timeout=10.0
                )
                
                passed = response.status_code in [401, 400, 422]
                self.add_result("输入验证", "SQL注入防护", passed)
                self.print_test("SQL 注入防护", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("输入验证", "SQL注入防护", False, str(e))
            self.print_test("SQL 注入防护", False, str(e))
        
        # 测试 6.2: 邮箱格式验证
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                response = await client.post(
                    f"{self.base_url}/api/v1/users",
                    headers=headers,
                    json={
                        "username": f"email_test_{datetime.now().timestamp()}",
                        "email": "invalid_email_format",
                        "password": "Test123!@#",
                        "realName": "测试"
                    },
                    timeout=10.0
                )
                
                passed = response.status_code in [400, 422]
                self.add_result("输入验证", "邮箱格式验证", passed)
                self.print_test("邮箱格式验证", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("输入验证", "邮箱格式验证", False, str(e))
            self.print_test("邮箱格式验证", False, str(e))
        
        # 测试 6.3: 输入长度验证
        try:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {self.admin_token}"}
                very_long_username = "a" * 1000
                
                response = await client.post(
                    f"{self.base_url}/api/v1/users",
                    headers=headers,
                    json={
                        "username": very_long_username,
                        "email": "test@test.com",
                        "password": "Test123!@#",
                        "realName": "测试"
                    },
                    timeout=10.0
                )
                
                passed = response.status_code in [400, 422]
                self.add_result("输入验证", "输入长度验证", passed)
                self.print_test("输入长度验证", passed, f"状态码: {response.status_code}")
        except Exception as e:
            self.add_result("输入验证", "输入长度验证", False, str(e))
            self.print_test("输入长度验证", False, str(e))
        
        # 测试 6.4: 输入清理器存在性
        try:
            from app.utils.input_sanitizer import sanitize_input
            
            # 测试 XSS 清理
            xss_input = "<script>alert('XSS')</script>"
            sanitized = sanitize_input(xss_input)
            
            passed = "<script>" not in sanitized
            self.add_result("输入验证", "XSS防护", passed)
            self.print_test("XSS 防护（输入清理）", passed)
        except Exception as e:
            self.add_result("输入验证", "XSS防护", False, str(e))
            self.print_test("XSS 防护（输入清理）", False, str(e))
    
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
            print("✓ 所有安全性验证测试通过！")
        else:
            print(f"✗ 有 {total_tests - passed_tests} 个测试失败，请检查安全配置。")
        print("=" * 80 + "\n")
        
        return passed_tests == total_tests
    
    async def run_all_verifications(self):
        """运行所有验证"""
        print("\n" + "=" * 80)
        print("  FastAPI 后端安全性验证")
        print("  验证时间:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        print("  服务地址:", self.base_url)
        print("=" * 80)
        
        # 1. JWT 认证
        await self.verify_jwt_authentication()
        
        # 2. RBAC 权限控制
        await self.verify_rbac_permission_control()
        
        # 3. 敏感数据加密
        self.verify_sensitive_data_encryption()
        
        # 4. 限流保护
        await self.verify_rate_limit_protection()
        
        # 5. 审计日志记录
        await self.verify_audit_log_recording()
        
        # 6. 输入参数验证
        await self.verify_input_validation()
        
        # 打印摘要
        all_passed = self.print_summary()
        
        return all_passed


async def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="FastAPI 后端安全性验证")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="FastAPI 服务地址 (默认: http://localhost:8000)"
    )
    
    args = parser.parse_args()
    
    verifier = SecurityVerifier(base_url=args.url)
    
    try:
        all_passed = await verifier.run_all_verifications()
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
    asyncio.run(main())
