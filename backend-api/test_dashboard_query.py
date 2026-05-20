#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
测试 Dashboard 查询逻辑
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.models.sample import Sample
from app.models.task import Task


async def test_dashboard_query():
    """测试 Dashboard 查询"""
    
    async for db in get_db():
        try:
            # 计算时间范围
            now = datetime.now()
            week_ago = now - timedelta(days=7)
            two_weeks_ago = now - timedelta(days=14)
            
            print(f"当前时间: {now}")
            print(f"一周前: {week_ago}")
            print(f"两周前: {two_weeks_ago}")
            
            # 1. 样品总数（所有样品）
            print("\n1. 查询样品总数...")
            total_samples_query = select(func.count(Sample.id))
            total_samples_result = await db.execute(total_samples_query)
            total_samples = total_samples_result.scalar() or 0
            print(f"   样品总数: {total_samples}")
            
            # 本周新增样品数
            print("\n2. 查询本周新增样品...")
            this_week_samples_query = select(func.count(Sample.id)).where(
                Sample.created_at >= week_ago
            )
            this_week_samples_result = await db.execute(this_week_samples_query)
            this_week_samples = this_week_samples_result.scalar() or 0
            print(f"   本周新增: {this_week_samples}")
            
            # 上周新增样品数
            print("\n3. 查询上周新增样品...")
            last_week_samples_query = select(func.count(Sample.id)).where(
                and_(
                    Sample.created_at >= two_weeks_ago,
                    Sample.created_at < week_ago
                )
            )
            last_week_samples_result = await db.execute(last_week_samples_query)
            last_week_samples = last_week_samples_result.scalar() or 0
            print(f"   上周新增: {last_week_samples}")
            
            # 计算趋势
            if last_week_samples > 0:
                trend = round(((this_week_samples - last_week_samples) / last_week_samples) * 100, 1)
            else:
                trend = 0.0 if this_week_samples == 0 else 100.0
            print(f"   趋势: {trend}%")
            
            # 4. 待处理任务数
            print("\n4. 查询待处理任务...")
            pending_tasks_query = select(func.count(Task.id)).where(
                Task.status.in_(['PENDING', 'IN_PROGRESS'])
            )
            pending_tasks_result = await db.execute(pending_tasks_query)
            pending_tasks = pending_tasks_result.scalar() or 0
            print(f"   待处理任务: {pending_tasks}")
            
            return True
            
        except Exception as e:
            print(f"❌ 查询失败: {e}")
            import traceback
            traceback.print_exc()
            return False


if __name__ == "__main__":
    asyncio.run(test_dashboard_query())
