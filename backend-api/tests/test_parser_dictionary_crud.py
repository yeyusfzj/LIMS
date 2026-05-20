"""
测试解析器词典 CRUD 操作
"""

import pytest
import json
import tempfile
from pathlib import Path
import sys

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.agent.parser_dictionary import ParserDictionary


@pytest.fixture
def temp_dictionary_file():
    """创建临时词典文件"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
        initial_data = {
            "purpose_keywords": ["检测", "测定"],
            "sample_type_keywords": {
                "水样": ["水样", "水质"],
                "土壤": ["土壤", "土质"]
            },
            "indicator_keywords": {
                "重金属": ["铅", "汞"]
            },
            "equipment_keywords": ["光谱仪", "色谱仪"],
            "time_patterns": ["(\\d+)\\s*(小时|h)"],
            "value_patterns": ["(\\d+\\.?\\d*)\\s*(mg/L)"],
            "experiment_type_mapping": {
                "水样重金属": "water_heavy_metal"
            }
        }
        json.dump(initial_data, f, ensure_ascii=False, indent=2)
        temp_path = f.name
    
    yield temp_path
    
    # 清理
    Path(temp_path).unlink(missing_ok=True)


@pytest.fixture
def dictionary(temp_dictionary_file):
    """创建词典实例"""
    return ParserDictionary(temp_dictionary_file)


class TestAddKeyword:
    """测试添加关键词"""
    
    def test_add_keyword_to_list_category(self, dictionary):
        """测试添加关键词到列表类型的类别"""
        result = dictionary.add_keyword("purpose_keywords", "分析")
        assert result is True
        assert "分析" in dictionary.get_purpose_keywords()
    
    def test_add_keyword_to_dict_category(self, dictionary):
        """测试添加关键词到字典类型的类别"""
        result = dictionary.add_keyword("sample_type_keywords", "地表水", subcategory="水样")
        assert result is True
        assert "地表水" in dictionary.get_sample_type_keywords()["水样"]
    
    def test_add_keyword_to_new_subcategory(self, dictionary):
        """测试添加关键词到新的子类别"""
        result = dictionary.add_keyword("sample_type_keywords", "大气", subcategory="空气")
        assert result is True
        assert "空气" in dictionary.get_sample_type_keywords()
        assert "大气" in dictionary.get_sample_type_keywords()["空气"]
    
    def test_add_duplicate_keyword(self, dictionary):
        """测试添加重复关键词"""
        result1 = dictionary.add_keyword("purpose_keywords", "检测")
        result2 = dictionary.add_keyword("purpose_keywords", "检测")
        assert result1 is True
        assert result2 is True
        # 确保只有一个
        assert dictionary.get_purpose_keywords().count("检测") == 1
    
    def test_add_keyword_without_subcategory(self, dictionary):
        """测试添加关键词到字典类型但未提供子类别"""
        result = dictionary.add_keyword("sample_type_keywords", "测试")
        assert result is False


class TestRemoveKeyword:
    """测试删除关键词"""
    
    def test_remove_keyword_from_list_category(self, dictionary):
        """测试从列表类型的类别删除关键词"""
        result = dictionary.remove_keyword("purpose_keywords", "检测")
        assert result is True
        assert "检测" not in dictionary.get_purpose_keywords()
    
    def test_remove_keyword_from_dict_category(self, dictionary):
        """测试从字典类型的类别删除关键词"""
        result = dictionary.remove_keyword("sample_type_keywords", "水样", subcategory="水样")
        assert result is True
        assert "水样" not in dictionary.get_sample_type_keywords()["水样"]
    
    def test_remove_nonexistent_keyword(self, dictionary):
        """测试删除不存在的关键词"""
        result = dictionary.remove_keyword("purpose_keywords", "不存在的关键词")
        assert result is False
    
    def test_remove_keyword_from_nonexistent_category(self, dictionary):
        """测试从不存在的类别删除关键词"""
        result = dictionary.remove_keyword("nonexistent_category", "测试")
        assert result is False


class TestPatternOperations:
    """测试正则模式操作"""
    
    def test_add_pattern(self, dictionary):
        """测试添加正则模式"""
        result = dictionary.add_pattern("time_patterns", "(\\d+)\\s*(分钟|min)")
        assert result is True
        assert "(\\d+)\\s*(分钟|min)" in dictionary.data["time_patterns"]
    
    def test_add_invalid_pattern(self, dictionary):
        """测试添加无效的正则模式"""
        result = dictionary.add_pattern("time_patterns", "(\\d+[")
        assert result is False
    
    def test_remove_pattern(self, dictionary):
        """测试删除正则模式"""
        result = dictionary.remove_pattern("time_patterns", "(\\d+)\\s*(小时|h)")
        assert result is True
        assert "(\\d+)\\s*(小时|h)" not in dictionary.data["time_patterns"]
    
    def test_update_pattern(self, dictionary):
        """测试更新正则模式"""
        old_pattern = "(\\d+)\\s*(小时|h)"
        new_pattern = "(\\d+)\\s*(小时|h|hour)"
        result = dictionary.update_pattern("time_patterns", old_pattern, new_pattern)
        assert result is True
        assert new_pattern in dictionary.data["time_patterns"]
        assert old_pattern not in dictionary.data["time_patterns"]
    
    def test_update_pattern_with_invalid_new_pattern(self, dictionary):
        """测试用无效模式更新"""
        result = dictionary.update_pattern("time_patterns", "(\\d+)\\s*(小时|h)", "(\\d+[")
        assert result is False


class TestSubcategoryOperations:
    """测试子类别操作"""
    
    def test_add_subcategory(self, dictionary):
        """测试添加子类别"""
        result = dictionary.add_subcategory("sample_type_keywords", "空气")
        assert result is True
        assert "空气" in dictionary.get_sample_type_keywords()
        assert isinstance(dictionary.get_sample_type_keywords()["空气"], list)
    
    def test_add_duplicate_subcategory(self, dictionary):
        """测试添加重复的子类别"""
        result1 = dictionary.add_subcategory("sample_type_keywords", "水样")
        result2 = dictionary.add_subcategory("sample_type_keywords", "水样")
        assert result1 is True
        assert result2 is True
    
    def test_remove_subcategory(self, dictionary):
        """测试删除子类别"""
        result = dictionary.remove_subcategory("sample_type_keywords", "土壤")
        assert result is True
        assert "土壤" not in dictionary.get_sample_type_keywords()
    
    def test_remove_nonexistent_subcategory(self, dictionary):
        """测试删除不存在的子类别"""
        result = dictionary.remove_subcategory("sample_type_keywords", "不存在")
        assert result is False


class TestMappingOperations:
    """测试映射操作"""
    
    def test_add_mapping(self, dictionary):
        """测试添加映射"""
        result = dictionary.add_mapping("experiment_type_mapping", "土壤重金属", "soil_heavy_metal")
        assert result is True
        assert dictionary.get_experiment_type_mapping()["土壤重金属"] == "soil_heavy_metal"
    
    def test_remove_mapping(self, dictionary):
        """测试删除映射"""
        result = dictionary.remove_mapping("experiment_type_mapping", "水样重金属")
        assert result is True
        assert "水样重金属" not in dictionary.get_experiment_type_mapping()
    
    def test_remove_nonexistent_mapping(self, dictionary):
        """测试删除不存在的映射"""
        result = dictionary.remove_mapping("experiment_type_mapping", "不存在")
        assert result is False


class TestExportImport:
    """测试导出导入功能"""
    
    def test_export_to_json(self, dictionary):
        """测试导出到 JSON"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            export_path = f.name
        
        try:
            result = dictionary.export_to_json(export_path)
            assert result is True
            assert Path(export_path).exists()
            
            # 验证导出的内容
            with open(export_path, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            assert "purpose_keywords" in exported_data
            assert "sample_type_keywords" in exported_data
        finally:
            Path(export_path).unlink(missing_ok=True)
    
    def test_import_from_json(self, dictionary, temp_dictionary_file):
        """测试从 JSON 导入"""
        # 创建一个新的 JSON 文件
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            new_data = {
                "purpose_keywords": ["新检测", "新测定"],
                "equipment_keywords": ["新设备"]
            }
            json.dump(new_data, f, ensure_ascii=False, indent=2)
            import_path = f.name
        
        try:
            result = dictionary.import_from_json(import_path)
            assert result is True
            assert "新检测" in dictionary.get_purpose_keywords()
            assert "新设备" in dictionary.get_equipment_keywords()
        finally:
            Path(import_path).unlink(missing_ok=True)
    
    def test_import_from_nonexistent_file(self, dictionary):
        """测试从不存在的文件导入"""
        result = dictionary.import_from_json("/nonexistent/path/file.json")
        assert result is False


class TestImmediateEffect:
    """测试更新后立即生效"""
    
    def test_add_keyword_immediate_effect(self, dictionary):
        """测试添加关键词后立即生效"""
        # 添加新关键词
        dictionary.add_keyword("purpose_keywords", "新目的")
        
        # 立即查询应该能获取到
        assert "新目的" in dictionary.get_purpose_keywords()
    
    def test_pattern_update_immediate_effect(self, dictionary):
        """测试更新模式后立即生效"""
        # 添加新模式
        dictionary.add_pattern("time_patterns", "(\\d+)\\s*(秒|s)")
        
        # 立即使用应该能匹配
        result = dictionary.extract_time("需要30秒")
        assert len(result) > 0
    
    def test_remove_keyword_immediate_effect(self, dictionary):
        """测试删除关键词后立即生效"""
        # 删除关键词
        dictionary.remove_keyword("purpose_keywords", "检测")
        
        # 立即查询应该获取不到
        assert "检测" not in dictionary.get_purpose_keywords()


class TestPersistence:
    """测试数据持久化"""
    
    def test_data_persists_after_save(self, temp_dictionary_file):
        """测试数据保存后持久化"""
        # 创建词典并添加数据
        dict1 = ParserDictionary(temp_dictionary_file)
        dict1.add_keyword("purpose_keywords", "持久化测试")
        
        # 创建新实例，应该能读取到之前添加的数据
        dict2 = ParserDictionary(temp_dictionary_file)
        assert "持久化测试" in dict2.get_purpose_keywords()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
