#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
为 Dashboard 创建测试数据

创建样品、任务和检测结果数据，用于测试 Dashboard 统计功能
"""

import asyncio
import uuid
from datetime import datetime, timedelta
import sys
import os

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_db


async def seed_data():
    """创建测试数据"""
    
    print("开始创建测试数据...")
    
    async for db in get_db():
        try:
            # 1. 创建样品数据
            print("\n1. 创建样品数据...")
            
            now = datetime.now()
            samples_data = []
            
            # 创建 10 个样品（不同状态和时间）
            for i in range(10):
                sample_id = str(uuid.uuid4())
                timestamp = now.strftime('%Y%m%d%H%M%S')
                barcode = f"BAR{timestamp}{i:04d}"
                sample_number = f"S{timestamp}{i:04d}"
                
                # 随机分配状态
                statuses = ['REGISTERED', 'IN_TESTING', 'TESTING_COMPLETE', 'AUDIT_COMPLETE', 'RELEASED']
                status = statuses[i % len(statuses)]
                
                # 随机分配创建时间（一半本周，一半上周）
                if i < 5:
                    created_at = now - timedelta(days=i)  # 本周
                else:
                    created_at = now - timedelta(days=7 + i)  # 上周
                
                samples_data.append({
                    'id': sample_id,
                    'barcode': barcode,
                    'sampleNumber': sample_number,
                    'clientName': f'客户{i+1}',
                    'clientContact': f'联系人{i+1}',
                    'sampleName': f'样品{i+1}',
                    'sampleType': '水样' if i % 2 == 0 else '土壤',
                    'sampleCategory': '环境检测',
                    'quantity': 500.0,
                    'unit': 'ml' if i % 2 == 0 else 'g',
                    'receivedDate': created_at,
                    'status': status,
                    'priority': 'NORMAL',
                    'createdBy': 'admin',
                    'createdAt': created_at,
                    'updatedAt': created_at
                })
            
            # 批量插入样品
            for sample in samples_data:
                await db.execute(text("""
                    INSERT INTO samples (
                        id, barcode, "sampleNumber", "clientName", "clientContact",
                        "sampleName", "sampleType", "sampleCategory", quantity, unit,
                        "receivedDate", status, priority, "createdBy", "createdAt", "updatedAt"
                    ) VALUES (
                        :id, :barcode, :sampleNumber, :clientName, :clientContact,
                        :sampleName, :sampleType, :sampleCategory, :quantity, :unit,
                        :receivedDate, :status, :priority, :createdBy, :createdAt, :updatedAt
                    )
                    ON CONFLICT (barcode) DO NOTHING
                """), sample)
            
            print(f"   ✅ 创建了 {len(samples_data)} 个样品")
            
            # 提交事务
            await db.commit()
            
            print("\n✅ 测试数据创建成功！")
            print("\n数据统计:")
            print(f"  - 样品: {len(samples_data)} 个")
            
            # 验证数据
            print("\n验证数据...")
            result = await db.execute(text("SELECT COUNT(*) FROM samples"))
            samples_count = result.scalar()
            print(f"  - samples 表: {samples_count} 条记录")
            
            result = await db.execute(text("SELECT COUNT(*) FROM tasks"))
            tasks_count = result.scalar()
            print(f"  - tasks 表: {tasks_count} 条记录")
            
            return True
            
        except Exception as e:
            await db.rollback()
            print(f"\n❌ 创建测试数据失败: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    success = asyncio.run(seed_data())
    if success:
        print("\n🎉 数据种子脚本执行成功！")
        print("现在可以刷新 Dashboard 页面查看真实数据了。")
    else:
        print("\n❌ 数据种子脚本执行失败！")
        sys.exit(1)
