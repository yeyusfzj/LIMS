"""
简化版测试数据生成脚本 - 只生成样品和仪器数据
"""

import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import get_session_factory
from app.models.sample import Sample, SampleStatus, Priority
from app.models.user import User
from app.models.instrument import Instrument, InstrumentStatus

# 公司名称列表
COMPANY_NAMES = [
    "华泰检测有限公司", "中科检验中心", "国检集团", "天正实验室",
    "博瑞检测技术", "精准分析中心", "环保监测站", "质量检验所",
    "安全检测中心", "标准化研究院", "计量测试院", "产品质量监督局",
    "华信检测集团", "中环检测中心", "国标实验室", "天元检测",
    "博达分析中心", "精诚检验所", "环境监测中心", "质检研究院"
]

# 样品类型
SAMPLE_TYPES = [
    "水质样品", "土壤样品", "空气样品", "食品样品", 
    "药品样品", "化妆品样品", "工业品样品", "农产品样品",
    "饮用水样品", "地表水样品", "地下水样品", "废水样品",
    "农田土壤", "工业土壤", "建筑土壤", "污染土壤"
]

# 仪器类型
INSTRUMENT_TYPES = [
    "光谱仪", "色谱仪", "质谱仪", "显微镜", "天平", "离心机",
    "培养箱", "干燥箱", "水浴锅", "电热板", "搅拌器", "振荡器",
    "pH计", "电导仪", "浊度仪", "溶氧仪", "COD测定仪", "BOD测定仪",
    "原子吸收光谱仪", "气相色谱仪", "液相色谱仪", "紫外分光光度计"
]

# 仪器品牌
INSTRUMENT_BRANDS = [
    "安捷伦", "岛津", "赛默飞", "珀金埃尔默", "布鲁克",
    "沃特世", "AB Sciex", "日立", "尼康", "蔡司",
    "梅特勒", "赛多利斯", "奥豪斯", "AND", "普利赛斯"
]


async def get_admin_user(session: AsyncSession) -> User:
    """获取管理员用户"""
    result = await session.execute(
        select(User).where(User.username == "admin")
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise Exception("未找到管理员用户，请先运行数据库初始化")
    
    return admin


async def create_samples(session: AsyncSession, admin_user: User, count: int = 150):
    """创建样品数据"""
    print(f"创建 {count} 个样品...")
    
    base_date = datetime.now()
    
    for i in range(count):
        days_ago = random.randint(0, 60)
        sample_date = base_date - timedelta(days=days_ago)
        barcode = f"S{sample_date.strftime('%Y%m%d')}{str(i+1).zfill(4)}"
        
        sample = Sample(
            barcode=barcode,
            sample_number=barcode,  # 使用相同的编号
            sample_name=f"{random.choice(SAMPLE_TYPES)}-{i+1}",
            sample_type=random.choice(SAMPLE_TYPES),
            sample_category=random.choice(["环境", "食品", "药品", "化妆品", "工业品"]),
            client_name=random.choice(COMPANY_NAMES),
            sampling_date=sample_date - timedelta(days=random.randint(0, 5)),
            received_date=sample_date,
            quantity=round(random.uniform(10, 1000), 2),
            unit=random.choice(["g", "ml", "kg", "L", "个", "份"]),
            status=random.choice([SampleStatus.REGISTERED, SampleStatus.IN_TESTING, SampleStatus.TESTING_COMPLETE, SampleStatus.ARCHIVED]),
            storage_location=f"仓库-{random.choice(['A', 'B', 'C', 'D', 'E'])}-{random.randint(1, 20)}",
            priority=random.choice([Priority.NORMAL, Priority.HIGH, Priority.URGENT]),
            description=f"样品外观正常，状态良好",
            created_by=admin_user.id,
            created_at=sample_date,
            updated_at=sample_date
        )
        session.add(sample)
        
        if (i + 1) % 50 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 个样品...")
    
    await session.commit()
    print(f"✓ 已创建 {count} 个样品")


async def create_instruments(session: AsyncSession, admin_user: User, count: int = 80):
    """创建仪器数据"""
    print(f"创建 {count} 台仪器...")
    
    base_date = datetime.now()
    
    for i in range(count):
        instrument_type = random.choice(INSTRUMENT_TYPES)
        brand = random.choice(INSTRUMENT_BRANDS)
        
        instrument_code = f"INS{datetime.now().year}{str(i+1).zfill(4)}"
        purchase_date = base_date - timedelta(days=random.randint(365, 3650))
        next_calibration = base_date + timedelta(days=random.randint(30, 365))
        
        instrument = Instrument(
            code=instrument_code,
            name=f"{brand} {instrument_type}",
            model=f"{brand}-{random.randint(1000, 9999)}",
            manufacturer=brand,
            serial_number=f"SN{random.randint(100000, 999999)}",
            purchase_date=purchase_date,
            status=random.choice([InstrumentStatus.IN_USE, InstrumentStatus.IN_USE, InstrumentStatus.MAINTENANCE, InstrumentStatus.STANDBY]),
            current_location=f"实验室-{random.choice(['A', 'B', 'C', 'D'])}-{random.randint(1, 10)}号位",
            current_responsible=admin_user.username,
            description=f"精度: ±{random.uniform(0.001, 0.1):.3f}, 量程: {random.randint(10, 1000)}",
            remarks=f"购置于{purchase_date.year}年，状态良好",
            created_by=admin_user.id,
            created_at=purchase_date,
            updated_at=purchase_date
        )
        session.add(instrument)
        
        if (i + 1) % 40 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 台仪器...")
    
    await session.commit()
    print(f"✓ 已创建 {count} 台仪器")


async def print_summary(session: AsyncSession):
    """打印统计摘要"""
    print("\n" + "="*60)
    print("数据填充完成！统计摘要：")
    print("="*60)
    
    # 统计样品
    sample_result = await session.execute(select(Sample))
    samples = sample_result.scalars().all()
    print(f"样品总数: {len(samples)}")
    
    # 统计仪器
    instrument_result = await session.execute(select(Instrument))
    instruments = instrument_result.scalars().all()
    print(f"仪器总数: {len(instruments)}")
    
    print("="*60)


async def main():
    """主函数"""
    print("="*60)
    print("FastAPI 后端测试数据填充（样品和仪器）")
    print("="*60)
    print()
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            # 获取管理员用户
            admin_user = await get_admin_user(session)
            print(f"✓ 找到管理员用户: {admin_user.username}\n")
            
            # 创建样品
            await create_samples(session, admin_user, count=150)
            
            # 创建仪器
            await create_instruments(session, admin_user, count=80)
            
            # 打印统计摘要
            await print_summary(session)
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())
