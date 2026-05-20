"""
简单的性能测试脚本
使用 requests 库进行基本的性能测试
"""
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# 测试配置
BASE_URL = "http://localhost:8001"
NUM_REQUESTS = 1000
NUM_WORKERS = 100

# 测试结果
results = {
    "health_check": [],
    "auth_login": [],
    "auth_me": [],
}

def test_health_check():
    """测试健康检查端点"""
    start = time.time()
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        elapsed = time.time() - start
        return ("health_check", elapsed, response.status_code)
    except Exception as e:
        elapsed = time.time() - start
        return ("health_check", elapsed, 0)

def test_auth_login():
    """测试登录端点"""
    start = time.time()
    try:
        response = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"username": "admin", "password": "admin123"},
            timeout=10
        )
        elapsed = time.time() - start
        return ("auth_login", elapsed, response.status_code)
    except Exception as e:
        elapsed = time.time() - start
        return ("auth_login", elapsed, 0)

def test_auth_me(token):
    """测试获取当前用户信息端点"""
    start = time.time()
    try:
        response = requests.get(
            f"{BASE_URL}/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        elapsed = time.time() - start
        return ("auth_me", elapsed, response.status_code)
    except Exception as e:
        elapsed = time.time() - start
        return ("auth_me", elapsed, 0)

def run_performance_test():
    """运行性能测试"""
    print(f"开始性能测试: {datetime.now()}")
    print(f"目标: {BASE_URL}")
    print(f"请求数: {NUM_REQUESTS}")
    print(f"并发数: {NUM_WORKERS}")
    print("-" * 60)
    
    # 先获取一个有效的 token
    print("获取认证令牌...")
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"username": "admin", "password": "admin123"}
    )
    if response.status_code == 200:
        token = response.json().get("accessToken")
        print(f"✓ 令牌获取成功")
    else:
        print(f"✗ 令牌获取失败: {response.status_code}")
        token = None
    
    print("\n测试 1: 健康检查端点 (/health)")
    print("-" * 60)
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = [executor.submit(test_health_check) for _ in range(NUM_REQUESTS)]
        for future in as_completed(futures):
            endpoint, elapsed, status = future.result()
            results[endpoint].append((elapsed, status))
    
    print("\n测试 2: 登录端点 (/api/v1/auth/login)")
    print("-" * 60)
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = [executor.submit(test_auth_login) for _ in range(NUM_REQUESTS)]
        for future in as_completed(futures):
            endpoint, elapsed, status = future.result()
            results[endpoint].append((elapsed, status))
    
    if token:
        print("\n测试 3: 获取当前用户信息 (/api/v1/auth/me)")
        print("-" * 60)
        with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
            futures = [executor.submit(test_auth_me, token) for _ in range(NUM_REQUESTS)]
            for future in as_completed(futures):
                endpoint, elapsed, status = future.result()
                results[endpoint].append((elapsed, status))
    
    # 分析结果
    print("\n" + "=" * 60)
    print("性能测试结果")
    print("=" * 60)
    
    for endpoint, data in results.items():
        if not data:
            continue
        
        times = [t for t, s in data]
        statuses = [s for t, s in data]
        
        success_count = sum(1 for s in statuses if 200 <= s < 300)
        error_count = len(statuses) - success_count
        
        print(f"\n端点: {endpoint}")
        print(f"  总请求数: {len(data)}")
        print(f"  成功请求: {success_count} ({success_count/len(data)*100:.1f}%)")
        print(f"  失败请求: {error_count} ({error_count/len(data)*100:.1f}%)")
        print(f"  平均响应时间: {statistics.mean(times)*1000:.2f} ms")
        print(f"  中位数响应时间: {statistics.median(times)*1000:.2f} ms")
        print(f"  最小响应时间: {min(times)*1000:.2f} ms")
        print(f"  最大响应时间: {max(times)*1000:.2f} ms")
        if len(times) > 1:
            print(f"  标准差: {statistics.stdev(times)*1000:.2f} ms")
        
        # 计算 P95 和 P99
        sorted_times = sorted(times)
        p95_index = int(len(sorted_times) * 0.95)
        p99_index = int(len(sorted_times) * 0.99)
        print(f"  P95 响应时间: {sorted_times[p95_index]*1000:.2f} ms")
        print(f"  P99 响应时间: {sorted_times[p99_index]*1000:.2f} ms")
    
    print("\n" + "=" * 60)
    print(f"测试完成: {datetime.now()}")
    print("=" * 60)

if __name__ == "__main__":
    run_performance_test()
