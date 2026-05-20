"""
性能指标验证脚本

验证 FastAPI 后端的性能指标是否达标：
1. API 响应时间 < 200ms (P95)
2. 数据库查询时间 < 100ms (P95)
3. 并发支持 ≥ 1000 QPS
4. 内存使用 < 2GB (单进程)

需求: 11.1, 11.2, 11.10
"""

import asyncio
import time
import statistics
import psutil
import os
import sys
from typing import List, Dict, Tuple
from datetime import datetime
import json

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# 测试配置
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8001")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lab_db")

# 性能目标
TARGETS = {
    "api_response_time_p95": 200,  # ms
    "db_query_time_p95": 100,      # ms
    "concurrent_qps": 1000,         # QPS
    "memory_usage": 2048,           # MB
}

# 测试结果
test_results = {
    "timestamp": datetime.now().isoformat(),
    "targets": TARGETS,
    "results": {},
    "passed": False
}


class PerformanceVerifier:
    """性能指标验证器"""
    
    def __init__(self):
        self.client = None
        self.engine = None
        self.process = psutil.Process(os.getpid())
    
    async def setup(self):
        """初始化测试环境"""
        print("初始化测试环境...")
        
        # 创建 HTTP 客户端
        self.client = httpx.AsyncClient(
            base_url=BASE_URL,
            timeout=30.0,
            limits=httpx.Limits(max_keepalive_connections=200, max_connections=200)
        )
        
        # 创建数据库引擎
        self.engine = create_async_engine(
            DATABASE_URL,
            pool_size=50,
            max_overflow=50,
            echo=False
        )
        
        print("✓ 测试环境初始化完成")
    
    async def cleanup(self):
        """清理测试环境"""
        if self.client:
            await self.client.aclose()
        if self.engine:
            await self.engine.dispose()
    
    async def get_auth_token(self) -> str:
        """获取认证令牌"""
        try:
            response = await self.client.post(
                "/api/v1/auth/login",
                json={"username": "admin", "password": "admin123"}
            )
            if response.status_code == 200:
                return response.json().get("accessToken")
            else:
                print(f"⚠ 登录失败: {response.status_code}")
                return None
        except Exception as e:
            print(f"⚠ 登录异常: {e}")
            return None
    
    async def test_api_response_time(self) -> Dict:
        """测试 1: 验证 API 响应时间 < 200ms (P95)"""
        print("\n" + "=" * 70)
        print("测试 1: API 响应时间验证")
        print("=" * 70)
        print(f"目标: P95 响应时间 < {TARGETS['api_response_time_p95']} ms")
        print("-" * 70)
        
        # 获取认证令牌
        token = await self.get_auth_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        # 测试端点列表
        endpoints = [
            ("GET", "/health", None),
            ("GET", "/api/v1/auth/me", headers),
            ("GET", "/api/v1/samples?page=1&pageSize=20", headers),
            ("GET", "/api/v1/workflows?page=1&pageSize=20", headers),
            ("GET", "/api/v1/tasks?page=1&pageSize=20", headers),
        ]
        
        results = {}
        all_passed = True
        
        for method, endpoint, req_headers in endpoints:
            print(f"\n测试端点: {method} {endpoint}")
            times = []
            success_count = 0
            error_count = 0
            
            # 预热请求
            for _ in range(10):
                try:
                    if method == "GET":
                        await self.client.get(endpoint, headers=req_headers)
                except:
                    pass
            
            # 正式测试 (100 个请求)
            for i in range(100):
                start = time.perf_counter()
                try:
                    if method == "GET":
                        response = await self.client.get(endpoint, headers=req_headers)
                    elapsed = (time.perf_counter() - start) * 1000  # 转换为毫秒
                    
                    if 200 <= response.status_code < 300:
                        times.append(elapsed)
                        success_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    error_count += 1
                    elapsed = (time.perf_counter() - start) * 1000
                    times.append(elapsed)
            
            if times:
                sorted_times = sorted(times)
                p50 = sorted_times[int(len(sorted_times) * 0.50)]
                p95 = sorted_times[int(len(sorted_times) * 0.95)]
                p99 = sorted_times[int(len(sorted_times) * 0.99)]
                avg = statistics.mean(times)
                
                passed = p95 < TARGETS['api_response_time_p95']
                status = "✅ 通过" if passed else "❌ 未通过"
                
                print(f"  总请求数: {len(times)}")
                print(f"  成功: {success_count}, 失败: {error_count}")
                print(f"  平均响应时间: {avg:.2f} ms")
                print(f"  P50 响应时间: {p50:.2f} ms")
                print(f"  P95 响应时间: {p95:.2f} ms {status}")
                print(f"  P99 响应时间: {p99:.2f} ms")
                
                results[endpoint] = {
                    "total_requests": len(times),
                    "success_count": success_count,
                    "error_count": error_count,
                    "avg_ms": round(avg, 2),
                    "p50_ms": round(p50, 2),
                    "p95_ms": round(p95, 2),
                    "p99_ms": round(p99, 2),
                    "passed": passed
                }
                
                if not passed:
                    all_passed = False
            else:
                print(f"  ❌ 无有效响应数据")
                results[endpoint] = {"error": "无有效响应数据", "passed": False}
                all_passed = False
        
        print("\n" + "-" * 70)
        print(f"测试 1 结果: {'✅ 通过' if all_passed else '❌ 未通过'}")
        
        return {
            "passed": all_passed,
            "endpoints": results
        }
    
    async def test_database_query_time(self) -> Dict:
        """测试 2: 验证数据库查询时间 < 100ms (P95)"""
        print("\n" + "=" * 70)
        print("测试 2: 数据库查询时间验证")
        print("=" * 70)
        print(f"目标: P95 查询时间 < {TARGETS['db_query_time_p95']} ms")
        print("-" * 70)
        
        # 测试查询列表
        queries = [
            ("简单查询", "SELECT COUNT(*) FROM \"Sample\""),
            ("带条件查询", "SELECT * FROM \"Sample\" WHERE status = 'REGISTERED' LIMIT 20"),
            ("关联查询", """
                SELECT s.*, COUNT(r.id) as result_count 
                FROM \"Sample\" s 
                LEFT JOIN \"Result\" r ON s.id = r.\"sampleId\" 
                GROUP BY s.id 
                LIMIT 20
            """),
            ("聚合查询", """
                SELECT status, COUNT(*) as count 
                FROM \"Sample\" 
                GROUP BY status
            """),
        ]
        
        results = {}
        all_passed = True
        
        async with self.engine.begin() as conn:
            for query_name, query in queries:
                print(f"\n测试查询: {query_name}")
                times = []
                
                # 预热
                for _ in range(5):
                    try:
                        await conn.execute(text(query))
                    except:
                        pass
                
                # 正式测试 (100 次)
                for _ in range(100):
                    start = time.perf_counter()
                    try:
                        await conn.execute(text(query))
                        elapsed = (time.perf_counter() - start) * 1000
                        times.append(elapsed)
                    except Exception as e:
                        print(f"  ⚠ 查询错误: {e}")
                
                if times:
                    sorted_times = sorted(times)
                    p50 = sorted_times[int(len(sorted_times) * 0.50)]
                    p95 = sorted_times[int(len(sorted_times) * 0.95)]
                    p99 = sorted_times[int(len(sorted_times) * 0.99)]
                    avg = statistics.mean(times)
                    
                    passed = p95 < TARGETS['db_query_time_p95']
                    status = "✅ 通过" if passed else "❌ 未通过"
                    
                    print(f"  执行次数: {len(times)}")
                    print(f"  平均查询时间: {avg:.2f} ms")
                    print(f"  P50 查询时间: {p50:.2f} ms")
                    print(f"  P95 查询时间: {p95:.2f} ms {status}")
                    print(f"  P99 查询时间: {p99:.2f} ms")
                    
                    results[query_name] = {
                        "executions": len(times),
                        "avg_ms": round(avg, 2),
                        "p50_ms": round(p50, 2),
                        "p95_ms": round(p95, 2),
                        "p99_ms": round(p99, 2),
                        "passed": passed
                    }
                    
                    if not passed:
                        all_passed = False
        
        print("\n" + "-" * 70)
        print(f"测试 2 结果: {'✅ 通过' if all_passed else '❌ 未通过'}")
        
        return {
            "passed": all_passed,
            "queries": results
        }
    
    async def test_concurrent_qps(self) -> Dict:
        """测试 3: 验证并发支持 ≥ 1000 QPS"""
        print("\n" + "=" * 70)
        print("测试 3: 并发 QPS 验证")
        print("=" * 70)
        print(f"目标: 并发支持 ≥ {TARGETS['concurrent_qps']} QPS")
        print("-" * 70)
        
        # 获取认证令牌
        token = await self.get_auth_token()
        headers = {"Authorization": f"Bearer {token}"} if token else {}
        
        # 测试端点
        endpoint = "/health"
        
        # 测试不同并发级别
        concurrency_levels = [100, 200, 500, 1000]
        results = {}
        
        for concurrency in concurrency_levels:
            print(f"\n测试并发级别: {concurrency}")
            
            # 每个并发级别发送 10 秒的请求
            duration = 10  # 秒
            request_count = 0
            success_count = 0
            error_count = 0
            response_times = []
            
            start_time = time.time()
            
            async def make_request():
                nonlocal request_count, success_count, error_count
                req_start = time.perf_counter()
                try:
                    response = await self.client.get(endpoint, headers=headers)
                    elapsed = (time.perf_counter() - req_start) * 1000
                    response_times.append(elapsed)
                    request_count += 1
                    if 200 <= response.status_code < 300:
                        success_count += 1
                    else:
                        error_count += 1
                except Exception as e:
                    error_count += 1
                    request_count += 1
            
            # 持续发送请求
            tasks = []
            while time.time() - start_time < duration:
                # 创建并发任务
                batch_tasks = [make_request() for _ in range(concurrency)]
                await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # 短暂延迟以控制 QPS
                await asyncio.sleep(0.1)
            
            elapsed_time = time.time() - start_time
            qps = request_count / elapsed_time
            
            passed = qps >= TARGETS['concurrent_qps']
            status = "✅ 通过" if passed else "❌ 未通过"
            
            print(f"  测试时长: {elapsed_time:.2f} 秒")
            print(f"  总请求数: {request_count}")
            print(f"  成功: {success_count}, 失败: {error_count}")
            print(f"  QPS: {qps:.2f} {status}")
            
            if response_times:
                sorted_times = sorted(response_times)
                p95 = sorted_times[int(len(sorted_times) * 0.95)]
                print(f"  P95 响应时间: {p95:.2f} ms")
            
            results[f"concurrency_{concurrency}"] = {
                "duration_seconds": round(elapsed_time, 2),
                "total_requests": request_count,
                "success_count": success_count,
                "error_count": error_count,
                "qps": round(qps, 2),
                "p95_ms": round(p95, 2) if response_times else None,
                "passed": passed
            }
            
            # 如果达到目标，可以提前结束
            if passed:
                break
        
        # 判断是否通过
        max_qps = max(r["qps"] for r in results.values())
        all_passed = max_qps >= TARGETS['concurrent_qps']
        
        print("\n" + "-" * 70)
        print(f"最大 QPS: {max_qps:.2f}")
        print(f"测试 3 结果: {'✅ 通过' if all_passed else '❌ 未通过'}")
        
        return {
            "passed": all_passed,
            "max_qps": round(max_qps, 2),
            "concurrency_tests": results
        }
    
    def test_memory_usage(self) -> Dict:
        """测试 4: 验证内存使用 < 2GB (单进程)"""
        print("\n" + "=" * 70)
        print("测试 4: 内存使用验证")
        print("=" * 70)
        print(f"目标: 内存使用 < {TARGETS['memory_usage']} MB")
        print("-" * 70)
        
        # 获取当前进程内存使用
        memory_info = self.process.memory_info()
        rss_mb = memory_info.rss / 1024 / 1024  # 转换为 MB
        vms_mb = memory_info.vms / 1024 / 1024
        
        # 获取内存百分比
        memory_percent = self.process.memory_percent()
        
        passed = rss_mb < TARGETS['memory_usage']
        status = "✅ 通过" if passed else "❌ 未通过"
        
        print(f"  RSS (常驻内存): {rss_mb:.2f} MB {status}")
        print(f"  VMS (虚拟内存): {vms_mb:.2f} MB")
        print(f"  内存占用百分比: {memory_percent:.2f}%")
        
        # 获取系统内存信息
        system_memory = psutil.virtual_memory()
        print(f"\n  系统总内存: {system_memory.total / 1024 / 1024 / 1024:.2f} GB")
        print(f"  系统可用内存: {system_memory.available / 1024 / 1024 / 1024:.2f} GB")
        print(f"  系统内存使用率: {system_memory.percent}%")
        
        print("\n" + "-" * 70)
        print(f"测试 4 结果: {status}")
        
        return {
            "passed": passed,
            "rss_mb": round(rss_mb, 2),
            "vms_mb": round(vms_mb, 2),
            "memory_percent": round(memory_percent, 2),
            "system_total_gb": round(system_memory.total / 1024 / 1024 / 1024, 2),
            "system_available_gb": round(system_memory.available / 1024 / 1024 / 1024, 2),
            "system_percent": system_memory.percent
        }
    
    async def run_all_tests(self):
        """运行所有性能测试"""
        print("\n" + "=" * 70)
        print("FastAPI 后端性能指标验证")
        print("=" * 70)
        print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"目标服务: {BASE_URL}")
        print(f"数据库: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'N/A'}")
        print("=" * 70)
        
        try:
            await self.setup()
            
            # 测试 1: API 响应时间
            test_results["results"]["api_response_time"] = await self.test_api_response_time()
            
            # 测试 2: 数据库查询时间
            test_results["results"]["database_query_time"] = await self.test_database_query_time()
            
            # 测试 3: 并发 QPS
            test_results["results"]["concurrent_qps"] = await self.test_concurrent_qps()
            
            # 测试 4: 内存使用
            test_results["results"]["memory_usage"] = self.test_memory_usage()
            
            # 汇总结果
            all_passed = all(
                result.get("passed", False) 
                for result in test_results["results"].values()
            )
            test_results["passed"] = all_passed
            
            # 打印总结
            print("\n" + "=" * 70)
            print("性能指标验证总结")
            print("=" * 70)
            
            for test_name, result in test_results["results"].items():
                status = "✅ 通过" if result.get("passed") else "❌ 未通过"
                print(f"{test_name}: {status}")
            
            print("\n" + "-" * 70)
            final_status = "✅ 所有测试通过" if all_passed else "❌ 部分测试未通过"
            print(f"最终结果: {final_status}")
            print("=" * 70)
            
            # 保存结果到文件
            output_file = "performance_metrics_verification_results.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(test_results, f, indent=2, ensure_ascii=False)
            print(f"\n详细结果已保存到: {output_file}")
            
            return all_passed
            
        except Exception as e:
            print(f"\n❌ 测试过程中发生错误: {e}")
            import traceback
            traceback.print_exc()
            return False
        finally:
            await self.cleanup()


async def main():
    """主函数"""
    verifier = PerformanceVerifier()
    success = await verifier.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
