"""
FastAPI 后端大量测试数据填充脚本
生成大量测试数据用于测试分页功能
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
from app.models.instrument import Instrument
from app.models.workflow import Workflow, WorkflowStatus

# 公司名称列表（扩展）
COMPANY_NAMES = [
    "华泰检测有限公司", "中科检验中心", "国检集团", "天正实验室",
    "博瑞检测技术", "精准分析中心", "环保监测站", "质量检验所",
    "安全检测中心", "标准化研究院", "计量测试院", "产品质量监督局",
    "华信检测集团", "中环检测中心", "国标实验室", "天元检测",
    "博达分析中心", "精诚检验所", "环境监测中心", "质检研究院",
    "安全评估中心", "标准检测院", "计量认证中心", "质量监督站",
    "华美检测公司", "中正检验中心", "国信实验室", "天成检测",
    "博雅分析所", "精益检测中心", "环科监测站", "质控研究所"
]

# 样品类型（扩展）
SAMPLE_TYPES = [
    "水质样品", "土壤样品", "空气样品", "食品样品", 
    "药品样品", "化妆品样品", "工业品样品", "农产品样品",
    "饮用水样品", "地表水样品", "地下水样品", "废水样品",
    "农田土壤", "工业土壤", "建筑土壤", "污染土壤",
    "室内空气", "室外空气", "工业废气", "汽车尾气",
    "粮食样品", "蔬菜样品", "水果样品", "肉类样品",
    "中药材", "西药制剂", "生物制品", "原料药",
    "护肤品", "彩妆品", "洗护用品", "香水样品",
    "金属材料", "塑料制品", "纺织品", "建材样品",
    "谷物样品", "油料样品", "畜产品", "水产品"
]

# 仪器类型
INSTRUMENT_TYPES = [
    "光谱仪", "色谱仪", "质谱仪", "显微镜", "天平", "离心机",
    "培养箱", "干燥箱", "水浴锅", "电热板", "搅拌器", "振荡器",
    "pH计", "电导仪", "浊度仪", "溶氧仪", "COD测定仪", "BOD测定仪",
    "原子吸收光谱仪", "气相色谱仪", "液相色谱仪", "紫外分光光度计",
    "红外光谱仪", "荧光光谱仪", "拉曼光谱仪", "核磁共振仪",
    "扫描电镜", "透射电镜", "X射线衍射仪", "热分析仪"
]

# 仪器品牌
INSTRUMENT_BRANDS = [
    "安捷伦", "岛津", "赛默飞", "珀金埃尔默", "布鲁克",
    "沃特世", "AB Sciex", "日立", "尼康", "蔡司",
    "梅特勒", "赛多利斯", "奥豪斯", "AND", "普利赛斯",
    "海能", "磐诺", "天美", "东西分析", "北分瑞利"
]

# 仪器状态
INSTRUMENT_STATUSES = ["正常", "维护中", "故障", "停用", "校准中"]

# 工作流模板名称
WORKFLOW_TEMPLATES = [
    "水质检测标准流程", "土壤检测标准流程", "空气检测标准流程",
    "食品检测标准流程", "药品检测标准流程", "化妆品检测标准流程",
    "重金属检测流程", "有机物检测流程", "微生物检测流程",
    "农药残留检测流程", "兽药残留检测流程", "添加剂检测流程",
    "理化指标检测流程", "营养成分检测流程", "毒理学检测流程",
    "稳定性检测流程", "溶出度检测流程", "含量测定流程",
    "杂质检测流程", "有关物质检测流程", "残留溶剂检测流程"
]

# 工作流步骤模板
WORKFLOW_STEP_TEMPLATES = [
    {"name": "样品登记", "description": "登记样品信息，分配样品编号", "order": 1},
    {"name": "样品前处理", "description": "对样品进行前处理，如研磨、消解、萃取等", "order": 2},
    {"name": "仪器检测", "description": "使用相应仪器进行检测分析", "order": 3},
    {"name": "数据处理", "description": "处理检测数据，计算结果", "order": 4},
    {"name": "结果录入", "description": "将检测结果录入系统", "order": 5},
    {"name": "初审", "description": "分析人员对结果进行初步审核", "order": 6},
    {"name": "复审", "description": "技术负责人进行复审", "order": 7},
    {"name": "审核", "description": "质量负责人进行最终审核", "order": 8},
    {"name": "报告生成", "description": "生成检测报告", "order": 9},
    {"name": "报告签发", "description": "授权签字人签发报告", "order": 10}
]

# 描述模板
DESCRIPTIONS = [
    "样品外观正常，无异味", "样品密封完好，标识清晰",
    "样品状态良好，符合检测要求", "样品包装完整，无破损",
    "样品保存条件符合标准", "样品来源可追溯，记录完整",
    "样品数量充足，可进行全项检测", "样品特征明显，易于识别",
    "样品颜色正常，无沉淀", "样品气味正常，无异常",
    "样品透明度良好", "样品pH值在正常范围",
    "样品温度符合要求", "样品湿度适中",
    "样品无污染迹象", "样品标签完整清晰"
]

# 审核级别配置
AUDIT_LEVELS = [
    {"level": 1, "name": "分析审核"},
    {"level": 2, "name": "样品审核"},
    {"level": 3, "name": "技术审核"},
    {"level": 4, "name": "质量审核"}
]

# 优先级
PRIORITIES = ["normal", "high", "urgent"]


async def clear_existing_data(session: AsyncSession):
    """清除现有测试数据"""
    print("清除现有测试数据...")
    
    # 删除工作流
    await session.execute(delete(Workflow))
    
    # 删除仪器
    await session.execute(delete(Instrument))
    
    # 删除审核任务
    await session.execute(delete(AuditTask))
    
    # 删除样品
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


async def create_samples(session: AsyncSession, admin_user: User, count: int = 150) -> list[Sample]:
    """创建样品数据"""
    print(f"创建 {count} 个样品...")
    
    samples = []
    base_date = datetime.now()
    
    for i in range(count):
        # 生成样品编号
        days_ago = random.randint(0, 60)
        sample_date = base_date - timedelta(days=days_ago)
        barcode = f"S{sample_date.strftime('%Y%m%d')}{str(i+1).zfill(4)}"
        
        sample = Sample(
            barcode=barcode,
            sample_name=f"{random.choice(SAMPLE_TYPES)}-{i+1}",
            sample_type=random.choice(SAMPLE_TYPES),
            client_name=random.choice(COMPANY_NAMES),
            sampling_date=sample_date - timedelta(days=random.randint(0, 5)),
            received_date=sample_date,
            quantity=round(random.uniform(10, 1000), 2),
            unit=random.choice(["g", "ml", "kg", "L", "个", "份"]),
            status=random.choice(["registered", "testing", "completed", "archived"]),
            current_location=f"仓库-{random.choice(['A', 'B', 'C', 'D', 'E'])}-{random.randint(1, 20)}",
            priority=random.choice(PRIORITIES),
            description=random.choice(DESCRIPTIONS),
            created_by=admin_user.id,
            created_at=sample_date
        )
        samples.append(sample)
        session.add(sample)
        
        # 每100个提交一次，避免内存占用过大
        if (i + 1) % 100 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 个样品...")
    
    await session.flush()
    print(f"✓ 已创建 {len(samples)} 个样品")
    return samples


async def create_instruments(session: AsyncSession, admin_user: User, count: int = 80) -> list[Instrument]:
    """创建仪器数据"""
    print(f"创建 {count} 台仪器...")
    
    instruments = []
    base_date = datetime.now()
    
    for i in range(count):
        instrument_type = random.choice(INSTRUMENT_TYPES)
        brand = random.choice(INSTRUMENT_BRANDS)
        
        # 生成仪器编号
        instrument_code = f"INS{datetime.now().year}{str(i+1).zfill(4)}"
        
        # 生成购置日期（1-10年前）
        purchase_date = base_date - timedelta(days=random.randint(365, 3650))
        
        # 生成下次校准日期（未来1-12个月）
        next_calibration = base_date + timedelta(days=random.randint(30, 365))
        
        instrument = Instrument(
            code=instrument_code,
            name=f"{brand} {instrument_type}",
            model=f"{brand}-{random.randint(1000, 9999)}",
            manufacturer=brand,
            serial_number=f"SN{random.randint(100000, 999999)}",
            purchase_date=purchase_date,
            status=random.choice(INSTRUMENT_STATUSES),
            location=f"实验室-{random.choice(['A', 'B', 'C', 'D'])}-{random.randint(1, 10)}号位",
            responsible_person=admin_user.username,
            next_calibration_date=next_calibration,
            specifications=f"精度: ±{random.uniform(0.001, 0.1):.3f}, 量程: {random.randint(10, 1000)}",
            notes=f"购置于{purchase_date.year}年，状态良好",
            created_by=admin_user.id,
            created_at=purchase_date
        )
        instruments.append(instrument)
        session.add(instrument)
        
        if (i + 1) % 50 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 台仪器...")
    
    await session.flush()
    print(f"✓ 已创建 {len(instruments)} 台仪器")
    return instruments


async def create_workflows(session: AsyncSession, admin_user: User, count: int = 50) -> list[Workflow]:
    """创建工作流数据"""
    print(f"创建 {count} 个工作流...")
    
    workflows = []
    base_date = datetime.now()
    
    for i in range(count):
        # 选择模板名称
        if i < len(WORKFLOW_TEMPLATES):
            workflow_name = WORKFLOW_TEMPLATES[i]
        else:
            workflow_name = f"{random.choice(WORKFLOW_TEMPLATES)} V{i - len(WORKFLOW_TEMPLATES) + 2}"
        
        created_date = base_date - timedelta(days=random.randint(0, 365))
        
        # 创建工作流配置
        config = {
            "nodes": [],
            "edges": []
        }
        
        # 添加节点（使用步骤模板）
        num_steps = random.randint(5, 10)
        selected_steps = random.sample(WORKFLOW_STEP_TEMPLATES, min(num_steps, len(WORKFLOW_STEP_TEMPLATES)))
        
        for idx, step_template in enumerate(selected_steps):
            node = {
                "id": f"node_{idx+1}",
                "type": "task",
                "data": {
                    "label": step_template["name"],
                    "description": step_template["description"],
                    "order": step_template["order"]
                },
                "position": {"x": 100 + idx * 200, "y": 100}
            }
            config["nodes"].append(node)
            
            # 添加边（连接节点）
            if idx > 0:
                edge = {
                    "id": f"edge_{idx}",
                    "source": f"node_{idx}",
                    "target": f"node_{idx+1}",
                    "type": "default"
                }
                config["edges"].append(edge)
        
        workflow = Workflow(
            name=workflow_name,
            description=f"{workflow_name}的标准操作流程，包含完整的检测步骤和质量控制要求",
            version=random.randint(1, 5),
            config=config,
            status=random.choice([WorkflowStatus.ACTIVE, WorkflowStatus.ACTIVE, WorkflowStatus.ACTIVE, WorkflowStatus.INACTIVE]),
            isActive=random.choice([True, True, True, False]),  # 75%激活
            createdBy=admin_user.id,
            createdAt=created_date
        )
        workflows.append(workflow)
        session.add(workflow)
        
        if (i + 1) % 25 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 个工作流...")
    
    await session.flush()
    print(f"✓ 已创建 {len(workflows)} 个工作流")
    return workflows


async def create_audit_tasks(session: AsyncSession, samples: list[Sample], admin_user: User, count: int = 120) -> list[AuditTask]:
    """创建审核任务数据"""
    print(f"创建 {count} 个审核任务...")
    
    audit_tasks = []
    
    # 审核意见模板
    comments_templates = [
        "审核通过，样品符合检测标准", "数据准确，结果可靠",
        "检测方法正确，操作规范", "需要补充相关检测数据",
        "样品处理过程需要改进", "建议重新采样检测",
        "检测结果存在异常，需要复核", "符合质量控制要求",
        "检测记录完整，数据真实", "操作流程符合SOP要求",
        "质量控制措施到位", "检测环境符合要求",
        "仪器状态良好，数据可靠", "样品保存条件符合标准",
        "检测人员资质符合要求", "报告格式规范，内容完整"
    ]
    
    for i in range(count):
        sample = random.choice(samples)
        level_config = random.choice(AUDIT_LEVELS)
        status = random.choice([
            AuditStatus.PENDING, AuditStatus.PENDING,  # 增加待审核的比例
            AuditStatus.APPROVED, AuditStatus.APPROVED, AuditStatus.APPROVED,
            AuditStatus.REJECTED, AuditStatus.RETURNED
        ])
        
        # 根据状态设置时间
        submitted_at = datetime.now() - timedelta(days=random.randint(1, 30))
        audited_at = None
        comments = None
        if status in [AuditStatus.APPROVED, AuditStatus.REJECTED, AuditStatus.RETURNED]:
            audited_at = submitted_at + timedelta(hours=random.randint(1, 72))
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
        
        if (i + 1) % 50 == 0:
            await session.flush()
            print(f"  已创建 {i+1}/{count} 个审核任务...")
    
    await session.flush()
    print(f"✓ 已创建 {len(audit_tasks)} 个审核任务")
    return audit_tasks


async def print_summary(session: AsyncSession):
    """打印数据统计摘要"""
    print("\n" + "="*60)
    print("数据填充完成！统计摘要：")
    print("="*60)
    
    # 统计样品
    sample_result = await session.execute(select(Sample))
    samples = sample_result.scalars().all()
    print(f"样品总数: {len(samples)}")
    
    # 按类型统计样品
    type_counts = {}
    for sample in samples:
        type_counts[sample.sample_type] = type_counts.get(sample.sample_type, 0) + 1
    print(f"  样品类型数: {len(type_counts)}")
    
    # 统计仪器
    instrument_result = await session.execute(select(Instrument))
    instruments = instrument_result.scalars().all()
    print(f"\n仪器总数: {len(instruments)}")
    
    # 按状态统计仪器
    status_counts = {}
    for instrument in instruments:
        status_counts[instrument.status] = status_counts.get(instrument.status, 0) + 1
    print("  仪器状态分布:")
    for status, count in status_counts.items():
        print(f"    - {status}: {count}")
    
    # 统计工作流
    workflow_result = await session.execute(select(Workflow))
    workflows = workflow_result.scalars().all()
    print(f"\n工作流总数: {len(workflows)}")
    print(f"  激活的工作流: {sum(1 for w in workflows if w.isActive)}")
    
    # 统计工作流节点
    total_nodes = sum(len(w.config.get("nodes", [])) for w in workflows)
    print(f"  工作流节点总数: {total_nodes}")
    
    # 统计审核任务
    audit_result = await session.execute(select(AuditTask))
    audits = audit_result.scalars().all()
    print(f"\n审核任务总数: {len(audits)}")
    
    # 按状态统计审核任务
    audit_status_counts = {}
    for audit in audits:
        audit_status_counts[audit.status] = audit_status_counts.get(audit.status, 0) + 1
    print("  审核任务状态分布:")
    for status, count in audit_status_counts.items():
        print(f"    - {status}: {count}")
    
    print("="*60)
    print("\n提示：")
    print("  - 样品数据支持分页测试（每页10-20条）")
    print("  - 仪器数据支持分页测试（每页10-20条）")
    print("  - 工作流支持分页测试（每页10-20条）")
    print("  - 审核任务支持分页测试（每页10-20条）")
    print("="*60)


async def main():
    """主函数"""
    print("="*60)
    print("FastAPI 后端大量测试数据填充")
    print("="*60)
    print()
    
    async with async_session_maker() as session:
        try:
            # 1. 清除现有数据
            await clear_existing_data(session)
            
            # 2. 获取管理员用户
            admin_user = await get_admin_user(session)
            print(f"✓ 找到管理员用户: {admin_user.username}\n")
            
            # 3. 创建样品（150个）
            samples = await create_samples(session, admin_user, count=150)
            
            # 4. 创建仪器（80台）
            instruments = await create_instruments(session, admin_user, count=80)
            
            # 5. 创建工作流（50个）
            workflows = await create_workflows(session, admin_user, count=50)
            
            # 6. 创建审核任务（120个）
            audit_tasks = await create_audit_tasks(session, samples, admin_user, count=120)
            
            # 7. 提交事务
            print("\n提交数据到数据库...")
            await session.commit()
            print("✓ 所有数据已提交到数据库")
            
            # 8. 打印统计摘要
            await print_summary(session)
            
        except Exception as e:
            await session.rollback()
            print(f"\n❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(main())
