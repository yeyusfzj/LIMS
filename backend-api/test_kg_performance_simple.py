"""
简单的知识图谱性能测试脚本
"""

import time
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.agent.knowledge_graph import KnowledgeGraph


def test_performance():
    """测试知识图谱查询性能"""
    print("=" * 60)
    print("知识图谱性能测试")
    print("=" * 60)
    
    # 1. 测试初始化性能
    print("\n1. 测试初始化性能...")
    start_time = time.time()
    kg = KnowledgeGraph()
    init_duration = time.time() - start_time
    print(f"   初始化耗时: {init_duration * 1000:.2f}ms")
    
    # 获取统计信息
    stats = kg.get_statistics()
    print(f"   知识图谱统计: {stats}")
    
    # 获取所有实验类型
    experiment_types = kg.get_all_experiment_types()
    print(f"   实验类型数量: {len(experiment_types)}")
    
    if not experiment_types:
        print("\n⚠️  警告: 没有实验类型数据，无法进行查询测试")
        return
    
    experiment_id = experiment_types[0].id
    print(f"   测试实验类型: {experiment_id}")
    
    # 2. 测试设备查询性能
    print("\n2. 测试设备查询性能...")
    start_time = time.time()
    equipment = kg.query_equipment(experiment_id)
    duration = time.time() - start_time
    print(f"   查询耗时: {duration * 1000:.2f}ms")
    print(f"   查询结果: {len(equipment)} 个设备")
    if duration < 0.5:
        print(f"   ✅ 通过: 查询时间 < 500ms")
    else:
        print(f"   ❌ 失败: 查询时间 {duration * 1000:.2f}ms >= 500ms")
    
    # 3. 测试材料查询性能
    print("\n3. 测试材料查询性能...")
    start_time = time.time()
    materials = kg.query_materials(experiment_id)
    duration = time.time() - start_time
    print(f"   查询耗时: {duration * 1000:.2f}ms")
    print(f"   查询结果: {len(materials)} 个材料")
    if duration < 0.5:
        print(f"   ✅ 通过: 查询时间 < 500ms")
    else:
        print(f"   ❌ 失败: 查询时间 {duration * 1000:.2f}ms >= 500ms")
    
    # 4. 测试指标查询性能
    print("\n4. 测试指标查询性能...")
    start_time = time.time()
    indicators = kg.query_indicators(experiment_id)
    duration = time.time() - start_time
    print(f"   查询耗时: {duration * 1000:.2f}ms")
    print(f"   查询结果: {len(indicators)} 个指标")
    if duration < 0.5:
        print(f"   ✅ 通过: 查询时间 < 500ms")
    else:
        print(f"   ❌ 失败: 查询时间 {duration * 1000:.2f}ms >= 500ms")
    
    # 5. 测试步骤查询性能
    print("\n5. 测试步骤查询性能...")
    start_time = time.time()
    steps = kg.query_steps(experiment_id)
    duration = time.time() - start_time
    print(f"   查询耗时: {duration * 1000:.2f}ms")
    print(f"   查询结果: {len(steps)} 个步骤")
    if duration < 0.5:
        print(f"   ✅ 通过: 查询时间 < 500ms")
    else:
        print(f"   ❌ 失败: 查询时间 {duration * 1000:.2f}ms >= 500ms")
    
    # 6. 测试多次查询的平均性能
    print("\n6. 测试多次查询的平均性能...")
    num_iterations = 100
    start_time = time.time()
    for _ in range(num_iterations):
        kg.query_equipment(experiment_id)
    total_duration = time.time() - start_time
    avg_duration = total_duration / num_iterations
    print(f"   {num_iterations} 次查询总耗时: {total_duration * 1000:.2f}ms")
    print(f"   平均查询耗时: {avg_duration * 1000:.2f}ms")
    if avg_duration < 0.5:
        print(f"   ✅ 通过: 平均查询时间 < 500ms")
    else:
        print(f"   ❌ 失败: 平均查询时间 {avg_duration * 1000:.2f}ms >= 500ms")
    
    # 7. 测试搜索性能
    print("\n7. 测试搜索性能...")
    start_time = time.time()
    results = kg.search_experiment_by_name("水")
    duration = time.time() - start_time
    print(f"   搜索耗时: {duration * 1000:.2f}ms")
    print(f"   搜索结果: {len(results)} 个实验类型")
    if duration < 0.5:
        print(f"   ✅ 通过: 搜索时间 < 500ms")
    else:
        print(f"   ❌ 失败: 搜索时间 {duration * 1000:.2f}ms >= 500ms")
    
    # 8. 测试缓存一致性
    print("\n8. 测试缓存一致性...")
    results = []
    for i in range(10):
        equipment = kg.query_equipment(experiment_id)
        results.append([eq.id for eq in equipment])
    
    first_result = results[0]
    all_same = all(result == first_result for result in results[1:])
    if all_same:
        print(f"   ✅ 通过: 10 次查询结果一致")
    else:
        print(f"   ❌ 失败: 查询结果不一致")
    
    print("\n" + "=" * 60)
    print("性能测试完成")
    print("=" * 60)


if __name__ == "__main__":
    test_performance()
