#!/usr/bin/env python3
"""
日志系统测试脚本

测试应用日志记录和 Loki 日志聚合功能
"""

import requests
import time
import sys
import json
from typing import List, Dict, Any
from datetime import datetime, timedelta


class LoggingTester:
    """日志系统测试器"""
    
    def __init__(
        self,
        loki_url: str = "http://localhost:3100",
        fastapi_url: str = "http://localhost:8000"
    ):
        self.loki_url = loki_url
        self.fastapi_url = fastapi_url
        self.test_results: List[Dict[str, Any]] = []
    
    def generate_test_logs(self) -> bool:
        """生成测试日志"""
        print("生成测试日志...")
        
        try:
            # 生成不同类型的请求以产生不同的日志
            test_requests = [
                ("GET", "/health", 200),
                ("GET", "/health/detailed", 200),
                ("GET", "/api/v1/samples", 401),  # 未授权
                ("GET", "/api/v1/nonexistent", 404),  # 不存在的端点
                ("POST", "/api/v1/auth/login", 200),  # 登录请求
            ]
            
            for method, path, expected_status in test_requests:
                try:
                    if method == "GET":
                        response = requests.get(f"{self.fastapi_url}{path}", timeout=2)
                    elif method == "POST":
                        response = requests.post(
                            f"{self.fastapi_url}{path}",
                            json={"username": "test", "password": "test"},
                            timeout=2
                        )
                    
                    print(f"  {method} {path}: {response.status_code}")
                    time.sleep(0.5)
                except Exception as e:
                    print(f"  {method} {path}: 错误 - {str(e)}")
            
            self.test_results.append({
                "test": "生成测试日志",
                "success": True,
                "message": f"成功生成 {len(test_requests)} 个测试请求"
            })
            return True
        except Exception as e:
            self.test_results.append({
                "test": "生成测试日志",
                "success": False,
                "message": f"失败: {str(e)}"
            })
            return False
    
    def query_logs_by_job(self, job: str = "fastapi-backend") -> bool:
        """按 job 查询日志"""
        print(f"\n查询 {job} 的日志...")
        
        try:
            # 查询最近 5 分钟的日志
            end_time = datetime.now()
            start_time = end_time - timedelta(minutes=5)
            
            query = f'{{job="{job}"}}'
            params = {
                "query": query,
                "start": int(start_time.timestamp() * 1e9),  # 纳秒
                "end": int(end_time.timestamp() * 1e9),
                "limit": 100
            }
            
            response = requests.get(
                f"{self.loki_url}/loki/api/v1/query_range",
                params=params,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_results.append({
                    "test": f"查询 {job} 日志",
                    "success": False,
                    "message": f"查询失败: {response.status_code}"
                })
                return False
            
            data = response.json()
            result = data.get("data", {}).get("result", [])
            
            total_logs = sum(len(stream.get("values", [])) for stream in result)
            
            print(f"  找到 {len(result)} 个日志流")
            print(f"  总共 {total_logs} 条日志")
            
            # 显示一些日志样本
            if result and total_logs > 0:
                print("\n  日志样本:")
                for stream in result[:2]:  # 只显示前两个流
                    labels = stream.get("stream", {})
                    values = stream.get("values", [])[:3]  # 每个流显示前3条
                    
                    print(f"    标签: {labels}")
                    for timestamp, log_line in values:
                        print(f"      {log_line[:100]}...")
            
            self.test_results.append({
                "test": f"查询 {job} 日志",
                "success": total_logs > 0,
                "message": f"找到 {total_logs} 条日志"
            })
            return total_logs > 0
        except Exception as e:
            self.test_results.append({
                "test": f"查询 {job} 日志",
                "success": False,
                "message": f"查询失败: {str(e)}"
            })
            return False
    
    def query_logs_by_level(self, level: str = "ERROR") -> bool:
        """按日志级别查询"""
        print(f"\n查询 {level} 级别的日志...")
        
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(hours=1)
            
            query = f'{{job="fastapi-backend", level="{level}"}}'
            params = {
                "query": query,
                "start": int(start_time.timestamp() * 1e9),
                "end": int(end_time.timestamp() * 1e9),
                "limit": 50
            }
            
            response = requests.get(
                f"{self.loki_url}/loki/api/v1/query_range",
                params=params,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_results.append({
                    "test": f"查询 {level} 日志",
                    "success": False,
                    "message": f"查询失败: {response.status_code}"
                })
                return False
            
            data = response.json()
            result = data.get("data", {}).get("result", [])
            total_logs = sum(len(stream.get("values", [])) for stream in result)
            
            print(f"  找到 {total_logs} 条 {level} 级别的日志")
            
            self.test_results.append({
                "test": f"查询 {level} 日志",
                "success": True,
                "message": f"找到 {total_logs} 条日志"
            })
            return True
        except Exception as e:
            self.test_results.append({
                "test": f"查询 {level} 日志",
                "success": False,
                "message": f"查询失败: {str(e)}"
            })
            return False
    
    def test_log_search(self, search_term: str = "health") -> bool:
        """测试日志搜索"""
        print(f"\n搜索包含 '{search_term}' 的日志...")
        
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(minutes=10)
            
            query = f'{{job="fastapi-backend"}} |= "{search_term}"'
            params = {
                "query": query,
                "start": int(start_time.timestamp() * 1e9),
                "end": int(end_time.timestamp() * 1e9),
                "limit": 20
            }
            
            response = requests.get(
                f"{self.loki_url}/loki/api/v1/query_range",
                params=params,
                timeout=10
            )
            
            if response.status_code != 200:
                self.test_results.append({
                    "test": f"搜索 '{search_term}'",
                    "success": False,
                    "message": f"搜索失败: {response.status_code}"
                })
                return False
            
            data = response.json()
            result = data.get("data", {}).get("result", [])
            total_logs = sum(len(stream.get("values", [])) for stream in result)
            
            print(f"  找到 {total_logs} 条匹配的日志")
            
            # 显示一些匹配的日志
            if result and total_logs > 0:
                print("\n  匹配的日志样本:")
                for stream in result[:1]:
                    values = stream.get("values", [])[:3]
                    for timestamp, log_line in values:
                        print(f"    {log_line[:150]}...")
            
            self.test_results.append({
                "test": f"搜索 '{search_term}'",
                "success": True,
                "message": f"找到 {total_logs} 条匹配日志"
            })
            return True
        except Exception as e:
            self.test_results.append({
                "test": f"搜索 '{search_term}'",
                "success": False,
                "message": f"搜索失败: {str(e)}"
            })
            return False
    
    def test_log_labels(self) -> bool:
        """测试日志标签"""
        print("\n查询可用的日志标签...")
        
        try:
            response = requests.get(f"{self.loki_url}/loki/api/v1/labels", timeout=5)
            
            if response.status_code != 200:
                self.test_results.append({
                    "test": "查询日志标签",
                    "success": False,
                    "message": f"查询失败: {response.status_code}"
                })
                return False
            
            data = response.json()
            labels = data.get("data", [])
            
            print(f"  找到 {len(labels)} 个标签:")
            for label in labels:
                print(f"    - {label}")
            
            # 检查必需的标签
            required_labels = ["job", "level"]
            missing_labels = [label for label in required_labels if label not in labels]
            
            if missing_labels:
                message = f"缺少必需标签: {', '.join(missing_labels)}"
                self.test_results.append({
                    "test": "查询日志标签",
                    "success": False,
                    "message": message
                })
                return False
            
            self.test_results.append({
                "test": "查询日志标签",
                "success": True,
                "message": f"找到 {len(labels)} 个标签，包含所有必需标签"
            })
            return True
        except Exception as e:
            self.test_results.append({
                "test": "查询日志标签",
                "success": False,
                "message": f"查询失败: {str(e)}"
            })
            return False
    
    def run_all_tests(self) -> bool:
        """运行所有测试"""
        print("=" * 80)
        print("日志系统测试")
        print("=" * 80)
        print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # 1. 生成测试日志
        self.generate_test_logs()
        
        # 等待日志被收集
        print("\n等待 10 秒以收集日志...")
        time.sleep(10)
        
        # 2. 测试日志标签
        self.test_log_labels()
        
        # 3. 按 job 查询日志
        self.query_logs_by_job("fastapi-backend")
        
        # 4. 按级别查询日志
        for level in ["INFO", "WARNING", "ERROR"]:
            self.query_logs_by_level(level)
        
        # 5. 测试日志搜索
        self.test_log_search("health")
        self.test_log_search("api")
        
        # 打印结果摘要
        self.print_summary()
        
        # 检查是否所有测试都通过
        all_passed = all(result["success"] for result in self.test_results)
        return all_passed
    
    def print_summary(self):
        """打印测试结果摘要"""
        print("\n" + "=" * 80)
        print("测试结果摘要")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✓ 通过" if result["success"] else "✗ 失败"
            print(f"{status:10} | {result['test']:30} | {result['message']}")
        
        print("\n" + "-" * 80)
        print(f"总计: {passed}/{total} 测试通过 ({passed/total*100:.1f}%)")
        print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)


def main():
    """主函数"""
    tester = LoggingTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
