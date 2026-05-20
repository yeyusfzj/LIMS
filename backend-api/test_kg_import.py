"""测试知识图谱模块导入"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

try:
    print("尝试导入 knowledge_graph 模块...")
    from app.agent.knowledge_graph import KnowledgeGraph
    print("✅ 成功导入 KnowledgeGraph")
    
    print("\n尝试创建 KnowledgeGraph 实例...")
    kg = KnowledgeGraph()
    print("✅ 成功创建实例")
    
    print("\n获取统计信息...")
    stats = kg.get_statistics()
    print(f"统计信息: {stats}")
    
    print("\n获取所有实验类型...")
    exp_types = kg.get_all_experiment_types()
    print(f"实验类型数量: {len(exp_types)}")
    for exp in exp_types:
        print(f"  - {exp.id}: {exp.name}")
    
    print("\n✅ 所有测试通过")
    
except Exception as e:
    print(f"\n❌ 错误: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
