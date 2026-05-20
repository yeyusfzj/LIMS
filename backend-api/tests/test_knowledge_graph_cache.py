"""
知识图谱缓存机制测试

验证需求 2.12: 知识图谱应在 500 毫秒内完成单次查询操作

测试内容：
1. 查询性能测试（设备、材料、指标、步骤）
2. 缓存一致性测试
3. 并发查询测试
4. 内存索引效率测试
"""

import time
import pytest
from pathlib import Path
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.agent.knowledge_graph import KnowledgeGraph


class TestKnowledgeGraphCache:
    """知识图谱缓存机制测试"""
    
    @pytest.fixture(scope="class")
    def kg(self):
        """创建知识图谱实例（类级别，所有测试共享）"""
        return KnowledgeGraph()
    
    @pytest.fixture(scope="class")
    def experiment_id(self, kg):
        """获取测试用的实验类型 ID"""
        experiment_types = kg.get_all_experiment_types()
        if not experiment_types:
            pytest.skip("没有实验类型数据")
        return experiment_types[0].id
    
    # ========== 性能测试 ==========
    
    def test_equipment_query_performance(self, kg, experiment_id):
        """测试设备查询性能 - 需求 2.12"""
        start_time = time.time()
        result = kg.query_equipment(experiment_id)
        duration = time.time() - start_time
        
        assert duration < 0.5, f"设备查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert len(result) > 0, "应该返回设备列表"
    
    def test_materials_query_performance(self, kg, experiment_id):
        """测试材料查询性能 - 需求 2.12"""
        start_time = time.time()
        result = kg.query_materials(experiment_id)
        duration = time.time() - start_time
        
        assert duration < 0.5, f"材料查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert len(result) > 0, "应该返回材料列表"
    
    def test_indicators_query_performance(self, kg, experiment_id):
        """测试指标查询性能 - 需求 2.12"""
        start_time = time.time()
        result = kg.query_indicators(experiment_id)
        duration = time.time() - start_time
        
        assert duration < 0.5, f"指标查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert len(result) > 0, "应该返回指标列表"
    
    def test_steps_query_performance(self, kg, experiment_id):
        """测试步骤查询性能 - 需求 2.12"""
        start_time = time.time()
        result = kg.query_steps(experiment_id)
        duration = time.time() - start_time
        
        assert duration < 0.5, f"步骤查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert len(result) > 0, "应该返回步骤列表"
        # 验证步骤已按 order 排序
        orders = [step.order for step in result]
        assert orders == sorted(orders), "步骤应该按 order 排序"
    
    def test_search_performance(self, kg):
        """测试搜索性能"""
        start_time = time.time()
        result = kg.search_experiment_by_name("水")
        duration = time.time() - start_time
        
        assert duration < 0.5, f"搜索耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_get_experiment_type_performance(self, kg, experiment_id):
        """测试获取实验类型性能"""
        start_time = time.time()
        result = kg.get_experiment_type(experiment_id)
        duration = time.time() - start_time
        
        assert duration < 0.5, f"获取实验类型耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert result is not None, "应该返回实验类型对象"
        assert result.id == experiment_id, "返回的实验类型 ID 应该匹配"
    
    # ========== 缓存一致性测试 ==========
    
    def test_cache_consistency_equipment(self, kg, experiment_id):
        """测试设备查询缓存一致性 - Property 3"""
        results = []
        for _ in range(10):
            equipment = kg.query_equipment(experiment_id)
            results.append([eq.id for eq in equipment])
        
        # 验证所有结果相同
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "多次查询应返回相同结果"
    
    def test_cache_consistency_materials(self, kg, experiment_id):
        """测试材料查询缓存一致性 - Property 3"""
        results = []
        for _ in range(10):
            materials = kg.query_materials(experiment_id)
            results.append([mat.id for mat in materials])
        
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "多次查询应返回相同结果"
    
    def test_cache_consistency_indicators(self, kg, experiment_id):
        """测试指标查询缓存一致性 - Property 3"""
        results = []
        for _ in range(10):
            indicators = kg.query_indicators(experiment_id)
            results.append([ind.id for ind in indicators])
        
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "多次查询应返回相同结果"
    
    def test_cache_consistency_steps(self, kg, experiment_id):
        """测试步骤查询缓存一致性 - Property 3"""
        results = []
        for _ in range(10):
            steps = kg.query_steps(experiment_id)
            results.append([step.id for step in steps])
        
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result, "多次查询应返回相同结果"
    
    # ========== 批量查询性能测试 ==========
    
    def test_multiple_queries_average_performance(self, kg, experiment_id):
        """测试多次查询的平均性能"""
        num_iterations = 100
        
        start_time = time.time()
        for _ in range(num_iterations):
            kg.query_equipment(experiment_id)
        total_duration = time.time() - start_time
        avg_duration = total_duration / num_iterations
        
        assert avg_duration < 0.5, f"平均查询耗时 {avg_duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_mixed_queries_performance(self, kg, experiment_id):
        """测试混合查询性能"""
        num_iterations = 25
        
        start_time = time.time()
        for _ in range(num_iterations):
            kg.query_equipment(experiment_id)
            kg.query_materials(experiment_id)
            kg.query_indicators(experiment_id)
            kg.query_steps(experiment_id)
        total_duration = time.time() - start_time
        avg_duration = total_duration / (num_iterations * 4)
        
        assert avg_duration < 0.5, f"混合查询平均耗时 {avg_duration * 1000:.2f}ms，超过 500ms 限制"
    
    # ========== 并发查询测试 ==========
    
    def test_concurrent_queries(self, kg, experiment_id):
        """测试并发查询性能"""
        num_threads = 10
        num_queries_per_thread = 10
        
        def query_task():
            """单个查询任务"""
            start_time = time.time()
            kg.query_equipment(experiment_id)
            return time.time() - start_time
        
        with ThreadPoolExecutor(max_workers=num_threads) as executor:
            futures = [executor.submit(query_task) for _ in range(num_threads * num_queries_per_thread)]
            durations = [future.result() for future in as_completed(futures)]
        
        # 验证所有查询都在 500ms 内完成
        max_duration = max(durations)
        avg_duration = sum(durations) / len(durations)
        
        assert max_duration < 0.5, f"最慢查询耗时 {max_duration * 1000:.2f}ms，超过 500ms 限制"
        assert avg_duration < 0.5, f"平均查询耗时 {avg_duration * 1000:.2f}ms，超过 500ms 限制"
    
    # ========== 内存索引效率测试 ==========
    
    def test_index_lookup_efficiency(self, kg):
        """测试内存索引查找效率"""
        # 获取所有实验类型
        experiment_types = kg.get_all_experiment_types()
        
        # 测试每个实验类型的查询性能
        for exp_type in experiment_types:
            start_time = time.time()
            kg.query_equipment(exp_type.id)
            kg.query_materials(exp_type.id)
            kg.query_indicators(exp_type.id)
            kg.query_steps(exp_type.id)
            duration = time.time() - start_time
            
            assert duration < 0.5, f"实验类型 {exp_type.id} 的完整查询耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
    
    def test_nonexistent_experiment_type_performance(self, kg):
        """测试查询不存在的实验类型的性能"""
        start_time = time.time()
        result = kg.query_equipment("nonexistent_type")
        duration = time.time() - start_time
        
        assert duration < 0.5, f"查询不存在的实验类型耗时 {duration * 1000:.2f}ms，超过 500ms 限制"
        assert result == [], "查询不存在的实验类型应返回空列表"
    
    # ========== 初始化性能测试 ==========
    
    def test_initialization_performance(self):
        """测试知识图谱初始化性能"""
        start_time = time.time()
        kg = KnowledgeGraph()
        duration = time.time() - start_time
        
        # 初始化应该在合理时间内完成（2 秒）
        assert duration < 2.0, f"初始化耗时 {duration * 1000:.2f}ms，超过 2000ms 限制"
        
        # 验证数据已加载
        stats = kg.get_statistics()
        assert stats['experiment_types'] > 0, "应该加载实验类型数据"
        assert stats['equipment'] > 0, "应该加载设备数据"
        assert stats['materials'] > 0, "应该加载材料数据"
        assert stats['indicators'] > 0, "应该加载指标数据"
        assert stats['steps'] > 0, "应该加载步骤数据"


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v", "-s"])
