#!/usr/bin/env python3
"""
快速测试检查脚本

此脚本用于快速检查测试环境和基本测试是否可以运行
"""

import sys
import subprocess
from pathlib import Path


def check_python_version():
    """检查 Python 版本"""
    print("检查 Python 版本...")
    version = sys.version_info
    print(f"  Python {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 9):
        print("  ❌ Python 版本过低，需要 Python 3.9+")
        return False
    
    print("  ✅ Python 版本符合要求")
    return True


def check_dependencies():
    """检查依赖包"""
    print("\n检查依赖包...")
    
    required_packages = [
        'pytest',
        'pytest_asyncio',
        'pytest_cov',
        'hypothesis',
        'fastapi',
        'sqlalchemy',
        'pydantic'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"  ✅ {package}")
        except ImportError:
            print(f"  ❌ {package} (未安装)")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n缺少以下依赖包: {', '.join(missing_packages)}")
        print("请运行: pip install -r requirements.txt")
        return False
    
    return True


def check_test_files():
    """检查测试文件"""
    print("\n检查测试文件...")
    
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"
    
    if not tests_dir.exists():
        print("  ❌ tests 目录不存在")
        return False
    
    # 统计测试文件
    unit_tests = list((tests_dir / "unit").glob("test_*.py"))
    integration_tests = list((tests_dir / "integration").glob("test_*.py"))
    root_tests = list(tests_dir.glob("test_*.py"))
    
    total_tests = len(unit_tests) + len(integration_tests) + len(root_tests)
    
    print(f"  单元测试文件: {len(unit_tests)}")
    print(f"  集成测试文件: {len(integration_tests)}")
    print(f"  根目录测试文件: {len(root_tests)}")
    print(f"  总计: {total_tests} 个测试文件")
    
    if total_tests == 0:
        print("  ⚠️  没有找到测试文件")
        return False
    
    print("  ✅ 测试文件存在")
    return True


def run_simple_test():
    """运行简单测试"""
    print("\n运行简单测试...")
    
    project_root = Path(__file__).parent.parent
    
    # 尝试运行一个简单的测试
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/unit/test_simple.py",
        "-v",
        "--tb=short"
    ]
    
    try:
        result = subprocess.run(
            cmd,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("  ✅ 简单测试通过")
            return True
        else:
            print("  ❌ 简单测试失败")
            print("\n错误输出:")
            print(result.stdout)
            if result.stderr:
                print(result.stderr)
            return False
    
    except subprocess.TimeoutExpired:
        print("  ⚠️  测试超时")
        return False
    except FileNotFoundError:
        print("  ⚠️  找不到测试文件 tests/unit/test_simple.py")
        return False
    except Exception as e:
        print(f"  ❌ 运行测试时出错: {e}")
        return False


def check_database_config():
    """检查数据库配置"""
    print("\n检查数据库配置...")
    
    project_root = Path(__file__).parent.parent
    env_file = project_root / ".env"
    
    if not env_file.exists():
        print("  ⚠️  .env 文件不存在")
        print("  提示: 复制 .env.example 到 .env 并配置数据库连接")
        return False
    
    # 读取 .env 文件
    with open(env_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'DATABASE_URL' in content:
        print("  ✅ DATABASE_URL 已配置")
    else:
        print("  ⚠️  DATABASE_URL 未配置")
        return False
    
    if 'REDIS_URL' in content:
        print("  ✅ REDIS_URL 已配置")
    else:
        print("  ⚠️  REDIS_URL 未配置")
    
    return True


def main():
    """主函数"""
    print("=" * 80)
    print("FastAPI 后端测试环境检查")
    print("=" * 80)
    
    checks = [
        ("Python 版本", check_python_version),
        ("依赖包", check_dependencies),
        ("测试文件", check_test_files),
        ("数据库配置", check_database_config),
        ("简单测试", run_simple_test),
    ]
    
    results = []
    for name, check_func in checks:
        try:
            result = check_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n检查 {name} 时出错: {e}")
            results.append((name, False))
    
    # 总结
    print("\n" + "=" * 80)
    print("检查总结")
    print("=" * 80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"  {name:<20} {status}")
    
    print(f"\n总计: {passed}/{total} 项检查通过")
    
    if passed == total:
        print("\n✅ 所有检查通过！可以开始运行测试。")
        print("\n下一步:")
        print("  1. 运行所有测试: pytest tests/")
        print("  2. 生成覆盖率报告: pytest --cov=app --cov-report=html")
        print("  3. 查看覆盖率报告: 打开 htmlcov/index.html")
        return 0
    else:
        print("\n⚠️  部分检查未通过，请先解决上述问题。")
        return 1


if __name__ == "__main__":
    sys.exit(main())
