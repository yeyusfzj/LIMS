#!/usr/bin/env python3
"""完整修复 audits.py 文件"""

# 读取文件
with open("app/routers/audits.py", "rb") as f:
    content = f.read().decode('utf-8', errors='ignore')

# 修复所有问题
lines = content.split('\n')
fixed_lines = []

for line in lines:
    # 修复被截断的字符串
    if 'description="审核状?' in line and '),"' in line:
        line = line.replace('description="审核状?),"\n', 'description="审核状态"),')
        line = line.replace('description="审核状?),', 'description="审核状态"),')
    if 'description="是否为默认模?' in line:
        line = line.replace('description="是否为默认模?),"\n', 'description="是否为默认模板"),')
        line = line.replace('description="是否为默认模?),', 'description="是否为默认模板"),')
    if 'description="配置状?' in line:
        line = line.replace('description="配置状?),"\n', 'description="配置状态"),')
        line = line.replace('description="配置状?),', 'description="配置状态"),')
    
    fixed_lines.append(line)

content = '\n'.join(fixed_lines)

# 写回文件
with open("app/routers/audits.py", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ 修复完成")
