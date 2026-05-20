#!/usr/bin/env python3
"""
检查报告模板是否添加成功
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.database import get_session_factory
from app.models.report import ReportTemplate
from sqlalchemy import select


async def check_templates():
    """检查报告模板"""
    session_factory = get_session_factory()
    async with session_factory() as db:
        try:
            print("正在查询报告模板...")
            print("=" * 80)
            
            result = await db.execute(select(ReportTemplate))
            templates = result.scalars().all()
            
            if not templates:
                print("未找到任何报告模板")
                return
            
            print(f"找到 {len(templates)} 个报告模板:\n")
            
            for i, template in enumerate(templates, 1):
                print(f"{i}. {template.name}")
                print(f"   分类: {template.category}")
                print(f"   描述: {template.description}")
                print(f"   版本: v{template.version}")
                print(f"   状态: {'激活' if template.isActive else '未激活'}")
                print(f"   变量数量: {len(template.variables) if template.variables else 0}")
                print(f"   创建时间: {template.createdAt}")
                print()
            
            print("=" * 80)
            print(f"总计: {len(templates)} 个模板")
            
        except Exception as e:
            print(f"错误：查询报告模板失败 - {str(e)}")
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(check_templates())
