"""
检查数据库中的样品数据
"""
import asyncio
from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.sample import Sample

async def check_sample():
    sample_id = "c9a8a88e-4b51-4715-b290-52f8b052a46c"
    
    async with AsyncSessionLocal() as db:
        # 使用ORM查询
        result = await db.execute(
            select(Sample).where(Sample.id == sample_id)
        )
        sample = result.scalar_one_or_none()
        
        if sample:
            print(f"✓ 找到样品")
            print(f"  ID: {sample.id}")
            print(f"  样品名称: {sample.sample_name}")
            print(f"  数量: {sample.quantity}")
            print(f"  版本: {sample.version}")
            print(f"  更新时间: {sample.updated_at}")
        else:
            print("❌ 未找到样品")

if __name__ == "__main__":
    asyncio.run(check_sample())
