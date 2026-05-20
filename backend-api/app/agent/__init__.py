"""
本地轻量化 AI 智能体模块

提供实验室智能分析功能：
- 实验需求文本解析
- 实验计划自动生成
- 智能问答
- 结果分析（待实现）
"""

__version__ = "1.0.0"

from app.agent.nlp_parser import NLPParser, get_nlp_parser
from app.agent.knowledge_graph import KnowledgeGraph, get_knowledge_graph
from app.agent.parser_dictionary import ParserDictionary, get_parser_dictionary
from app.agent.qa_engine import QAEngine, get_qa_engine
from app.agent.plan_generator import PlanGenerator, get_plan_generator

__all__ = [
    "NLPParser",
    "get_nlp_parser",
    "KnowledgeGraph",
    "get_knowledge_graph",
    "ParserDictionary",
    "get_parser_dictionary",
    "QAEngine",
    "get_qa_engine",
    "PlanGenerator",
    "get_plan_generator",
]
