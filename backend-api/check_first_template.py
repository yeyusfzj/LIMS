"""
查看第一个报告模板
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.report import ReportTemplate
from sqlalchemy import select


async def check_template():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ReportTemplate).limit(1))
        template = result.scalar_one_or_none()
        
        if template:
            print(f'模板ID: {template.id}')
            print(f'模板名称: {template.name}')
            print(f'模板分类: {template.category}')
            print(f'模板内容长度: {len(template.content)}')
            print(f'变量数量: {len(template.variables)}')
            print(f'\n模板内容前1000字符:\n{template.content[:1000]}')
            print(f'\n变量列表:')
            for var in template.variables:
                print(f'  - {var}')
        else:
            print('没有找到模板')


if __name__ == "__main__":
    asyncio.run(check_template())
