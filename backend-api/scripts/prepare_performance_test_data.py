"""
准备性能测试数据

为性能测试创建必要的测试数据：
- 创建测试用户
- 创建样品数据
- 创建工作流模板
- 创建任务数据
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# 配置
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/lab_db")

# 测试数据配置
NUM_SAMPLES = 1000
NUM_WORKFLOWS = 50
NUM_TASKS = 500


async def create_test_user(session: AsyncSession):
    """创建测试用户"""
    print("创建测试用户...")
    
    # 检查用户是否已存在
    result = await session.execute(
        text('SELECT id FROM "User" WHERE username = :username'),
        {"username": "admin"}
    )
    existing_user = result.first()
    
    if existing_user:
        print("  ✓ 测试用户已存在")
        return existing_user[0]
    
    # 创建用户
    # 注意：密码应该是哈希后的，这里简化处理
    user_id = f"user-{datetime.now().timestamp()}"
    await session.execute(
        text('''
            INSERT INTO "User" (id, username, email, password, "realName", "isActive", "createdAt", "updatedAt")
            VALUES (:id, :username, :email, :password, :realName, :isActive, :createdAt, :updatedAt)
        '''),
        {
            "id": user_id,
            "username": "admin",
            "email": "admin@example.com",
            "password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYqVr/1jrPK",  # admin123
            "realName": "管理员",
            "isActive": True,
            "createdAt": datetime.now(),
            "updatedAt": datetime.now()
        }
    )
    await session.commit()
    
    print(f"  ✓ 创建测试用户: admin (ID: {user_id})")
    return user_id


async def create_sample_data(session: AsyncSession, user_id: str, count: int):
    """创建样品测试数据"""
    print(f"\n创建 {count} 个样品数据...")
    
    statuses = ["REGISTERED", "TESTING", "COMPLETED", "RELEASED"]
    priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
    sample_types = ["食品", "药品", "化妆品", "环境", "水质", "土壤"]
    
    created_count = 0
    batch_size = 100
    
    for i in range(0, count, batch_size):
        batch_count = min(batch_size, count - i)
        
        for j in range(batch_count):
            sample_id = f"sample-{i+j+1}"
            barcode = f"SP{datetime.now().strftime('%Y%m%d')}{i+j+1:06d}"
            sample_number = f"S{datetime.now().strftime('%Y%m%d')}{i+j+1:04d}"
            
            try:
                await session.execute(
                    text('''
                        INSERT INTO "Sample" (
                            id, barcode, "sampleNumber", "clientName", "sampleName", 
                            "sampleType", quantity, unit, status, priority,
                            "receivedDate", "createdBy", "createdAt", "updatedAt"
                        )
                        VALUES (
                            :id, :barcode, :sampleNumber, :clientName, :sampleName,
                            :sampleType, :quantity, :unit, :status, :priority,
                            :receivedDate, :createdBy, :createdAt, :updatedAt
                        )
                        ON CONFLICT (barcode) DO NOTHING
                    '''),
                    {
                        "id": sample_id,
                        "barcode": barcode,
                        "sampleNumber": sample_number,
                        "clientName": f"客户{random.randint(1, 100)}",
                        "sampleName": f"样品{i+j+1}",
                        "sampleType": random.choice(sample_types),
                        "quantity": random.uniform(1, 100),
                        "unit": random.choice(["kg", "g", "L", "mL"]),
                        "status": random.choice(statuses),
                        "priority": random.choice(priorities),
                        "receivedDate": datetime.now() - timedelta(days=random.randint(0, 30)),
                        "createdBy": user_id,
                        "createdAt": datetime.now(),
                        "updatedAt": datetime.now()
                    }
                )
                created_count += 1
            except Exception as e:
                print(f"  ⚠ 创建样品 {sample_id} 失败: {e}")
        
        await session.commit()
        print(f"  进度: {min(i + batch_size, count)}/{count}")
    
    print(f"  ✓ 成功创建 {created_count} 个样品")


async def create_workflow_data(session: AsyncSession, user_id: str, count: int):
    """创建工作流测试数据"""
    print(f"\n创建 {count} 个工作流模板...")
    
    categories = ["检测流程", "审核流程", "报告流程", "质量控制"]
    statuses = ["DRAFT", "ACTIVE", "INACTIVE"]
    
    created_count = 0
    
    for i in range(count):
        workflow_id = f"workflow-{i+1}"
        
        try:
            await session.execute(
                text('''
                    INSERT INTO "WorkflowTemplate" (
                        id, name, description, category, nodes, status, version,
                        "createdBy", "createdAt", "updatedAt"
                    )
                    VALUES (
                        :id, :name, :description, :category, :nodes, :status, :version,
                        :createdBy, :createdAt, :updatedAt
                    )
                    ON CONFLICT (id) DO NOTHING
                '''),
                {
                    "id": workflow_id,
                    "name": f"工作流模板{i+1}",
                    "description": f"测试工作流模板{i+1}",
                    "category": random.choice(categories),
                    "nodes": '[]',  # 简化的节点配置
                    "status": random.choice(statuses),
                    "version": 1,
                    "createdBy": user_id,
                    "createdAt": datetime.now(),
                    "updatedAt": datetime.now()
                }
            )
            created_count += 1
        except Exception as e:
            print(f"  ⚠ 创建工作流 {workflow_id} 失败: {e}")
    
    await session.commit()
    print(f"  ✓ 成功创建 {created_count} 个工作流模板")


async def create_task_data(session: AsyncSession, user_id: str, count: int):
    """创建任务测试数据"""
    print(f"\n创建 {count} 个任务...")
    
    statuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"]
    
    created_count = 0
    batch_size = 100
    
    for i in range(0, count, batch_size):
        batch_count = min(batch_size, count - i)
        
        for j in range(batch_count):
            task_id = f"task-{i+j+1}"
            
            try:
                await session.execute(
                    text('''
                        INSERT INTO "Task" (
                            id, title, description, status, priority,
                            "assignedTo", "createdBy", "createdAt", "updatedAt"
                        )
                        VALUES (
                            :id, :title, :description, :status, :priority,
                            :assignedTo, :createdBy, :createdAt, :updatedAt
                        )
                        ON CONFLICT (id) DO NOTHING
                    '''),
                    {
                        "id": task_id,
                        "title": f"任务{i+j+1}",
                        "description": f"测试任务{i+j+1}",
                        "status": random.choice(statuses),
                        "priority": random.choice(priorities),
                        "assignedTo": user_id,
                        "createdBy": user_id,
                        "createdAt": datetime.now(),
                        "updatedAt": datetime.now()
                    }
                )
                created_count += 1
            except Exception as e:
                print(f"  ⚠ 创建任务 {task_id} 失败: {e}")
        
        await session.commit()
        print(f"  进度: {min(i + batch_size, count)}/{count}")
    
    print(f"  ✓ 成功创建 {created_count} 个任务")


async def get_data_statistics(session: AsyncSession):
    """获取数据统计"""
    print("\n" + "=" * 60)
    print("数据统计")
    print("=" * 60)
    
    # 样品统计
    result = await session.execute(text('SELECT COUNT(*) FROM "Sample"'))
    sample_count = result.scalar()
    print(f"样品总数: {sample_count}")
    
    # 工作流统计
    result = await session.execute(text('SELECT COUNT(*) FROM "WorkflowTemplate"'))
    workflow_count = result.scalar()
    print(f"工作流模板总数: {workflow_count}")
    
    # 任务统计
    result = await session.execute(text('SELECT COUNT(*) FROM "Task"'))
    task_count = result.scalar()
    print(f"任务总数: {task_count}")
    
    # 用户统计
    result = await session.execute(text('SELECT COUNT(*) FROM "User"'))
    user_count = result.scalar()
    print(f"用户总数: {user_count}")
    
    print("=" * 60)


async def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("准备性能测试数据")
    print("=" * 60)
    print(f"数据库: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'N/A'}")
    print(f"样品数量: {NUM_SAMPLES}")
    print(f"工作流数量: {NUM_WORKFLOWS}")
    print(f"任务数量: {NUM_TASKS}")
    print("=" * 60)
    
    # 创建数据库引擎
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    try:
        async with async_session() as session:
            # 1. 创建测试用户
            user_id = await create_test_user(session)
            
            # 2. 创建样品数据
            await create_sample_data(session, user_id, NUM_SAMPLES)
            
            # 3. 创建工作流数据
            await create_workflow_data(session, user_id, NUM_WORKFLOWS)
            
            # 4. 创建任务数据
            await create_task_data(session, user_id, NUM_TASKS)
            
            # 5. 显示统计
            await get_data_statistics(session)
        
        print("\n✅ 测试数据准备完成！")
        print("\n现在可以运行性能测试：")
        print("  python scripts/quick_performance_check.py")
        print("  python scripts/verify_performance_metrics.py")
        
    except Exception as e:
        print(f"\n❌ 准备测试数据失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
