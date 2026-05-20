"""
查看特定模板的详细信息
"""
import asyncio
import json
from app.core.database import AsyncSessionLocal
from app.models.report import ReportTemplate
from sqlalchemy import select


async def check_template_detail(template_name="分析报告模板"):
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ReportTemplate).where(ReportTemplate.name == template_name)
        )
        template = result.scalar_one_or_none()
        
        if template:
            print(f'模板名称: {template.name}')
            print(f'模板ID: {template.id}')
            print(f'模板分类: {template.category}')
            print(f'\n=== 完整模板内容 ===\n')
            print(template.content)
            print(f'\n=== 变量定义 ===\n')
            print(json.dumps(template.variables, indent=2, ensure_ascii=False))
        else:
            print(f'没有找到模板: {template_name}')


if __name__ == "__main__":
    asyncio.run(check_template_detail())
