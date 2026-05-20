#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
直接查询样品数据
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_db


async def query_samples():
    """查询样品数据"""
    
    async for db in get_db():
        try:
            # 查询样品总数
            result = await db.execute(text("SELECT COUNT(*) FROM samples"))
            total = result.scalar()
            print(f"样品总数: {total}")
            
            # 查询样品状态分布
            result = await db.execute(text("""
                SELECT status, COUNT(*) as count 
                FROM samples 
                GROUP BY status
            """))
            print("\n样品状态分布:")
            for row in result:
                print(f"  {row.status}: {row.count}")
            
            # 查询最近的样品
            result = await db.execute(text("""
                SELECT "sampleNumber", "sampleName", status, "createdAt"
                FROM samples 
                ORDER BY "createdAt" DESC 
                LIMIT 5
            """))
            print("\n最近的样品:")
            for row in result:
                print(f"  {row.sampleNumber} - {row.sampleName} ({row.status}) - {row.createdAt}")
            
            return True
            
        except Exception as e:
            print(f"❌ 查询失败: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    asyncio.run(query_samples())
