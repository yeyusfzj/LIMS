# -*- coding: utf-8 -*-
"""修复reports.py的编码问题"""

import re

# 读取文件
with open('app/routers/reports.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 修复所有乱码
replacements = {
    '默�?�?': '默认1',
    '默�?0�?': '默认20',
    '�?PDF': '为PDF',
    '文件�?': '文件名',
    '分发状�?': '分发状态',
    '开始日�?': '开始日期',
    '报�?': '报告',
    '接收�?': '接收人',
    'PRINT�?': 'PRINT)',
    '记�?': '记录',
    '端点�?': '端点)',
}

for old, new in replacements.items():
    content = content.replace(old, new)

# 写回文件
with open('app/routers/reports.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("修复完成！")
