"""
为化学样品X补充留样管理信息

此脚本会：
1. 查找化学样品X
2. 添加留样相关的详细信息
3. 更新样品状态和备注
4. 添加留样期限和提醒信息
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


async def add_retention_info_for_chemical_sample_x():
    """为化学样品X添加留样管理信息"""
    # 从环境变量获取数据库URL
    db_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lims")
    
    # 创建数据库连接
    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        print(f"\n{'='*70}")
        print(f"为化学样品X补充留样管理信息")
        print(f"{'='*70}\n")
        
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
        print(f"   当前状态: {sample.status.value}")
        
        # 计算留样相关日期
        current_date = datetime.now()
        retention_start_date = current_date  # 留样开始日期（检测完成日期）
        retention_period_days = 180  # 留样期限：180天（6个月）
        retention_expiry_date = retention_start_date + timedelta(days=retention_period_days)
        reminder_date = retention_expiry_date - timedelta(days=30)  # 提前30天提醒
        
        print(f"\n📝 添加留样管理信息...")
        print(f"   留样开始日期: {retention_start_date.strftime('%Y-%m-%d')}")
        print(f"   留样期限: {retention_period_days}天")
        print(f"   留样到期日期: {retention_expiry_date.strftime('%Y-%m-%d')}")
        print(f"   提醒日期: {reminder_date.strftime('%Y-%m-%d')}")
        
        # 更新样品的存储信息（留样专用）
        sample.storage_location = "留样室-化学品专区-A01-冷藏柜2号"
        sample.storage_condition = """留样存储条件：
- 温度：2-8℃（冷藏保存）
- 湿度：相对湿度 ≤60%
- 光照：避光保存，使用棕色玻璃瓶
- 容器：密封玻璃容器，防止挥发
- 标识：贴有"留样"标签，标注留样日期和到期日期
- 检查频率：每周检查一次外观和密封性
- 特殊要求：远离热源和强氧化剂，保持通风"""
        
        # 更新描述信息，添加留样用途说明
        sample.description = f"""
化学样品X是从化工厂A区生产车间3号反应釜中采集的化学品样品。

【样品信息】
- 样品外观：无色透明液体
- 气味：无明显异味
- pH值：7.2
- 密度：1.05 g/cm³
- 批次号：20260513-A03-001

【检测项目】
1. 主成分含量测定（HPLC法）
2. 杂质检测（GC-MS法）
3. 重金属含量测定（ICP-MS法）
4. 水分含量测定（卡尔费休法）
5. pH值测定

【留样目的】
- 质量追溯：用于产品质量问题的追溯调查
- 法规要求：符合化学品生产质量管理规范（GMP）要求
- 对比分析：用于后续批次的质量对比
- 复检备用：如有质量争议，可进行复检

【留样期限】
- 留样开始日期：{retention_start_date.strftime('%Y年%m月%d日')}
- 留样期限：{retention_period_days}天（6个月）
- 留样到期日期：{retention_expiry_date.strftime('%Y年%m月%d日')}
- 提醒日期：{reminder_date.strftime('%Y年%m月%d日')}（到期前30天）

【留样处置】
到期后可选择：
1. 延期留样：如有特殊需要，可申请延期
2. 销毁处理：按照危险化学品处置规程进行销毁
3. 转移处理：转移至长期存档区
        """.strip()
        
        # 更新备注信息
        sample.remarks = f"""【留样管理重点】
1. 该样品为重要生产批次样品，需严格按照留样管理规程执行
2. 留样期限：{retention_period_days}天，到期日期：{retention_expiry_date.strftime('%Y-%m-%d')}
3. 系统将在{reminder_date.strftime('%Y-%m-%d')}自动发送到期提醒
4. 留样期间需定期检查样品状态，发现异常立即报告
5. 留样容器必须密封完好，标签清晰可读
6. 禁止未经授权擅自取用留样样品
7. 留样记录需完整保存，包括检查记录和处置记录

【质量要求】
- 主成分含量：≥98.5%
- 杂质总量：≤1.0%
- 重金属（以Pb计）：≤10 ppm
- 水分：≤0.5%

【安全注意事项】
- 该样品为易燃液体，远离火源
- 操作时佩戴防护手套和护目镜
- 在通风良好的环境中操作
- 避免皮肤接触和吸入蒸气

