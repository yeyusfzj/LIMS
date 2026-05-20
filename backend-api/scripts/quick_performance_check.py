"""
快速性能检查脚本

快速验证 FastAPI 后端的基本性能指标
适用于开发过程中的快速检查
"""

import asyncio
import time
import statistics
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# 配置
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:8001")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lab_db")

# 简化的目标
QUICK_TARGETS = {
    "api_response_p95": 200,  # ms
    "db_query_p95": 100,       # ms
}


async def quick_api_test():
    """快速 API 响应时间测试"""
    print("\n" + "=" * 60)
    print("快速 API 响应时间测试")
    print("=" * 60)
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # 测试健康检查端点
        times = []
        
        # 预热
        for _ in range(5):
            try:
                await client.get("/health")
            except:
                pass
        
        # 测试 50 次
        for _ in range(50):
            start = time.perf_counter()
            try:
                response = await client.get("/health")
                elapsed = (time.perf_counter() - start) * 1000
                if response.status_code == 200:
                    times.append(elapsed)
            except:
                pass
        
        if times:
            sorted_times = sorted(times)
            p95 = sorted_times[int(len(sorted_times) * 0.95)]
            avg = statistics.mean(times)
            
            passed = p95 < QUICK_TARGETS['api_response_p95']
            status = "✅" if passed else "❌"
            
            print(f"端点: GET /health")
            print(f"  请求数: {len(times)}")
            print(f"  平均响应时间: {avg:.2f} ms")
            print(f"  P95 响应时间: {p95:.2f} ms {status}")
            print(f"  目标: < {QUICK_TARGETS['api_response_p95']} ms")
            
            return passed
        else:
            print("❌ 无有效响应")
            return False


async def quick_db_test():
    """快速数据库查询时间测试"""
    print("\n" + "=" * 60)
    print("快速数据库查询时间测试")
    print("=" * 60)
    
    engine = create_async_engine(DATABASE_URL, pool_size=10, echo=False)
    
    try:
        async with engine.begin() as conn:
            # 简单查询
            query = 'SELECT COUNT(*) FROM "Sample"'
            times = []
            
            # 预热
            for _ in range(5):
                try:
                    await conn.execute(text(query))
                except:
                    pass
            
            # 测试 50 次
            for _ in range(50):
                start = time.perf_counter()
                try:
                    await conn.execute(text(query))
                    elapsed = (time.perf_counter() - start) * 1000
                    times.append(elapsed)
                except:
                    pass
            
            if times:
                sorted_times = sorted(times)
                p95 = sorted_times[int(len(sorted_times) * 0.95)]
                avg = statistics.mean(times)
                
                passed = p95 < QUICK_TARGETS['db_query_p95']
                status = "✅" if passed else "❌"
                
                print(f"查询: {query}")
                print(f"  执行次数: {len(times)}")
                print(f"  平均查询时间: {avg:.2f} ms")
                print(f"  P95 查询时间: {p95:.2f} ms {status}")
                print(f"  目标: < {QUICK_TARGETS['db_query_p95']} ms")
                
                return passed
            else:
                print("❌ 无有效查询结果")
                return False
    finally:
        await engine.dispose()


async def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("FastAPI 快速性能检查")
    print("=" * 60)
    print(f"目标服务: {BASE_URL}")
    print(f"数据库: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'N/A'}")
    
    try:
        # API 测试
        api_passed = await quick_api_test()
        
        # 数据库测试
        db_passed = await quick_db_test()
        
        # 总结
        print("\n" + "=" * 60)
        print("快速检查结果")
        print("=" * 60)
        print(f"API 响应时间: {'✅ 通过' if api_passed else '❌ 未通过'}")
        print(f"数据库查询时间: {'✅ 通过' if db_passed else '❌ 未通过'}")
        
        all_passed = api_passed and db_passed
        print("\n" + "-" * 60)
        print(f"总体结果: {'✅ 通过' if all_passed else '❌ 未通过'}")
        print("=" * 60)
        
        return all_passed
        
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
