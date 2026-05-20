#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查 reports.py 文件的语法错误"""

import sys

# 读取文件
with open('fastapi-backend/app/routers/reports.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 查找包含"分发状态"的行
for i, line in enumerate(lines, 1):
    if '分发状态' in line:
        print(f"第 {i} 行: {repr(line)}")
        # 检查引号是否匹配
        if line.count('"') % 2 != 0:
            print(f"  ⚠️ 警告: 引号数量不匹配!")
        if line.count("'") % 2 != 0:
            print(f"  ⚠️ 警告: 单引号数量不匹配!")

# 尝试编译文件
print("\n尝试编译文件...")
try:
    with open('fastapi-backend/app/routers/reports.py', 'r', encoding='utf-8') as f:
        code = f.read()
    compile(code, 'reports.py', 'exec')
    print("✅ 文件语法正确")
except SyntaxError as e:
    print(f"❌ 语法错误: {e}")
    print(f"   行号: {e.lineno}")
    print(f"   位置: {e.offset}")
    print(f"   文本: {e.text}")
