#!/usr/bin/env python3
"""
监控系统测试脚本

测试 Prometheus、Grafana、Loki 和 Alertmanager 的连接和功能
"""

import requests
import time
import sys
from typing import Dict, List, Tuple
from datetime import datetime


class MonitoringTester:
    """监控系统测试器"""
    
    def __init__(
        self,
        prometheus_url: str = "http://localhost:9090",
        grafana_url: str = "http://localhost:3000",
        loki_url: str = "http://localhost:3100",
        alertmanager_url: str = "http://localhost:9093",
        fastapi_url: str = "http://localhost:8000"
    ):
        self.prometheus_url = prometheus_url
        self.grafana_url = grafana_url
        self.loki_url = loki_url
        self.alertmanager_url = alertmanager_url
        self.fastapi_url = fastapi_url
        self.results: List[Tuple[str, bool, str]] = []
    
    def test_prometheus_health(self) -> bool:
        """测试 Prometheus 健康状态"""
        try:
            response = requests.get(f"{self.prometheus_url}/-/healthy", timeout=5)
            success = response.status_code == 200
            message = "Prometheus 健康检查通过" if success else f"Prometheus 健康检查失败: {response.status_code}"
            self.results.append(("Prometheus 健康检查", success, message))
            return success
        except Exception as e:
            self.results.append(("Prometheus 健康检查", False, f"连接失败: {str(e)}"))
            return False
    
    def test_prometheus_targets(self) -> bool:
        """测试 Prometheus 目标状态"""
        try:
            response = requests.get(f"{self.prometheus_url}/api/v1/targets", timeout=5)
            if response.status_code != 200:
                self.results.append(("Prometheus 目标检查", False, f"API 调用失败: {response.status_code}"))
                return False
            
            data = response.json()
            active_targets = data.get("data", {}).get("activeTargets", [])
            
            # 检查每个目标的状态
            all_up = True
            target_status = []
            for target in active_targets:
                job = target.get("labels", {}).get("job", "unknown")
                health = target.get("health", "unknown")
                target_status.append(f"{job}: {health}")
                if health != "up":
                    all_up = False
            
            message = "所有目标正常" if all_up else f"部分目标异常: {', '.join(target_status)}"
            self.results.append(("Prometheus 目标检查", all_up, message))
            return all_up
        except Exception as e:
            self.results.append(("Prometheus 目标检查", False, f"检查失败: {str(e)}"))
            return False
    
    def test_prometheus_metrics(self) -> bool:
        """测试 Prometheus 指标收集"""
        try:
            # 查询 FastAPI 应用的指标
            query = "up{job='fastapi-backend'}"
            response = requests.get(
                f"{self.prometheus_url}/api/v1/query",
                params={"query": query},
                timeout=5
            )
            
            if response.status_code != 200:
                self.results.append(("Prometheus 指标查询", False, f"查询失败: {response.status_code}"))
                return False
            
            data = response.json()
            result = data.get("data", {}).get("result", [])
            
            if not result:
                self.results.append(("Prometheus 指标查询", False, "未找到 FastAPI 应用指标"))
                return False
            
            value = result[0].get("value", [None, "0"])[1]
            success = value == "1"
            message = "FastAPI 应用指标正常" if success else "FastAPI 应用指标异常"
            self.results.append(("Prometheus 指标查询", success, message))
            return success
        except Exception as e:
            self.results.append(("Prometheus 指标查询", False, f"查询失败: {str(e)}"))
            return False
    
    def test_grafana_health(self) -> bool:
        """测试 Grafana 健康状态"""
        try:
            response = requests.get(f"{self.grafana_url}/api/health", timeout=5)
            success = response.status_code == 200
            message = "Grafana 健康检查通过" if success else f"Grafana 健康检查失败: {response.status_code}"
            self.results.append(("Grafana 健康检查", success, message))
            return success
        except Exception as e:
            self.results.append(("Grafana 健康检查", False, f"连接失败: {str(e)}"))
            return False
    
    def test_grafana_datasources(self) -> bool:
        """测试 Grafana 数据源配置"""
        try:
            # 使用默认的 admin/admin 凭据
            response = requests.get(
                f"{self.grafana_url}/api/datasources",
                auth=("admin", "admin"),
                timeout=5
            )
            
            if response.status_code != 200:
                self.results.append(("Grafana 数据源检查", False, f"API 调用失败: {response.status_code}"))
                return False
            
            datasources = response.json()
            datasource_names = [ds.get("name") for ds in datasources]
            
            required_datasources = ["Prometheus", "Loki"]
            missing = [ds for ds in required_datasources if ds not in datasource_names]
            
            if missing:
                message = f"缺少数据源: {', '.join(missing)}"
                self.results.append(("Grafana 数据源检查", False, message))
                return False
            
            self.results.append(("Grafana 数据源检查", True, f"数据源配置正常: {', '.join(datasource_names)}"))
            return True
        except Exception as e:
            self.results.append(("Grafana 数据源检查", False, f"检查失败: {str(e)}"))
            return False
    
    def test_loki_health(self) -> bool:
        """测试 Loki 健康状态"""
        try:
            response = requests.get(f"{self.loki_url}/ready", timeout=5)
            success = response.status_code == 200
            message = "Loki 健康检查通过" if success else f"Loki 健康检查失败: {response.status_code}"
            self.results.append(("Loki 健康检查", success, message))
            return success
        except Exception as e:
            self.results.append(("Loki 健康检查", False, f"连接失败: {str(e)}"))
            return False
    
    def test_loki_labels(self) -> bool:
        """测试 Loki 标签查询"""
        try:
            response = requests.get(f"{self.loki_url}/loki/api/v1/labels", timeout=5)
            
            if response.status_code != 200:
                self.results.append(("Loki 标签查询", False, f"查询失败: {response.status_code}"))
                return False
            
            data = response.json()
            labels = data.get("data", [])
            
            message = f"Loki 标签查询成功，找到 {len(labels)} 个标签"
            self.results.append(("Loki 标签查询", True, message))
            return True
        except Exception as e:
            self.results.append(("Loki 标签查询", False, f"查询失败: {str(e)}"))
            return False
    
    def test_alertmanager_health(self) -> bool:
        """测试 Alertmanager 健康状态"""
        try:
            response = requests.get(f"{self.alertmanager_url}/-/healthy", timeout=5)
            success = response.status_code == 200
            message = "Alertmanager 健康检查通过" if success else f"Alertmanager 健康检查失败: {response.status_code}"
            self.results.append(("Alertmanager 健康检查", success, message))
            return success
        except Exception as e:
            self.results.append(("Alertmanager 健康检查", False, f"连接失败: {str(e)}"))
            return False
    
    def test_alertmanager_config(self) -> bool:
        """测试 Alertmanager 配置"""
        try:
            response = requests.get(f"{self.alertmanager_url}/api/v1/status", timeout=5)
            
            if response.status_code != 200:
                self.results.append(("Alertmanager 配置检查", False, f"API 调用失败: {response.status_code}"))
                return False
            
            data = response.json()
            config = data.get("data", {}).get("config", {})
            
            if not config:
                self.results.append(("Alertmanager 配置检查", False, "配置为空"))
                return False
            
            self.results.append(("Alertmanager 配置检查", True, "配置加载成功"))
            return True
        except Exception as e:
            self.results.append(("Alertmanager 配置检查", False, f"检查失败: {str(e)}"))
            return False
    
    def test_fastapi_metrics_endpoint(self) -> bool:
        """测试 FastAPI 指标端点"""
        try:
            response = requests.get(f"{self.fastapi_url}/metrics", timeout=5)
            
            if response.status_code != 200:
                self.results.append(("FastAPI 指标端点", False, f"端点访问失败: {response.status_code}"))
                return False
            
            metrics_text = response.text
            
            # 检查是否包含关键指标
            required_metrics = [
                "http_requests_total",
                "http_request_duration_seconds"
            ]
            
            missing_metrics = [m for m in required_metrics if m not in metrics_text]
            
            if missing_metrics:
                message = f"缺少指标: {', '.join(missing_metrics)}"
                self.results.append(("FastAPI 指标端点", False, message))
                return False
            
            self.results.append(("FastAPI 指标端点", True, "指标端点正常，包含所有必需指标"))
            return True
        except Exception as e:
            self.results.append(("FastAPI 指标端点", False, f"访问失败: {str(e)}"))
            return False
    
    def generate_test_traffic(self, num_requests: int = 10) -> bool:
        """生成测试流量"""
        try:
            print(f"\n生成 {num_requests} 个测试请求...")
            success_count = 0
            
            for i in range(num_requests):
                try:
                    response = requests.get(f"{self.fastapi_url}/health", timeout=2)
                    if response.status_code == 200:
                        success_count += 1
                    time.sleep(0.1)
                except:
                    pass
            
            message = f"成功发送 {success_count}/{num_requests} 个请求"
            self.results.append(("生成测试流量", success_count > 0, message))
            return success_count > 0
        except Exception as e:
            self.results.append(("生成测试流量", False, f"失败: {str(e)}"))
            return False
    
    def run_all_tests(self) -> bool:
        """运行所有测试"""
        print("=" * 80)
        print("监控系统测试")
        print("=" * 80)
        print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # 运行所有测试
        tests = [
            ("Prometheus", [
                self.test_prometheus_health,
                self.test_prometheus_targets,
                self.test_prometheus_metrics
            ]),
            ("Grafana", [
                self.test_grafana_health,
                self.test_grafana_datasources
            ]),
            ("Loki", [
                self.test_loki_health,
                self.test_loki_labels
            ]),
            ("Alertmanager", [
                self.test_alertmanager_health,
                self.test_alertmanager_config
            ]),
            ("FastAPI", [
                self.test_fastapi_metrics_endpoint
            ])
        ]
        
        all_passed = True
        
        for category, test_funcs in tests:
            print(f"\n{category} 测试:")
            print("-" * 80)
            
            for test_func in test_funcs:
                result = test_func()
                if not result:
                    all_passed = False
        
        # 生成测试流量
        print(f"\n测试流量生成:")
        print("-" * 80)
        self.generate_test_traffic(20)
        
        # 等待指标收集
        print("\n等待 15 秒以收集指标...")
        time.sleep(15)
        
        # 再次检查指标
        print(f"\n验证指标收集:")
        print("-" * 80)
        self.test_prometheus_metrics()
        
        # 打印结果摘要
        self.print_summary()
        
        return all_passed
    
    def print_summary(self):
        """打印测试结果摘要"""
        print("\n" + "=" * 80)
        print("测试结果摘要")
        print("=" * 80)
        
        passed = sum(1 for _, success, _ in self.results if success)
        total = len(self.results)
        
        for test_name, success, message in self.results:
            status = "✓ 通过" if success else "✗ 失败"
            print(f"{status:10} | {test_name:30} | {message}")
        
        print("\n" + "-" * 80)
        print(f"总计: {passed}/{total} 测试通过 ({passed/total*100:.1f}%)")
        print(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)


def main():
    """主函数"""
    tester = MonitoringTester()
    success = tester.run_all_tests()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
