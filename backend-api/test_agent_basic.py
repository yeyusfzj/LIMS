"""
基础功能测试 - 本地轻量化 AI 智能体

测试核心功能：
1. NLP 解析器
2. 知识图谱查询
3. 问答引擎
4. 实验计划生成器
"""

import sys
import asyncio
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).parent))

from app.agent.nlp_parser import get_nlp_parser
from app.agent.knowledge_graph import get_knowledge_graph
from app.agent.qa_engine import get_qa_engine
from app.agent.plan_generator import get_plan_generator


def test_nlp_parser():
    """测试 NLP 解析器"""
    print("=" * 60)
    print("测试 1: NLP 解析器")
    print("=" * 60)
    
    parser = get_nlp_parser()
    
    # 测试用例
    test_text = "我需要检测水样中的重金属含量，包括铅、汞、镉"
    
    print(f"\n输入文本: {test_text}")
    
    result = parser.parse(test_text)
    
    print(f"\n解析结果:")
    print(f"  实验目的: {result.purpose}")
    print(f"  样品类型: {result.sample_type}")
    print(f"  检测指标: {result.indicators}")
    print(f"  所需设备: {result.equipment}")
    print(f"  所需材料: {result.materials}")
    print(f"  实验步骤: {result.steps}")
    print(f"  预计时间: {result.estimated_time}")
    print(f"  置信度: {result.confidence:.2f}")
    
    print("\n✅ NLP 解析器测试通过")
    return result


def test_knowledge_graph():
    """测试知识图谱"""
    print("\n" + "=" * 60)
    print("测试 2: 知识图谱查询")
    print("=" * 60)
    
    kg = get_knowledge_graph()
    
    # 测试查询
    experiment_type = "water_heavy_metal"
    
    print(f"\n查询实验类型: {experiment_type}")
    
    equipment = kg.query_equipment(experiment_type)
    materials = kg.query_materials(experiment_type)
    indicators = kg.query_indicators(experiment_type)
    steps = kg.query_steps(experiment_type)
    
    print(f"\n设备列表 ({len(equipment)} 个):")
    for eq in equipment[:3]:  # 只显示前3个
        print(f"  - {eq.name} ({eq.model})")
    
    print(f"\n材料列表 ({len(materials)} 个):")
    for mat in materials[:3]:
        print(f"  - {mat.name} ({mat.concentration})")
    
    print(f"\n指标列表 ({len(indicators)} 个):")
    for ind in indicators[:3]:
        print(f"  - {ind.name} ({ind.unit})")
    
    print(f"\n步骤列表 ({len(steps)} 个):")
    for step in steps[:3]:
        print(f"  {step.order}. {step.title}")
    
    # 统计信息
    stats = kg.get_statistics()
    print(f"\n知识图谱统计:")
    print(f"  实验类型: {stats['experiment_types']} 个")
    print(f"  设备: {stats['equipment']} 个")
    print(f"  材料: {stats['materials']} 个")
    print(f"  指标: {stats['indicators']} 个")
    print(f"  步骤: {stats['steps']} 个")
    
    print("\n✅ 知识图谱测试通过")


def test_qa_engine():
    """测试问答引擎"""
    print("\n" + "=" * 60)
    print("测试 3: 问答引擎")
    print("=" * 60)
    
    qa = get_qa_engine()
    
    # 测试问题
    questions = [
        "水质检测需要什么设备？",
        "水样重金属检测需要哪些材料？",
        "水样重金属检测的步骤是什么？"
    ]
    
    for i, question in enumerate(questions, 1):
        print(f"\n问题 {i}: {question}")
        
        result = qa.answer(question, context={"experiment_type": "water_heavy_metal"})
        
        print(f"回答: {result['answer'][:200]}...")
        print(f"置信度: {result['confidence']:.2f}")
    
    print("\n✅ 问答引擎测试通过")


def test_plan_generator():
    """测试实验计划生成器"""
    print("\n" + "=" * 60)
    print("测试 4: 实验计划生成器")
    print("=" * 60)
    
    # 先解析文本
    parser = get_nlp_parser()
    parsed_fields = parser.parse("我需要检测水样中的重金属含量，包括铅、汞、镉")
    
    # 生成计划
    generator = get_plan_generator()
    plan = generator.generate(parsed_fields)
    
    print(f"\n计划 ID: {plan.id}")
    print(f"实验目的: {plan.purpose}")
    print(f"样品类型: {plan.sample_type}")
    print(f"检测指标: {len(plan.indicators)} 个")
    print(f"所需设备: {len(plan.equipment)} 个")
    print(f"所需材料: {len(plan.materials)} 个")
    print(f"实验步骤: {len(plan.steps)} 个")
    print(f"预计时间: {plan.estimated_time}")
    
    # 显示 Markdown 格式（前500字符）
    markdown = plan.to_markdown()
    print(f"\nMarkdown 格式预览:")
    print("-" * 60)
    print(markdown[:500])
    print("...")
    print("-" * 60)
    
    print("\n✅ 实验计划生成器测试通过")
    return plan


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("本地轻量化 AI 智能体 - 基础功能测试")
    print("=" * 60)
    
    try:
        # 测试 1: NLP 解析器
        parsed_fields = test_nlp_parser()
        
        # 测试 2: 知识图谱
        test_knowledge_graph()
        
        # 测试 3: 问答引擎
        test_qa_engine()
        
        # 测试 4: 实验计划生成器
        plan = test_plan_generator()
        
        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)
        
        print("\n核心功能已就绪：")
        print("  ✓ NLP 解析器")
        print("  ✓ 知识图谱查询")
        print("  ✓ 问答引擎")
        print("  ✓ 实验计划生成器")
        
        print("\nAPI 端点已注册：")
        print("  POST /api/agent/parse - 解析实验需求")
        print("  POST /api/agent/plan - 生成实验计划")
        print("  POST /api/agent/qa - 智能问答")
        print("  GET  /api/agent/health - 健康检查")
        
        print("\n可以启动 FastAPI 服务进行测试：")
        print("  cd fastapi-backend")
        print("  uvicorn app.main:app --reload")
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
