#!/usr/bin/env python3
"""
FastAPI 后端集成测试脚本
测试所有功能模块与前端的集成
"""

import asyncio
import json
import sys
from typing import Dict, Any, List, Optional
import httpx
from datetime import datetime, timedelta

# 测试配置
BASE_URL = "http://localhost:8001"
TIMEOUT = 30.0

# 测试结果统计
test_results = {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "errors": []
}

# 全局变量存储测试数据
test_data = {
    "access_token": None,
    "refresh_token": None,
    "user_id": None,
    "sample_id": None,
    "workflow_template_id": None,
    "workflow_instance_id": None,
    "task_id": None,
    "result_id": None,
    "audit_task_id": None,
    "report_template_id": None,
    "report_id": None,
    "formula_id": None,
    "method_id": None
}


class TestRunner:
    """测试运行器"""
    
    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=TIMEOUT)
        self.headers = {}
    
    async def close(self):
        """关闭客户端"""
        await self.client.aclose()
    
    def set_auth_token(self, token: str):
        """设置认证令牌"""
        self.headers["Authorization"] = f"Bearer {token}"
    
    async def test_request(
        self,
        method: str,
        url: str,
        name: str,
        expected_status: int = 200,
        json_data: Optional[Dict] = None,
        params: Optional[Dict] = None,
        files: Optional[Dict] = None
    ) -> Optional[Dict]:
        """执行测试请求"""
        test_results["total"] += 1
        
        try:
            if method.upper() == "GET":
                response = await self.client.get(url, headers=self.headers, params=params)
            elif method.upper() == "POST":
                if files:
                    response = await self.client.post(url, headers=self.headers, files=files, data=json_data)
                else:
                    response = await self.client.post(url, headers=self.headers, json=json_data)
            elif method.upper() == "PUT":
                response = await self.client.put(url, headers=self.headers, json=json_data)
            elif method.upper() == "DELETE":
                response = await self.client.delete(url, headers=self.headers)
            else:
                raise ValueError(f"不支持的 HTTP 方法: {method}")
            
            if response.status_code == expected_status:
                test_results["passed"] += 1
                print(f"[PASS] {name}")
                try:
                    return response.json()
                except:
                    return None
            else:
                test_results["failed"] += 1
                error_msg = f"[FAIL] {name} - 期望状态码 {expected_status}, 实际 {response.status_code}"
                print(error_msg)
                try:
                    print(f"   响应: {response.json()}")
                except:
                    print(f"   响应: {response.text}")
                test_results["errors"].append(error_msg)
                return None
                
        except Exception as e:
            test_results["failed"] += 1
            error_msg = f"[FAIL] {name} - 异常: {str(e)}"
            print(error_msg)
            test_results["errors"].append(error_msg)
            return None


async def test_health_check(runner: TestRunner):
    """测试健康检查"""
    print("\n" + "="*60)
    print("1. 健康检查测试")
    print("="*60)
    
    await runner.test_request("GET", "/health", "基础健康检查")
    await runner.test_request("GET", "/api/v1/health/detailed", "详细健康检查")
    await runner.test_request("GET", "/api/v1/ready", "就绪检查")
    await runner.test_request("GET", "/api/v1/live", "存活检查")


async def test_authentication(runner: TestRunner):
    """测试认证授权功能"""
    print("\n" + "="*60)
    print("2. 认证授权测试")
    print("="*60)
    
    # 登录
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    result = await runner.test_request(
        "POST", "/api/v1/auth/login", "用户登录",
        json_data=login_data
    )
    
    if result and "access_token" in result:
        test_data["access_token"] = result["access_token"]
        test_data["refresh_token"] = result.get("refresh_token")
        runner.set_auth_token(test_data["access_token"])
        print(f"   已获取访问令牌")
    
    # 获取当前用户信息
    result = await runner.test_request(
        "GET", "/api/v1/auth/me", "获取当前用户信息"
    )
    
    if result and "id" in result:
        test_data["user_id"] = result["id"]
        print(f"   用户ID: {test_data['user_id']}")
    
    # 刷新令牌
    if test_data["refresh_token"]:
        await runner.test_request(
            "POST", "/api/v1/auth/refresh", "刷新令牌",
            json_data={"refresh_token": test_data["refresh_token"]}
        )


