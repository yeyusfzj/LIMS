#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复破损的字符串"""

import re

# 读取文件
with open('app/routers/audits.py', 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

# 修复每一行
fixed_lines = []
for i, line in enumerate(lines, 1):
    # 查找未闭合的字符串
    if 'description="' in line and line.count('"') % 2 != 0:
        # 字符串未闭合,添加闭合引号
        line = line.rstrip() + '")\n' if not line.rstrip().endswith(')') else line.rstrip() + '"\n'
        print(f"修复第 {i} 行: {line.strip()}")
    fixed_lines.append(line)

# 写回文件
with open('app/routers/audits.py', 'w', encoding='utf-8') as f:
    f.writelines(fixed_lines)

print("\n修复完成!")
