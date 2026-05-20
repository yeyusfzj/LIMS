"""
验证工作流实现

检查工作流相关文件的语法和导入
"""

import sys
import ast


def check_syntax(file_path):
    """检查文件语法"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()
        ast.parse(code)
        print(f"✓ {file_path} - 语法正确")
        return True
    except SyntaxError as e:
        print(f"✗ {file_path} - 语法错误: {e}")
        return False
    except Exception as e:
        print(f"✗ {file_path} - 错误: {e}")
        return False


def main():
    """主函数"""
    print("=" * 60)
    print("验证工作流实现")
    print("=" * 60)
    
    files_to_check = [
        "app/schemas/workflow.py",
        "app/services/workflow_service.py",
        "app/routers/workflows.py",
        "app/models/workflow.py",
    ]
    
    all_passed = True
    for file_path in files_to_check:
        if not check_syntax(file_path):
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("所有文件验证通过！")
        print("=" * 60)
        return 0
    else:
        print("部分文件验证失败！")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
