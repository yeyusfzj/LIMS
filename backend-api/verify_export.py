"""
验证导出功能代码的正确性
"""
import sys
import ast

def check_syntax(file_path):
    """检查 Python 文件语法"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.compile()
            ast.parse(code)
        print(f"✓ {file_path} 语法正确")
        return True
    except SyntaxError as e:
        print(f"✗ {file_path} 语法错误: {e}")
        return False

# 检查导出服务文件
files_to_check = [
    "app/services/export_service.py",
    "app/services/audit_service.py",
    "app/routers/audits.py",
    "tests/test_audit_export.py"
]

all_ok = True
for file_path in files_to_check:
    if not check_syntax(file_path):
        all_ok = False

if all_ok:
    print("\n所有文件语法检查通过！")
    sys.exit(0)
else:
    print("\n存在语法错误！")
    sys.exit(1)

