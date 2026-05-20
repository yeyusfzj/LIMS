#!/usr/bin/env python3
"""快速 CRUD 测试"""

import sys
import os

# 添加当前目录到路径
sys.path.insert(0, os.path.dirname(__file__))

try:
    print("开始测试...")
    print(f"Python 版本: {sys.version}")
    print(f"当前目录: {os.getcwd()}")
    print(f"sys.path: {sys.path[:3]}")
    
    print("\n导入模块...")
    from app.agent.parser_dictionary import ParserDictionary
    print("✅ 导入成功")
    
    print("\n创建实例...")
    pd = ParserDictionary()
    print("✅ 实例创建成功")
    
    print("\n测试基本功能...")
    keywords = pd.get_purpose_keywords()
    print(f"目的关键词数量: {len(keywords)}")
    print(f"示例: {keywords[:3] if keywords else '无'}")
    
    print("\n✅ 所有测试通过!")
    
except Exception as e:
    print(f"\n❌ 错误: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
