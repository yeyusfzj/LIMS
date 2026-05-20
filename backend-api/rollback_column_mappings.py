"""回滚列名映射修复（除了 audit.py）"""
import re
from pathlib import Path

def remove_column_mapping(line):
    """移除列名映射"""
    # 匹配 Column('column_name', Type, ...) 格式
    match = re.match(r"(\s*)(\w+)(\s*=\s*Column\()'([^']+)',\s*(.*?)(\).*)$", line)
    if not match:
        return line
    
    indent = match.group(1)
    var_name = match.group(2)
    equals_column = match.group(3)
    column_name = match.group(4)
    rest_args = match.group(5)
    rest = match.group(6)
    
    # 生成没有映射的行
    new_line = f"{indent}{var_name}{equals_column}{rest_args}{rest}\n"
    
    return new_line

def rollback_model_file(file_path):
    """回滚单个模型文件"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    rolled_back_lines = []
    changes = 0
    
    for line in lines:
        rolled_back_line = remove_column_mapping(line)
        if rolled_back_line != line:
            changes += 1
        rolled_back_lines.append(rolled_back_line)
    
    if changes > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(rolled_back_lines)
    
    return changes

def main():
    models_dir = Path('app/models')
    total_changes = 0
    
    # 跳过 audit.py，只回滚其他文件
    for model_file in models_dir.glob('*.py'):
        if model_file.name in ['__init__.py', 'base.py', 'audit.py']:
            continue
        
        changes = rollback_model_file(model_file)
        if changes > 0:
            print(f"✅ {model_file.name}: 回滚了 {changes} 个列定义")
            total_changes += changes
    
    if total_changes == 0:
        print("✅ 没有需要回滚的列定义！")
    else:
        print(f"\n🎉 总共回滚了 {total_changes} 个列定义！")
        print("\n⚠️  注意：audit.py 的修复已保留")

if __name__ == "__main__":
    main()
