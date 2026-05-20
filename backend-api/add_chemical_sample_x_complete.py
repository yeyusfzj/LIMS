"""
为化学样品X添加完整的详细信息
包括留样信息、存储条件等
"""
import asyncio
import sys
import os
from datetime import datetime, timedelta

# 添加项目根目录到 Python 路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.sample import Sample, SampleStatus, Priority
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


async def add_chemical_sample_x_details():
    """为化学样品X添加完整详细信息"""
    # 从环境变量获取数据库URL
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lims")
    
    # 创建数据库连接
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print(f"\n{'='*60}")
        print(f"为化学样品X添加完整详细信息")
        print(f"{'='*60}\n")
        
        # 查询化学样品X
        barcode = "SP20260514000001"
        result = await db.execute(
            select(Sample).where(Sample.barcode == barcode)
        )
        sample = result.scalar_one_or_none()
        
        if not sample:
            print(f"❌ 未找到化学样品X (条码: {barcode})")
            print(f"   请先运行 add_audit_task_for_chemical_sample.py 创建样品")
            return
        
        print(f"✅ 找到化学样品X:")
        print(f"   ID: {sample.id}")
        print(f"   条码: {sample.barcode}")
        print(f"   样品名称: {sample.sample_name}")
        print(f"   当前状态: {sample.status}")
        
        # 更新样品信息，添加更多详细信息
        print(f"\n📝 更新样品详细信息...")
        
        # 添加采样信息
        sample.sampling_date = datetime(2026, 5, 13)  # 采样日期
        sample.sampling_location = "化工厂A区-生产车间3号反应釜"
        sample.sampling_person = "李工程师"
        
        # 添加存储信息
        sample.storage_location = "留样室-化学品专区-A01"
        sample.storage_condition = "常温避光保存，温度20±2℃，相对湿度45±5%"
        
        # 添加描述信息
        sample.description = """
化学样品X是从化工厂A区生产车间3号反应釜中采集的化学品样品。
该样品用于质量检测和留样管理，需要进行多项化学成分分析。
样品外观为无色透明液体，无明显异味。
        """.strip()
        
        sample.remarks = "该样品为重要生产批次样品，需要特别关注检测结果和留样期限"
        
        # 更新优先级为高
        sample.priority = Priority.HIGH
        
        # 更新时间戳
        sample.updated_at = datetime.utcnow()
        
        await db.commit()
        
        print(f"✅ 样品信息更新成功:")
        print(f"   采样日期: {sample.sampling_date.strftime('%Y-%m-%d')}")
        print(f"   采样地点: {sample.sampling_location}")
        print(f"   采样人: {sample.sampling_person}")
        print(f"   存储位置: {sample.storage_location}")
        print(f"   存储条件: {sample.storage_condition}")
        print(f"   优先级: {sample.priority.value}")
        
        print(f"\n{'='*60}")
        print(f"✅ 化学样品X详细信息添加完成！")
        print(f"{'='*60}\n")
        
        print(f"📋 样品完整信息:")
        print(f"   ID: {sample.id}")
        print(f"   条码: {sample.barcode}")
        print(f"   样品编号: {sample.sample_number}")
        print(f"   样品名称: {sample.sample_name}")
        print(f"   样品类型: {sample.sample_type}")
        print(f"   样品分类: {sample.sample_category}")
        print(f"   客户名称: {sample.client_name}")
        print(f"   客户联系方式: {sample.client_contact}")
        print(f"   数量: {sample.quantity} {sample.unit}")
        print(f"   接收日期: {sample.received_date.strftime('%Y-%m-%d')}")
        print(f"   采样日期: {sample.sampling_date.strftime('%Y-%m-%d')}")
        print(f"   采样地点: {sample.sampling_location}")
        print(f"   采样人: {sample.sampling_person}")
        print(f"   存储位置: {sample.storage_location}")
        print(f"   存储条件: {sample.storage_condition}")
        print(f"   状态: {sample.status.value}")
        print(f"   优先级: {sample.priority.value}")
        print(f"   描述: {sample.description}")
        print(f"   备注: {sample.remarks}")
        print(f"   创建人: {sample.created_by}")
        print(f"   创建时间: {sample.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"   更新时间: {sample.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        print(f"\n💡 提示:")
        print(f"   1. 可以在样品管理页面查看该样品")
        print(f"   2. 可以在留样管理页面查看留样信息")
        print(f"   3. 点击查看按钮可以看到完整的详细信息")
        print(f"   4. 样品详情页面会显示所有字段信息")


if __name__ == "__main__":
    asyncio.run(add_chemical_sample_x_details())
