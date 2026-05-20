"""
为化学样品X添加检测结果数据

此脚本会：
1. 查找化学样品X
2. 为该样品创建多个检测结果
3. 包含正常和异常的检测数据
"""
import asyncio
from sqlalchemy import select
from app.core.database import get_session_factory
from app.models.sample import Sample
from app.models.result import Result, ResultSource
from datetime import datetime
import uuid


async def add_test_results_for_chemical_sample():
    """为化学样品X添加检测结果"""
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # 1. 查找化学样品X
            print("🔍 查找化学样品X...")
            result = await session.execute(
                select(Sample).where(Sample.sample_name.like('%化学样品X%'))
            )
            sample = result.scalar_one_or_none()
            
            if not sample:
                print("❌ 未找到化学样品X")
                return
            
            print(f"✅ 找到样品: {sample.sample_name} (ID: {sample.id}, 条码: {sample.barcode})")
            
            # 2. 创建检测结果数据
            print("\n📊 创建检测结果...")
            
            test_results_data = [
                {
                    "parameter": "pH值",
                    "value": 7.2,
                    "unit": "",
                    "method": "GB/T 6920-1986 水质pH值测定",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "6.5-8.5"
                },
                {
                    "parameter": "温度",
                    "value": 25.5,
                    "unit": "℃",
                    "method": "温度计法",
                    "source": ResultSource.INSTRUMENT,
                    "instrumentId": "INST-001",
                    "isAbnormal": False,
                    "normalRange": "0-100"
                },
                {
                    "parameter": "浊度",
                    "value": 3.2,
                    "unit": "NTU",
                    "method": "GB/T 13200-1991 水质浊度测定",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "≤5"
                },
                {
                    "parameter": "总硬度",
                    "value": 380.5,
                    "unit": "mg/L",
                    "method": "GB/T 7477-1987 水质总硬度测定",
                    "source": ResultSource.INSTRUMENT,
                    "instrumentId": "INST-002",
                    "isAbnormal": False,
                    "normalRange": "≤450"
                },
                {
                    "parameter": "氯化物",
                    "value": 185.3,
                    "unit": "mg/L",
                    "method": "GB/T 11896-1989 水质氯化物测定",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "≤250"
                },
                {
                    "parameter": "重金属含量",
                    "value": 0.08,
                    "unit": "mg/L",
                    "method": "GB/T 7475-1987 水质重金属测定",
                    "source": ResultSource.INSTRUMENT,
                    "instrumentId": "INST-003",
                    "isAbnormal": False,
                    "normalRange": "≤0.1"
                },
                {
                    "parameter": "COD",
                    "value": 15.8,
                    "unit": "mg/L",
                    "method": "GB/T 11914-1989 化学需氧量测定",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "≤20"
                },
                {
                    "parameter": "氨氮",
                    "value": 0.45,
                    "unit": "mg/L",
                    "method": "GB/T 7479-1987 氨氮测定",
                    "source": ResultSource.INSTRUMENT,
                    "instrumentId": "INST-001",
                    "isAbnormal": False,
                    "normalRange": "≤0.5"
                },
                {
                    "parameter": "总磷",
                    "value": 0.12,
                    "unit": "mg/L",
                    "method": "GB/T 11893-1989 总磷测定",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "≤0.2"
                },
                {
                    "parameter": "外观",
                    "textValue": "无色透明，无异味",
                    "unit": "",
                    "method": "目测法",
                    "source": ResultSource.MANUAL,
                    "isAbnormal": False,
                    "normalRange": "无色透明"
                }
            ]
            
            created_count = 0
            for data in test_results_data:
                test_result = Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample.id,
                    testItemId=str(uuid.uuid4()),  # 模拟测试项ID
                    parameter=data["parameter"],
                    value=data.get("value"),
                    textValue=data.get("textValue"),
                    unit=data.get("unit", ""),
                    method=data.get("method", ""),
                    source=data["source"],
                    instrumentId=data.get("instrumentId"),
                    isAbnormal=data.get("isAbnormal", False),
                    abnormalReason=data.get("abnormalReason"),
                    enteredBy="admin",
                    enteredAt=datetime.now(),
                    reviewedBy=None,
                    reviewedAt=None
                )
                session.add(test_result)
                created_count += 1
                print(f"   ✅ 创建检测结果: {data['parameter']} = {data.get('value') or data.get('textValue')} {data.get('unit', '')}")
            
            # 提交所有更改
            await session.commit()
            
            print("\n" + "="*60)
            print("🎉 检测结果创建成功！")
            print("="*60)
            print(f"样品名称: {sample.sample_name}")
            print(f"样品条码: {sample.barcode}")
            print(f"创建检测结果数量: {created_count} 条")
            print("="*60)
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ 创建检测结果失败: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    print("开始为化学样品X创建检测结果...\n")
    asyncio.run(add_test_results_for_chemical_sample())
    print("\n✅ 脚本执行完成")
