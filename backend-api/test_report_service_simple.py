"""
简单测试报告服务实现
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.services.report_service import ReportService
from app.schemas.report import ReportData
from datetime import datetime


def test_fill_report_template():
    """测试报告模板填充"""
    print("测试报告模板填充...")
    
    service = ReportService()
    
    # 模拟报告数据
    report_data = ReportData(
        sample={
            "id": "sample-123",
            "barcode": "SP20260409001",
            "sampleNumber": "S2026040900001",
            "clientName": "测试客户",
            "sampleName": "水样",
            "sampleType": "环境样品",
            "quantity": 500.0,
            "unit": "ml"
        },
        results=[
            {
                "parameter": "pH值",
                "value": 7.2,
                "unit": "",
                "method": "玻璃电极法"
            },
            {
                "parameter": "浊度",
                "value": 1.5,
                "unit": "NTU",
                "method": "浊度计法"
            }
        ],
        qualityJudgment={
            "result": "合格",
            "basis": "GB 5749-2006",
            "isAutomatic": True
        },
        auditTasks=[],
        generatedAt=datetime.now(),
        generatedBy="user-123"
    )
    
    # 模拟模板内容
    template_content = """
    <html>
    <head><title>检测报告</title></head>
    <body>
        <h1>检测报告 - {{reportNumber}}</h1>
        <h2>样品信息</h2>
        <p>样品编号：{{sample.sampleNumber}}</p>
        <p>样品名称：{{sample.sampleName}}</p>
        <p>客户名称：{{sample.clientName}}</p>
        <p>样品类型：{{sample.sampleType}}</p>
        <p>样品数量：{{sample.quantity}} {{sample.unit}}</p>
        
        <h2>检测结果</h2>
        <p>检测项目数量：{{results}}</p>
        
        <h2>质量判定</h2>
        <p>判定结果：{{qualityJudgment.result}}</p>
        <p>判定依据：{{qualityJudgment.basis}}</p>
        
        <h2>报告信息</h2>
        <p>生成时间：{{generatedAt}}</p>
        <p>生成人：{{generatedBy}}</p>
    </body>
    </html>
    """
    
    # 模拟变量定义
    variables = [
        {"name": "reportNumber", "type": "string"},
        {"name": "sample", "type": "object"},
        {"name": "results", "type": "array"},
        {"name": "qualityJudgment", "type": "object"},
        {"name": "generatedAt", "type": "date", "format": "%Y-%m-%d %H:%M:%S"},
        {"name": "generatedBy", "type": "string"}
    ]
    
    # 填充模板
    content = service._fill_report_template(
        template_content,
        variables,
        report_data,
        "REPORT-20260409-0001"
    )
    
    print("填充后的内容：")
    print(content)
    print("\n✓ 模板填充测试通过")
    
    # 验证关键内容
    assert "REPORT-20260409-0001" in content
    assert "S2026040900001" in content
    assert "测试客户" in content
    assert "水样" in content
    assert "合格" in content
    
    print("✓ 内容验证通过")


def test_format_value():
    """测试值格式化"""
    print("\n测试值格式化...")
    
    service = ReportService()
    
    # 测试日期格式化
    date_value = datetime(2026, 4, 9, 14, 30, 0)
    date_var = {"type": "date", "format": "%Y-%m-%d %H:%M:%S"}
    formatted_date = service._format_value(date_value, date_var)
    print(f"日期格式化: {formatted_date}")
    assert formatted_date == "2026-04-09 14:30:00"
    
    # 测试数字格式化
    number_value = 3.14159
    number_var = {"type": "number", "format": "0.00"}
    formatted_number = service._format_value(number_value, number_var)
    print(f"数字格式化: {formatted_number}")
    assert formatted_number == "3.14"
    
    # 测试布尔值格式化
    bool_value = True
    bool_var = {"type": "boolean"}
    formatted_bool = service._format_value(bool_value, bool_var)
    print(f"布尔值格式化: {formatted_bool}")
    assert formatted_bool == "是"
    
    # 测试数组格式化
    array_value = ["项目1", "项目2", "项目3"]
    array_var = {"type": "array"}
    formatted_array = service._format_value(array_value, array_var)
    print(f"数组格式化: {formatted_array}")
    assert formatted_array == "项目1, 项目2, 项目3"
    
    print("✓ 值格式化测试通过")


def test_get_value_by_path():
    """测试路径取值"""
    print("\n测试路径取值...")
    
    service = ReportService()
    
    # 测试对象
    obj = {
        "sample": {
            "name": "水样",
            "client": {
                "name": "测试客户"
            }
        },
        "count": 10
    }
    
    # 测试简单路径
    value1 = service._get_value_by_path(obj, "count")
    print(f"简单路径: count = {value1}")
    assert value1 == 10
    
    # 测试嵌套路径
    value2 = service._get_value_by_path(obj, "sample.name")
    print(f"嵌套路径: sample.name = {value2}")
    assert value2 == "水样"
    
    # 测试深层嵌套路径
    value3 = service._get_value_by_path(obj, "sample.client.name")
    print(f"深层嵌套路径: sample.client.name = {value3}")
    assert value3 == "测试客户"
    
    # 测试不存在的路径
    value4 = service._get_value_by_path(obj, "sample.notexist")
    print(f"不存在的路径: sample.notexist = {value4}")
    assert value4 is None
    
    print("✓ 路径取值测试通过")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("报告服务简单测试")
    print("=" * 60)
    
    try:
        test_get_value_by_path()
        test_format_value()
        test_fill_report_template()
        
        print("\n" + "=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
