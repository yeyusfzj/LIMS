"""
FastAPI 后端测试数据填充脚本
从 Node.js 后端迁移测试数据生成逻辑到 FastAPI 后端
"""

import asyncio
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.database import async_session_maker
from app.models.sample import Sample
from app.models.audit import AuditTask, AuditLevel, AuditStatus
from app.models.user import User

# 公司名称列表
COMPANY_NAMES = [
    "华泰检测有限公司", "中科检验中心", "国检集团", "天正实验室",
    "博瑞检测技术", "精准分析中心", "环保监测站", "质量检验所",
    "安全检测中心", "标准化研究院", "计量测试院", "产品质量监督局"
]

# 描述模板
DESCRIPTIONS = [
    "样品外观正常，无异味",
    "样品密封完好，标识清晰",
    "样品状态良好，符合检测要求",
    "样品包装完整，无破损",
    "样品保存条件符合标准",
    "样品来源可追溯，记录完整",
    "样品数量充足，可进行全项检测",
    "样品特征明显，易于识别"
]

# 审核级别配置
AUDIT_LEVELS = [
    {"level": 1, "name": "分析审核"},
    {"level": 2, "name": "样品审核"},
    {"level": 3, "name": "技术审核"},
    {"level": 4, "name": "质量审核"}
]

# 审核状态配置
AUDIT_STATUSES = [
    AuditStatus.PENDING,
    AuditStatus.APPROVED,
    AuditStatus.REJECTED,
    AuditStatus.RETURNED
]

# 样品类型
SAMPLE_TYPES = [
    "水质样品", "土壤样品", "空气样品", "食品样品", 
    "药品样品", "化妆品样品", "工业品样品", "农产品样品"
]

# 优先级
PRIORITIES = ["normal", "high", "urgent"]


async def clear_existing_data(session: AsyncSession):
    """清除现有测试数据"""
    print("清除现有测试数据...")
    
    # 删除审核任务
    await session.execute(delete(AuditTask))
    
    # 删除样品（保留用户数据）
    await session.execute(delete(Sample))
    
    await session.commit()
    print("✓ 现有数据已清除")


async def get_admin_user(session: AsyncSession) -> User:
    """获取管理员用户"""
    result = await session.execute(
        select(User).where(User.username == "admin")
    )
    admin = result.scalar_one_or_none()
    
    if not admin:
        raise Exception("未找到管理员用户，请先运行数据库初始化")
    
    return admin


async def create_samples(session: AsyncSession, admin_user: User, count: int = 30) -> list[Sample]:
    """创建样品数据"""
    print(f"创建 {count} 个样品...")
    
    samples = []
    for i in range(count):
        sample = Sample(
            barcode=f"S{datetime.now().strftime('%Y%m%d')}{str(i+1).zfill(4)}",
            sample_name=f"{random.choice(SAMPLE_TYPES)}-{i+1}",
            sample_type=random.choice(SAMPLE_TYPES),
            client_name=random.choice(COMPANY_NAMES),
            sampling_date=datetime.now() - timedelta(days=random.randint(1, 30)),
            received_date=datetime.now() - timedelta(days=random.randint(0, 5)),
            quantity=random.uniform(10, 1000),
            unit=random.choice(["g", "ml", "kg", "L"]),
            status="registered",
            current_location=f"仓库-{random.choice(['A', 'B', 'C'])}-{random.randint(1, 10)}",
            priority=random.choice(PRIORITIES),
            description=random.choice(DESCRIPTIONS),
            created_by=admin_user.id,
            created_at=datetime.now() - timedelta(days=random.randint(0, 10))
        )
        samples.append(sample)
        session.add(sample)
    
    await session.flush()
    print(f"✓ 已创建 {len(samples)} 个样品")
    return samples


async def create_audit_tasks(session: AsyncSession, samples: list[Sample], admin_user: User, count: int = 29) -> list[AuditTask]:
    """创建审核任务数据"""
    print(f"创建 {count} 个审核任务...")
    
    audit_tasks = []
    
    # 审核意见模板
    comments_templates = [
        "审核通过，样品符合检测标准",
        "数据准确，结果可靠",
        "检测方法正确，操作规范",
        "需要补充相关检测数据",
        "样品处理过程需要改进",
        "建议重新采样检测",
        "检测结果存在异常，需要复核",
        "符合质量控制要求"
    ]
    
    for i in range(count):
        sample = random.choice(samples)
        level_config = random.choice(AUDIT_LEVELS)
        status = random.choice(AUDIT_STATUSES)
        
        # 根据状态设置时间
        submitted_at = datetime.now() - timedelta(days=random.randint(1, 15))
        audited_at = None
        comments = None
        if status in [AuditStatus.APPROVED, AuditStatus.REJECTED, AuditStatus.RETURNED]:
            audited_at = submitted_at + timedelta(hours=random.randint(1, 48))
            comments = random.choice(comments_templates)
        
        audit_task = AuditTask(
            sample_id=sample.id,
            level=level_config["level"],
            status=status,
            auditor_id=admin_user.id,
            submitted_at=submitted_at,
            audited_at=audited_at,
            comments=comments,
            priority=sample.priority,
            created_by=admin_user.id,
            created_at=submitted_at
        )
        
        audit_tasks.append(audit_task)
        session.add(audit_task)
    
    await session.flush()
    print(f"✓ 已创建 {len(audit_tasks)} 个审核任务")
    return audit_tasks


async def print_summary(session: AsyncSession):
    """打印数据统计摘要"""
    print("\n" + "="*50)
    print("数据填充完成！统计摘要：")
    print("="*50)
    
    # 统计样品
    sample_result = await session.execute(select(Sample))
    samples = sample_result.scalars().all()
    print(f"样品总数: {len(samples)}")
    
    # 统计审核任务
    audit_result = await session.execute(select(AuditTask))
    audits = audit_result.scalars().all()
    print(f"审核任务总数: {len(audits)}")
    
    # 按状态统计审核任务
    status_counts = {}
    for audit in audits:
        status_counts[audit.status] = status_counts.get(audit.status, 0) + 1
    
    print("\n审核任务状态分布:")
    for status, count in status_counts.items():
        print(f"  - {status}: {count}")
    
    # 按级别统计审核任务
    level_counts = {}
    for audit in audits:
        level_name = next((l["name"] for l in AUDIT_LEVELS if l["level"] == audit.level), f"级别{audit.level}")
        level_counts[level_name] = level_counts.get(level_name, 0) + 1
    
    print("\n审核任务级别分布:")
    for level, count in level_counts.items():
        print(f"  - {level}: {count}")
    
    print("="*50)


async def main():
    """主函数"""
    print("="*50)
    print("FastAPI 后端测试数据填充")
    print("="*50)
    print()
    
    async with async_session_maker() as session:
        try:
            # 1. 清除现有数据
            await clear_existing_data(session)
            
            # 2. 获取管理员用户
            admin_user = await get_admin_user(session)
            print(f"✓ 找到管理员用户: {admin_user.username}")
            
            # 3. 创建样品
            samples = await create_samples(session, admin_user, count=30)
            
            # 4. 创建审核任务
            audit_tasks = await create_audit_tasks(session, samples, admin_user, count=29)
            
            # 5. 提交事务
            await session.commit()
            print("\n✓ 所有数据已提交到数据库")
            
            # 6. 打印统计摘要
            await print_summary(session)
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ 错误: {str(e)}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
