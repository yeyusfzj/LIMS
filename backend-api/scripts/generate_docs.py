#!/usr/bin/env python3
"""
API 文档生成脚本

用于在本地或 CI/CD 环境生成 API 文档
"""
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.main import app
from app.utils.openapi_generator import OpenAPIGenerator


def main():
    """主函数"""
    print("开始生成 API 文档...\n")
    
    try:
        # 创建文档生成器
        generator = OpenAPIGenerator(app, docs_dir="docs/api")
        
        # 生成所有格式的文档
        print("正在生成文档...")
        files = generator.generate_all()
        
        print("\n✓ 文档生成完成！\n")
        print("生成的文件:")
        for format_type, file_path in files.items():
            print(f"  - {format_type.upper()}: {file_path}")
        
        # 获取统计信息
        stats = generator.get_statistics()
        
        print("\n文档统计:")
        print(f"  API 版本: {stats['version']}")
        print(f"  API 端点: {stats['endpoints']['total']}")
        print(f"  数据模型: {stats['schemas']}")
        print(f"  API 分类: {stats['tags']}")
        
        print("\n端点方法分布:")
        for method, count in stats['endpoints']['by_method'].items():
            print(f"  {method}: {count}")
        
        print("\n查看文档:")
        print(f"  - 本地文件: file://{Path(files['html']).absolute()}")
        print(f"  - Swagger UI: http://localhost:8000/docs")
        print(f"  - ReDoc: http://localhost:8000/redoc")
        
    except Exception as e:
        print(f"\n✗ 文档生成失败: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
