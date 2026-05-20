"""
性能监控服务验证脚本

验证性能监控服务的基本功能。
"""
import asyncio
from datetime import datetime, timedelta


async def verify_performance_service():
    """验证性能监控服务"""
    print("=" * 60)
    print("性能监控服务验证")
    print("=" * 60)
    
    try:
        from app.services.performance_service import performance_service
        print("✅ 性能监控服务导入成功")
    except Exception as e:
        print(f"❌ 性能监控服务导入失败: {e}")
        return
    
    # 测试 1: 记录 API 性能指标
    print("\n测试 1: 记录 API 性能指标")
    try:
        await performance_service.record_api_metric(
            method="GET",
            path="/api/v1/samples",
            duration=150.5,
            status_code=200,
            user_id="test-user"
        )
        print("✅ API 性能指标记录成功")
    except Exception as e:
        print(f"❌ API 性能指标记录失败: {e}")
    
    # 测试 2: 记录慢请求
    print("\n测试 2: 记录慢请求")
    try:
        await performance_service.record_api_metric(
            method="POST",
            path="/api/v1/samples",
            duration=1500.0,
            status_code=201,
            user_id="test-user"
        )
        print("✅ 慢请求记录成功")
    except Exception as e:
        print(f"❌ 慢请求记录失败: {e}")
    
    # 测试 3: 记录数据库性能指标
    print("\n测试 3: 记录数据库性能指标")
    try:
        await performance_service.record_database_metric(
            query="SELECT * FROM samples WHERE id = $1",
            duration=50.0,
            model="Sample",
            operation="select"
        )
        print("✅ 数据库性能指标记录成功")
    except Exception as e:
        print(f"❌ 数据库性能指标记录失败: {e}")
    
    # 测试 4: 记录慢查询
    print("\n测试 4: 记录慢查询")
    try:
        await performance_service.record_database_metric(
            query="SELECT * FROM samples JOIN results",
            duration=1200.0,
            model="Sample",
            operation="select"
        )
        print("✅ 慢查询记录成功")
    except Exception as e:
        print(f"❌ 慢查询记录失败: {e}")
    
    # 测试 5: 获取慢请求列表
    print("\n测试 5: 获取慢请求列表")
    try:
        slow_requests = await performance_service.get_slow_requests(limit=10)
        print(f"✅ 获取慢请求列表成功，共 {len(slow_requests)} 条记录")
        if slow_requests:
            print(f"   示例: {slow_requests[0]}")
    except Exception as e:
        print(f"❌ 获取慢请求列表失败: {e}")
    
    # 测试 6: 获取慢查询列表
    print("\n测试 6: 获取慢查询列表")
    try:
        slow_queries = await performance_service.get_slow_queries(limit=10)
        print(f"✅ 获取慢查询列表成功，共 {len(slow_queries)} 条记录")
        if slow_queries:
            print(f"   示例: {slow_queries[0]}")
    except Exception as e:
        print(f"❌ 获取慢查询列表失败: {e}")
    
    # 测试 7: 获取性能统计
    print("\n测试 7: 获取性能统计")
    try:
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=1)
        stats = await performance_service.get_performance_stats(start_time, end_time)
        print("✅ 获取性能统计成功")
        print(f"   API 统计: {stats.get('apiStats', {})}")
        print(f"   数据库统计: {stats.get('databaseStats', {})}")
    except Exception as e:
        print(f"❌ 获取性能统计失败: {e}")
    
    # 测试 8: 获取路径统计
    print("\n测试 8: 获取路径统计")
    try:
        path_stats = await performance_service.get_path_stats(limit=10)
        print(f"✅ 获取路径统计成功，共 {len(path_stats)} 条记录")
        if path_stats:
            print(f"   示例: {path_stats[0]}")
    except Exception as e:
        print(f"❌ 获取路径统计失败: {e}")
    
    # 测试 9: 百分位数计算
    print("\n测试 9: 百分位数计算")
    try:
        values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        p50 = performance_service._calculate_percentile(values, 50)
        p95 = performance_service._calculate_percentile(values, 95)
        p99 = performance_service._calculate_percentile(values, 99)
        print(f"✅ 百分位数计算成功")
        print(f"   P50: {p50}, P95: {p95}, P99: {p99}")
    except Exception as e:
        print(f"❌ 百分位数计算失败: {e}")
    
    # 测试 10: API 统计数据计算
    print("\n测试 10: API 统计数据计算")
    try:
        metrics = [
            {"duration": 100, "status_code": 200},
            {"duration": 200, "status_code": 200},
            {"duration": 300, "status_code": 400},
            {"duration": 1500, "status_code": 200},
            {"duration": 150, "status_code": 500},
        ]
        api_stats = performance_service._calculate_api_stats(metrics)
        print(f"✅ API 统计数据计算成功")
        print(f"   总请求数: {api_stats['totalRequests']}")
        print(f"   平均响应时间: {api_stats['averageDuration']:.2f}ms")
        print(f"   慢请求数: {api_stats['slowRequestCount']}")
        print(f"   错误率: {api_stats['errorRate']:.2%}")
    except Exception as e:
        print(f"❌ API 统计数据计算失败: {e}")
    
    # 测试 11: 数据库统计数据计算
    print("\n测试 11: 数据库统计数据计算")
    try:
        metrics = [
            {"duration": 50},
            {"duration": 100},
            {"duration": 1200},
            {"duration": 80},
            {"duration": 1500},
        ]
        db_stats = performance_service._calculate_database_stats(metrics)
        print(f"✅ 数据库统计数据计算成功")
        print(f"   总查询数: {db_stats['totalQueries']}")
        print(f"   平均查询时间: {db_stats['averageDuration']:.2f}ms")
        print(f"   慢查询数: {db_stats['slowQueryCount']}")
    except Exception as e:
        print(f"❌ 数据库统计数据计算失败: {e}")
    
    print("\n" + "=" * 60)
    print("验证完成")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(verify_performance_service())
