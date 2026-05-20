"""
知识图谱 CRUD 操作测试

测试知识图谱的添加、导出、导入功能，包括：
- 添加各种类型的知识条目
- 数据完整性验证
- 重复条目检查
- JSON 导出和导入
"""

import pytest
import json
import tempfile
from pathlib import Path

from app.agent.knowledge_graph import KnowledgeGraph
from app.agent.models import Equipment, Material, Indicator, Step, ExperimentType


class TestKnowledgeGraphCRUD:
    """知识图谱 CRUD 操作测试类"""
    
    @pytest.fixture
    def temp_storage(self):
        """创建临时存储文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            # 初始化空数据结构
            initial_data = {
                "experiment_types": [],
                "equipment": [],
                "materials": [],
                "indicators": [],
                "steps": []
            }
            json.dump(initial_data, f)
            temp_path = f.name
        
        yield temp_path
        
        # 清理
        Path(temp_path).unlink(missing_ok=True)
    
    @pytest.fixture
    def kg(self, temp_storage):
        """创建知识图谱实例"""
        return KnowledgeGraph(storage_path=temp_storage)
    
    # ==================== 添加设备测试 ====================
    
    def test_add_equipment_success(self, kg):
        """测试成功添加设备"""
        equipment = Equipment(
            id="eq_test_001",
            name="测试光谱仪",
            model="TEST-2000",
            category="分析仪器",
            specifications="检测限: 0.001 mg/L"
        )
        
        result = kg.add_entry(equipment)
        assert result is True
        
        # 验证可以查询到
        assert "eq_test_001" in kg._equipment
        assert kg._equipment["eq_test_001"].name == "测试光谱仪"
    
    def test_add_equipment_duplicate_id(self, kg):
        """测试添加重复 ID 的设备"""
        equipment1 = Equipment(id="eq_dup_001", name="设备1")
        kg.add_entry(equipment1)
        
        equipment2 = Equipment(id="eq_dup_001", name="设备2")
        with pytest.raises(ValueError, match="设备 ID 已存在"):
            kg.add_entry(equipment2)
    
    def test_add_equipment_missing_id(self, kg):
        """测试添加缺少 ID 的设备"""
        equipment = Equipment(id="", name="测试设备")
        with pytest.raises(ValueError, match="必须包含非空的 id 字段"):
            kg.add_entry(equipment)
    
    def test_add_equipment_missing_name(self, kg):
        """测试添加缺少名称的设备"""
        equipment = Equipment(id="eq_test_002", name="")
        with pytest.raises(ValueError, match="必须包含非空的 name 字段"):
            kg.add_entry(equipment)
    
    def test_add_equipment_invalid_id_format(self, kg):
        """测试添加无效 ID 格式的设备"""
        equipment = Equipment(id="eq test 001", name="测试设备")  # 包含空格
        with pytest.raises(ValueError, match="ID 格式不正确"):
            kg.add_entry(equipment)
    
    # ==================== 添加材料测试 ====================
    
    def test_add_material_success(self, kg):
        """测试成功添加材料"""
        material = Material(
            id="mat_test_001",
            name="测试硝酸",
            concentration="65%",
            cas_number="7697-37-2",
            safety_level="危险"
        )
        
        result = kg.add_entry(material)
        assert result is True
        
        # 验证可以查询到
        assert "mat_test_001" in kg._materials
        assert kg._materials["mat_test_001"].concentration == "65%"
    
    def test_add_material_duplicate_id(self, kg):
        """测试添加重复 ID 的材料"""
        material1 = Material(id="mat_dup_001", name="材料1")
        kg.add_entry(material1)
        
        material2 = Material(id="mat_dup_001", name="材料2")
        with pytest.raises(ValueError, match="材料 ID 已存在"):
            kg.add_entry(material2)
    
    # ==================== 添加指标测试 ====================
    
    def test_add_indicator_success(self, kg):
        """测试成功添加指标"""
        indicator = Indicator(
            id="ind_test_001",
            name="测试铅含量",
            unit="mg/L",
            method="原子吸收法",
            threshold_min=0.0,
            threshold_max=0.01
        )
        
        result = kg.add_entry(indicator)
        assert result is True
        
        # 验证可以查询到
        assert "ind_test_001" in kg._indicators
        assert kg._indicators["ind_test_001"].unit == "mg/L"
    
    def test_add_indicator_invalid_threshold(self, kg):
        """测试添加阈值无效的指标"""
        indicator = Indicator(
            id="ind_test_002",
            name="测试指标",
            threshold_min=10.0,
            threshold_max=5.0  # 下限大于上限
        )
        
        with pytest.raises(ValueError, match="阈值下限.*不能大于上限"):
            kg.add_entry(indicator)
    
    def test_add_indicator_duplicate_id(self, kg):
        """测试添加重复 ID 的指标"""
        indicator1 = Indicator(id="ind_dup_001", name="指标1")
        kg.add_entry(indicator1)
        
        indicator2 = Indicator(id="ind_dup_001", name="指标2")
        with pytest.raises(ValueError, match="指标 ID 已存在"):
            kg.add_entry(indicator2)
    
    # ==================== 添加步骤测试 ====================
    
    def test_add_step_success(self, kg):
        """测试成功添加步骤"""
        step = Step(
            id="step_test_001",
            order=1,
            title="测试步骤",
            description="这是一个测试步骤",
            duration="30分钟",
            temperature="95°C"
        )
        
        result = kg.add_entry(step)
        assert result is True
        
        # 验证可以查询到
        assert "step_test_001" in kg._steps
        assert kg._steps["step_test_001"].order == 1
    
    def test_add_step_invalid_order(self, kg):
        """测试添加无效 order 的步骤"""
        step = Step(
            id="step_test_002",
            order=0,  # order 必须大于 0
            title="测试步骤",
            description="描述"
        )
        
        with pytest.raises(ValueError, match="order 字段必须是大于 0 的整数"):
            kg.add_entry(step)
    
    def test_add_step_missing_title(self, kg):
        """测试添加缺少标题的步骤"""
        step = Step(
            id="step_test_003",
            order=1,
            title="",
            description="描述"
        )
        
        with pytest.raises(ValueError, match="必须包含非空的 title 字段"):
            kg.add_entry(step)
    
    def test_add_step_missing_description(self, kg):
        """测试添加缺少描述的步骤"""
        step = Step(
            id="step_test_004",
            order=1,
            title="标题",
            description=""
        )
        
        with pytest.raises(ValueError, match="必须包含非空的 description 字段"):
            kg.add_entry(step)
    
    def test_add_step_duplicate_id(self, kg):
        """测试添加重复 ID 的步骤"""
        step1 = Step(id="step_dup_001", order=1, title="步骤1", description="描述1")
        kg.add_entry(step1)
        
        step2 = Step(id="step_dup_001", order=2, title="步骤2", description="描述2")
        with pytest.raises(ValueError, match="步骤 ID 已存在"):
            kg.add_entry(step2)
    
    # ==================== 添加实验类型测试 ====================
    
    def test_add_experiment_type_success(self, kg):
        """测试成功添加实验类型"""
        # 先添加依赖的条目
        equipment = Equipment(id="eq_exp_001", name="设备1")
        material = Material(id="mat_exp_001", name="材料1")
        indicator = Indicator(id="ind_exp_001", name="指标1")
        step = Step(id="step_exp_001", order=1, title="步骤1", description="描述1")
        
        kg.add_entry(equipment)
        kg.add_entry(material)
        kg.add_entry(indicator)
        kg.add_entry(step)
        
        # 添加实验类型
        exp_type = ExperimentType(
            id="exp_test_001",
            name="测试实验",
            category="测试类别",
            equipment_ids=["eq_exp_001"],
            material_ids=["mat_exp_001"],
            indicator_ids=["ind_exp_001"],
            step_ids=["step_exp_001"]
        )
        
        result = kg.add_entry(exp_type)
        assert result is True
        
        # 验证可以查询到
        assert "exp_test_001" in kg._experiment_types
        assert kg._experiment_types["exp_test_001"].name == "测试实验"
    
    def test_add_experiment_type_invalid_equipment_id(self, kg):
        """测试添加包含无效设备 ID 的实验类型"""
        exp_type = ExperimentType(
            id="exp_test_002",
            name="测试实验",
            equipment_ids=["nonexistent_eq_id"]
        )
        
        with pytest.raises(ValueError, match="关联的设备 ID 不存在"):
            kg.add_entry(exp_type)
    
    def test_add_experiment_type_invalid_material_id(self, kg):
        """测试添加包含无效材料 ID 的实验类型"""
        exp_type = ExperimentType(
            id="exp_test_003",
            name="测试实验",
            material_ids=["nonexistent_mat_id"]
        )
        
        with pytest.raises(ValueError, match="关联的材料 ID 不存在"):
            kg.add_entry(exp_type)
    
    def test_add_experiment_type_invalid_indicator_id(self, kg):
        """测试添加包含无效指标 ID 的实验类型"""
        exp_type = ExperimentType(
            id="exp_test_004",
            name="测试实验",
            indicator_ids=["nonexistent_ind_id"]
        )
        
        with pytest.raises(ValueError, match="关联的指标 ID 不存在"):
            kg.add_entry(exp_type)
    
    def test_add_experiment_type_invalid_step_id(self, kg):
        """测试添加包含无效步骤 ID 的实验类型"""
        exp_type = ExperimentType(
            id="exp_test_005",
            name="测试实验",
            step_ids=["nonexistent_step_id"]
        )
        
        with pytest.raises(ValueError, match="关联的步骤 ID 不存在"):
            kg.add_entry(exp_type)
    
    def test_add_experiment_type_duplicate_id(self, kg):
        """测试添加重复 ID 的实验类型"""
        exp_type1 = ExperimentType(id="exp_dup_001", name="实验1")
        kg.add_entry(exp_type1)
        
        exp_type2 = ExperimentType(id="exp_dup_001", name="实验2")
        with pytest.raises(ValueError, match="实验类型 ID 已存在"):
            kg.add_entry(exp_type2)
    
    # ==================== 导出测试 ====================
    
    def test_export_to_json_success(self, kg):
        """测试成功导出到 JSON"""
        # 添加一些数据
        equipment = Equipment(id="eq_export_001", name="导出设备")
        kg.add_entry(equipment)
        
        # 导出到临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            export_path = f.name
        
        try:
            result = kg.export_to_json(export_path)
            assert result is True
            
            # 验证文件存在且内容正确
            assert Path(export_path).exists()
            
            with open(export_path, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            assert "equipment" in exported_data
            assert len(exported_data["equipment"]) == 1
            assert exported_data["equipment"][0]["id"] == "eq_export_001"
        
        finally:
            Path(export_path).unlink(missing_ok=True)
    
    def test_export_to_json_creates_directory(self, kg):
        """测试导出时自动创建目录"""
        with tempfile.TemporaryDirectory() as temp_dir:
            export_path = Path(temp_dir) / "subdir" / "export.json"
            
            result = kg.export_to_json(str(export_path))
            assert result is True
            assert export_path.exists()
    
    # ==================== 导入测试 ====================
    
    def test_import_from_json_success(self, kg):
        """测试成功从 JSON 导入"""
        # 创建导入数据
        import_data = {
            "experiment_types": [],
            "equipment": [
                {
                    "id": "eq_import_001",
                    "name": "导入设备",
                    "model": "IMPORT-100",
                    "category": "测试",
                    "specifications": "测试规格"
                }
            ],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        
        # 写入临时文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(import_data, f)
            import_path = f.name
        
        try:
            result = kg.import_from_json(import_path)
            assert result is True
            
            # 验证数据已导入
            assert "eq_import_001" in kg._equipment
            assert kg._equipment["eq_import_001"].name == "导入设备"
        
        finally:
            Path(import_path).unlink(missing_ok=True)
    
    def test_import_from_json_file_not_found(self, kg):
        """测试导入不存在的文件"""
        result = kg.import_from_json("/nonexistent/path/file.json")
        assert result is False
    
    def test_import_from_json_missing_required_key(self, kg):
        """测试导入缺少必需字段的 JSON"""
        # 创建缺少 "equipment" 字段的数据
        import_data = {
            "experiment_types": [],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(import_data, f)
            import_path = f.name
        
        try:
            result = kg.import_from_json(import_path)
            assert result is False
        
        finally:
            Path(import_path).unlink(missing_ok=True)
    
    def test_import_from_json_invalid_json(self, kg):
        """测试导入无效的 JSON 文件"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write("{ invalid json }")
            import_path = f.name
        
        try:
            result = kg.import_from_json(import_path)
            assert result is False
        
        finally:
            Path(import_path).unlink(missing_ok=True)
    
    # ==================== 数据持久化测试 ====================
    
    def test_data_persistence_after_add(self, temp_storage):
        """测试添加数据后持久化"""
        # 创建知识图谱并添加数据
        kg1 = KnowledgeGraph(storage_path=temp_storage)
        equipment = Equipment(id="eq_persist_001", name="持久化设备")
        kg1.add_entry(equipment)
        
        # 创建新实例，验证数据已持久化
        kg2 = KnowledgeGraph(storage_path=temp_storage)
        assert "eq_persist_001" in kg2._equipment
        assert kg2._equipment["eq_persist_001"].name == "持久化设备"
    
    def test_data_persistence_after_import(self, temp_storage):
        """测试导入数据后持久化"""
        # 创建导入数据
        import_data = {
            "experiment_types": [],
            "equipment": [{"id": "eq_import_persist_001", "name": "导入持久化设备", "model": "", "category": "", "specifications": ""}],
            "materials": [],
            "indicators": [],
            "steps": []
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(import_data, f)
            import_path = f.name
        
        try:
            # 导入数据
            kg1 = KnowledgeGraph(storage_path=temp_storage)
            kg1.import_from_json(import_path)
            
            # 创建新实例，验证数据已持久化
            kg2 = KnowledgeGraph(storage_path=temp_storage)
            assert "eq_import_persist_001" in kg2._equipment
        
        finally:
            Path(import_path).unlink(missing_ok=True)
    
    # ==================== 不支持的类型测试 ====================
    
    def test_add_unsupported_type(self, kg):
        """测试添加不支持的类型"""
        class UnsupportedType:
            def __init__(self):
                self.id = "unsupported_001"
                self.name = "不支持的类型"
        
        unsupported = UnsupportedType()
        with pytest.raises(ValueError, match="不支持的条目类型"):
            kg.add_entry(unsupported)
