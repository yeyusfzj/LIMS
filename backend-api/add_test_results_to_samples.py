"""为样品添加检测结果数据"""
import asyncio
import uuid
from datetime import datetime, timedelta
from app.core.database import get_session_factory
from app.models.result import Result, ResultSource
from sqlalchemy import text

async def add_test_results():
    session_factory = get_session_factory()
    async with session_factory() as db:
        print("开始为样品添加检测结果...")
        
        # 获取所有新创建的样品
        result = await db.execute(
            text("""
                SELECT id, "sampleName", "sampleType"
                FROM samples
                WHERE "sampleNumber" LIKE 'SN-20260513-%'
                ORDER BY "createdAt";
            """)
        )
        
        samples = result.fetchall()
        print(f"找到 {len(samples)} 个样品")
        
        # 不同样品类型的检测参数
        test_params = {
            '水质': [
                {'parameter': 'pH值', 'value': 7.2, 'unit': '', 'method': 'GB/T 6920-1986'},
                {'parameter': '浊度', 'value': 0.8, 'unit': 'NTU', 'method': 'GB/T 13200-1991'},
                {'parameter': '总硬度', 'value': 180.5, 'unit': 'mg/L', 'method': 'GB/T 5750.4-2006'},
                {'parameter': '溶解氧', 'value': 6.5, 'unit': 'mg/L', 'method': 'GB/T 7489-1987'},
                {'parameter': '化学需氧量(COD)', 'value': 15.2, 'unit': 'mg/L', 'method': 'GB/T 11914-1989'}
            ],
            '土壤': [
                {'parameter': 'pH值', 'value': 6.8, 'unit': '', 'method': 'NY/T 1377-2007'},
                {'parameter': '有机质', 'value': 2.5, 'unit': '%', 'method': 'NY/T 1121.6-2006'},
                {'parameter': '全氮', 'value': 0.15, 'unit': 'g/kg', 'method': 'NY/T 53-1987'},
                {'parameter': '速效磷', 'value': 18.5, 'unit': 'mg/kg', 'method': 'NY/T 1121.7-2014'},
                {'parameter': '速效钾', 'value': 125.0, 'unit': 'mg/kg', 'method': 'NY/T 889-2004'}
            ],
            '空气': [
                {'parameter': 'PM2.5', 'value': 35.0, 'unit': 'μg/m³', 'method': 'HJ 653-2013'},
                {'parameter': 'PM10', 'value': 68.0, 'unit': 'μg/m³', 'method': 'HJ 618-2011'},
                {'parameter': '二氧化硫(SO₂)', 'value': 12.0, 'unit': 'μg/m³', 'method': 'HJ 482-2009'},
                {'parameter': '二氧化氮(NO₂)', 'value': 42.0, 'unit': 'μg/m³', 'method': 'HJ 479-2009'},
                {'parameter': '一氧化碳(CO)', 'value': 0.8, 'unit': 'mg/m³', 'method': 'GB/T 9801-1988'}
            ],
            '食品': [
                {'parameter': '水分', 'value': 12.5, 'unit': '%', 'method': 'GB 5009.3-2016'},
                {'parameter': '蛋白质', 'value': 8.2, 'unit': 'g/100g', 'method': 'GB 5009.5-2016'},
                {'parameter': '脂肪', 'value': 3.5, 'unit': 'g/100g', 'method': 'GB 5009.6-2016'},
                {'parameter': '总糖', 'value': 65.0, 'unit': 'g/100g', 'method': 'GB/T 5009.7-2016'},
                {'parameter': '菌落总数', 'value': 850.0, 'unit': 'CFU/g', 'method': 'GB 4789.2-2016'}
            ],
            '药品': [
                {'parameter': '含量测定', 'value': 98.5, 'unit': '%', 'method': '中国药典2020版'},
                {'parameter': '水分', 'value': 2.8, 'unit': '%', 'method': '中国药典2020版'},
                {'parameter': '重金属', 'value': 8.0, 'unit': 'ppm', 'method': '中国药典2020版'},
                {'parameter': '溶出度', 'value': 92.0, 'unit': '%', 'method': '中国药典2020版'},
                {'parameter': '微生物限度', 'value': 50.0, 'unit': 'CFU/g', 'method': '中国药典2020版'}
            ]
        }
        
        operators = ['张三', '李四', '王五', '赵六', '钱七']
        sources = [ResultSource.MANUAL, ResultSource.INSTRUMENT, ResultSource.CALCULATED]
        
        created_count = 0
        
        for sample in samples:
            sample_id = sample[0]
            sample_name = sample[1]
            sample_type = sample[2]
            
            # 获取该样品类型的检测参数
            params = test_params.get(sample_type, test_params['水质'])
            
            # 为每个样品创建检测结果
            for i, param in enumerate(params):
                # 添加一些随机变化
                value_variation = (hash(sample_id + param['parameter']) % 20 - 10) / 10.0
                adjusted_value = param['value'] + value_variation
                
                # 判断是否异常（10%的概率）
                is_abnormal = (hash(sample_id + param['parameter']) % 10) == 0
                
                result = Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample_id,
                    testItemId=str(uuid.uuid4()),  # 临时ID
                    parameter=param['parameter'],
                    value=adjusted_value,
                    textValue=None,
                    unit=param['unit'],
                    method=param['method'],
                    source=sources[i % len(sources)],
                    isAbnormal=is_abnormal,
                    abnormalReason='超出标准范围' if is_abnormal else None,
                    enteredBy=operators[i % len(operators)],
                    enteredAt=datetime.utcnow() - timedelta(days=(i % 10), hours=i),
                    reviewedBy=operators[(i + 1) % len(operators)] if i % 2 == 0 else None,
                    reviewedAt=datetime.utcnow() - timedelta(days=(i % 5)) if i % 2 == 0 else None
                )
                
                db.add(result)
                created_count += 1
            
            # 每10个样品提交一次
            if created_count % 50 == 0:
                await db.commit()
                print(f"已创建 {created_count} 条检测结果...")
        
        await db.commit()
        
        print(f"\n✅ 完成！")
        print(f"   - 处理样品: {len(samples)} 个")
        print(f"   - 创建检测结果: {created_count} 条")
        print(f"   - 平均每个样品: {created_count // len(samples) if samples else 0} 条结果")

if __name__ == "__main__":
    asyncio.run(add_test_results())
