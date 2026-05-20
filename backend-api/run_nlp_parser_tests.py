#!/usr/bin/env python
"""
运行 NLP 解析器测试的简单脚本
"""
import sys
import os

# 添加当前目录到 Python 路径
sys.path.insert(0, os.path.dirname(__file__))

from app.agent.nlp_parser import NLPParser
from app.agent.exceptions import EmptyInputException, UnrecognizedTextException

def test_water_heavy_metal_detection():
    """测试水样重金属检测解析"""
    parser = NLPParser()
    text = "我需要检测水样中的重金属含量，包括铅、汞、镉等指标"
    
    try:
        result = parser.parse(text)
        print(f"✓ 测试通过: 水样重金属检测解析")
        print(f"  - 样品类型: {result.sample_type}")
        print(f"  - 检测指标: {result.indicators}")
        print(f"  - 置信度: {result.confidence:.2f}")
        return True
    except Exception as e:
        print(f"✗ 测试失败: 水样重金属检测解析 - {e}")
        return False

def test_time_extraction():
    """测试时间表达式提取"""
    parser = NLPParser()
    text = "检测水样重金属，预计需要2小时完成"
    
    try:
        result = parser.parse(text)
        if result.estimated_time:
            print(f"✓ 测试通过: 时间表达式提取")
            print(f"  - 提取的时间: {result.estimated_time}")
            return True
        else:
            print(f"✗ 测试失败: 时间表达式提取 - 未提取到时间")
            return False
    except Exception as e:
        print(f"✗ 测试失败: 时间表达式提取 - {e}")
        return False

def test_empty_text():
    """测试空文本输入"""
    parser = NLPParser()
    
    try:
        result = parser.parse("")
        print(f"✗ 测试失败: 空文本输入 - 应该抛出异常但没有")
        return False
    except EmptyInputException as e:
        print(f"✓ 测试通过: 空文本输入")
        print(f"  - 错误代码: {e.error_code}")
        print(f"  - 错误消息: {e.message}")
        return True
    except Exception as e:
        print(f"✗ 测试失败: 空文本输入 - 抛出了错误的异常类型: {type(e).__name__}")
        return False

def test_whitespace_only():
    """测试纯空格输入"""
    parser = NLPParser()
    
    try:
        result = parser.parse("   \t\n  ")
        print(f"✗ 测试失败: 纯空格输入 - 应该抛出异常但没有")
        return False
    except EmptyInputException:
        print(f"✓ 测试通过: 纯空格输入")
        return True
    except Exception as e:
        print(f"✗ 测试失败: 纯空格输入 - 抛出了错误的异常类型: {type(e).__name__}")
        return False

def test_unrecognizable_text():
    """测试无法识别的文本"""
    parser = NLPParser()
    
    try:
        result = parser.parse("今天天气真好")
        print(f"✗ 测试失败: 无法识别的文本 - 应该抛出异常但没有")
        return False
    except UnrecognizedTextException as e:
        print(f"✓ 测试通过: 无法识别的文本")
        print(f"  - 错误代码: {e.error_code}")
        return True
    except Exception as e:
        print(f"✗ 测试失败: 无法识别的文本 - 抛出了错误的异常类型: {type(e).__name__}")
        return False

def main():
    """运行所有测试"""
    print("=" * 60)
    print("NLP 解析器单元测试")
    print("=" * 60)
    print()
    
    tests = [
        test_water_heavy_metal_detection,
        test_time_extraction,
        test_empty_text,
        test_whitespace_only,
        test_unrecognizable_text
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        print(f"\n运行测试: {test.__doc__}")
        print("-" * 60)
        if test():
            passed += 1
        else:
            failed += 1
        print()
    
    print("=" * 60)
    print(f"测试结果: {passed} 通过, {failed} 失败")
    print("=" * 60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
