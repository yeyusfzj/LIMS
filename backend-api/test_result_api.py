"""
检测结果 API 测试脚本

测试结果管理的各个端点
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session_factory
from app.services.result_service import result_service
from app.schemas.result import ResultCreate, ResultUpdate, ResultReview, ResultSource
from app.models.sample import Sample, SampleStatus, Priority
from app.models.result import Result
from datetime import datetime
import uuid


async def create_test_sample(db: AsyncSession) -> str:
    """创建测试样品"""
    sample = Sample(
        id=str(uuid.uuid4()),
        barcode=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        sample_number=f"S-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        client_name="测试客户",
        sample_name="测试样品",
        sample_type="水质",
        sample_category="环境",
        quantity=100.0,
        unit="mL",
        status=SampleStatus.REGISTERED,
        priority=Priority.NORMAL,
        received_date=datetime.utcnow(),
        created_by="test-user",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    db.add(sample)
    await db.commit()
    await db.refresh(sample)
    
    print(f"[OK] 创建测试样品: {sample.id}")
    return sample.id


async def test_create_result(db: AsyncSession, sample_id: str):
    """测试创建结果"""
    print("\n=== 测试创建结果 ===")
    
    data = ResultCreate(
        sample_id=sample_id,
        test_item_id=str(uuid.uuid4()),
        parameter="pH值",
        value=7.2,
        unit="pH",
        method="玻璃电极法",
        source=ResultSource.MANUAL,
        entered_by="test-user"
    )
    
    result = await result_service.create_result(db, data)
    
    print(f"✓ 结果创建成功")
    print(f"  - ID: {result.id}")
    print(f"  - 参数: {result.parameter}")
    print(f"  - 值: {result.value} {result.unit}")
    print(f"  - 方法: {result.method}")
    print(f"  - 来源: {result.source}")
    print(f"  - 录入人: {result.entered_by}")
    print(f"  - 录入时间: {result.entered_at}")
    
    return result.id


async def test_get_result(db: AsyncSession, result_id: str):
    """测试获取结果详情"""
    print("\n=== 测试获取结果详情 ===")
    
    result = await result_service.get_result_by_id(db, result_id)
    
    if result:
        print(f"✓ 获取结果成功")
        print(f"  - ID: {result.id}")
        print(f"  - 参数: {result.parameter}")
        print(f"  - 值: {result.value} {result.unit}")
    else:
        print("✗ 结果不存在")


async def test_list_results(db: AsyncSession, sample_id: str):
    """测试查询结果列表"""
    print("\n=== 测试查询结果列表 ===")
    
    # 按样品 ID 查询
    results = await result_service.list_results(
        db=db,
        sample_id=sample_id,
        page=1,
        page_size=10
    )
    
    print(f"✓ 查询结果列表成功")
    print(f"  - 总数: {results.pagination.total}")
    print(f"  - 当前页: {results.pagination.page}")
    print(f"  - 每页数量: {results.pagination.page_size}")
    print(f"  - 总页数: {results.pagination.total_pages}")
    print(f"  - 结果数量: {len(results.items)}")
    
    for item in results.items:
        print(f"    * {item.parameter}: {item.value} {item.unit}")


async def test_update_result(db: AsyncSession, result_id: str):
    """测试更新结果"""
    print("\n=== 测试更新结果 ===")
    
    data = ResultUpdate(
        value=7.5,
        is_abnormal=True,
        abnormal_reason="pH值偏高"
    )
    
    result = await result_service.update_result(db, result_id, data)
    
    print(f"✓ 结果更新成功")
    print(f"  - 新值: {result.value} {result.unit}")
    print(f"  - 是否异常: {result.is_abnormal}")
    print(f"  - 异常原因: {result.abnormal_reason}")


async def test_review_result(db: AsyncSession, result_id: str):
    """测试审核结果"""
    print("\n=== 测试审核结果 ===")
    
    review = ResultReview(
        reviewed_by="reviewer-user",
        is_approved=True,
        review_comment="数据准确，审核通过"
    )
    
    result = await result_service.review_result(db, result_id, review)
    
    print(f"✓ 结果审核成功")
    print(f"  - 审核人: {result.reviewed_by}")
    print(f"  - 审核时间: {result.reviewed_at}")


async def test_get_results_by_sample(db: AsyncSession, sample_id: str):
    """测试根据样品 ID 获取所有结果"""
    print("\n=== 测试根据样品 ID 获取所有结果 ===")
    
    results = await result_service.get_results_by_sample_id(db, sample_id)
    
    print(f"✓ 获取样品结果成功")
    print(f"  - 结果数量: {len(results)}")
    
    for result in results:
        print(f"    * {result.parameter}: {result.value} {result.unit}")


async def test_delete_result(db: AsyncSession, result_id: str):
    """测试删除结果"""
    print("\n=== 测试删除结果 ===")
    
    await result_service.delete_result(db, result_id)
    
    print(f"✓ 结果删除成功")
    
    # 验证删除
    result = await result_service.get_result_by_id(db, result_id)
    if result is None:
        print(f"✓ 验证删除成功：结果已不存在")
    else:
        print(f"✗ 验证删除失败：结果仍然存在")


async def cleanup_test_data(db: AsyncSession, sample_id: str):
    """清理测试数据"""
    print("\n=== 清理测试数据 ===")
    
    # 删除样品（会级联删除结果）
    from sqlalchemy import select, delete
    
    # 删除样品
    stmt = delete(Sample).where(Sample.id == sample_id)
    await db.execute(stmt)
    await db.commit()
    
    print(f"✓ 测试数据清理完成")


async def main():
    """主测试函数"""
    print("=" * 60)
    print("检测结果 API 测试")
    print("=" * 60)
    
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            # 1. 创建测试样品
            sample_id = await create_test_sample(db)
            
            # 2. 测试创建结果
            result_id = await test_create_result(db, sample_id)
            
            # 3. 测试获取结果详情
            await test_get_result(db, result_id)
            
            # 4. 测试查询结果列表
            await test_list_results(db, sample_id)
            
            # 5. 测试更新结果
            await test_update_result(db, result_id)
            
            # 6. 测试审核结果
            await test_review_result(db, result_id)
            
            # 7. 测试根据样品 ID 获取所有结果
            await test_get_results_by_sample(db, sample_id)
            
            # 8. 测试删除结果
            await test_delete_result(db, result_id)
            
            # 9. 清理测试数据
            await cleanup_test_data(db, sample_id)
            
            print("\n" + "=" * 60)
            print("✓ 所有测试通过")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 测试失败: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
