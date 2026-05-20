"""检查所有模型文件中的列名映射问题"""
import re
import os
from pathlib import Path

def has_camel_case(name):
    """检查是否包含驼峰命名"""
    # 检查是否有小写字母后跟大写字母
    return bool(re.search(r'[a-z][A-Z]', name))

def check_column_definition(line, line_num, file_path):
    """检查列定义是否有映射问题"""
    # 匹配 Column 定义: variable_name = Column(...)
    match = re.match(r'\s*(\w+)\s*=\s*Column\((.*?)\)', line)
    if not match:
        return None
    
    var_name = match.group(1)
    column_args = match.group(2)
    
    # 跳过特殊列名
    if var_name in ['id', 'name', 'type', 'status', 'level', 'action', 'content', 
                     'description', 'expression', 'parameters', 'version', 'priority',
                     'decision', 'comments', 'changes', 'quantity', 'unit', 'remarks']:
        return None
    
    # 检查是否是驼峰命名
    if not has_camel_case(var_name):
        return None
    
    # 检查是否已经有列名映射（第一个参数是字符串）
    if re.match(r"^['\"]", column_args.strip()):
        return None  # 已经有映射
    
    # 转换为蛇形命名
    snake_case = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', var_name).lower()
    
    return {
        'file': file_path,
        'line': line_num,
        'var_name': var_name,
        'snake_case': snake_case,
        'original_line': line.rstrip()
    }

def check_model_file(file_path):
    """检查单个模型文件"""
    issues = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines, 1):
        issue = check_column_definition(line, i, file_path)
        if issue:
            issues.append(issue)
    
    return issues

def main():
    models_dir = Path('app/models')
    all_issues = []
    
    for model_file in models_dir.glob('*.py'):
        if model_file.name in ['__init__.py', 'base.py']:
            continue
        
        issues = check_model_file(model_file)
        all_issues.extend(issues)
    
    if not all_issues:
        print("✅ 没有发现列名映射问题！")
        return
    
    print(f"⚠️  发现 {len(all_issues)} 个潜在的列名映射问题：\n")
    
    # 按文件分组
    by_file = {}
    for issue in all_issues:
        file_name = os.path.basename(issue['file'])
        if file_name not in by_file:
            by_file[file_name] = []
        by_file[file_name].append(issue)
    
    for file_name, issues in sorted(by_file.items()):
        print(f"\n📄 {file_name}:")
        for issue in issues:
            print(f"  行 {issue['line']}: {issue['var_name']} -> 应该映射到 '{issue['snake_case']}'")
            print(f"    原始: {issue['original_line']}")
            # 生成修复建议
            fixed_line = issue['original_line'].replace(
                f"{issue['var_name']} = Column(",
                f"{issue['var_name']} = Column('{issue['snake_case']}, "
            )
            print(f"    建议: {fixed_line}")

if __name__ == "__main__":
    main()
