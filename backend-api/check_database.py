#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
检查数据库中的数据
"""

import asyncio
import sys
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# 数据库 URL
DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/lims_dev"

async def check_database():
    """检查数据库中的数据"""
    
    # 创建引擎
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    # 创建会话
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        try:
            # 检查 samples 表
            result = await session.execute(text("SELECT COUNT(*) FROM samples"))
            samples_count = result.scalar()
            print(f"✅ samples 表中有 {samples_count} 条记录")
            
            # 检查 tasks 表
            result = await session.execute(text("SELECT COUNT(*) FROM tasks"))
            tasks_count = result.scalar()
            print(f"✅ tasks 表中有 {tasks_count} 条记录")
            
            # 检查 results 表
            result = await session.execute(text("SELECT COUNT(*) FROM results"))
            results_count = result.scalar()
            print(f"✅ results 表中有 {results_count} 条记录")
            
            # 如果有样品，显示样品状态分布
            if samples_count > 0:
                result = await session.execute(text("""
                    SELECT status, COUNT(*) as count 
                    FROM samples 
                    GROUP BY status
                """))
                print("\n样品状态分布:")
                for row in result:
                    print(f"  {row.status}: {row.count}")
                
                # 显示最近的样品
                result = await session.execute(text("""
                    SELECT "sampleNumber", "sampleName", status, "createdAt"
                    FROM samples 
                    ORDER BY "createdAt" DESC 
                    LIMIT 5
                """))
                print("\n最近的样品:")
                for row in result:
                    print(f"  {row.sampleNumber} - {row.sampleName} ({row.status}) - {row.createdAt}")
            
            return {
                "samples": samples_count,
                "tasks": tasks_count,
                "results": results_count
            }
            
        except Exception as e:
            print(f"❌ 检查数据库失败: {e}")
            import traceback
            traceback.print_exc()
            return None
        finally:
            await engine.dispose()


if __name__ == "__main__":
    result = asyncio.run(check_database())
    if result:
        print(f"\n✅ 数据库检查完成")
        print(f"   样品: {result['samples']}")
        print(f"   任务: {result['tasks']}")
        print(f"   结果: {result['results']}")
    else:
        print("\n❌ 数据库检查失败")
        sys.exit(1)
