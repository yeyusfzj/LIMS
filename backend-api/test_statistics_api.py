"""
统计分析 API 测试脚本

测试统计分析服务的各个端点
"""

import asyncio
import httpx
from datetime import datetime, timedelta


BASE_URL = "http://localhost:8000"
TOKEN = None


async def login():
    """登录获取令牌"""
    global TOKEN
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            TOKEN = data["data"]["access_token"]
            print("✓ 登录成功")
            return True
        else:
            print(f"✗ 登录失败: {response.text}")
            return False


async def test_overview_statistics():
    """测试综合统计"""
    print("\n=== 测试综合统计 ===")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    # 测试不带时间范围的统计
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/overview",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ 获取综合统计成功")
            print(f"  样品统计: {data['data']['samples']}")
            print(f"  任务统计: {data['data']['tasks']}")
            print(f"  报告统计: {data['data']['reports']}")
        else:
            print(f"✗ 获取综合统计失败: {response.text}")
    
    # 测试带时间范围的统计
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/overview",
            params={
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ 获取30天综合统计成功")
        else:
            print(f"✗ 获取30天综合统计失败: {response.text}")


async def test_audit_statistics():
    """测试审核统计"""
    print("\n=== 测试审核统计 ===")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/audit",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ 获取审核统计成功")
            print(f"  通过率: {data['data']['pass_rate']}")
            print(f"  时长统计: {data['data']['duration']}")
            print(f"  问题分布: {len(data['data']['issue_distribution'])} 种问题")
        else:
            print(f"✗ 获取审核统计失败: {response.text}")


async def test_workload_statistics():
    """测试工作量统计"""
    print("\n=== 测试工作量统计 ===")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/workload",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ 获取工作量统计成功")
            print(f"  审核人员数量: {len(data['data']['by_auditor'])}")
            for auditor in data['data']['by_auditor'][:3]:  # 显示前3个
                print(f"    - {auditor['auditor_name']}: {auditor['total_tasks']} 个任务")
        else:
            print(f"✗ 获取工作量统计失败: {response.text}")


async def test_quality_statistics():
    """测试质量统计"""
    print("\n=== 测试质量统计 ===")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/quality",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✓ 获取质量统计成功")
            print(f"  总样品数: {data['data']['total_samples']}")
            print(f"  合格样品数: {data['data']['qualified_samples']}")
            print(f"  合格率: {data['data']['qualified_rate']}%")
        else:
            print(f"✗ 获取质量统计失败: {response.text}")


async def test_cache_operations():
    """测试缓存操作"""
    print("\n=== 测试缓存操作 ===")
    
    headers = {"Authorization": f"Bearer {TOKEN}"}
    
    # 第一次请求（不使用缓存）
    async with httpx.AsyncClient() as client:
        start_time = datetime.now()
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/overview",
            params={"use_cache": "false"},
            headers=headers
        )
        first_duration = (datetime.now() - start_time).total_seconds()
        
        if response.status_code == 200:
            print(f"✓ 第一次请求成功 (耗时: {first_duration:.3f}s)")
        else:
            print(f"✗ 第一次请求失败: {response.text}")
    
    # 第二次请求（使用缓存）
    async with httpx.AsyncClient() as client:
        start_time = datetime.now()
        response = await client.get(
            f"{BASE_URL}/api/v1/statistics/overview",
            params={"use_cache": "true"},
            headers=headers
        )
        second_duration = (datetime.now() - start_time).total_seconds()
        
        if response.status_code == 200:
            print(f"✓ 第二次请求成功 (耗时: {second_duration:.3f}s, 使用缓存)")
            if second_duration < first_duration:
                print(f"  缓存加速: {(first_duration - second_duration) / first_duration * 100:.1f}%")
        else:
            print(f"✗ 第二次请求失败: {response.text}")
    
    # 清除缓存
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{BASE_URL}/api/v1/statistics/cache",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 清除缓存成功: {data['data']['count']} 个条目")
        else:
            print(f"✗ 清除缓存失败: {response.text}")


async def main():
    """主测试函数"""
    print("=" * 60)
    print("统计分析 API 测试")
    print("=" * 60)
    
    # 登录
    if not await login():
        print("\n测试终止：登录失败")
        return
    
    # 运行测试
    await test_overview_statistics()
    await test_audit_statistics()
    await test_workload_statistics()
    await test_quality_statistics()
    await test_cache_operations()
    
    print("\n" + "=" * 60)
    print("测试完成")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
