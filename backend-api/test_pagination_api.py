"""
测试分页API返回格式
"""
import asyncio
import sys
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session_factory
from app.services.sample_service import SampleService
from app.schemas.sample import SampleListResponse, SampleResponse
from app.schemas.response import PaginationInfo


async def test_pagination():
    """测试分页数据格式"""
    print("="*60)
    print("测试样品列表分页API")
    print("="*60)
    print()
    
    session_factory = get_session_factory()
    async with session_factory() as session:
        try:
            service = SampleService(session)
            
            # 获取第1页数据
            print("📊 获取第1页数据（每页20条）...")
            samples, meta = await service.get_samples(
                page=1,
                page_size=20
            )
            
            print(f"✓ 查询成功")
            print(f"  - 返回样品数: {len(samples)}")
            print(f"  - 总记录数: {meta.total}")
            print(f"  - 当前页码: {meta.page}")
            print(f"  - 每页数量: {meta.pageSize}")
            print(f"  - 总页数: {meta.totalPages}")
            print()
            
            # 构造响应对象
            print("📦 构造响应对象...")
            pagination_info = PaginationInfo(
                total=meta.total,
                page=meta.page,
                page_size=meta.pageSize,
                total_pages=meta.totalPages
            )
            
            print(f"✓ PaginationInfo 创建成功")
            print(f"  - pagination_info.total: {pagination_info.total}")
            print(f"  - pagination_info.page: {pagination_info.page}")
            print(f"  - pagination_info.pageSize: {pagination_info.pageSize}")
            print(f"  - pagination_info.totalPages: {pagination_info.totalPages}")
            print()
            
            # 转换为字典（模拟API响应）
            print("🔄 转换为JSON格式...")
            pagination_dict = pagination_info.model_dump(by_alias=True)
            print(f"✓ 转换成功")
            print(f"  - JSON格式: {pagination_dict}")
            print()
            
            # 测试第2页
            if meta.totalPages > 1:
                print("📊 获取第2页数据...")
                samples2, meta2 = await service.get_samples(
                    page=2,
                    page_size=20
                )
                print(f"✓ 第2页查询成功")
                print(f"  - 返回样品数: {len(samples2)}")
                print(f"  - 当前页码: {meta2.page}")
                print()
            
            # 总结
            print("="*60)
            print("✅ 测试完成！")
            print("="*60)
            print(f"数据库中共有 {meta.total} 个样品")
            print(f"分为 {meta.totalPages} 页（每页 {meta.pageSize} 条）")
            print(f"前端应该能看到分页控件")
            print("="*60)
            
        except Exception as e:
            print(f"\n❌ 错误: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_pagination())
