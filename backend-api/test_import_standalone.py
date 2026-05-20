"""
独立的导入服务测试脚本

不依赖完整的测试环境，直接测试核心功能
"""
import asyncio
import io
from openpyxl import Workbook


def test_file_parser():
    """测试文件解析器"""
    print("测试文件解析器...")
    
    from app.utils.file_parser import file_parser
    
    # 测试 CSV 解析
    print("\n1. 测试 CSV 解析")
    csv_content = """sampleId,testItemId,parameter,value,unit,method
sample-001,item-001,pH,7.5,pH,GB/T 5750.4-2006
sample-001,item-002,浊度,2.3,NTU,GB/T 5750.4-2006
"""
    
    content_bytes = csv_content.encode('utf-8')
    records = file_parser.parse_csv(content_bytes)
    
    print(f"   解析到 {len(records)} 条记录")
    print(f"   第一条记录: {records[0]}")
    assert len(records) == 2
    assert records[0]['parameter'] == 'pH'
    print("   ✓ CSV 解析测试通过")
    
    # 测试 Excel 解析
    print("\n2. 测试 Excel 解析")
    wb = Workbook()
    ws = wb.active
    
    # 添加表头
    ws.append(['sampleId', 'testItemId', 'parameter', 'value', 'unit', 'method'])
    
    # 添加数据
    ws.append(['sample-001', 'item-001', 'pH', 7.5, 'pH', 'GB/T 5750.4-2006'])
    ws.append(['sample-001', 'item-002', '浊度', 2.3, 'NTU', 'GB/T 5750.4-2006'])
    
    # 保存到字节流
    excel_stream = io.BytesIO()
    wb.save(excel_stream)
    excel_stream.seek(0)
    content_bytes = excel_stream.read()
    
    records = file_parser.parse_excel(content_bytes)
    
    print(f"   解析到 {len(records)} 条记录")
    print(f"   第一条记录: {records[0]}")
    assert len(records) == 2
    assert records[0]['parameter'] == 'pH'
    print("   ✓ Excel 解析测试通过")


def test_import_schemas():
    """测试导入相关的 Schema"""
    print("\n测试导入 Schema...")
    
    from app.schemas.result import ImportError, ImportResult, ImportTaskStatus
    
    # 测试 ImportError
    print("\n1. 测试 ImportError")
    error = ImportError(
        row=2,
        field='sampleId',
        value='sample-999',
        message='样品不存在'
    )
    print(f"   错误对象: {error}")
    assert error.row == 2
    assert error.message == '样品不存在'
    print("   ✓ ImportError 测试通过")
    
    # 测试 ImportResult
    print("\n2. 测试 ImportResult")
    result = ImportResult(
        success=True,
        total_records=10,
        success_count=8,
        failure_count=2,
        errors=[error]
    )
    print(f"   导入结果: 总数={result.total_records}, 成功={result.success_count}, 失败={result.failure_count}")
    assert result.total_records == 10
    assert result.success_count == 8
    print("   ✓ ImportResult 测试通过")
    
    # 测试 ImportTaskStatus
    print("\n3. 测试 ImportTaskStatus")
    status = ImportTaskStatus.PENDING
    print(f"   任务状态: {status.value}")
    assert status == ImportTaskStatus.PENDING
    print("   ✓ ImportTaskStatus 测试通过")


def test_validation_logic():
    """测试数据验证逻辑"""
    print("\n测试数据验证逻辑...")
    
    # 模拟验证场景
    print("\n1. 测试必填字段验证")
    
    test_rows = [
        {
            'sampleId': '',
            'testItemId': 'item-001',
            'parameter': 'pH',
            'method': 'GB/T 5750.4-2006'
        },
        {
            'sampleId': 'sample-001',
            'testItemId': '',
            'parameter': 'pH',
            'method': 'GB/T 5750.4-2006'
        },
        {
            'sampleId': 'sample-001',
            'testItemId': 'item-001',
            'parameter': '',
            'method': 'GB/T 5750.4-2006'
        },
        {
            'sampleId': 'sample-001',
            'testItemId': 'item-001',
            'parameter': 'pH',
            'method': ''
        }
    ]
    
    errors = []
    for i, row in enumerate(test_rows):
        row_number = i + 2
        
        if not row.get('sampleId', '').strip():
            errors.append(f"行 {row_number}: 样品 ID 不能为空")
        
        if not row.get('testItemId', '').strip():
            errors.append(f"行 {row_number}: 检测项 ID 不能为空")
        
        if not row.get('parameter', '').strip():
            errors.append(f"行 {row_number}: 检测参数不能为空")
        
        if not row.get('method', '').strip():
            errors.append(f"行 {row_number}: 检测方法不能为空")
    
    print(f"   检测到 {len(errors)} 个验证错误:")
    for error in errors:
        print(f"   - {error}")
    
    assert len(errors) == 4
    print("   ✓ 必填字段验证测试通过")
    
    print("\n2. 测试数值格式验证")
    
    test_values = [
        ('7.5', True),
        ('2.3', True),
        ('abc', False),
        ('', False),
        ('10', True),
        ('-5.2', True)
    ]
    
    for value_str, should_pass in test_values:
        try:
            if value_str:
                value = float(value_str)
                result = True
            else:
                result = False
        except ValueError:
            result = False
        
        print(f"   值 '{value_str}': {'通过' if result else '失败'} (预期: {'通过' if should_pass else '失败'})")
        assert result == should_pass
    
    print("   ✓ 数值格式验证测试通过")


def main():
    """主测试函数"""
    print("=" * 60)
    print("批量导入服务独立测试")
    print("=" * 60)
    
    try:
        test_file_parser()
        test_import_schemas()
        test_validation_logic()
        
        print("\n" + "=" * 60)
        print("✓ 所有测试通过！")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 测试失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
