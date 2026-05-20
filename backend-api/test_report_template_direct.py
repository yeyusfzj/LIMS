"""
直接测试报告模板服务
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal
from app.services.report_template_service import report_template_service
from app.schemas.report_template import ReportTemplateQuery


async def test_list_templates():
    """测试查询报告模板列表"""
    print("=" * 60)
    print("测试报告模板列表查询")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. 检查数据库连接
            print("\n1. 检查数据库连接...")
            result = await db.execute(text("SELECT COUNT(*) FROM report_templates"))
            count = result.scalar()
            print(f"✓ 数据库连接成功，report_templates 表有 {count} 条记录")
            
            # 2. 测试服务层查询
            print("\n2. 测试服务层查询...")
            query = ReportTemplateQuery(
                page=1,
                pageSize=10
            )
            
            result = await report_template_service.list_templates(db=db, query=query)
            
            print(f"✓ 查询成功")
            print(f"  - 总数: {result.total}")
            print(f"  - 当前页: {result.page}")
            print(f"  - 每页数量: {result.pageSize}")
            print(f"  - 总页数: {result.totalPages}")
            print(f"  - 返回记录数: {len(result.items)}")
            
            if result.items:
                print("\n  前 3 个模板:")
                for i, item in enumerate(result.items[:3], 1):
                    print(f"    {i}. {item.name}")
                    print(f"       - ID: {item.id}")
                    print(f"       - 分类: {item.category}")
                    print(f"       - 版本: {item.version}")
                    print(f"       - 激活: {item.isActive}")
                    print(f"       - 变量数量: {len(item.variables)}")
            
            print("\n" + "=" * 60)
            print("测试完成")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ 错误: {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_list_templates())
