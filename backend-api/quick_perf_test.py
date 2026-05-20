"""
快速性能测试 - 测试优化效果
"""
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://localhost:8001"

def test_health():
    """测试健康检查"""
    start = time.time()
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=5)
        return time.time() - start, r.status_code
    except:
        return time.time() - start, 0

def test_login():
    """测试登录"""
    start = time.time()
    try:
        r = requests.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={"username": "testuser", "password": "password123"},
            timeout=5
        )
        return time.time() - start, r.status_code
    except:
        return time.time() - start, 0

print("快速性能测试 - 优化后")
print("=" * 60)

# 测试 1: 健康检查 (100 并发, 500 请求)
print("\n测试 1: 健康检查端点")
print("-" * 60)
with ThreadPoolExecutor(max_workers=100) as executor:
    futures = [executor.submit(test_health) for _ in range(500)]
    results = [f.result() for f in futures]

times = [t for t, s in results]
success = sum(1 for t, s in results if 200 <= s < 300)

print(f"总请求: {len(results)}")
print(f"成功: {success} ({success/len(results)*100:.1f}%)")
print(f"平均响应时间: {statistics.mean(times)*1000:.2f} ms")
print(f"P95 响应时间: {sorted(times)[int(len(times)*0.95)]*1000:.2f} ms")
print(f"目标: < 200ms")

# 测试 2: 登录端点 (50 并发, 100 请求 - 避免触发限流)
print("\n测试 2: 登录端点")
print("-" * 60)
with ThreadPoolExecutor(max_workers=50) as executor:
    futures = [executor.submit(test_login) for _ in range(100)]
    results = [f.result() for f in futures]

times = [t for t, s in results]
success = sum(1 for t, s in results if 200 <= s < 300)
errors = [(t, s) for t, s in results if not (200 <= s < 300)]

print(f"总请求: {len(results)}")
print(f"成功: {success} ({success/len(results)*100:.1f}%)")
print(f"失败: {len(errors)}")
if errors:
    print(f"失败状态码: {set(s for t, s in errors)}")
print(f"平均响应时间: {statistics.mean(times)*1000:.2f} ms")
if len(times) > 1:
    print(f"P95 响应时间: {sorted(times)[int(len(times)*0.95)]*1000:.2f} ms")

print("\n" + "=" * 60)
print("测试完成")