【联系人】
- 样品负责人：李工程师（分机：8001）
- 留样管理员：王主任（分机：8002）
- 质量负责人：张经理（分机：8003）"""
        
        # 更新优先级为高（留样样品需要特别关注）
        sample.priority = Priority.HIGH
        
        # 更新时间戳
        sample.updated_at = datetime.utcnow()
        
        await db.commit()
        
        print(f"\n✅ 留样管理信息添加成功！")
        print(f"\n{'='*70}")
        print(f"化学样品X留样管理信息汇总")
        print(f"{'='*70}\n")
        
        print(f"【基本信息】")
        print(f"  样品ID: {sample.id}")
        print(f"  条码: {sample.barcode}")
        print(f"  样品编号: {sample.sample_number}")
        print(f"  样品名称: {sample.sample_name}")
        print(f"  样品类型: {sample.sample_type}")
        print(f"  样品分类: {sample.sample_category}")
        print(f"  数量: {sample.quantity} {sample.unit}")
        print(f"  优先级: {sample.priority.value}")
        print(f"  状态: {sample.status.value}")
        
        print(f"\n【客户信息】")
        print(f"  客户名称: {sample.client_name}")
        print(f"  客户联系方式: {sample.client_contact}")
        
        print(f"\n【日期信息】")
        print(f"  接收日期: {sample.received_date.strftime('%Y-%m-%d')}")
        print(f"  采样日期: {sample.sampling_date.strftime('%Y-%m-%d')}")
        print(f"  留样开始日期: {retention_start_date.strftime('%Y-%m-%d')}")
        print(f"  留样到期日期: {retention_expiry_date.strftime('%Y-%m-%d')}")
        print(f"  提醒日期: {reminder_date.strftime('%Y-%m-%d')}")
        
        print(f"\n【采样信息】")
        print(f"  采样地点: {sample.sampling_location}")
        print(f"  采样人: {sample.sampling_person}")
        
        print(f"\n【留样存储信息】")
        print(f"  存储位置: {sample.storage_location}")
        print(f"  存储条件: ")
        for line in sample.storage_condition.split('\n'):
            if line.strip():
                print(f"    {line.strip()}")
        
        print(f"\n【留样期限】")
        print(f"  留样期限: {retention_period_days}天（{retention_period_days // 30}个月）")
        print(f"  剩余天数: {(retention_expiry_date - current_date).days}天")
        print(f"  到期提醒: 提前30天（{reminder_date.strftime('%Y-%m-%d')}）")
        
        print(f"\n【审计信息】")
        print(f"  创建人: {sample.created_by}")
        print(f"  创建时间: {sample.created_at.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  更新时间: {sample.updated_at.strftime('%Y-%m-%d %H:%M:%S')}")
        
        print(f"\n{'='*70}")
        print(f"💡 后续操作建议")
        print(f"{'='*70}\n")
        print(f"1. 【查看样品详情】")
        print(f"   - 在样品管理页面搜索条码：{sample.barcode}")
        print(f"   - 点击【查看】按钮查看完整的留样信息")
        print(f"   - 可以看到详细的存储条件和留样要求")
        
        print(f"\n2. 【留样管理】")
        print(f"   - 在留样管理页面可以查看所有留样样品")
        print(f"   - 系统会在{reminder_date.strftime('%Y-%m-%d')}自动发送到期提醒")
        print(f"   - 可以进行留样延期、销毁或转移操作")
        
        print(f"\n3. 【定期检查】")
        print(f"   - 每周检查一次样品外观和密封性")
        print(f"   - 记录检查结果和异常情况")
        print(f"   - 确保存储条件符合要求")
        
        print(f"\n4. 【到期处置】")
        print(f"   - 到期前30天收到提醒后，评估是否需要延期")
        print(f"   - 如不需要延期，按规程进行销毁或转移")
        print(f"   - 完整记录处置过程和结果")
        
        print(f"\n5. 【质量追溯】")
        print(f"   - 如有质量问题，可随时调取留样进行复检")
        print(f"   - 留样记录可用于质量追溯和分析")
        print(f"   - 保持留样记录的完整性和可追溯性")
        
        print(f"\n{'='*70}")
        print(f"✅ 化学样品X留样管理信息补充完成！")
        print(f"{'='*70}\n")


if __name__ == "__main__":
    asyncio.run(add_retention_info_for_chemical_sample_x())
