"""
测试后端分页功能
"""
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session_factory
from app.services.sample_service import SampleService


async def test_pagination():
    """测试分页功能"""
    print("="*60)
    print("测试后端分页功能")
    print("="*60)
    print()
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            service = SampleService(session)
            
            # 测试第1页
            print("📄 获取第1页数据...")
            samples1, meta1 = await service.get_samples(page=1, page_size=20)
            print(f"✓ 第1页:")
            print(f"  - 返回数量: {len(samples1)}")
            print(f"  - 总记录数: {meta1.total}")
            print(f"  - 当前页码: {meta1.page}")
            print(f"  - 每页数量: {meta1.pageSize}")
            print(f"  - 总页数: {meta1.totalPages}")
            if samples1:
                print(f"  - 第1条样品条码: {samples1[0].barcode}")
                print(f"  - 最后1条样品条码: {samples1[-1].barcode}")
            print()
            
            # 测试第2页
            print("📄 获取第2页数据...")
            samples2, meta2 = await service.get_samples(page=2, page_size=20)
            print(f"✓ 第2页:")
            print(f"  - 返回数量: {len(samples2)}")
            print(f"  - 当前页码: {meta2.page}")
            if samples2:
                print(f"  - 第1条样品条码: {samples2[0].barcode}")
                print(f"  - 最后1条样品条码: {samples2[-1].barcode}")
            print()
            
            # 比较两页数据
            print("🔍 比较第1页和第2页...")
            if samples1 and samples2:
                page1_barcodes = {s.barcode for s in samples1}
                page2_barcodes = {s.barcode for s in samples2}
                
                overlap = page1_barcodes & page2_barcodes
                
                if overlap:
                    print(f"❌ 错误：两页有重复数据！")
                    print(f"   重复的条码: {overlap}")
                else:
                    print(f"✅ 正确：两页数据完全不同")
                    print(f"   第1页条码数: {len(page1_barcodes)}")
                    print(f"   第2页条码数: {len(page2_barcodes)}")
            print()
            
            # 测试第3页
            if meta1.totalPages >= 3:
                print("📄 获取第3页数据...")
                samples3, meta3 = await service.get_samples(page=3, page_size=20)
                print(f"✓ 第3页:")
                print(f"  - 返回数量: {len(samples3)}")
                print(f"  - 当前页码: {meta3.page}")
                if samples3:
                    print(f"  - 第1条样品条码: {samples3[0].barcode}")
                print()
            
            # 总结
            print("="*60)
            print("✅ 测试完成！")
            print("="*60)
            print(f"数据库中共有 {meta1.total} 个样品")
            print(f"分为 {meta1.totalPages} 页（每页 {meta1.pageSize} 条）")
            
            if samples1 and samples2 and not overlap:
                print("✅ 分页功能正常工作")
            else:
                print("❌ 分页功能可能有问题")
            print("="*60)
            
        except Exception as e:
            print(f"\n❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_pagination())
