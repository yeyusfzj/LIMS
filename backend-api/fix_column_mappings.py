"""自动修复所有模型文件中的列名映射问题"""
import re
import os
from pathlib import Path

def has_camel_case(name):
    """检查是否包含驼峰命名"""
    return bool(re.search(r'[a-z][A-Z]', name))

def to_snake_case(name):
    """转换为蛇形命名"""
    return re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name).lower()

def fix_column_definition(line):
    """修复列定义"""
    # 匹配 Column 定义: variable_name = Column(...)
    match = re.match(r'(\s*)(\w+)(\s*=\s*Column\()(.*?)(\).*)$', line)
    if not match:
        return line
    
    indent = match.group(1)
    var_name = match.group(2)
    equals_column = match.group(3)
    column_args = match.group(4)
    rest = match.group(5)
    
    # 跳过特殊列名
    if var_name in ['id', 'name', 'type', 'status', 'level', 'action', 'content',
                     'description', 'expression', 'parameters', 'version', 'priority',
                     'decision', 'comments', 'changes', 'quantity', 'unit', 'remarks']:
        return line
    
    # 检查是否是驼峰命名
    if not has_camel_case(var_name):
        return line
    
    # 检查是否已经有列名映射
    if re.match(r"^['\"]", column_args.strip()):
        return line  # 已经有映射
    
    # 转换为蛇形命名
    snake_case = to_snake_case(var_name)
    
    # 生成新的行
    new_line = f"{indent}{var_name}{equals_column}'{snake_case}', {column_args}{rest}\n"
    
    return new_line

def fix_model_file(file_path):
    """修复单个模型文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed_lines = []
    changes = 0
    
    for line in lines:
        fixed_line = fix_column_definition(line)
        if fixed_line != line:
            changes += 1
        fixed_lines.append(fixed_line)
    
    if changes > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(fixed_lines)
    
    return changes

def main():
    models_dir = Path('app/models')
    total_changes = 0
    
    for model_file in models_dir.glob('*.py'):
        if model_file.name in ['__init__.py', 'base.py']:
            continue
        
        changes = fix_model_file(model_file)
        if changes > 0:
            print(f"✅ {model_file.name}: 修复了 {changes} 个列定义")
            total_changes += changes
    
    if total_changes == 0:
        print("✅ 没有需要修复的列定义！")
    else:
        print(f"\n🎉 总共修复了 {total_changes} 个列定义！")

if __name__ == "__main__":
    main()
