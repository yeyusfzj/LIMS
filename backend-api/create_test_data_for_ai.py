#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
创建测试数据用于 AI 智能分析

创建包含检测结果的样品数据，用于测试 AI 智能分析功能
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models.sample import Sample, SampleStatus, Priority
from app.models.result import Result, ResultSource


async def create_test_data():
    """创建测试数据"""
    
    async for db in get_db():
        try:
            # 创建样品 1: 水样重金属检测（正常）
            sample1 = Sample(
                id=str(uuid.uuid4()),
                barcode=f"BAR{datetime.now().strftime('%Y%m%d%H%M%S')}001",
                sample_number=f"S{datetime.now().strftime('%Y%m%d')}0001",
                client_name="环保局",
                client_contact="张三 13800138000",
                sample_name="河水样品",
                sample_type="水样",
                sample_category="环境检测",
                quantity=500.0,
                unit="ml",
                received_date=datetime.now(),
                sampling_date=datetime.now() - timedelta(days=1),
                sampling_location="长江武汉段",
                sampling_person="李四",
                storage_location="冷藏室A-01",
                storage_condition="4°C冷藏",
                status=SampleStatus.TESTING_COMPLETE,
                priority=Priority.NORMAL,
                description="长江武汉段水质监测样品",
                created_by="admin",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(sample1)
            await db.flush()
            
            # 为样品 1 添加检测结果（正常值）
            results1 = [
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample1.id,
                    testItemId="test_001",
                    parameter="铅含量",
                    value=0.008,  # 正常（阈值 0.01）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                ),
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample1.id,
                    testItemId="test_002",
                    parameter="镉含量",
                    value=0.003,  # 正常（阈值 0.005）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                ),
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample1.id,
                    testItemId="test_003",
                    parameter="汞含量",
                    value=0.0005,  # 正常（阈值 0.001）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                )
            ]
            for result in results1:
                db.add(result)
            
            # 创建样品 2: 水样重金属检测（超标）
            sample2 = Sample(
                id=str(uuid.uuid4()),
                barcode=f"BAR{datetime.now().strftime('%Y%m%d%H%M%S')}002",
                sample_number=f"S{datetime.now().strftime('%Y%m%d')}0002",
                client_name="环保局",
                client_contact="张三 13800138000",
                sample_name="工业废水样品",
                sample_type="水样",
                sample_category="环境检测",
                quantity=500.0,
                unit="ml",
                received_date=datetime.now(),
                sampling_date=datetime.now() - timedelta(days=1),
                sampling_location="某化工厂排放口",
                sampling_person="李四",
                storage_location="冷藏室A-02",
                storage_condition="4°C冷藏",
                status=SampleStatus.TESTING_COMPLETE,
                priority=Priority.HIGH,
                description="化工厂废水排放监测样品",
                created_by="admin",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(sample2)
            await db.flush()
            
            # 为样品 2 添加检测结果（超标值）
            results2 = [
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample2.id,
                    testItemId="test_001",
                    parameter="铅含量",
                    value=0.025,  # 超标（阈值 0.01）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    isAbnormal=True,
                    abnormalReason="超过国家标准",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                ),
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample2.id,
                    testItemId="test_002",
                    parameter="镉含量",
                    value=0.008,  # 超标（阈值 0.005）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    isAbnormal=True,
                    abnormalReason="超过国家标准",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                ),
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample2.id,
                    testItemId="test_003",
                    parameter="汞含量",
                    value=0.0015,  # 超标（阈值 0.001）
                    unit="mg/L",
                    method="原子吸收法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="AAS-2000",
                    isAbnormal=True,
                    abnormalReason="超过国家标准",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                )
            ]
            for result in results2:
                db.add(result)
            
            # 创建样品 3: 土壤有机物检测
            sample3 = Sample(
                id=str(uuid.uuid4()),
                barcode=f"BAR{datetime.now().strftime('%Y%m%d%H%M%S')}003",
                sample_number=f"S{datetime.now().strftime('%Y%m%d')}0003",
                client_name="农业局",
                client_contact="王五 13900139000",
                sample_name="农田土壤样品",
                sample_type="土壤",
                sample_category="环境检测",
                quantity=1000.0,
                unit="g",
                received_date=datetime.now(),
                sampling_date=datetime.now() - timedelta(days=2),
                sampling_location="某农田",
                sampling_person="赵六",
                storage_location="常温室B-01",
                storage_condition="常温干燥",
                status=SampleStatus.TESTING_COMPLETE,
                priority=Priority.NORMAL,
                description="农田土壤有机物检测样品",
                created_by="admin",
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(sample3)
            await db.flush()
            
            # 为样品 3 添加检测结果
            results3 = [
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample3.id,
                    testItemId="test_004",
                    parameter="苯含量",
                    value=0.05,  # 正常（阈值 0.1）
                    unit="mg/kg",
                    method="气相色谱法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="GC-2030",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                ),
                Result(
                    id=str(uuid.uuid4()),
                    sampleId=sample3.id,
                    testItemId="test_005",
                    parameter="甲苯含量",
                    value=0.8,  # 正常（阈值 1.2）
                    unit="mg/kg",
                    method="气相色谱法",
                    source=ResultSource.INSTRUMENT,
                    instrumentId="GC-2030",
                    enteredBy="admin",
                    enteredAt=datetime.now()
                )
            ]
            for result in results3:
                db.add(result)
            
            # 提交事务
            await db.commit()
            
            print("✅ 测试数据创建成功！")
            print(f"\n样品 1: {sample1.sample_number} - {sample1.sample_name} (正常)")
            print(f"  - 铅含量: 0.008 mg/L (正常)")
            print(f"  - 镉含量: 0.003 mg/L (正常)")
            print(f"  - 汞含量: 0.0005 mg/L (正常)")
            print(f"\n样品 2: {sample2.sample_number} - {sample2.sample_name} (超标)")
            print(f"  - 铅含量: 0.025 mg/L (超标)")
            print(f"  - 镉含量: 0.008 mg/L (超标)")
            print(f"  - 汞含量: 0.0015 mg/L (超标)")
            print(f"\n样品 3: {sample3.sample_number} - {sample3.sample_name} (正常)")
            print(f"  - 苯含量: 0.05 mg/kg (正常)")
            print(f"  - 甲苯含量: 0.8 mg/kg (正常)")
            
            return {
                "sample1_id": sample1.id,
                "sample2_id": sample2.id,
                "sample3_id": sample3.id
            }
            
        except Exception as e:
            await db.rollback()
            print(f"❌ 创建测试数据失败: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(create_test_data())
