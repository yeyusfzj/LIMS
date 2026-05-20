#!/usr/bin/env python3
"""
依赖验证脚本

验证 AI Agent 模块所需的所有依赖是否正确安装。
"""

import sys
from typing import Dict, List, Tuple


def check_python_version() -> bool:
    """检查 Python 版本"""
    required_version = (3, 9)
    current_version = sys.version_info[:2]
    
    print(f"Python 版本检查:")
    print(f"  当前版本: {sys.version}")
    print(f"  要求版本: >= {required_version[0]}.{required_version[1]}")
    
    if current_version >= required_version:
        print("  ✅ Python 版本满足要求\n")
        return True
    else:
        print(f"  ❌ Python 版本过低，需要 >= {required_version[0]}.{required_version[1]}\n")
        return False


def check_package(package_name: str, min_version: str = None) -> Tuple[bool, str]:
    """检查单个包是否安装"""
    try:
        import importlib.metadata
        version = importlib.metadata.version(package_name)
        return True, version
    except importlib.metadata.PackageNotFoundError:
        return False, None


def verify_dependencies() -> Dict[str, bool]:
    """验证所有依赖"""
    
    # AI Agent 核心依赖
    core_dependencies = {
        "fastapi": "0.104.1",
        "uvicorn": "0.24.0",
        "pydantic": "2.5.0",
        "python-dotenv": "1.0.0",
        "python-dateutil": "2.8.2",
    }
    
    # 测试依赖
    test_dependencies = {
        "pytest": "7.4.3",
        "pytest-asyncio": "0.21.1",
        "pytest-cov": "4.1.0",
        "hypothesis": "6.92.0",
        "httpx": "0.25.2",
    }
    
    results = {}
    
    print("=" * 60)
    print("核心依赖检查")
    print("=" * 60)
    
    for package, expected_version in core_dependencies.items():
        installed, version = check_package(package)
        if installed:
            print(f"✅ {package:20s} {version:15s} (期望: {expected_version})")
            results[package] = True
        else:
            print(f"❌ {package:20s} 未安装 (期望: {expected_version})")
            results[package] = False
    
    print("\n" + "=" * 60)
    print("测试依赖检查")
    print("=" * 60)
    
    for package, expected_version in test_dependencies.items():
        installed, version = check_package(package)
        if installed:
            print(f"✅ {package:20s} {version:15s} (期望: {expected_version})")
            results[package] = True
        else:
            print(f"❌ {package:20s} 未安装 (期望: {expected_version})")
            results[package] = False
    
    return results


def check_import_modules() -> bool:
    """检查关键模块是否可以导入"""
    print("\n" + "=" * 60)
    print("模块导入检查")
    print("=" * 60)
    
    modules_to_check = [
        "fastapi",
        "pydantic",
        "pytest",
        "hypothesis",
        "uvicorn",
        "httpx",
    ]
    
    all_success = True
    
    for module_name in modules_to_check:
        try:
            __import__(module_name)
            print(f"✅ {module_name:20s} 可以正常导入")
        except ImportError as e:
            print(f"❌ {module_name:20s} 导入失败: {e}")
            all_success = False
    
    return all_success


def main():
    """主函数"""
    print("\n" + "=" * 60)
    print("AI Agent 模块依赖验证")
    print("=" * 60 + "\n")
    
    # 检查 Python 版本
    python_ok = check_python_version()
    
    # 检查依赖包
    results = verify_dependencies()
    
    # 检查模块导入
    import_ok = check_import_modules()
    
    # 总结
    print("\n" + "=" * 60)
    print("验证总结")
    print("=" * 60)
    
    total_packages = len(results)
    installed_packages = sum(results.values())
    
    print(f"Python 版本: {'✅ 通过' if python_ok else '❌ 失败'}")
    print(f"依赖包: {installed_packages}/{total_packages} 已安装")
    print(f"模块导入: {'✅ 通过' if import_ok else '❌ 失败'}")
    
    if python_ok and installed_packages == total_packages and import_ok:
        print("\n✅ 所有依赖验证通过！环境配置正确。")
        return 0
    else:
        print("\n❌ 部分依赖验证失败，请检查上述错误信息。")
        print("\n修复建议:")
        print("  1. 确保 Python 版本 >= 3.9")
        print("  2. 运行: pip install -r requirements.txt")
        print("  3. 如果问题持续，尝试: pip install --upgrade pip")
        return 1


if __name__ == "__main__":
    sys.exit(main())
