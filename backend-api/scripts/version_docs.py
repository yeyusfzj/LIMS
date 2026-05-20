#!/usr/bin/env python3
"""
API 文档版本管理脚本

用于管理不同版本的 API 文档，支持版本归档、查询、恢复和对比
"""
import sys
import argparse
from pathlib import Path
from datetime import datetime

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.main import app
from app.utils.openapi_generator import OpenAPIGenerator


def archive_version(generator: OpenAPIGenerator, version: str = None, description: str = ""):
    """归档当前版本的文档"""
    print(f"\n开始归档版本 {version or app.version}...")
    
    try:
        version_dir = generator.archive_version(version, description)
        print(f"✓ 版本归档完成: {version_dir}")
    except Exception as e:
        print(f"✗ 归档失败: {str(e)}")
        sys.exit(1)


def list_versions(generator: OpenAPIGenerator):
    """列出所有版本"""
    versions = generator.list_versions()
    
    if not versions:
        print("\n暂无归档版本")
        return
    
    print("\n已归档的 API 文档版本:\n")
    print(f"{'版本号':<20} {'归档时间':<30} {'描述'}")
    print("-" * 80)
    
    for v in versions:
        archived_at = datetime.fromisoformat(v['archivedAt']).strftime('%Y-%m-%d %H:%M:%S')
        description = v.get('description', '无描述')
        print(f"{v['version']:<20} {archived_at:<30} {description}")
    
    print(f"\n共 {len(versions)} 个版本")


def restore_version(generator: OpenAPIGenerator, version: str):
    """恢复指定版本"""
    print(f"\n开始恢复版本 {version}...")
    
    success = generator.restore_version(version)
    
    if success:
        print(f"✓ 版本 {version} 恢复完成")
    else:
        print(f"✗ 版本 {version} 不存在或恢复失败")
        sys.exit(1)


def compare_versions(generator: OpenAPIGenerator, version1: str, version2: str):
    """对比两个版本"""
    print(f"\n对比版本 {version1} 和 {version2}...\n")
    
    diff = generator.compare_versions(version1, version2)
    
    if "error" in diff:
        print(f"✗ 对比失败: {diff['error']}")
        sys.exit(1)
    
    # 端点变更
    paths = diff['paths']
    print("端点变更:")
    print(f"  新增: {len(paths['added'])}")
    print(f"  删除: {len(paths['removed'])}")
    print(f"  保持: {paths['common']}")
    print(f"  总计: {paths['total_v1']} -> {paths['total_v2']}")
    
    if paths['added']:
        print("\n新增端点:")
        for path in paths['added']:
            print(f"  + {path}")
    
    if paths['removed']:
        print("\n删除端点:")
        for path in paths['removed']:
            print(f"  - {path}")
    
    # 数据模型变更
    schemas = diff['schemas']
    print("\n数据模型变更:")
    print(f"  新增: {len(schemas['added'])}")
    print(f"  删除: {len(schemas['removed'])}")
    print(f"  总计: {schemas['total_v1']} -> {schemas['total_v2']}")
    
    if schemas['added']:
        print("\n新增模型:")
        for schema in schemas['added']:
            print(f"  + {schema}")
    
    if schemas['removed']:
        print("\n删除模型:")
        for schema in schemas['removed']:
            print(f"  - {schema}")


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description="API 文档版本管理工具")
    subparsers = parser.add_subparsers(dest="command", help="命令")
    
    # archive 命令
    archive_parser = subparsers.add_parser("archive", help="归档当前版本")
    archive_parser.add_argument("--version", help="版本号（默认使用应用版本）")
    archive_parser.add_argument("--description", default="", help="版本描述")
    
    # list 命令
    subparsers.add_parser("list", help="列出所有版本")
    
    # restore 命令
    restore_parser = subparsers.add_parser("restore", help="恢复指定版本")
    restore_parser.add_argument("version", help="要恢复的版本号")
    
    # compare 命令
    compare_parser = subparsers.add_parser("compare", help="对比两个版本")
    compare_parser.add_argument("version1", help="版本1")
    compare_parser.add_argument("version2", help="版本2")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        print("\n示例:")
        print("  python version_docs.py archive --version 1.0.0 --description '初始版本'")
        print("  python version_docs.py list")
        print("  python version_docs.py restore 1.0.0")
        print("  python version_docs.py compare 1.0.0 1.1.0")
        return
    
    # 创建文档生成器
    generator = OpenAPIGenerator(app, docs_dir="docs/api")
    
    # 执行命令
    if args.command == "archive":
        archive_version(generator, args.version, args.description)
    elif args.command == "list":
        list_versions(generator)
    elif args.command == "restore":
        restore_version(generator, args.version)
    elif args.command == "compare":
        compare_versions(generator, args.version1, args.version2)


if __name__ == "__main__":
    main()
