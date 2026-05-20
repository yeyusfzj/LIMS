"""
批量导入服务测试

测试检测结果批量导入功能
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import io
import csv
from openpyxl import Workbook

from app.models.base import Base
from app.models.sample import Sample, SampleStatus, Priority
from app.models.result import Result
from app.services.import_service import import_service
from datetime import datetime


# 测试数据库 URL
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
async def db_session():
    """创建测试数据库会话"""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # 创建所有表
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 创建会话
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    # 清理
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def sample_data(db_session: AsyncSession):
    """创建测试样品数据"""
    sample = Sample(
        id="sample-001",
        barcode="SP20260409001",
        sampleNumber="SN001",
        clientName="测试客户",
        sampleName="水样",
        sampleType="环境样品",
        quantity=500.0,
        unit="ml",
        status=SampleStatus.REGISTERED,
        priority=Priority.MEDIUM,
        receivedDate=datetime.utcnow(),
        createdBy="user-001"
    )
    
    db_session.add(sample)
    await db_session.commit()
    
    return sample


@pytest.mark.asyncio
async def test_parse_csv_file():
    """测试 CSV 文件解析"""
    # 创建 CSV 内容
    csv_content = """sampleId,testItemId,parameter,value,unit,method
sample-001,item-001,pH,7.5,pH,GB/T 5750.4-2006
sample-001,item-002,浊度,2.3,NTU,GB/T 5750.4-2006
"""
    
    content_bytes = csv_content.encode('utf-8')
    
    from app.utils.file_parser import file_parser
    
    records = file_parser.parse_csv(content_bytes)
    
    assert len(records) == 2
    assert records[0]['parameter'] == 'pH'
    assert records[0]['value'] == '7.5'
    assert records[1]['parameter'] == '浊度'


@pytest.mark.asyncio
async def test_parse_excel_file():
    """测试 Excel 文件解析"""
    # 创建 Excel 工作簿
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
    
    from app.utils.file_parser import file_parser
    
    records = file_parser.parse_excel(content_bytes)
    
    assert len(records) == 2
    assert records[0]['parameter'] == 'pH'
    assert records[0]['value'] == '7.5'


@pytest.mark.asyncio
async def test_import_results_success(db_session: AsyncSession, sample_data: Sample):
    """测试成功导入结果"""
    # 创建 CSV 内容
    csv_content = f"""sampleId,testItemId,parameter,value,unit,method
{sample_data.id},item-001,pH,7.5,pH,GB/T 5750.4-2006
{sample_data.id},item-002,浊度,2.3,NTU,GB/T 5750.4-2006
"""
    
    content_bytes = csv_content.encode('utf-8')
    
    # 执行导入
    result = await import_service.import_results(
        db=db_session,
        content=content_bytes,
        filename="test.csv",
        entered_by="user-001"
    )
    
    # 验证结果
    assert result.success is True
    assert result.total_records == 2
    assert result.success_count == 2
    assert result.failure_count == 0
    assert len(result.errors) == 0
    assert len(result.imported_results) == 2


@pytest.mark.asyncio
async def test_import_results_with_validation_errors(db_session: AsyncSession):
    """测试导入时的验证错误"""
    # 创建包含错误的 CSV 内容
    csv_content = """sampleId,testItemId,parameter,value,unit,method
,item-001,pH,7.5,pH,GB/T 5750.4-2006
sample-999,item-002,浊度,2.3,NTU,GB/T 5750.4-2006
sample-001,,温度,25,℃,
"""
    
    content_bytes = csv_content.encode('utf-8')
    
    # 执行导入
    result = await import_service.import_results(
        db=db_session,
        content=content_bytes,
        filename="test.csv",
        entered_by="user-001"
    )
    
    # 验证结果
    assert result.success is False
    assert result.total_records == 3
    assert result.success_count == 0
    assert result.failure_count == 3
    assert len(result.errors) > 0
    
    # 验证错误详情
    error_messages = [e.message for e in result.errors]
    assert any('样品 ID 不能为空' in msg for msg in error_messages)
    assert any('样品不存在' in msg for msg in error_messages)
    assert any('检测项 ID 不能为空' in msg for msg in error_messages)


@pytest.mark.asyncio
async def test_import_results_with_mixed_data(db_session: AsyncSession, sample_data: Sample):
    """测试导入混合数据（部分成功，部分失败）"""
    # 创建混合数据的 CSV 内容
    csv_content = f"""sampleId,testItemId,parameter,value,unit,method
{sample_data.id},item-001,pH,7.5,pH,GB/T 5750.4-2006
sample-999,item-002,浊度,2.3,NTU,GB/T 5750.4-2006
{sample_data.id},item-003,温度,25,℃,GB/T 5750.4-2006
"""
    
    content_bytes = csv_content.encode('utf-8')
    
    # 执行导入
    result = await import_service.import_results(
        db=db_session,
        content=content_bytes,
        filename="test.csv",
        entered_by="user-001"
    )
    
    # 验证结果
    assert result.success is False  # 因为有错误
    assert result.total_records == 3
    assert result.success_count == 2
    assert result.failure_count == 1
    assert len(result.errors) == 1
    assert result.errors[0].message == '样品不存在'


@pytest.mark.asyncio
async def test_import_results_with_text_value(db_session: AsyncSession, sample_data: Sample):
    """测试导入文本型结果"""
    # 创建包含文本结果的 CSV 内容
    csv_content = f"""sampleId,testItemId,parameter,textValue,method
{sample_data.id},item-001,外观,无色透明,目测法
{sample_data.id},item-002,气味,无异味,嗅觉法
"""
    
    content_bytes = csv_content.encode('utf-8')
    
    # 执行导入
    result = await import_service.import_results(
        db=db_session,
        content=content_bytes,
        filename="test.csv",
        entered_by="user-001"
    )
    
    # 验证结果
    assert result.success is True
    assert result.success_count == 2
    assert result.imported_results[0].text_value == '无色透明'
    assert result.imported_results[1].text_value == '无异味'


@pytest.mark.asyncio
async def test_batch_insert_performance(db_session: AsyncSession, sample_data: Sample):
    """测试批量插入性能"""
    # 创建大量数据
    rows = []
    for i in range(100):
        rows.append({
            'sample_id': sample_data.id,
            'test_item_id': f'item-{i:03d}',
            'parameter': f'参数{i}',
            'value': float(i),
            'unit': 'mg/L',
            'method': 'GB/T 5750.4-2006',
            'instrument_id': None
        })
    
    # 执行批量插入
    import time
    start_time = time.time()
    
    results = await import_service._batch_insert(
        db=db_session,
        valid_rows=rows,
        entered_by="user-001"
    )
    
    end_time = time.time()
    duration = end_time - start_time
    
    # 验证结果
    assert len(results) == 100
    
    # 性能验证：100 条记录应在 1 秒内完成
    assert duration < 1.0, f"批量插入耗时过长: {duration:.2f}秒"
    
    print(f"批量插入 100 条记录耗时: {duration:.3f}秒")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
