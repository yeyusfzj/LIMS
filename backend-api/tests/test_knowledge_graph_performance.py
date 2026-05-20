"""
知识图谱性能测试

测试知识图谱查询性能，验证是否满足需求 2.12：
- 查询响应时间 < 500ms
"""

import time
import pytest
from pathlib import Path
import sys

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.agent.knowledge_graph import KnowledgeGraph


class TestKnowledgeGraphPerformance:
    """知识图谱性能测试"""
    
    @pytest.fixture
    def kg(self):
        """创建知识图谱实例"""
        return KnowledgeGraph()
    
    def test_query_equipment_performance(self, kg):
        """测试设备查询性能 - 应在 500ms 内完成"""
        # 获取所有实验类型
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        # 测试第一个实验类型的查询性能
        experiment_id = experiment_types[0].id
        
        start_time = time.time()
        result = kg.query_equipment(experiment_id)
        duration = time.time() - start_time
        
        print(f"\n设备查询耗时: {duration * 1000:.2f}ms")
        assert duration < 0.5, f"设备查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_query_materials_performance(self, kg):
        """测试材料查询性能 - 应在 500ms 内完成"""
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        experiment_id = experiment_types[0].id
        
        start_time = time.time()
        result = kg.query_materials(experiment_id)
        duration = time.time() - start_time
        
        print(f"\n材料查询耗时: {duration * 1000:.2f}ms")
        assert duration < 0.5, f"材料查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_query_indicators_performance(self, kg):
        """测试指标查询性能 - 应在 500ms 内完成"""
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        experiment_id = experiment_types[0].id
        
        start_time = time.time()
        result = kg.query_indicators(experiment_id)
        duration = time.time() - start_time
        
        print(f"\n指标查询耗时: {duration * 1000:.2f}ms")
        assert duration < 0.5, f"指标查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_query_steps_performance(self, kg):
        """测试步骤查询性能 - 应在 500ms 内完成"""
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        experiment_id = experiment_types[0].id
        
        start_time = time.time()
        result = kg.query_steps(experiment_id)
        duration = time.time() - start_time
        
        print(f"\n步骤查询耗时: {duration * 1000:.2f}ms")
        assert duration < 0.5, f"步骤查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_multiple_queries_performance(self, kg):
        """测试多次查询的平均性能"""
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        experiment_id = experiment_types[0].id
        num_iterations = 100
        
        # 测试设备查询
        start_time = time.time()
        for _ in range(num_iterations):
            kg.query_equipment(experiment_id)
        duration = time.time() - start_time
        avg_duration = duration / num_iterations
        
        print(f"\n{num_iterations} 次设备查询平均耗时: {avg_duration * 1000:.2f}ms")
        assert avg_duration < 0.5, f"平均查询耗时 {avg_duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_cache_consistency(self, kg):
        """测试缓存一致性 - 多次查询应返回相同结果"""
        experiment_types = kg.get_all_experiment_types()
        
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        
        experiment_id = experiment_types[0].id
        
        # 执行多次查询
        results = []
        for _ in range(10):
            equipment = kg.query_equipment(experiment_id)
            results.append([eq.id for eq in equipment])
        
        # 验证所有结果相同
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "多次查询返回的结果不一致"
    
    def test_initialization_performance(self):
        """测试知识图谱初始化性能"""
        start_time = time.time()
        kg = KnowledgeGraph()
        duration = time.time() - start_time
        
        print(f"\n知识图谱初始化耗时: {duration * 1000:.2f}ms")
        # 初始化应该在合理时间内完成（比如 2 秒）
        assert duration < 2.0, f"初始化耗时 {duration * 1000:.2f}ms，超过 2000ms 限制"
    
    def test_search_performance(self, kg):
        """测试搜索功能性能"""
        start_time = time.time()
        results = kg.search_experiment_by_name("水")
        duration = time.time() - start_time
        
        print(f"\n搜索耗时: {duration * 1000:.2f}ms，找到 {len(results)} 个结果")
        assert duration < 0.5, f"搜索耗时 {duration * 1000:.2f}ms，超过 500ms 限制"


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "-s"])
