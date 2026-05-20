#!/usr/bin/env python3
"""
检查数据库中的 Enum 类型
"""

import sys
import asyncio
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from app.core.database import AsyncSessionLocal


async def check_enum_types():
    """检查数据库中的 Enum 类型"""
    async with AsyncSessionLocal() as db:
        # 查询所有 Enum 类型
        result = await db.execute(text("""
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            ORDER BY t.typname, e.enumsortorder
        """))
        
        enums = {}
        for row in result.fetchall():
            type_name, label = row
            if type_name not in enums:
                enums[type_name] = []
            enums[type_name].append(label)
        
        print("数据库中的 Enum 类型:")
        print("=" * 80)
        for type_name, labels in sorted(enums.items()):
            print(f"\n{type_name}:")
            for label in labels:
                print(f"  - {label}")
        print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(check_enum_types())
