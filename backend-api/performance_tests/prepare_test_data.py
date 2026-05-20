"""
性能测试数据准备脚本

创建足够的测试数据用于性能测试:
- 用户和角色
- 样品记录
- 工作流模板和实例
- 任务
- 检测结果
- 审核任务
- 报告

运行方式:
    python performance_tests/prepare_test_data.py
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timedelta
import random
from faker import Faker

from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.models.sample import Sample, SampleStatus, Priority
from app.models.workflow import WorkflowTemplate, WorkflowInstance, WorkflowStatus, WorkflowInstanceStatus
from app.models.task import Task, TaskStatus
from app.models.result import Result
from app.models.audit import AuditTask, AuditStatus
from app.models.report import Report, ReportStatus
from app.core.security import get_password_hash

fake = Faker('zh_CN')


async def create_test_users(session, count=50):
    """创建测试用户"""
    print(f"创建 {count} 个测试用户...")
    users = []
    
    for i in range(count):
        user = User(
            username=f"testuser{i+1}",
            email=f"testuser{i+1}@example.com",
            password=get_password_hash("password123"),
            realName=fake.name(),
            phone=fake.phone_number(),
            department=random.choice(["检测部", "质量部", "技术部", "管理部"]),
            position=random.choice(["检测员", "审核员", "主管", "经理"]),
            isActive=True
        )
        users.append(user)
    
    session.add_all(users)
    await session.commit()
    print(f"✓ 创建了 {count} 个测试用户")
    return users


async def create_test_samples(session, users, count=1000):
    """创建测试样品"""
    print(f"创建 {count} 个测试样品...")
    samples = []
    
    sample_types = ["食品", "药品", "化妆品", "环境", "水质", "土壤"]
    sample_categories = ["原料", "成品", "半成品", "包装材料"]
    units = ["kg", "g", "L", "mL", "个", "批"]
    
    for i in range(count):
        received_date = datetime.now() - timedelta(days=random.randint(0, 365))
        
        sample = Sample(
            barcode=f"BC{datetime.now().strftime('%Y%m%d')}{i+1:06d}",
            sampleNumber=f"S{datetime.now().strftime('%Y%m%d')}{i+1:06d}",
            clientName=fake.company(),
            clientContact=fake.name(),
            sampleName=f"{random.choice(sample_types)}{i+1}",
            sampleType=random.choice(sample_types),
            sampleCategory=random.choice(sample_categories),
            quantity=round(random.uniform(0.1, 100), 2),
            unit=random.choice(units),
            status=random.choice(list(SampleStatus)),
            priority=random.choice(list(Priority)),
            receivedDate=received_date,
            samplingDate=received_date - timedelta(days=random.randint(0, 7)),
            samplingLocation=fake.address(),
            samplingPerson=fake.name(),
            storageLocation=f"仓库{random.randint(1, 10)}-货架{random.randint(1, 20)}",
            storageCondition=random.choice(["常温", "冷藏", "冷冻", "避光"]),
            description=fake.text(max_nb_chars=200),
            remarks=fake.text(max_nb_chars=100) if random.random() > 0.5 else None,
            createdBy=random.choice(users).id
        )
        samples.append(sample)
    
    session.add_all(samples)
    await session.commit()
    print(f"✓ 创建了 {count} 个测试样品")
    return samples


async def create_test_workflow_templates(session, users, count=50):
    """创建测试工作流模板"""
    print(f"创建 {count} 个工作流模板...")
    templates = []
    
    categories = ["食品检测", "药品检测", "环境检测", "水质检测"]
    
    for i in range(count):
        nodes = [
            {
                "id": f"node-{j+1}",
                "type": random.choice(["start", "task", "decision", "end"]),
                "name": f"节点{j+1}",
                "config": {}
            }
            for j in range(random.randint(3, 8))
        ]
        
        template = WorkflowTemplate(
            name=f"工作流模板{i+1}",
            description=fake.text(max_nb_chars=200),
            category=random.choice(categories),
            nodes=nodes,
            status=random.choice(list(WorkflowStatus)),
            version=random.randint(1, 5),
            createdBy=random.choice(users).id
        )
        templates.append(template)
    
    session.add_all(templates)
    await session.commit()
    print(f"✓ 创建了 {count} 个工作流模板")
    return templates


async def create_test_workflow_instances(session, templates, samples, count=200):
    """创建测试工作流实例"""
    print(f"创建 {count} 个工作流实例...")
    instances = []
    
    for i in range(count):
        started_at = datetime.now() - timedelta(days=random.randint(0, 90))
        status = random.choice(list(WorkflowInstanceStatus))
        
        instance = WorkflowInstance(
            templateId=random.choice(templates).id,
            sampleId=random.choice(samples).id if random.random() > 0.3 else None,
            status=status,
            currentNode=f"node-{random.randint(1, 5)}",
            startedAt=started_at,
            completedAt=started_at + timedelta(days=random.randint(1, 30)) if status == WorkflowInstanceStatus.COMPLETED else None
        )
        instances.append(instance)
    
    session.add_all(instances)
    await session.commit()
    print(f"✓ 创建了 {count} 个工作流实例")
    return instances


async def create_test_tasks(session, users, samples, instances, count=2000):
    """创建测试任务"""
    print(f"创建 {count} 个测试任务...")
    tasks = []
    
    task_types = ["检测", "审核", "复核", "签发"]
    
    for i in range(count):
        created_at = datetime.now() - timedelta(days=random.randint(0, 90))
        status = random.choice(list(TaskStatus))
        
        task = Task(
            workflowInstanceId=random.choice(instances).id if random.random() > 0.3 else None,
            sampleId=random.choice(samples).id if random.random() > 0.5 else None,
            name=f"{random.choice(task_types)}任务{i+1}",
            description=fake.text(max_nb_chars=200),
            type=random.choice(task_types),
            status=status,
            priority=random.choice(list(Priority)),
            assigneeId=random.choice(users).id if random.random() > 0.2 else None,
            createdBy=random.choice(users).id,
            dueDate=created_at + timedelta(days=random.randint(1, 30)),
            startedAt=created_at + timedelta(hours=random.randint(1, 48)) if status != TaskStatus.PENDING else None,
            completedAt=created_at + timedelta(days=random.randint(1, 20)) if status == TaskStatus.COMPLETED else None
        )
        tasks.append(task)
    
    session.add_all(tasks)
    await session.commit()
    print(f"✓ 创建了 {count} 个测试任务")
    return tasks


async def create_test_results(session, samples, users, count=5000):
    """创建测试检测结果"""
    print(f"创建 {count} 个检测结果...")
    results = []
    
    test_items = ["重金属", "农药残留", "微生物", "理化指标", "营养成分"]
    units = ["mg/kg", "mg/L", "%", "CFU/g", "μg/kg"]
    
    for i in range(count):
        test_date = datetime.now() - timedelta(days=random.randint(0, 90))
        
        result = Result(
            sampleId=random.choice(samples).id,
            testItem=random.choice(test_items),
            testMethod=f"GB/T {random.randint(1000, 9999)}-{random.randint(2010, 2023)}",
            value=str(round(random.uniform(0, 100), 2)),
            unit=random.choice(units),
            standardValue=str(round(random.uniform(0, 100), 2)) if random.random() > 0.3 else None,
            isQualified=random.choice([True, False]),
            testDate=test_date,
            testerId=random.choice(users).id,
            reviewerId=random.choice(users).id if random.random() > 0.3 else None,
            remarks=fake.text(max_nb_chars=100) if random.random() > 0.7 else None
        )
        results.append(result)
    
    session.add_all(results)
    await session.commit()
    print(f"✓ 创建了 {count} 个检测结果")
    return results


async def create_test_audit_tasks(session, samples, users, count=1000):
    """创建测试审核任务"""
    print(f"创建 {count} 个审核任务...")
    audit_tasks = []
    
    audit_types = ["初审", "复审", "终审"]
    
    for i in range(count):
        created_at = datetime.now() - timedelta(days=random.randint(0, 90))
        status = random.choice(list(AuditStatus))
        
        audit_task = AuditTask(
            sampleId=random.choice(samples).id,
            type=random.choice(audit_types),
            status=status,
            assigneeId=random.choice(users).id if random.random() > 0.2 else None,
            createdBy=random.choice(users).id,
            dueDate=created_at + timedelta(days=random.randint(1, 15)),
            completedAt=created_at + timedelta(days=random.randint(1, 10)) if status == AuditStatus.COMPLETED else None,
            opinion=fake.text(max_nb_chars=200) if status == AuditStatus.COMPLETED else None,
            result=random.choice(["通过", "驳回", "需修改"]) if status == AuditStatus.COMPLETED else None
        )
        audit_tasks.append(audit_task)
    
    session.add_all(audit_tasks)
    await session.commit()
    print(f"✓ 创建了 {count} 个审核任务")
    return audit_tasks


async def create_test_reports(session, samples, users, count=500):
    """创建测试报告"""
    print(f"创建 {count} 个测试报告...")
    reports = []
    
    for i in range(count):
        created_at = datetime.now() - timedelta(days=random.randint(0, 90))
        status = random.choice(list(ReportStatus))
        
        report = Report(
            reportNumber=f"R{datetime.now().strftime('%Y%m%d')}{i+1:06d}",
            sampleId=random.choice(samples).id,
            templateId=None,  # 需要先创建报告模板
            title=f"检测报告{i+1}",
            content={"summary": fake.text(max_nb_chars=500)},
            status=status,
            createdBy=random.choice(users).id,
            publishedAt=created_at + timedelta(days=random.randint(1, 30)) if status == ReportStatus.PUBLISHED else None,
            publishedBy=random.choice(users).id if status == ReportStatus.PUBLISHED else None
        )
        reports.append(report)
    
    session.add_all(reports)
    await session.commit()
    print(f"✓ 创建了 {count} 个测试报告")
    return reports


async def main():
    """主函数"""
    print("=" * 60)
    print("开始准备性能测试数据...")
    print("=" * 60)
    
    async with AsyncSessionLocal() as session:
        try:
            # 1. 创建用户
            users = await create_test_users(session, count=50)
            
            # 2. 创建样品
            samples = await create_test_samples(session, users, count=1000)
            
            # 3. 创建工作流模板
            templates = await create_test_workflow_templates(session, users, count=50)
            
            # 4. 创建工作流实例
            instances = await create_test_workflow_instances(session, templates, samples, count=200)
            
            # 5. 创建任务
            tasks = await create_test_tasks(session, users, samples, instances, count=2000)
            
            # 6. 创建检测结果
            results = await create_test_results(session, samples, users, count=5000)
            
            # 7. 创建审核任务
            audit_tasks = await create_test_audit_tasks(session, samples, users, count=1000)
            
            # 8. 创建报告
            reports = await create_test_reports(session, samples, users, count=500)
            
            print("=" * 60)
            print("✓ 测试数据准备完成!")
            print("=" * 60)
            print(f"用户: {len(users)}")
            print(f"样品: {len(samples)}")
            print(f"工作流模板: {len(templates)}")
            print(f"工作流实例: {len(instances)}")
            print(f"任务: {len(tasks)}")
            print(f"检测结果: {len(results)}")
            print(f"审核任务: {len(audit_tasks)}")
            print(f"报告: {len(reports)}")
            print("=" * 60)
            
        except Exception as e:
            print(f"✗ 错误: {str(e)}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
