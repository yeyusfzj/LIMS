#!/usr/bin/env python3
"""
简单的解析器词典 CRUD 功能验证脚本
"""

import sys
import tempfile
import json
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.agent.parser_dictionary import ParserDictionary

def test_crud_operations():
    """测试 CRUD 操作"""
    print("=" * 60)
    print("解析器词典 CRUD 操作测试")
    print("=" * 60)
    
    # 创建临时词典文件
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
    
    try:
        # 创建词典实例
        pd = ParserDictionary(temp_path)
        
        # 测试 1: 添加关键词到列表类型
        print("\n1. 测试添加关键词到列表类型...")
        result = pd.add_keyword("purpose_keywords", "分析")
        print(f"   添加结果: {result}")
        print(f"   当前关键词: {pd.get_purpose_keywords()}")
        assert "分析" in pd.get_purpose_keywords(), "添加失败"
        print("   ✅ 通过")
        
        # 测试 2: 添加关键词到字典类型
        print("\n2. 测试添加关键词到字典类型...")
        result = pd.add_keyword("sample_type_keywords", "地表水", subcategory="水样")
        print(f"   添加结果: {result}")
        print(f"   当前关键词: {pd.get_sample_type_keywords()['水样']}")
        assert "地表水" in pd.get_sample_type_keywords()["水样"], "添加失败"
        print("   ✅ 通过")
        
        # 测试 3: 删除关键词
        print("\n3. 测试删除关键词...")
        result = pd.remove_keyword("purpose_keywords", "检测")
        print(f"   删除结果: {result}")
        print(f"   当前关键词: {pd.get_purpose_keywords()}")
        assert "检测" not in pd.get_purpose_keywords(), "删除失败"
        print("   ✅ 通过")
        
        # 测试 4: 添加正则模式
        print("\n4. 测试添加正则模式...")
        result = pd.add_pattern("time_patterns", "(\\d+)\\s*(分钟|min)")
        print(f"   添加结果: {result}")
        assert "(\\d+)\\s*(分钟|min)" in pd.data["time_patterns"], "添加失败"
        print("   ✅ 通过")
        
        # 测试 5: 删除正则模式
        print("\n5. 测试删除正则模式...")
        result = pd.remove_pattern("time_patterns", "(\\d+)\\s*(小时|h)")
        print(f"   删除结果: {result}")
        assert "(\\d+)\\s*(小时|h)" not in pd.data["time_patterns"], "删除失败"
        print("   ✅ 通过")
        
        # 测试 6: 更新正则模式
        print("\n6. 测试更新正则模式...")
        # 先添加回来
        pd.add_pattern("time_patterns", "(\\d+)\\s*(小时|h)")
        result = pd.update_pattern("time_patterns", "(\\d+)\\s*(小时|h)", "(\\d+)\\s*(小时|h|hour)")
        print(f"   更新结果: {result}")
        assert "(\\d+)\\s*(小时|h|hour)" in pd.data["time_patterns"], "更新失败"
        print("   ✅ 通过")
        
        # 测试 7: 添加子类别
        print("\n7. 测试添加子类别...")
        result = pd.add_subcategory("sample_type_keywords", "空气")
        print(f"   添加结果: {result}")
        assert "空气" in pd.get_sample_type_keywords(), "添加失败"
        print("   ✅ 通过")
        
        # 测试 8: 添加映射
        print("\n8. 测试添加映射...")
        result = pd.add_mapping("experiment_type_mapping", "土壤重金属", "soil_heavy_metal")
        print(f"   添加结果: {result}")
        assert pd.get_experiment_type_mapping()["土壤重金属"] == "soil_heavy_metal", "添加失败"
        print("   ✅ 通过")
        
        # 测试 9: 导出
        print("\n9. 测试导出...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            export_path = f.name
        result = pd.export_to_json(export_path)
        print(f"   导出结果: {result}")
        assert Path(export_path).exists(), "导出失败"
        print("   ✅ 通过")
        Path(export_path).unlink()
        
        # 测试 10: 导入
        print("\n10. 测试导入...")
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            new_data = {
                "purpose_keywords": ["新检测", "新测定"],
                "equipment_keywords": ["新设备"]
            }
            json.dump(new_data, f, ensure_ascii=False, indent=2)
            import_path = f.name
        
        result = pd.import_from_json(import_path)
        print(f"   导入结果: {result}")
        assert "新检测" in pd.get_purpose_keywords(), "导入失败"
        print("   ✅ 通过")
        Path(import_path).unlink()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        
        return True
        
    finally:
        # 清理临时文件
        Path(temp_path).unlink(missing_ok=True)

if __name__ == "__main__":
    try:
        success = test_crud_operations()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