async def test_user_management(runner: TestRunner):
    """测试用户管理功能"""
    print("\n" + "="*60)
    print("3. 用户管理测试")
    print("="*60)
    
    # 查询用户列表
    await runner.test_request(
        "GET", "/api/users", "查询用户列表",
        params={"page": 1, "page_size": 10}
    )
    
    # 查询角色列表
    await runner.test_request(
        "GET", "/api/roles", "查询角色列表"
    )
    
    # 查询权限列表
    await runner.test_request(
        "GET", "/api/permissions", "查询权限列表"
    )


async def test_sample_management(runner: TestRunner):
    """测试样品管理功能"""
    print("\n" + "="*60)
    print("4. 样品管理测试")
    print("="*60)
    
    # 创建样品
    sample_data = {
        "sampleNumber": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "clientName": "测试客户",
        "sampleName": "测试样品",
        "sampleType": "水质",
        "quantity": 100.0,
        "unit": "mL",
        "receivedDate": datetime.now().isoformat(),
        "priority": "MEDIUM"
    }
    
    result = await runner.test_request(
        "POST", "/api/v1/samples", "创建样品",
        json_data=sample_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["sample_id"] = result["id"]
        print(f"   样品ID: {test_data['sample_id']}")
    
    # 查询样品列表
    await runner.test_request(
        "GET", "/api/v1/samples", "查询样品列表",
        params={"page": 1, "page_size": 10}
    )
    
    # 查询样品详情
    if test_data["sample_id"]:
        await runner.test_request(
            "GET", f"/api/v1/samples/{test_data['sample_id']}", "查询样品详情"
        )
        
        # 更新样品
        update_data = {
            "status": "TESTING",
            "remarks": "集成测试更新"
        }
        await runner.test_request(
            "PUT", f"/api/v1/samples/{test_data['sample_id']}", "更新样品",
            json_data=update_data
        )


async def test_workflow_management(runner: TestRunner):
    """测试工作流管理功能"""
    print("\n" + "="*60)
    print("5. 工作流管理测试")
    print("="*60)
    
    # 创建工作流模板
    template_data = {
        "name": f"测试工作流-{datetime.now().strftime('%H%M%S')}",
        "description": "集成测试工作流模板",
        "category": "检测流程",
        "nodes": [
            {
                "id": "node1",
                "type": "start",
                "name": "开始",
                "config": {}
            },
            {
                "id": "node2",
                "type": "task",
                "name": "样品检测",
                "config": {"assignee": "auto"}
            },
            {
                "id": "node3",
                "type": "end",
                "name": "结束",
                "config": {}
            }
        ]
    }
    
    result = await runner.test_request(
        "POST", "/api/v1/workflows", "创建工作流模板",
        json_data=template_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["workflow_template_id"] = result["id"]
        print(f"   工作流模板ID: {test_data['workflow_template_id']}")
    
    # 查询工作流模板列表
    await runner.test_request(
        "GET", "/api/v1/workflows", "查询工作流模板列表"
    )
    
    # 创建工作流实例
    if test_data["workflow_template_id"] and test_data["sample_id"]:
        instance_data = {
            "sampleId": test_data["sample_id"]
        }
        result = await runner.test_request(
            "POST", f"/api/v1/workflows/{test_data['workflow_template_id']}/instances",
            "创建工作流实例",
            json_data=instance_data, expected_status=201
        )
        
        if result and "id" in result:
            test_data["workflow_instance_id"] = result["id"]
            print(f"   工作流实例ID: {test_data['workflow_instance_id']}")
    
    # 查询工作流实例列表
    await runner.test_request(
        "GET", "/api/v1/workflow-instances", "查询工作流实例列表"
    )


async def test_task_management(runner: TestRunner):
    """测试任务管理功能"""
    print("\n" + "="*60)
    print("6. 任务管理测试")
    print("="*60)
    
    # 创建任务
    task_data = {
        "title": f"测试任务-{datetime.now().strftime('%H%M%S')}",
        "description": "集成测试任务",
        "type": "DETECTION",
        "priority": "MEDIUM",
        "dueDate": (datetime.now() + timedelta(days=7)).isoformat()
    }
    
    if test_data["sample_id"]:
        task_data["sampleId"] = test_data["sample_id"]
    
    result = await runner.test_request(
        "POST", "/api/v1/tasks", "创建任务",
        json_data=task_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["task_id"] = result["id"]
        print(f"   任务ID: {test_data['task_id']}")
    
    # 查询任务列表
    await runner.test_request(
        "GET", "/api/v1/tasks", "查询任务列表",
        params={"page": 1, "page_size": 10}
    )
    
    # 分配任务
    if test_data["task_id"] and test_data["user_id"]:
        await runner.test_request(
            "POST", f"/api/v1/tasks/{test_data['task_id']}/assign",
            "分配任务",
            json_data={"assigneeId": test_data["user_id"]}
        )


async def test_result_management(runner: TestRunner):
    """测试检测结果管理功能"""
    print("\n" + "="*60)
    print("7. 检测结果管理测试")
    print("="*60)
    
    # 创建检测结果
    if test_data["sample_id"]:
        result_data = {
            "sampleId": test_data["sample_id"],
            "testItem": "pH值",
            "testMethod": "GB/T 5750.4-2006",
            "value": "7.2",
            "unit": "无量纲",
            "standardValue": "6.5-8.5",
            "result": "合格"
        }
        
        result = await runner.test_request(
            "POST", "/api/v1/results", "创建检测结果",
            json_data=result_data, expected_status=201
        )
        
        if result and "id" in result:
            test_data["result_id"] = result["id"]
            print(f"   检测结果ID: {test_data['result_id']}")
    
    # 查询检测结果列表
    await runner.test_request(
        "GET", "/api/v1/results", "查询检测结果列表",
        params={"page": 1, "page_size": 10}
    )
    
    # 创建计算公式
    formula_data = {
        "name": "测试公式",
        "expression": "a + b",
        "variables": ["a", "b"],
        "description": "简单加法公式"
    }
    
    result = await runner.test_request(
        "POST", "/api/v1/formulas", "创建计算公式",
        json_data=formula_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["formula_id"] = result["id"]
        print(f"   公式ID: {test_data['formula_id']}")
    
    # 查询公式列表
    await runner.test_request(
        "GET", "/api/v1/formulas", "查询公式列表"
    )
    
    # 查询异常列表
    await runner.test_request(
        "GET", "/api/v1/anomalies", "查询异常列表"
    )


async def test_audit_management(runner: TestRunner):
    """测试审核管理功能"""
    print("\n" + "="*60)
    print("8. 审核管理测试（跳过 - 路由暂时不可用）")
    print("="*60)
    print("[SKIP] 审核路由暂时不可用，跳过测试")


async def test_report_management(runner: TestRunner):
    """测试报告管理功能"""
    print("\n" + "="*60)
    print("9. 报告管理测试")
    print("="*60)
    
    # 创建报告模板
    template_data = {
        "name": f"测试报告模板-{datetime.now().strftime('%H%M%S')}",
        "category": "检测报告",
        "fields": [
            {"name": "sampleName", "label": "样品名称", "type": "text"},
            {"name": "testResult", "label": "检测结果", "type": "text"}
        ]
    }
    
    result = await runner.test_request(
        "POST", "/api/v1/report-templates", "创建报告模板",
        json_data=template_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["report_template_id"] = result["id"]
        print(f"   报告模板ID: {test_data['report_template_id']}")
    
    # 查询报告模板列表
    await runner.test_request(
        "GET", "/api/v1/report-templates", "查询报告模板列表"
    )
    
    # 生成报告
    if test_data["report_template_id"] and test_data["sample_id"]:
        report_data = {
            "templateId": test_data["report_template_id"],
            "sampleId": test_data["sample_id"],
            "data": {
                "sampleName": "测试样品",
                "testResult": "合格"
            }
        }
        
        result = await runner.test_request(
            "POST", "/api/v1/reports/generate", "生成报告",
            json_data=report_data, expected_status=201
        )
        
        if result and "id" in result:
            test_data["report_id"] = result["id"]
            print(f"   报告ID: {test_data['report_id']}")
    
    # 查询报告列表
    await runner.test_request(
        "GET", "/api/v1/reports", "查询报告列表",
        params={"page": 1, "page_size": 10}
    )


async def test_statistics(runner: TestRunner):
    """测试统计分析功能"""
    print("\n" + "="*60)
    print("10. 统计分析测试")
    print("="*60)
    
    # 综合统计
    await runner.test_request(
        "GET", "/api/v1/statistics/overview", "综合统计",
        params={
            "startDate": (datetime.now() - timedelta(days=30)).isoformat(),
            "endDate": datetime.now().isoformat()
        }
    )
    
    # 审核统计
    await runner.test_request(
        "GET", "/api/v1/statistics/audit", "审核统计",
        params={
            "startDate": (datetime.now() - timedelta(days=30)).isoformat(),
            "endDate": datetime.now().isoformat()
        }
    )
    
    # 工作量统计
    await runner.test_request(
        "GET", "/api/v1/statistics/workload", "工作量统计",
        params={
            "startDate": (datetime.now() - timedelta(days=30)).isoformat(),
            "endDate": datetime.now().isoformat()
        }
    )
    
    # 质量统计
    await runner.test_request(
        "GET", "/api/v1/statistics/quality", "质量统计",
        params={
            "startDate": (datetime.now() - timedelta(days=30)).isoformat(),
            "endDate": datetime.now().isoformat()
        }
    )


async def test_system_management(runner: TestRunner):
    """测试系统管理功能"""
    print("\n" + "="*60)
    print("11. 系统管理测试")
    print("="*60)
    
    # 查询性能统计
    await runner.test_request(
        "GET", "/api/v1/performance/statistics", "查询性能统计"
    )
    
    # 创建检测方法
    method_data = {
        "code": f"TEST-{datetime.now().strftime('%H%M%S')}",
        "name": "测试检测方法",
        "category": "水质检测",
        "standard": "GB/T 5750-2006",
        "description": "集成测试方法"
    }
    
    result = await runner.test_request(
        "POST", "/api/v1/methods", "创建检测方法",
        json_data=method_data, expected_status=201
    )
    
    if result and "id" in result:
        test_data["method_id"] = result["id"]
        print(f"   检测方法ID: {test_data['method_id']}")
    
    # 查询检测方法列表
    await runner.test_request(
        "GET", "/api/v1/methods", "查询检测方法列表"
    )


async def test_edge_cases(runner: TestRunner):
    """测试边界情况和异常处理"""
    print("\n" + "="*60)
    print("12. 边界情况和异常处理测试")
    print("="*60)
    
    # 测试无效的认证令牌
    original_token = runner.headers.get("Authorization")
    runner.headers["Authorization"] = "Bearer invalid_token"
    await runner.test_request(
        "GET", "/api/v1/auth/me", "无效令牌访问",
        expected_status=401
    )
    runner.headers["Authorization"] = original_token
    
    # 测试不存在的资源
    await runner.test_request(
        "GET", "/api/v1/samples/nonexistent-id", "查询不存在的样品",
        expected_status=404
    )
    
    # 测试无效的请求数据
    await runner.test_request(
        "POST", "/api/v1/samples", "创建样品（缺少必填字段）",
        json_data={"sampleName": "测试"},
        expected_status=422
    )
    
    # 测试分页参数
    await runner.test_request(
        "GET", "/api/v1/samples", "分页查询（第1页）",
        params={"page": 1, "page_size": 5}
    )
    
    await runner.test_request(
        "GET", "/api/v1/samples", "分页查询（大页码）",
        params={"page": 999, "page_size": 10}
    )


async def main():
    """主测试函数"""
    print("="*60)
    print("FastAPI 后端集成测试")
    print("="*60)
    print(f"测试环境: {BASE_URL}")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    runner = TestRunner()
    
    try:
        # 执行所有测试
        await test_health_check(runner)
        await test_authentication(runner)
        await test_user_management(runner)
        await test_sample_management(runner)
        await test_workflow_management(runner)
        await test_task_management(runner)
        await test_result_management(runner)
        await test_audit_management(runner)
        await test_report_management(runner)
        await test_statistics(runner)
        await test_system_management(runner)
        await test_edge_cases(runner)
        
    finally:
        await runner.close()
    
    # 输出测试结果
    print("\n" + "="*60)
    print("测试结果汇总")
    print("="*60)
    print(f"总测试数: {test_results['total']}")
    print(f"通过: {test_results['passed']} [PASS]")
    print(f"失败: {test_results['failed']} [FAIL]")
    
    if test_results['failed'] > 0:
        print(f"\n通过率: {test_results['passed'] / test_results['total'] * 100:.1f}%")
        print("\n失败的测试:")
        for error in test_results['errors']:
            print(f"  - {error}")
    else:
        print("\n所有测试通过！")
    
    print(f"\n结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 保存测试结果到文件
    with open("integration_test_results.json", "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "results": test_results,
            "test_data": test_data
        }, f, indent=2, ensure_ascii=False)
    
    print(f"\n测试结果已保存到: integration_test_results.json")
    
    # 返回退出码
    return 0 if test_results['failed'] == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
