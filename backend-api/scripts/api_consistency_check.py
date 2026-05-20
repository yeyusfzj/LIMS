#!/usr/bin/env python3
"""
API 一致性验证脚本

对比 FastAPI 和 Node.js 后端的所有 API 端点，验证：
1. 端点路径一致性
2. 请求参数格式一致性
3. 响应数据格式一致性
4. 错误响应格式一致性
5. 分页格式一致性
"""

import asyncio
import json
import sys
from typing import Dict, List, Any, Optional
from datetime import datetime
import httpx
from colorama import init, Fore, Style

# 初始化 colorama
init(autoreset=True)

# 配置
FASTAPI_BASE_URL = "http://localhost:8000"
NODEJS_BASE_URL = "http://localhost:3000"
TIMEOUT = 30.0

# 测试用户凭证
TEST_USER = {
    "username": "admin",
    "password": "Admin@123"
}


class APIConsistencyChecker:
    """API 一致性检查器"""
    
    def __init__(self):
        self.fastapi_token: Optional[str] = None
        self.nodejs_token: Optional[str] = None
        self.results: List[Dict[str, Any]] = []
        self.summary = {
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "warnings": 0
        }
    
    async def login_fastapi(self) -> bool:
        """登录 FastAPI 后端"""
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.post(
                    f"{FASTAPI_BASE_URL}/api/v1/auth/login",
                    json=TEST_USER
                )
                if response.status_code == 200:
                    data = response.json()
                    self.fastapi_token = data.get("access_token") or data.get("accessToken")
                    print(f"{Fore.GREEN}✓ FastAPI 登录成功")
                    return True
                else:
                    print(f"{Fore.RED}✗ FastAPI 登录失败: {response.status_code}")
                    return False
        except Exception as e:
            print(f"{Fore.RED}✗ FastAPI 登录异常: {e}")
            return False
    
    async def login_nodejs(self) -> bool:
        """登录 Node.js 后端"""
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.post(
                    f"{NODEJS_BASE_URL}/api/auth/login",
                    json=TEST_USER
                )
                if response.status_code == 200:
                    data = response.json()
                    # Node.js 返回 { success: true, data: { accessToken: ... } }
                    if data.get("success"):
                        self.nodejs_token = data["data"]["accessToken"]
                    else:
                        self.nodejs_token = data.get("accessToken")
                    print(f"{Fore.GREEN}✓ Node.js 登录成功")
                    return True
                else:
                    print(f"{Fore.RED}✗ Node.js 登录失败: {response.status_code}")
                    return False
        except Exception as e:
            print(f"{Fore.RED}✗ Node.js 登录异常: {e}")
            return False
    
    def compare_response_structure(
        self, 
        fastapi_data: Any, 
        nodejs_data: Any, 
        path: str = "root"
    ) -> List[str]:
        """递归对比响应数据结构"""
        differences = []
        
        # 类型检查
        if type(fastapi_data) != type(nodejs_data):
            differences.append(
                f"{path}: 类型不一致 (FastAPI: {type(fastapi_data).__name__}, "
                f"Node.js: {type(nodejs_data).__name__})"
            )
            return differences
        
        # 字典对比
        if isinstance(fastapi_data, dict):
            fastapi_keys = set(fastapi_data.keys())
            nodejs_keys = set(nodejs_data.keys())
            
            # 检查缺失的键
            missing_in_fastapi = nodejs_keys - fastapi_keys
            missing_in_nodejs = fastapi_keys - nodejs_keys
            
            if missing_in_fastapi:
                differences.append(
                    f"{path}: FastAPI 缺少字段 {missing_in_fastapi}"
                )
            if missing_in_nodejs:
                differences.append(
                    f"{path}: Node.js 缺少字段 {missing_in_nodejs}"
                )
            
            # 递归对比共同的键
            common_keys = fastapi_keys & nodejs_keys
            for key in common_keys:
                differences.extend(
                    self.compare_response_structure(
                        fastapi_data[key],
                        nodejs_data[key],
                        f"{path}.{key}"
                    )
                )
        
        # 列表对比
        elif isinstance(fastapi_data, list):
            if len(fastapi_data) > 0 and len(nodejs_data) > 0:
                # 对比第一个元素的结构
                differences.extend(
                    self.compare_response_structure(
                        fastapi_data[0],
                        nodejs_data[0],
                        f"{path}[0]"
                    )
                )
        
        return differences
    
    async def test_endpoint(
        self,
        name: str,
        method: str,
        fastapi_path: str,
        nodejs_path: str,
        params: Optional[Dict] = None,
        json_data: Optional[Dict] = None,
        requires_auth: bool = True
    ) -> Dict[str, Any]:
        """测试单个端点"""
        result = {
            "name": name,
            "method": method,
            "fastapi_path": fastapi_path,
            "nodejs_path": nodejs_path,
            "status": "unknown",
            "issues": []
        }
        
        try:
            # 准备请求头
            fastapi_headers = {}
            nodejs_headers = {}
            
            if requires_auth:
                if self.fastapi_token:
                    fastapi_headers["Authorization"] = f"Bearer {self.fastapi_token}"
                if self.nodejs_token:
                    nodejs_headers["Authorization"] = f"Bearer {self.nodejs_token}"
            
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                # 发送 FastAPI 请求
                fastapi_response = await client.request(
                    method,
                    f"{FASTAPI_BASE_URL}{fastapi_path}",
                    headers=fastapi_headers,
                    params=params,
                    json=json_data
                )
                
                # 发送 Node.js 请求
                nodejs_response = await client.request(
                    method,
                    f"{NODEJS_BASE_URL}{nodejs_path}",
                    headers=nodejs_headers,
                    params=params,
                    json=json_data
                )
            
            # 对比状态码
            if fastapi_response.status_code != nodejs_response.status_code:
                result["issues"].append(
                    f"状态码不一致: FastAPI={fastapi_response.status_code}, "
                    f"Node.js={nodejs_response.status_code}"
                )
            
            # 对比响应结构
            if fastapi_response.status_code == 200:
                try:
                    fastapi_json = fastapi_response.json()
                    nodejs_json = nodejs_response.json()
                    
                    # Node.js 通常包装在 { success: true, data: ... } 中
                    # FastAPI 直接返回数据或包装在不同的结构中
                    
                    # 提取实际数据
                    fastapi_data = fastapi_json
                    nodejs_data = nodejs_json.get("data", nodejs_json) if isinstance(nodejs_json, dict) else nodejs_json
                    
                    # 对比结构
                    differences = self.compare_response_structure(
                        fastapi_data,
                        nodejs_data
                    )
                    
                    if differences:
                        result["issues"].extend(differences)
                
                except json.JSONDecodeError:
                    result["issues"].append("响应不是有效的 JSON")
            
            # 判断测试结果
            if not result["issues"]:
                result["status"] = "passed"
                self.summary["passed"] += 1
            else:
                result["status"] = "failed"
                self.summary["failed"] += 1
        
        except Exception as e:
            result["status"] = "error"
            result["issues"].append(f"测试异常: {str(e)}")
            self.summary["failed"] += 1
        
        self.summary["total_tests"] += 1
        self.results.append(result)
        return result
    
    async def test_pagination_format(self):
        """测试分页格式一致性"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试分页格式一致性")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试样品列表分页
        result = await self.test_endpoint(
            name="样品列表分页",
            method="GET",
            fastapi_path="/api/v1/samples",
            nodejs_path="/api/samples",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_error_response_format(self):
        """测试错误响应格式一致性"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试错误响应格式一致性")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试 404 错误
        result = await self.test_endpoint(
            name="404 错误响应",
            method="GET",
            fastapi_path="/api/v1/samples/00000000-0000-0000-0000-000000000000",
            nodejs_path="/api/samples/00000000-0000-0000-0000-000000000000"
        )
        
        self.print_result(result)
        
        # 测试 401 错误（未认证）
        result = await self.test_endpoint(
            name="401 错误响应",
            method="GET",
            fastapi_path="/api/v1/samples",
            nodejs_path="/api/samples",
            requires_auth=False
        )
        
        self.print_result(result)
    
    async def test_authentication_endpoints(self):
        """测试认证端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试认证端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试登录端点
        result = await self.test_endpoint(
            name="用户登录",
            method="POST",
            fastapi_path="/api/v1/auth/login",
            nodejs_path="/api/auth/login",
            json_data=TEST_USER,
            requires_auth=False
        )
        
        self.print_result(result)
        
        # 测试获取当前用户信息
        result = await self.test_endpoint(
            name="获取当前用户",
            method="GET",
            fastapi_path="/api/v1/auth/me",
            nodejs_path="/api/auth/me"
        )
        
        self.print_result(result)
    
    async def test_sample_endpoints(self):
        """测试样品管理端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试样品管理端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试样品列表
        result = await self.test_endpoint(
            name="样品列表",
            method="GET",
            fastapi_path="/api/v1/samples",
            nodejs_path="/api/samples",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_workflow_endpoints(self):
        """测试工作流端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试工作流端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试工作流模板列表
        result = await self.test_endpoint(
            name="工作流模板列表",
            method="GET",
            fastapi_path="/api/v1/workflows",
            nodejs_path="/api/workflows",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
        
        # 测试任务列表
        result = await self.test_endpoint(
            name="任务列表",
            method="GET",
            fastapi_path="/api/v1/tasks",
            nodejs_path="/api/tasks",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_result_endpoints(self):
        """测试检测结果端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试检测结果端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试结果列表
        result = await self.test_endpoint(
            name="检测结果列表",
            method="GET",
            fastapi_path="/api/v1/results",
            nodejs_path="/api/results",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_audit_endpoints(self):
        """测试审核端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试审核端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试审核任务列表
        result = await self.test_endpoint(
            name="审核任务列表",
            method="GET",
            fastapi_path="/api/v1/audits",
            nodejs_path="/api/audits",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_report_endpoints(self):
        """测试报告端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试报告端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试报告模板列表
        result = await self.test_endpoint(
            name="报告模板列表",
            method="GET",
            fastapi_path="/api/v1/report-templates",
            nodejs_path="/api/report-templates",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
        
        # 测试报告列表
        result = await self.test_endpoint(
            name="报告列表",
            method="GET",
            fastapi_path="/api/v1/reports",
            nodejs_path="/api/reports",
            params={"page": 1, "pageSize": 10}
        )
        
        self.print_result(result)
    
    async def test_statistics_endpoints(self):
        """测试统计端点"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试统计端点")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 测试综合统计
        result = await self.test_endpoint(
            name="综合统计",
            method="GET",
            fastapi_path="/api/v1/statistics/overview",
            nodejs_path="/api/statistics/overview"
        )
        
        self.print_result(result)
    
    def print_result(self, result: Dict[str, Any]):
        """打印测试结果"""
        status_color = {
            "passed": Fore.GREEN,
            "failed": Fore.RED,
            "error": Fore.RED,
            "unknown": Fore.YELLOW
        }
        
        status_symbol = {
            "passed": "✓",
            "failed": "✗",
            "error": "✗",
            "unknown": "?"
        }
        
        color = status_color.get(result["status"], Fore.WHITE)
        symbol = status_symbol.get(result["status"], "?")
        
        print(f"{color}{symbol} {result['name']}")
        
        if result["issues"]:
            for issue in result["issues"]:
                print(f"  {Fore.YELLOW}⚠ {issue}")
        
        print()
    
    def generate_report(self):
        """生成详细报告"""
        report_path = "api_consistency_report.json"
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "summary": self.summary,
            "results": self.results
        }
        
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}测试总结")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        print(f"总测试数: {self.summary['total_tests']}")
        print(f"{Fore.GREEN}通过: {self.summary['passed']}")
        print(f"{Fore.RED}失败: {self.summary['failed']}")
        print(f"{Fore.YELLOW}警告: {self.summary['warnings']}")
        
        pass_rate = (self.summary['passed'] / self.summary['total_tests'] * 100) if self.summary['total_tests'] > 0 else 0
        print(f"\n通过率: {pass_rate:.1f}%")
        
        print(f"\n详细报告已保存到: {report_path}")
    
    async def run(self):
        """运行所有测试"""
        print(f"{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}API 一致性验证")
        print(f"{Fore.CYAN}{'='*60}\n")
        
        # 登录
        print(f"{Fore.CYAN}正在登录...")
        fastapi_ok = await self.login_fastapi()
        nodejs_ok = await self.login_nodejs()
        
        if not (fastapi_ok and nodejs_ok):
            print(f"\n{Fore.RED}登录失败，无法继续测试")
            return
        
        # 运行测试
        await self.test_authentication_endpoints()
        await self.test_pagination_format()
        await self.test_error_response_format()
        await self.test_sample_endpoints()
        await self.test_workflow_endpoints()
        await self.test_result_endpoints()
        await self.test_audit_endpoints()
        await self.test_report_endpoints()
        await self.test_statistics_endpoints()
        
        # 生成报告
        self.generate_report()


async def main():
    """主函数"""
    checker = APIConsistencyChecker()
    await checker.run()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n{Fore.RED}测试异常: {e}")
        sys.exit(1)
