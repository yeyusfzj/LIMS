#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""测试工作流模型导入"""

try:
    from app.models import Workflow, WorkflowInstance, Task
    from app.models import WorkflowStatus, InstanceStatus, TaskStatus
    print("✓ 模型导入成功")
    print(f"  - Workflow: {Workflow.__tablename__}")
    print(f"  - WorkflowInstance: {WorkflowInstance.__tablename__}")
    print(f"  - Task: {Task.__tablename__}")
except Exception as e:
    print(f"✗ 导入失败: {e}")
    import traceback
    traceback.print_exc()
