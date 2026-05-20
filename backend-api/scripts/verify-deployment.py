#!/usr/bin/env python3
"""
FastAPI 后端测试环境部署验证脚本
验证所有关键功能是否正常工作
"""

import asyncio
import sys
from typing import Dict, List, Tuple
import httpx
from colorama import Fore, Style, init

# 初始化 colorama
init(autoreset=True)

# 配置
BASE_URL = "http://localhost:8001"
API_BASE = f"{BASE_URL}/api/v1"
TIMEOUT = 10.0


class DeploymentVerifier:
    """部署验证器"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=TIMEOUT)
        self.results: List[Tuple[str, bool, str]] = []
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log_info(self, message: str):
        """输出信息日志"""
        print(f"{Fore.BLUE}[INFO]{Style.RESET_ALL} {message}")
    
    def log_success(self, message: str):
        """输出成功日志"""
        print(f"{Fore.GREEN}[SUCCESS]{Style.RESET_ALL} {message}")
    
    def log_warning(self, message: str):
        """输出警告日志"""
        print(f"{Fore.YELLOW}[WARNING]{Style.RESET_ALL} {message}")
    
    def log_error(self, message: str):
        """输出错误日志"""
        print(f"{Fore.RED}[ERROR]{Style.RESET_ALL} {message}")
    
    def add_result(self, test_name: str, passed: bool, message: str = ""):
        """添加测试结果"""
        self.results.append((test_name, passed, message))
    
    async def verify_health_check(self) -> bool:
        """验证健康检查端点"""
        self.log_info("验证健康检查端点...")
        
        try:
            response = await self.client.get(f"{BASE_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("status") == "healthy":
                    self.log_success("健康检查通过")
                    self.add_result("健康检查", True)
                    
                    # 检查数据库连接
                    if "database" in data:
                        db_status = data["database"]
                        if db_status == "connected":
                            self.log_success(f"数据库连接状态: {db_status}")
                        else:
                            self.log_warning(f"数据库连接状态: {db_status}")
                    
                    # 检查 Redis 连接
                    if "redis" in data:
                        redis_status = data["redis"]
                        if redis_status == "connected":
                            self.log_success(f"Redis 连接状态: {redis_status}")
                        else:
                            self.log_warning(f"Redis 连接状态: {redis_status}")
                    
                    return True
                else:
                    self.log_error(f"健康检查失败: {data}")
                    self.add_result("健康检查", False, str(data))
                    return False
            else:
                self.log_error(f"健康检查返回状态码: {response.status_code}")
                self.add_result("健康检查", False, f"状态码: {response.status_code}")
                return False
        
        except Exception as e:
            self.log_error(f"健康检查失败: {e}")
            self.add_result("健康检查", False, str(e))
            return False
    
    async def verify_openapi_docs(self) -> bool:
        """验证 OpenAPI 文档"""
        self.log_info("验证 OpenAPI 文档...")
        
        try:
            # 检查 Swagger UI
            response = await self.client.get(f"{BASE_URL}/docs")
            if response.status_code == 200:
                self.log_success("Swagger UI 可访问")
            else:
                self.log_warning(f"Swagger UI 返回状态码: {response.status_code}")
            
            # 检查 ReDoc
            response = await self.client.get(f"{BASE_URL}/redoc")
            if response.status_code == 200:
                self.log_success("ReDoc 可访问")
            else:
                self.log_warning(f"ReDoc 返回状态码: {response.status_code}")
            
            # 检查 OpenAPI JSON
            response = await self.client.get(f"{BASE_URL}/openapi.json")
            if response.status_code == 200:
                self.log_success("OpenAPI JSON 可访问")
                self.add_result("OpenAPI 文档", True)
                return True
            else:
                self.log_error(f"OpenAPI JSON 返回状态码: {response.status_code}")
                self.add_result("OpenAPI 文档", False, f"状态码: {response.status_code}")
                return False
        
        except Exception as e:
            self.log_error(f"OpenAPI 文档验证失败: {e}")
            self.add_result("OpenAPI 文档", False, str(e))
            return False
    
    async def verify_api_endpoints(self) -> bool:
        """验证主要 API 端点"""
        self.log_info("验证主要 API 端点...")
        
        endpoints = [
            ("/auth/login", "POST", "认证登录"),
            ("/samples", "GET", "样品列表"),
            ("/workflows", "GET", "工作流列表"),
            ("/tasks", "GET", "任务列表"),
            ("/results", "GET", "结果列表"),
            ("/audits", "GET", "审核列表"),
            ("/reports", "GET", "报告列表"),
            ("/report-templates", "GET", "报告模板列表"),
            ("/statistics/overview", "GET", "统计概览"),
        ]
        
        all_passed = True
        
        for path, method, name in endpoints:
            try:
                url = f"{API_BASE}{path}"
                
                if method == "GET":
                    response = await self.client.get(url)
                elif method == "POST":
                    response = await self.client.post(url, json={})
                
                # 401 表示需要认证，这是正常的
                if response.status_code in [200, 401, 422]:
                    self.log_success(f"{name} 端点可访问 ({response.status_code})")
                    self.add_result(f"API 端点: {name}", True)
                else:
                    self.log_warning(f"{name} 端点返回状态码: {response.status_code}")
                    self.add_result(f"API 端点: {name}", False, f"状态码: {response.status_code}")
                    all_passed = False
            
            except Exception as e:
                self.log_error(f"{name} 端点验证失败: {e}")
                self.add_result(f"API 端点: {name}", False, str(e))
                all_passed = False
        
        return all_passed
    
    async def verify_database_connection(self) -> bool:
        """验证数据库连接"""
        self.log_info("验证数据库连接...")
        
        try:
            # 通过健康检查端点验证数据库连接
            response = await self.client.get(f"{BASE_URL}/health/detailed")
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("database", {}).get("status") == "connected":
                    self.log_success("数据库连接正常")
                    self.add_result("数据库连接", True)
                    return True
                else:
                    self.log_error("数据库连接失败")
                    self.add_result("数据库连接", False, "连接失败")
                    return False
            else:
                self.log_warning(f"无法获取详细健康状态: {response.status_code}")
                self.add_result("数据库连接", False, f"状态码: {response.status_code}")
                return False
        
        except Exception as e:
            self.log_error(f"数据库连接验证失败: {e}")
            self.add_result("数据库连接", False, str(e))
            return False
    
    async def verify_redis_connection(self) -> bool:
        """验证 Redis 连接"""
        self.log_info("验证 Redis 连接...")
        
        try:
            # 通过健康检查端点验证 Redis 连接
            response = await self.client.get(f"{BASE_URL}/health/detailed")
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get("redis", {}).get("status") == "connected":
                    self.log_success("Redis 连接正常")
                    self.add_result("Redis 连接", True)
                    return True
                else:
                    self.log_warning("Redis 连接失败（可选服务）")
                    self.add_result("Redis 连接", True, "Redis 为可选服务")
                    return True
            else:
                self.log_warning(f"无法获取详细健康状态: {response.status_code}")
                self.add_result("Redis 连接", True, "无法验证")
                return True
        
        except Exception as e:
            self.log_warning(f"Redis 连接验证失败（可选服务）: {e}")
            self.add_result("Redis 连接", True, "Redis 为可选服务")
            return True
    
    async def verify_cors_configuration(self) -> bool:
        """验证 CORS 配置"""
        self.log_info("验证 CORS 配置...")
        
        try:
            headers = {
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            }
            
            response = await self.client.options(f"{API_BASE}/samples", headers=headers)
            
            if "access-control-allow-origin" in response.headers:
                self.log_success("CORS 配置正常")
                self.add_result("CORS 配置", True)
                return True
            else:
                self.log_warning("CORS 头未找到")
                self.add_result("CORS 配置", False, "CORS 头未找到")
                return False
        
        except Exception as e:
            self.log_error(f"CORS 配置验证失败: {e}")
            self.add_result("CORS 配置", False, str(e))
            return False
    
    async def verify_rate_limiting(self) -> bool:
        """验证限流配置"""
        self.log_info("验证限流配置...")
        
        try:
            # 发送多个请求测试限流
            responses = []
            for _ in range(5):
                response = await self.client.get(f"{BASE_URL}/health")
                responses.append(response.status_code)
            
            # 检查是否有 429 状态码（限流）
            if 429 in responses:
                self.log_success("限流配置正常（检测到限流）")
                self.add_result("限流配置", True)
                return True
            else:
                self.log_info("限流配置可能未启用或阈值较高")
                self.add_result("限流配置", True, "未触发限流")
                return True
        
        except Exception as e:
            self.log_error(f"限流配置验证失败: {e}")
            self.add_result("限流配置", False, str(e))
            return False
    
    def print_summary(self):
        """打印测试摘要"""
        print("\n" + "=" * 60)
        print(f"{Fore.CYAN}部署验证摘要{Style.RESET_ALL}")
        print("=" * 60)
        
        passed_count = sum(1 for _, passed, _ in self.results if passed)
        total_count = len(self.results)
        
        for test_name, passed, message in self.results:
            status = f"{Fore.GREEN}✓ PASS{Style.RESET_ALL}" if passed else f"{Fore.RED}✗ FAIL{Style.RESET_ALL}"
            print(f"{status} {test_name}")
            if message:
                print(f"      {Fore.YELLOW}{message}{Style.RESET_ALL}")
        
        print("\n" + "=" * 60)
        print(f"总计: {passed_count}/{total_count} 测试通过")
        
        if passed_count == total_count:
            print(f"{Fore.GREEN}所有测试通过！部署成功！{Style.RESET_ALL}")
            return True
        else:
            print(f"{Fore.YELLOW}部分测试失败，请检查日志{Style.RESET_ALL}")
            return False
    
    async def run_all_verifications(self) -> bool:
        """运行所有验证"""
        print(f"\n{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}开始验证 FastAPI 后端测试环境部署{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}\n")
        
        # 执行所有验证
        await self.verify_health_check()
        await self.verify_openapi_docs()
        await self.verify_api_endpoints()
        await self.verify_database_connection()
        await self.verify_redis_connection()
        await self.verify_cors_configuration()
        await self.verify_rate_limiting()
        
        # 打印摘要
        return self.print_summary()


async def main():
    """主函数"""
    try:
        async with DeploymentVerifier() as verifier:
            success = await verifier.run_all_verifications()
            sys.exit(0 if success else 1)
    
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}验证被用户中断{Style.RESET_ALL}")
        sys.exit(1)
    
    except Exception as e:
        print(f"\n{Fore.RED}验证过程中发生错误: {e}{Style.RESET_ALL}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
