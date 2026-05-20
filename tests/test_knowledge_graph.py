"""
知识图谱单元测试

测试任务 13.2 的要求：
- 测试查询水质分析设备
- 测试添加和查询知识条目
- 测试查询不存在的实验类型
- 测试添加重复条目

验证属性: Property 3 (查询幂等性), Property 5 (重复条目检查)
"""

import pytest
import sys
import os
import tempfile
import json
from pathlib import Path

# 添加 fastapi-backend 到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'fastapi-backend'))

from app.agent.knowledge_graph import KnowledgeGraph
from app.agent.models import (
    Equipment, Material, Indicator, Step, ExperimentType
)


class TestKnowledgeGraph:
    """知识图谱单元测试类"""
    
    def setup_method(self):
        """设置测试环境"""
        # 使用默认的知识图谱数据
        self.kg = KnowledgeGraph()
    
    # ==================== 查询水质分析设备测试 ====================
    
    def test_query_equipment_for_water_analysis(self):
        """
        测试查询水质分析相关设备
        
        验证需求 2.7: 支持通过实验类型查询相关设备列表
        验证需求 2.12: 在 500 毫秒内完成单次查询操作
        """
        import time
        
        start_time = time.time()
        equipment_list = self.kg.query_equipment("water_heavy_metal")
        duration = time.time() - start_time
        
        # 验证查询结果
        assert len(equipment_list) > 0, "应该查询到设备"
        assert all(isinstance(eq, Equipment) for eq in equipment_list), "所有结果应该是 Equipment 对象"
        
        # 验证查询性能
        assert duration < 0.5, f"查询时间应小于 500ms，实际: {duration*1000:.2f}ms"
        
        # 验证设备信息完整性
        for eq in equipment_list:
            assert eq.id != "", "设备 ID 不应为空"
            assert eq.name != "", "设备名称不应为空"
    
    def test_query_equipment_contains_spectroscope(self):
        """
        测试水质分析设备列表包含光谱仪
        
        验证需求 2.7: 查询结果应包含相关设备
        """
        equipment_list = self.kg.query_equipment("water_heavy_metal")
        
        # 验证包含光谱仪
        equipment_names = [eq.name for eq in equipment_list]
        assert any("光谱仪" in name for name in equipment_names), \
            "水质分析设备应包含光谱仪"
    
    def test_query_materials_for_water_analysis(self):
        """
        测试查询水质分析相关材料
        
        验证需求 2.8: 支持通过实验类型查询相关材料列表
        """
        material_list = self.kg.query_materials("water_heavy_metal")
        
        # 验证查询结果
        assert len(material_list) > 0, "应该查询到材料"
        assert all(isinstance(mat, Material) for mat in material_list), \
            "所有结果应该是 Material 对象"
        
        # 验证材料信息完整性
        for mat in material_list:
            assert mat.id != "", "材料 ID 不应为空"
            assert mat.name != "", "材料名称不应为空"
    
    def test_query_indicators_for_water_analysis(self):
        """
        测试查询水质分析相关指标
        
        验证需求 2.9: 支持通过实验类型查询相关指标列表
        """
        indicator_list = self.kg.query_indicators("water_heavy_metal")
        
        # 验证查询结果
        assert len(indicator_list) > 0, "应该查询到指标"
        assert all(isinstance(ind, Indicator) for ind in indicator_list), \
            "所有结果应该是 Indicator 对象"
        
        # 验证指标信息完整性
        for ind in indicator_list:
            assert ind.id != "", "指标 ID 不应为空"
            assert ind.name != "", "指标名称不应为空"
    
    def test_query_steps_for_water_analysis(self):
        """
        测试查询水质分析相关步骤
        
        验证需求 2.10: 支持通过实验类型查询相关步骤列表
        """
        step_list = self.kg.query_steps("water_heavy_metal")
        
        # 验证查询结果
        assert len(step_list) > 0, "应该查询到步骤"
        assert all(isinstance(step, Step) for step in step_list), \
            "所有结果应该是 Step 对象"
        
        # 验证步骤信息完整性
        for step in step_list:
            assert step.id != "", "步骤 ID 不应为空"
            assert step.title != "", "步骤标题不应为空"
            assert step.description != "", "步骤描述不应为空"
            assert step.order > 0, "步骤顺序应大于 0"
        
        # 验证步骤按顺序排列
        orders = [step.order for step in step_list]
        assert orders == sorted(orders), "步骤应按 order 字段排序"

    
    # ==================== 添加和查询知识条目测试 ====================
    
    def test_add_and_query_equipment_entry(self):
        """
        测试添加和查询设备条目
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        验证需求 10.1, 10.2: 提供添加新设备的接口
        验证属性 Property 11: CRUD 操作一致性
        """
        # 创建临时知识图谱
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            # 初始化空知识图谱
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            # 创建知识图谱实例
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加新设备
            new_equipment = Equipment(
                id="eq_test_001",
                name="测试设备",
                model="TEST-100",
                category="测试类别",
                specifications="测试规格"
            )
            
            result = kg.add_entry(new_equipment)
            assert result == True, "添加设备应该成功"
            
            # 验证设备已添加到内存索引
            assert "eq_test_001" in kg._equipment, "设备应该在内存索引中"
            
            # 验证设备信息正确
            retrieved_eq = kg._equipment["eq_test_001"]
            assert retrieved_eq.id == new_equipment.id
            assert retrieved_eq.name == new_equipment.name
            assert retrieved_eq.model == new_equipment.model
            assert retrieved_eq.category == new_equipment.category
            assert retrieved_eq.specifications == new_equipment.specifications
    
    def test_add_and_query_material_entry(self):
        """
        测试添加和查询材料条目
        
        验证需求 10.3: 提供添加新材料的接口
        验证属性 Property 11: CRUD 操作一致性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加新材料
            new_material = Material(
                id="mat_test_001",
                name="测试试剂",
                concentration="99%",
                cas_number="12345-67-8",
                safety_level="低危"
            )
            
            result = kg.add_entry(new_material)
            assert result == True, "添加材料应该成功"
            
            # 验证材料已添加
            assert "mat_test_001" in kg._materials
            retrieved_mat = kg._materials["mat_test_001"]
            assert retrieved_mat.name == new_material.name
            assert retrieved_mat.concentration == new_material.concentration
    
    def test_add_and_query_indicator_entry(self):
        """
        测试添加和查询指标条目
        
        验证需求 10.4: 提供添加新检测指标的接口
        验证属性 Property 11: CRUD 操作一致性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加新指标
            new_indicator = Indicator(
                id="ind_test_001",
                name="测试指标",
                unit="mg/L",
                method="测试方法",
                threshold_min=0.0,
                threshold_max=10.0
            )
            
            result = kg.add_entry(new_indicator)
            assert result == True, "添加指标应该成功"
            
            # 验证指标已添加
            assert "ind_test_001" in kg._indicators
            retrieved_ind = kg._indicators["ind_test_001"]
            assert retrieved_ind.name == new_indicator.name
            assert retrieved_ind.unit == new_indicator.unit
            assert retrieved_ind.threshold_min == new_indicator.threshold_min
            assert retrieved_ind.threshold_max == new_indicator.threshold_max
    
    def test_add_and_query_step_entry(self):
        """
        测试添加和查询步骤条目
        
        验证需求 10.5: 提供添加新实验步骤的接口
        验证属性 Property 11: CRUD 操作一致性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加新步骤
            new_step = Step(
                id="step_test_001",
                order=1,
                title="测试步骤",
                description="这是一个测试步骤的描述",
                duration="30分钟",
                temperature="25°C"
            )
            
            result = kg.add_entry(new_step)
            assert result == True, "添加步骤应该成功"
            
            # 验证步骤已添加
            assert "step_test_001" in kg._steps
            retrieved_step = kg._steps["step_test_001"]
            assert retrieved_step.title == new_step.title
            assert retrieved_step.description == new_step.description
            assert retrieved_step.order == new_step.order

    
    # ==================== 查询不存在的实验类型测试 ====================
    
    def test_query_nonexistent_experiment_type(self):
        """
        测试查询不存在的实验类型
        
        验证需求 2.11: 当查询的实验类型不存在，返回空结果集
        """
        # 查询不存在的实验类型
        equipment_list = self.kg.query_equipment("nonexistent_experiment")
        materials_list = self.kg.query_materials("nonexistent_experiment")
        indicators_list = self.kg.query_indicators("nonexistent_experiment")
        steps_list = self.kg.query_steps("nonexistent_experiment")
        
        # 验证所有查询返回空列表
        assert equipment_list == [], "不存在的实验类型应返回空设备列表"
        assert materials_list == [], "不存在的实验类型应返回空材料列表"
        assert indicators_list == [], "不存在的实验类型应返回空指标列表"
        assert steps_list == [], "不存在的实验类型应返回空步骤列表"
    
    def test_query_empty_string_experiment_type(self):
        """
        测试查询空字符串实验类型
        
        验证需求 2.11: 当查询的实验类型不存在，返回空结果集
        """
        equipment_list = self.kg.query_equipment("")
        
        assert equipment_list == [], "空字符串实验类型应返回空列表"
    
    def test_query_none_experiment_type(self):
        """
        测试查询 None 实验类型
        
        验证需求 2.11: 当查询的实验类型不存在，返回空结果集
        """
        equipment_list = self.kg.query_equipment(None)
        
        assert equipment_list == [], "None 实验类型应返回空列表"
    
    # ==================== 添加重复条目测试 ====================
    
    def test_add_duplicate_equipment_entry(self):
        """
        测试添加重复的设备条目
        
        验证需求 3.11: 当添加重复的 Knowledge_Entry，返回错误提示
        验证属性 Property 5: 知识条目唯一性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加第一个设备
            equipment1 = Equipment(
                id="eq_duplicate_test",
                name="重复测试设备1"
            )
            result1 = kg.add_entry(equipment1)
            assert result1 == True, "第一次添加应该成功"
            
            # 尝试添加相同 ID 的设备
            equipment2 = Equipment(
                id="eq_duplicate_test",
                name="重复测试设备2"
            )
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(equipment2)
            
            # 验证错误信息
            assert "已存在" in str(exc_info.value), "错误信息应包含'已存在'"
            assert "eq_duplicate_test" in str(exc_info.value), "错误信息应包含重复的 ID"
    
    def test_add_duplicate_material_entry(self):
        """
        测试添加重复的材料条目
        
        验证需求 3.11: 当添加重复的 Knowledge_Entry，返回错误提示
        验证属性 Property 5: 知识条目唯一性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加第一个材料
            material1 = Material(
                id="mat_duplicate_test",
                name="重复测试材料1"
            )
            kg.add_entry(material1)
            
            # 尝试添加相同 ID 的材料
            material2 = Material(
                id="mat_duplicate_test",
                name="重复测试材料2"
            )
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(material2)
            
            assert "已存在" in str(exc_info.value)
    
    def test_add_duplicate_indicator_entry(self):
        """
        测试添加重复的指标条目
        
        验证需求 3.11: 当添加重复的 Knowledge_Entry，返回错误提示
        验证属性 Property 5: 知识条目唯一性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加第一个指标
            indicator1 = Indicator(
                id="ind_duplicate_test",
                name="重复测试指标1"
            )
            kg.add_entry(indicator1)
            
            # 尝试添加相同 ID 的指标
            indicator2 = Indicator(
                id="ind_duplicate_test",
                name="重复测试指标2"
            )
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(indicator2)
            
            assert "已存在" in str(exc_info.value)
    
    def test_add_duplicate_step_entry(self):
        """
        测试添加重复的步骤条目
        
        验证需求 3.11: 当添加重复的 Knowledge_Entry，返回错误提示
        验证属性 Property 5: 知识条目唯一性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 添加第一个步骤
            step1 = Step(
                id="step_duplicate_test",
                order=1,
                title="重复测试步骤1",
                description="描述1"
            )
            kg.add_entry(step1)
            
            # 尝试添加相同 ID 的步骤
            step2 = Step(
                id="step_duplicate_test",
                order=2,
                title="重复测试步骤2",
                description="描述2"
            )
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(step2)
            
            assert "已存在" in str(exc_info.value)

    
    # ==================== Property 3: 知识图谱查询幂等性测试 ====================
    
    def test_property_3_query_idempotence_equipment(self):
        """
        测试 Property 3: 知识图谱查询幂等性 - 设备查询
        
        对于任何实验类型 ID，在知识图谱中进行多次查询，
        每次查询应该返回相同的结果集，且结果的顺序和内容保持一致。
        
        验证属性: Property 3
        验证需求: 2.7
        """
        experiment_type = "water_heavy_metal"
        
        # 执行多次查询
        result1 = self.kg.query_equipment(experiment_type)
        result2 = self.kg.query_equipment(experiment_type)
        result3 = self.kg.query_equipment(experiment_type)
        
        # 验证结果数量相同
        assert len(result1) == len(result2) == len(result3), \
            "多次查询应返回相同数量的结果"
        
        # 验证结果内容相同
        ids1 = [eq.id for eq in result1]
        ids2 = [eq.id for eq in result2]
        ids3 = [eq.id for eq in result3]
        
        assert ids1 == ids2 == ids3, "多次查询应返回相同的设备 ID 列表"
        
        # 验证结果顺序相同
        for i in range(len(result1)):
            assert result1[i].id == result2[i].id == result3[i].id, \
                f"第 {i} 个结果的 ID 应该相同"
            assert result1[i].name == result2[i].name == result3[i].name, \
                f"第 {i} 个结果的名称应该相同"
    
    def test_property_3_query_idempotence_materials(self):
        """
        测试 Property 3: 知识图谱查询幂等性 - 材料查询
        
        验证属性: Property 3
        验证需求: 2.8
        """
        experiment_type = "water_heavy_metal"
        
        # 执行多次查询
        result1 = self.kg.query_materials(experiment_type)
        result2 = self.kg.query_materials(experiment_type)
        result3 = self.kg.query_materials(experiment_type)
        
        # 验证结果数量相同
        assert len(result1) == len(result2) == len(result3)
        
        # 验证结果内容相同
        ids1 = [mat.id for mat in result1]
        ids2 = [mat.id for mat in result2]
        ids3 = [mat.id for mat in result3]
        
        assert ids1 == ids2 == ids3, "多次查询应返回相同的材料 ID 列表"
    
    def test_property_3_query_idempotence_indicators(self):
        """
        测试 Property 3: 知识图谱查询幂等性 - 指标查询
        
        验证属性: Property 3
        验证需求: 2.9
        """
        experiment_type = "water_heavy_metal"
        
        # 执行多次查询
        result1 = self.kg.query_indicators(experiment_type)
        result2 = self.kg.query_indicators(experiment_type)
        result3 = self.kg.query_indicators(experiment_type)
        
        # 验证结果数量相同
        assert len(result1) == len(result2) == len(result3)
        
        # 验证结果内容相同
        ids1 = [ind.id for ind in result1]
        ids2 = [ind.id for ind in result2]
        ids3 = [ind.id for ind in result3]
        
        assert ids1 == ids2 == ids3, "多次查询应返回相同的指标 ID 列表"
    
    def test_property_3_query_idempotence_steps(self):
        """
        测试 Property 3: 知识图谱查询幂等性 - 步骤查询
        
        验证属性: Property 3
        验证需求: 2.10
        """
        experiment_type = "water_heavy_metal"
        
        # 执行多次查询
        result1 = self.kg.query_steps(experiment_type)
        result2 = self.kg.query_steps(experiment_type)
        result3 = self.kg.query_steps(experiment_type)
        
        # 验证结果数量相同
        assert len(result1) == len(result2) == len(result3)
        
        # 验证结果内容相同
        ids1 = [step.id for step in result1]
        ids2 = [step.id for step in result2]
        ids3 = [step.id for step in result3]
        
        assert ids1 == ids2 == ids3, "多次查询应返回相同的步骤 ID 列表"
        
        # 验证步骤顺序相同
        orders1 = [step.order for step in result1]
        orders2 = [step.order for step in result2]
        orders3 = [step.order for step in result3]
        
        assert orders1 == orders2 == orders3, "多次查询应返回相同的步骤顺序"
    
    def test_property_3_query_idempotence_nonexistent(self):
        """
        测试 Property 3: 查询不存在的实验类型的幂等性
        
        验证属性: Property 3
        """
        experiment_type = "nonexistent_type"
        
        # 执行多次查询
        result1 = self.kg.query_equipment(experiment_type)
        result2 = self.kg.query_equipment(experiment_type)
        result3 = self.kg.query_equipment(experiment_type)
        
        # 验证所有查询都返回空列表
        assert result1 == result2 == result3 == [], \
            "查询不存在的实验类型应始终返回空列表"
    
    # ==================== Property 5: 知识条目唯一性测试 ====================
    
    def test_property_5_duplicate_entry_uniqueness(self):
        """
        测试 Property 5: 知识条目唯一性
        
        对于任何知识条目，尝试添加具有相同 ID 的条目两次，
        第二次添加应该失败并返回重复错误提示。
        
        验证属性: Property 5
        验证需求: 3.11
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 测试设备唯一性
            eq = Equipment(id="eq_unique_test", name="唯一性测试设备")
            assert kg.add_entry(eq) == True, "第一次添加应成功"
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(eq)
            assert "已存在" in str(exc_info.value), "应返回重复错误提示"
            
            # 测试材料唯一性
            mat = Material(id="mat_unique_test", name="唯一性测试材料")
            assert kg.add_entry(mat) == True, "第一次添加应成功"
            
            with pytest.raises(ValueError):
                kg.add_entry(mat)
            
            # 测试指标唯一性
            ind = Indicator(id="ind_unique_test", name="唯一性测试指标")
            assert kg.add_entry(ind) == True, "第一次添加应成功"
            
            with pytest.raises(ValueError):
                kg.add_entry(ind)
            
            # 测试步骤唯一性
            step = Step(id="step_unique_test", order=1, title="唯一性测试步骤", description="描述")
            assert kg.add_entry(step) == True, "第一次添加应成功"
            
            with pytest.raises(ValueError):
                kg.add_entry(step)
    
    def test_property_5_different_types_same_id(self):
        """
        测试 Property 5: 不同类型可以有相同的 ID
        
        验证属性: Property 5
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 不同类型可以使用相同的 ID（因为它们在不同的命名空间）
            same_id = "test_001"
            
            eq = Equipment(id=same_id, name="设备")
            mat = Material(id=same_id, name="材料")
            ind = Indicator(id=same_id, name="指标")
            step = Step(id=same_id, order=1, title="步骤", description="描述")
            
            # 所有添加都应该成功
            assert kg.add_entry(eq) == True
            assert kg.add_entry(mat) == True
            assert kg.add_entry(ind) == True
            assert kg.add_entry(step) == True
            
            # 验证都已添加
            assert same_id in kg._equipment
            assert same_id in kg._materials
            assert same_id in kg._indicators
            assert same_id in kg._steps

    
    # ==================== 数据验证测试 ====================
    
    def test_validate_entry_missing_id(self):
        """
        测试验证缺少 ID 的条目
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 创建缺少 ID 的设备
            invalid_eq = Equipment(id="", name="无效设备")
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(invalid_eq)
            
            assert "id" in str(exc_info.value).lower(), "错误信息应提到 ID"
    
    def test_validate_entry_missing_name(self):
        """
        测试验证缺少名称的条目
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 创建缺少名称的设备
            invalid_eq = Equipment(id="eq_invalid", name="")
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(invalid_eq)
            
            assert "name" in str(exc_info.value).lower() or "名称" in str(exc_info.value), \
                "错误信息应提到名称"
    
    def test_validate_step_missing_title(self):
        """
        测试验证缺少标题的步骤
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 创建缺少标题的步骤
            invalid_step = Step(id="step_invalid", order=1, title="", description="描述")
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(invalid_step)
            
            assert "title" in str(exc_info.value).lower() or "标题" in str(exc_info.value)
    
    def test_validate_step_invalid_order(self):
        """
        测试验证无效顺序的步骤
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 创建顺序为 0 的步骤
            invalid_step = Step(id="step_invalid", order=0, title="标题", description="描述")
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(invalid_step)
            
            assert "order" in str(exc_info.value).lower() or "顺序" in str(exc_info.value)
    
    def test_validate_indicator_invalid_threshold(self):
        """
        测试验证无效阈值的指标
        
        验证需求 3.10: 添加新的 Knowledge_Entry，验证数据完整性
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 创建阈值下限大于上限的指标
            invalid_ind = Indicator(
                id="ind_invalid",
                name="无效指标",
                threshold_min=10.0,
                threshold_max=5.0
            )
            
            with pytest.raises(ValueError) as exc_info:
                kg.add_entry(invalid_ind)
            
            assert "阈值" in str(exc_info.value) or "threshold" in str(exc_info.value).lower()
    
    # ==================== 导入导出测试 ====================
    
    def test_export_to_json(self):
        """
        测试导出知识图谱为 JSON
        
        验证需求 10.9: 支持导出当前 Knowledge_Graph 为 JSON 格式
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            export_path = Path(tmpdir) / "exported_kg.json"
            
            # 导出
            result = self.kg.export_to_json(str(export_path))
            assert result == True, "导出应该成功"
            
            # 验证文件存在
            assert export_path.exists(), "导出文件应该存在"
            
            # 验证文件内容
            with open(export_path, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            assert "experiment_types" in exported_data
            assert "equipment" in exported_data
            assert "materials" in exported_data
            assert "indicators" in exported_data
            assert "steps" in exported_data
    
    def test_import_from_json(self):
        """
        测试从 JSON 导入知识图谱
        
        验证需求 10.8: 支持导入 JSON 格式的批量知识数据
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            # 创建测试数据
            test_data = {
                "experiment_types": [
                    {
                        "id": "test_exp",
                        "name": "测试实验",
                        "category": "测试",
                        "equipment_ids": ["test_eq"],
                        "material_ids": [],
                        "indicator_ids": [],
                        "step_ids": []
                    }
                ],
                "equipment": [
                    {
                        "id": "test_eq",
                        "name": "测试设备",
                        "model": "",
                        "category": "",
                        "specifications": ""
                    }
                ],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            
            import_path = Path(tmpdir) / "import_kg.json"
            with open(import_path, 'w', encoding='utf-8') as f:
                json.dump(test_data, f)
            
            # 创建新的知识图谱并导入
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 导入
            result = kg.import_from_json(str(import_path))
            assert result == True, "导入应该成功"
            
            # 验证数据已导入
            assert "test_exp" in kg._experiment_types
            assert "test_eq" in kg._equipment
    
    def test_import_invalid_json(self):
        """
        测试导入无效的 JSON 文件
        
        验证需求 10.10: 当导入数据格式错误，返回详细的错误信息
        """
        with tempfile.TemporaryDirectory() as tmpdir:
            # 创建无效数据（缺少必需字段）
            invalid_data = {
                "experiment_types": [],
                "equipment": []
                # 缺少 materials, indicators, steps
            }
            
            import_path = Path(tmpdir) / "invalid_kg.json"
            with open(import_path, 'w', encoding='utf-8') as f:
                json.dump(invalid_data, f)
            
            temp_kg_path = Path(tmpdir) / "test_kg.json"
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            with open(temp_kg_path, 'w', encoding='utf-8') as f:
                json.dump(initial_data, f)
            
            kg = KnowledgeGraph(storage_path=str(temp_kg_path))
            
            # 导入应该失败
            result = kg.import_from_json(str(import_path))
            assert result == False, "导入无效数据应该失败"
    
    # ==================== 其他功能测试 ====================
    
    def test_get_experiment_type(self):
        """
        测试获取实验类型
        """
        exp = self.kg.get_experiment_type("water_heavy_metal")
        
        assert exp is not None, "应该获取到实验类型"
        assert isinstance(exp, ExperimentType)
        assert exp.id == "water_heavy_metal"
        assert exp.name == "水样重金属检测"
    
    def test_get_nonexistent_experiment_type(self):
        """
        测试获取不存在的实验类型
        """
        exp = self.kg.get_experiment_type("nonexistent")
        
        assert exp is None, "不存在的实验类型应返回 None"
    
    def test_search_experiment_by_name(self):
        """
        测试根据名称搜索实验类型
        """
        results = self.kg.search_experiment_by_name("水")
        
        assert len(results) > 0, "应该搜索到包含'水'的实验类型"
        assert any("水" in exp.name for exp in results), "结果应包含'水'字"
    
    def test_search_experiment_by_category(self):
        """
        测试根据类别搜索实验类型
        """
        results = self.kg.search_experiment_by_name("环境")
        
        assert len(results) > 0, "应该搜索到环境检测类别的实验"
        assert any("环境" in exp.category for exp in results)
    
    def test_get_all_experiment_types(self):
        """
        测试获取所有实验类型
        """
        all_types = self.kg.get_all_experiment_types()
        
        assert len(all_types) > 0, "应该有实验类型"
        assert all(isinstance(exp, ExperimentType) for exp in all_types)
    
    def test_get_statistics(self):
        """
        测试获取统计信息
        """
        stats = self.kg.get_statistics()
        
        assert "experiment_types" in stats
        assert "equipment" in stats
        assert "materials" in stats
        assert "indicators" in stats
        assert "steps" in stats
        
        assert stats["experiment_types"] > 0, "应该有实验类型"
        assert stats["equipment"] > 0, "应该有设备"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
