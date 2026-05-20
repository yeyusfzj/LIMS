"""
检测结果 API 简单测试脚本
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_session_factory
from app.services.result_service import result_service
from app.schemas.result import ResultCreate, ResultUpdate, ResultReview, ResultSource
from app.models.sample import Sample, SampleStatus, Priority
from datetime import datetime
import uuid


async def create_test_sample(db: AsyncSession) -> str:
    """创建测试样品"""
    sample = Sample(
        id=str(uuid.uuid4()),
        barcode=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        sample_number=f"S-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        client_name="Test Client",
        sample_name="Test Sample",
        sample_type="Water",
        sample_category="Environment",
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
    
    print(f"[OK] Created test sample: {sample.id}")
    return sample.id


async def test_create_result(db: AsyncSession, sample_id: str):
    """测试创建结果"""
    print("\n=== Test Create Result ===")
    
    data = ResultCreate(
        sample_id=sample_id,
        test_item_id=str(uuid.uuid4()),
        parameter="pH",
        value=7.2,
        unit="pH",
        method="Glass Electrode Method",
        source=ResultSource.MANUAL,
        entered_by="test-user"
    )
    
    result = await result_service.create_result(db, data)
    
    print(f"[OK] Result created successfully")
    print(f"  - ID: {result.id}")
    print(f"  - Parameter: {result.parameter}")
    print(f"  - Value: {result.value} {result.unit}")
    print(f"  - Method: {result.method}")
    print(f"  - Source: {result.source}")
    
    return result.id


async def test_get_result(db: AsyncSession, result_id: str):
    """测试获取结果详情"""
    print("\n=== Test Get Result ===")
    
    result = await result_service.get_result_by_id(db, result_id)
    
    if result:
        print(f"[OK] Got result successfully")
        print(f"  - ID: {result.id}")
        print(f"  - Parameter: {result.parameter}")
        print(f"  - Value: {result.value} {result.unit}")
    else:
        print("[FAIL] Result not found")


async def test_list_results(db: AsyncSession, sample_id: str):
    """测试查询结果列表"""
    print("\n=== Test List Results ===")
    
    results = await result_service.list_results(
        db=db,
        sample_id=sample_id,
        page=1,
        page_size=10
    )
    
    print(f"[OK] Listed results successfully")
    print(f"  - Total: {results.pagination.total}")
    print(f"  - Page: {results.pagination.page}")
    print(f"  - Page Size: {results.pagination.page_size}")
    print(f"  - Total Pages: {results.pagination.total_pages}")
    print(f"  - Items: {len(results.items)}")


async def test_update_result(db: AsyncSession, result_id: str):
    """测试更新结果"""
    print("\n=== Test Update Result ===")
    
    data = ResultUpdate(
        value=7.5,
        is_abnormal=True,
        abnormal_reason="pH value is high"
    )
    
    result = await result_service.update_result(db, result_id, data)
    
    print(f"[OK] Result updated successfully")
    print(f"  - New Value: {result.value} {result.unit}")
    print(f"  - Is Abnormal: {result.is_abnormal}")
    print(f"  - Abnormal Reason: {result.abnormal_reason}")


async def test_review_result(db: AsyncSession, result_id: str):
    """测试审核结果"""
    print("\n=== Test Review Result ===")
    
    review = ResultReview(
        reviewed_by="reviewer-user",
        is_approved=True,
        review_comment="Data is accurate, approved"
    )
    
    result = await result_service.review_result(db, result_id, review)
    
    print(f"[OK] Result reviewed successfully")
    print(f"  - Reviewed By: {result.reviewed_by}")
    print(f"  - Reviewed At: {result.reviewed_at}")


async def test_delete_result(db: AsyncSession, result_id: str):
    """测试删除结果"""
    print("\n=== Test Delete Result ===")
    
    await result_service.delete_result(db, result_id)
    
    print(f"[OK] Result deleted successfully")
    
    # 验证删除
    result = await result_service.get_result_by_id(db, result_id)
    if result is None:
        print(f"[OK] Verified: Result no longer exists")
    else:
        print(f"[FAIL] Verification failed: Result still exists")


async def cleanup_test_data(db: AsyncSession, sample_id: str):
    """清理测试数据"""
    print("\n=== Cleanup Test Data ===")
    
    from sqlalchemy import delete
    
    stmt = delete(Sample).where(Sample.id == sample_id)
    await db.execute(stmt)
    await db.commit()
    
    print(f"[OK] Test data cleaned up")


async def main():
    """主测试函数"""
    print("=" * 60)
    print("Result API Test")
    print("=" * 60)
    
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            # 1. Create test sample
            sample_id = await create_test_sample(db)
            
            # 2. Test create result
            result_id = await test_create_result(db, sample_id)
            
            # 3. Test get result
            await test_get_result(db, result_id)
            
            # 4. Test list results
            await test_list_results(db, sample_id)
            
            # 5. Test update result
            await test_update_result(db, result_id)
            
            # 6. Test review result
            await test_review_result(db, result_id)
            
            # 7. Test delete result
            await test_delete_result(db, result_id)
            
            # 8. Cleanup test data
            await cleanup_test_data(db, sample_id)
            
            print("\n" + "=" * 60)
            print("[OK] All tests passed")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n[FAIL] Test failed: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
