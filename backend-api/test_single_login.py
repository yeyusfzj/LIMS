"""
测试单个登录请求
"""
import requests
import time

BASE_URL = "http://localhost:8001"

print("测试单个登录请求...")
print("-" * 60)

start = time.time()
try:
    response = requests.post(
        f"{BASE_URL}/api/v1/auth/login",
        json={"username": "testuser", "password": "password123"},
        timeout=10
    )
    elapsed = time.time() - start
    
    print(f"状态码: {response.status_code}")
    print(f"响应时间: {elapsed*1000:.2f} ms")
    print(f"响应内容: {response.text[:200]}")
    
    if response.status_code == 200:
        print("\n✓ 登录成功!")
    else:
        print("\n✗ 登录失败")
        
except Exception as e:
    elapsed = time.time() - start
    print(f"✗ 请求失败: {str(e)}")
    print(f"响应时间: {elapsed*1000:.2f} ms")
