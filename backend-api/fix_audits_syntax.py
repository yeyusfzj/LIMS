#!/usr/bin/env python3
"""修复 audits.py 文件中的语法错误"""

# 读取文件
with open("app/routers/audits.py", "r", encoding="utf-8") as f:
    content = f.read()

# 修复所有被截断的字符串
content = content.replace('description="审核状?),"\n', 'description="审核状态"),\n')
content = content.replace('description="是否为默认模?),"\n', 'description="是否为默认模板"),\n')
content = content.replace('description="配置状?),"\n', 'description="配置状态"),\n')
content = content.replace('实现审核任务的创建、查询、执行和统计?API 端点?', '实现审核任务的创建、查询、执行和统计的 API 端点')
content = content.replace('支持按样品、审核人员、状态、级别等条件筛?', '支持按样品、审核人员、状态、级别等条件筛选')
content = content.replace('处理审核决策并触发下一级审?', '处理审核决策并触发下一级审核')
content = content.replace('重新分配审核任务给其他审核人?', '重新分配审核任务给其他审核人员')
content = content.replace('验证放行条件并执行放行操?', '验证放行条件并执行放行操作')
content = content.replace('批量验证放行条件并执行放行操?', '批量验证放行条件并执行放行操作')
content = content.replace('导出审核数据?Excel 格式', '导出审核数据为 Excel 格式')
content = content.replace('支持按样品、审核人员、状态、级别等条件筛选导?', '支持按样品、审核人员、状态、级别等条件筛选导出')
content = content.replace('ApiResponse', 'APIResponse')

# 写回文件
with open("app/routers/audits.py", "w", encoding="utf-8") as f:
    f.write(content)

print("✅ 修复完成")
