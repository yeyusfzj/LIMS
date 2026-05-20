"""
查看所有报告模板
"""
import asyncio
from app.core.database import AsyncSessionLocal
from app.models.report import ReportTemplate
from sqlalchemy import select


async def check_templates():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ReportTemplate))
        templates = result.scalars().all()
        
        print(f'找到 {len(templates)} 个模板\n')
        
        for i, template in enumerate(templates, 1):
            print(f'=== 模板 {i} ===')
            print(f'ID: {template.id}')
            print(f'名称: {template.name}')
            print(f'分类: {template.category}')
            print(f'内容长度: {len(template.content)}')
            print(f'变量数量: {len(template.variables)}')
            print(f'激活状态: {template.isActive}')
            
            if len(template.content) > 100:
                print(f'\n内容前500字符:\n{template.content[:500]}...\n')
            else:
                print(f'\n完整内容:\n{template.content}\n')
            
            if template.variables:
                print(f'变量列表:')
                for var in template.variables[:5]:  # 只显示前5个变量
                    print(f'  - {var}')
                if len(template.variables) > 5:
                    print(f'  ... 还有 {len(template.variables) - 5} 个变量')
            
            print('\n' + '='*50 + '\n')


if __name__ == "__main__":
    asyncio.run(check_templates())
