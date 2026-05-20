#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""修复 audits.py 文件的导入和编码问题"""

import re

# 读取文件
with open('app/routers/audits.py', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 替换 AppException 为 APIException
content = re.sub(r'except AppException', 'except APIException', content)

# 写回文件
with open('app/routers/audits.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("修复完成!")
