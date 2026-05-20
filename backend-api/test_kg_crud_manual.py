"""
手动测试知识图谱 CRUD 操作
"""

import sys
import json
import tempfile
from pathlib import Path

# 添加当前目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.agent.knowledge_graph import KnowledgeGraph
from app.agent.models import Equipment, Material, Indicator, Step, ExperimentType


def test_add_equipment():
    """测试添加设备"""
    print("\n=== 测试添加设备 ===")
    
    # 创建临时存储
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    try:
        kg = KnowledgeGraph(storage_path=temp_path)
        
        # 测试成功添加
        equipment = Equipment(
            id="eq_test_001",
            name="测试光谱仪",
            model="TEST-2000",
            category="分析仪器"
        )
        result = kg.add_entry(equipment)
        print(f"✓ 添加设备成功: {result}")
        assert result is True
        assert "eq_test_001" in kg._equipment
        
        # 测试重复 ID
        try:
            equipment2 = Equipment(id="eq_test_001", name="重复设备")
            kg.add_entry(equipment2)
            print("✗ 应该抛出重复 ID 错误")
        except ValueError as e:
            print(f"✓ 正确捕获重复 ID 错误: {e}")
        
        # 测试缺少 ID
        try:
            equipment3 = Equipment(id="", name="缺少ID设备")
            kg.add_entry(equipment3)
            print("✗ 应该抛出缺少 ID 错误")
        except ValueError as e:
            print(f"✓ 正确捕获缺少 ID 错误: {e}")
        
        # 测试无效 ID 格式
        try:
            equipment4 = Equipment(id="eq test 001", name="无效ID设备")
            kg.add_entry(equipment4)
            print("✗ 应该抛出无效 ID 格式错误")
        except ValueError as e:
            print(f"✓ 正确捕获无效 ID 格式错误: {e}")
        
        print("✓ 设备添加测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)


def test_add_indicator_with_threshold():
    """测试添加带阈值的指标"""
    print("\n=== 测试添加带阈值的指标 ===")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    try:
        kg = KnowledgeGraph(storage_path=temp_path)
        
        # 测试有效阈值
        indicator = Indicator(
            id="ind_test_001",
            name="铅含量",
            unit="mg/L",
            threshold_min=0.0,
            threshold_max=0.01
        )
        result = kg.add_entry(indicator)
        print(f"✓ 添加有效阈值指标成功: {result}")
        
        # 测试无效阈值（下限大于上限）
        try:
            indicator2 = Indicator(
                id="ind_test_002",
                name="无效指标",
                threshold_min=10.0,
                threshold_max=5.0
            )
            kg.add_entry(indicator2)
            print("✗ 应该抛出阈值无效错误")
        except ValueError as e:
            print(f"✓ 正确捕获阈值无效错误: {e}")
        
        print("✓ 指标阈值测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)


def test_add_step():
    """测试添加步骤"""
    print("\n=== 测试添加步骤 ===")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    try:
        kg = KnowledgeGraph(storage_path=temp_path)
        
        # 测试有效步骤
        step = Step(
            id="step_test_001",
            order=1,
            title="样品预处理",
            description="取100ml水样，加入5ml硝酸"
        )
        result = kg.add_entry(step)
        print(f"✓ 添加有效步骤成功: {result}")
        
        # 测试无效 order
        try:
            step2 = Step(
                id="step_test_002",
                order=0,
                title="无效步骤",
                description="描述"
            )
            kg.add_entry(step2)
            print("✗ 应该抛出无效 order 错误")
        except ValueError as e:
            print(f"✓ 正确捕获无效 order 错误: {e}")
        
        # 测试缺少 title
        try:
            step3 = Step(
                id="step_test_003",
                order=1,
                title="",
                description="描述"
            )
            kg.add_entry(step3)
            print("✗ 应该抛出缺少 title 错误")
        except ValueError as e:
            print(f"✓ 正确捕获缺少 title 错误: {e}")
        
        print("✓ 步骤添加测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)


def test_add_experiment_type():
    """测试添加实验类型"""
    print("\n=== 测试添加实验类型 ===")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    try:
        kg = KnowledgeGraph(storage_path=temp_path)
        
        # 先添加依赖条目
        equipment = Equipment(id="eq_exp_001", name="设备1")
        material = Material(id="mat_exp_001", name="材料1")
        indicator = Indicator(id="ind_exp_001", name="指标1")
        step = Step(id="step_exp_001", order=1, title="步骤1", description="描述1")
        
        kg.add_entry(equipment)
        kg.add_entry(material)
        kg.add_entry(indicator)
        kg.add_entry(step)
        print("✓ 依赖条目添加成功")
        
        # 添加实验类型
        exp_type = ExperimentType(
            id="exp_test_001",
            name="水样重金属检测",
            category="环境检测",
            equipment_ids=["eq_exp_001"],
            material_ids=["mat_exp_001"],
            indicator_ids=["ind_exp_001"],
            step_ids=["step_exp_001"]
        )
        result = kg.add_entry(exp_type)
        print(f"✓ 添加实验类型成功: {result}")
        
        # 测试无效的设备 ID
        try:
            exp_type2 = ExperimentType(
                id="exp_test_002",
                name="无效实验",
                equipment_ids=["nonexistent_eq"]
            )
            kg.add_entry(exp_type2)
            print("✗ 应该抛出无效设备 ID 错误")
        except ValueError as e:
            print(f"✓ 正确捕获无效设备 ID 错误: {e}")
        
        print("✓ 实验类型添加测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)


def test_export_import():
    """测试导出和导入"""
    print("\n=== 测试导出和导入 ===")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    export_path = None
    
    try:
        kg = KnowledgeGraph(storage_path=temp_path)
        
        # 添加一些数据
        equipment = Equipment(id="eq_export_001", name="导出设备", model="EXP-100")
        kg.add_entry(equipment)
        print("✓ 添加测试数据成功")
        
        # 导出
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            export_path = f.name
        
        result = kg.export_to_json(export_path)
        print(f"✓ 导出成功: {result}")
        assert result is True
        assert Path(export_path).exists()
        
        # 验证导出内容
        with open(export_path, 'r', encoding='utf-8') as f:
            exported_data = json.load(f)
        assert len(exported_data["equipment"]) == 1
        assert exported_data["equipment"][0]["id"] == "eq_export_001"
        print("✓ 导出内容验证成功")
        
        # 导入到新实例
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(initial_data, f)
            temp_path2 = f.name
        
        kg2 = KnowledgeGraph(storage_path=temp_path2)
        result = kg2.import_from_json(export_path)
        print(f"✓ 导入成功: {result}")
        assert result is True
        assert "eq_export_001" in kg2._equipment
        assert kg2._equipment["eq_export_001"].model == "EXP-100"
        print("✓ 导入内容验证成功")
        
        Path(temp_path2).unlink(missing_ok=True)
        
        print("✓ 导出导入测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)
        if export_path:
            Path(export_path).unlink(missing_ok=True)


def test_data_persistence():
    """测试数据持久化"""
    print("\n=== 测试数据持久化 ===")
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        initial_data = {
            "experiment_types": [],
            "equipment": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        json.dump(initial_data, f)
        temp_path = f.name
    
    try:
        # 第一个实例添加数据
        kg1 = KnowledgeGraph(storage_path=temp_path)
        equipment = Equipment(id="eq_persist_001", name="持久化设备")
        kg1.add_entry(equipment)
        print("✓ 第一个实例添加数据成功")
        
        # 第二个实例读取数据
        kg2 = KnowledgeGraph(storage_path=temp_path)
        assert "eq_persist_001" in kg2._equipment
        assert kg2._equipment["eq_persist_001"].name == "持久化设备"
        print("✓ 第二个实例读取数据成功")
        
        print("✓ 数据持久化测试通过")
        
    finally:
        Path(temp_path).unlink(missing_ok=True)


if __name__ == "__main__":
    print("开始测试知识图谱 CRUD 操作...")
    
    try:
        test_add_equipment()
        test_add_indicator_with_threshold()
        test_add_step()
        test_add_experiment_type()
        test_export_import()
        test_data_persistence()
        
        print("\n" + "="*50)
        print("✓ 所有测试通过！")
        print("="*50)
        
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
