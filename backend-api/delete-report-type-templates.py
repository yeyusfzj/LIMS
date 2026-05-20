#!/usr/bin/env python3
"""
删除报告类型模板脚本
删除之前添加的5个报告类型模板
"""

import asyncio
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import select, delete
from app.core.database import AsyncSessionLocal
from app.models.report import ReportTemplate


async def delete_report_type_templates():
    """删除报告类型模板"""
    
    # 要删除的模板分类
    categories_to_delete = [
        "ANALYSIS_REPORT",
        "SAMPLE_REPORT",
        "TECHNICAL_REPORT",
        "QUALITY_REPORT",
        "COMPREHENSIVE_REPORT"
    ]
    
    async with AsyncSessionLocal() as db:
        try:
            print("正在删除报告类型模板...")
            print("=" * 80)
            
            # 查询要删除的模板
            stmt = select(ReportTemplate).where(
                ReportTemplate.category.in_(categories_to_delete)
            )
            result = await db.execute(stmt)
            templates = result.scalars().all()
            
            if not templates:
                print("没有找到需要删除的模板")
                return
            
            print(f"找到 {len(templates)} 个模板需要删除:\n")
            for template in templates:
                print(f"  - {template.name} ({template.category})")
            
            # 删除模板
            delete_stmt = delete(ReportTemplate).where(
                ReportTemplate.category.in_(categories_to_delete)
            )
            result = await db.execute(delete_stmt)
            await db.commit()
            
            print(f"\n成功删除 {result.rowcount} 个模板")
            print("=" * 80)
            
        except Exception as e:
            await db.rollback()
            print(f"删除失败: {str(e)}")
            raise


if __name__ == "__main__":
    asyncio.run(delete_report_type_templates())
