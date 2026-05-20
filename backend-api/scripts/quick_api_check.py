#!/usr/bin/env python3
"""
快速 API 一致性检查脚本

快速验证 FastAPI 和 Node.js 后端的关键端点一致性
"""

import asyncio
import json
from typing import Dict, List
import httpx
from colorama import init, Fore, Style

init(autoreset=True)

# 配置
FASTAPI_BASE = "http://localhost:8000"
NODEJS_BASE = "http://localhost:3000"
TIMEOUT = 10.0

# 测试用户
TEST_USER = {"username": "admin", "password": "Admin@123"}


class QuickAPIChecker:
    """快速 API 检查器"""
    
    def __init__(self):
        self.fastapi_token = None
        self.nodejs_token = None
        self.results = []
    
    async def login(self):
        """登录两个后端"""
        print(f"{Fore.CYAN}正在登录...")
        
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                # 登录 FastAPI
                resp1 = await client.post(
                    f"{FASTAPI_BASE}/api/v1/auth/login",
                    json=TEST_USER
                )
                if resp1.status_code == 200:
                    data = resp1.json()
                    self.fastapi_token = data.get("access_token") or data.get("accessToken")
                    print(f"{Fore.GREEN}✓ FastAPI 登录成功")
                else:
                    print(f"{Fore.RED}✗ FastAPI 登录失败: {resp1.status_code}")
                    return False
                
                # 登录 Node.js
                resp2 = await client.post(
                    f"{NODEJS_BASE}/api/auth/login",
                    json=TEST_USER
                )
                if resp2.status_code == 200:
                    data = resp2.json()
                    self.nodejs_token = data["data"]["accessToken"]
                    print(f"{Fore.GREEN}✓ Node.js 登录成功")
                else:
                    print(f"{Fore.RED}✗ Node.js 登录失败: {resp2.status_code}")
                    return False
                
                return True
        except Exception as e:
            print(f"{Fore.RED}✗ 登录异常: {e}")
            return False
    
    async def check_endpoint(
        self,
        name: str,
        fastapi_path: str,
        nodejs_path: str,
        method: str = "GET",
        params: Dict = None
    ):
        """检查单个端点"""
        print(f"\n{Fore.YELLOW}检查: {name}")
        
        headers_fastapi = {"Authorization": f"Bearer {self.fastapi_token}"}
        headers_nodejs = {"Authorization": f"Bearer {self.nodejs_token}"}
        
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                # 请求 FastAPI
                resp1 = await client.request(
                    method,
                    f"{FASTAPI_BASE}{fastapi_path}",
                    headers=headers_fastapi,
                    params=params
                )
                
                # 请求 Node.js
                resp2 = await client.request(
                    method,
                    f"{NODEJS_BASE}{nodejs_path}",
                    headers=headers_nodejs,
                    params=params
                )
            
            # 对比状态码
            if resp1.status_code != resp2.status_code:
                print(f"{Fore.RED}  ✗ 状态码不一致: FastAPI={resp1.status_code}, Node.js={resp2.status_code}")
                return False
            
            print(f"{Fore.GREEN}  ✓ 状态码一致: {resp1.status_code}")
            
            # 对比响应结构
            if resp1.status_code == 200:
                try:
                    json1 = resp1.json()
                    json2 = resp2.json()
                    
                    # 检查 success 字段
                    has_success_1 = "success" in json1
                    has_success_2 = "success" in json2
                    
                    if has_success_2 and not has_success_1:
                        print(f"{Fore.RED}  ✗ FastAPI 响应缺少 success 字段")
                        return False
                    
                    # 检查 data 字段
                    has_data_1 = "data" in json1
                    has_data_2 = "data" in json2
                    
                    if has_data_2 and not has_data_1:
                        print(f"{Fore.RED}  ✗ FastAPI 响应缺少 data 字段")
                        return False
                    
                    # 检查分页字段
                    if has_data_2 and isinstance(json2["data"], dict):
                        if "items" in json2["data"]:
                            # 这是分页响应
                            if not has_data_1 or "items" not in json1["data"]:
                                print(f"{Fore.RED}  ✗ FastAPI 分页响应格式不正确")
                                return False
                            
                            # 检查分页字段
                            required_fields = ["items", "total", "page", "pageSize", "totalPages"]
                            for field in required_fields:
                                if field not in json1["data"]:
                                    print(f"{Fore.RED}  ✗ FastAPI 分页响应缺少字段: {field}")
                                    return False
                            
                            print(f"{Fore.GREEN}  ✓ 分页响应格式一致")
                    
                    print(f"{Fore.GREEN}  ✓ 响应结构一致")
                    return True
                    
                except json.JSONDecodeError:
                    print(f"{Fore.RED}  ✗ 响应不是有效的 JSON")
                    return False
            
            return True
            
        except Exception as e:
            print(f"{Fore.RED}  ✗ 检查异常: {e}")
            return False
    
    async def run_checks(self):
        """运行所有检查"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}快速 API 一致性检查")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 登录
        if not await self.login():
            return
        
        # 定义要检查的端点
        checks = [
            ("获取当前用户", "/api/v1/auth/me", "/api/auth/me", "GET", None),
            ("样品列表", "/api/v1/samples", "/api/samples", "GET", {"page": 1, "pageSize": 10}),
            ("工作流列表", "/api/v1/workflows", "/api/workflows", "GET", {"page": 1, "pageSize": 10}),
            ("任务列表", "/api/v1/tasks", "/api/tasks", "GET", {"page": 1, "pageSize": 10}),
            ("检测结果列表", "/api/v1/results", "/api/results", "GET", {"page": 1, "pageSize": 10}),
            ("审核任务列表", "/api/v1/audits", "/api/audits", "GET", {"page": 1, "pageSize": 10}),
            ("报告模板列表", "/api/v1/report-templates", "/api/report-templates", "GET", {"page": 1, "pageSize": 10}),
            ("报告列表", "/api/v1/reports", "/api/reports", "GET", {"page": 1, "pageSize": 10}),
            ("综合统计", "/api/v1/statistics/overview", "/api/statistics/overview", "GET", None),
        ]
        
        passed = 0
        failed = 0
        
        for check in checks:
            result = await self.check_endpoint(*check)
            if result:
                passed += 1
            else:
                failed += 1
        
        # 总结
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}检查总结")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        total = passed + failed
        print(f"总检查数: {total}")
        print(f"{Fore.GREEN}通过: {passed}")
        print(f"{Fore.RED}失败: {failed}")
        
        if failed == 0:
            print(f"\n{Fore.GREEN}✓ 所有检查通过！")
        else:
            print(f"\n{Fore.RED}✗ 发现 {failed} 个不一致问题")


async def main():
    """主函数"""
    checker = QuickAPIChecker()
    await checker.run_checks()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}检查被用户中断")
    except Exception as e:
        print(f"\n{Fore.RED}检查异常: {e}")
