"""
问答引擎 - 本地轻量化 AI 智能体

负责理解用户问题并提供准确回答，包括：
- 意图识别（设备查询、材料查询、步骤查询、指标查询）
- 知识检索（从知识图谱查询）
- 回答生成（基于模板）
"""

import json
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
from enum import Enum

from app.agent.knowledge_graph import KnowledgeGraph, get_knowledge_graph
from app.agent.parser_dictionary import get_parser_dictionary

logger = logging.getLogger(__name__)


class QuestionIntent(str, Enum):
    """问题意图类型"""
    EQUIPMENT = "equipment"      # 设备查询
    MATERIALS = "materials"      # 材料查询
    STEPS = "steps"              # 步骤查询
    INDICATORS = "indicators"    # 指标查询
    TIME = "time"                # 时间查询
    UNKNOWN = "unknown"          # 未知意图


class QAEngine:
    """问答引擎"""
    
    def __init__(
        self,
        knowledge_graph: Optional[KnowledgeGraph] = None,
        templates_path: Optional[str] = None
    ):
        """
        初始化问答引擎
        
        Args:
            knowledge_graph: 知识图谱实例
            templates_path: 回答模板文件路径
        """
        self.kg = knowledge_graph or get_knowledge_graph()
        self.dictionary = get_parser_dictionary()
        
        # 加载回答模板
        if templates_path is None:
            current_dir = Path(__file__).parent
            templates_path = current_dir / "data" / "answer_templates.json"
        
        self.templates = self._load_templates(templates_path)
        
        # 意图识别关键词
        self.intent_keywords = {
            QuestionIntent.EQUIPMENT: ["设备", "仪器", "需要什么", "用什么", "哪些设备"],
            QuestionIntent.MATERIALS: ["材料", "试剂", "化学品", "药品", "溶液"],
            QuestionIntent.STEPS: ["步骤", "怎么做", "如何操作", "流程", "方法"],
            QuestionIntent.INDICATORS: ["指标", "检测什么", "测什么", "项目"],
            QuestionIntent.TIME: ["多久", "时间", "需要多长", "多长时间"]
        }
        
        logger.info("问答引擎初始化完成")
    
    def _load_templates(self, templates_path: Path) -> Dict[str, str]:
        """加载回答模板"""
        try:
            with open(templates_path, 'r', encoding='utf-8') as f:
                templates = json.load(f)
            logger.info("成功加载回答模板")
            return templates
        except Exception as e:
            logger.error(f"加载回答模板失败: {e}")
            return {"default": "抱歉，系统出现错误，无法回答您的问题。"}
    
    def answer(self, question: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        回答用户问题
        
        Args:
            question: 用户问题
            context: 上下文信息（可选），可包含 experiment_type
            
        Returns:
            包含 answer, confidence, sources 的字典
        """
        if not question or not question.strip():
            raise ValueError("问题不能为空")
        
        question = question.strip()
        logger.info(f"收到问题: {question}")
        
        # 1. 识别意图
        intent = self.classify_intent(question)
        logger.info(f"识别意图: {intent}")
        
        # 2. 识别实验类型
        experiment_type = None
        if context and "experiment_type" in context:
            experiment_type = context["experiment_type"]
        else:
            # 从问题中识别实验类型
            experiment_type = self.dictionary.match_experiment_type(question)
        
        if not experiment_type:
            # 尝试从样品类型推断
            sample_type = self.dictionary.match_sample_type(question)
            if sample_type:
                # 简单映射
                if "水" in sample_type:
                    experiment_type = "water_heavy_metal"
                elif "土壤" in sample_type:
                    experiment_type = "soil_organic"
                elif "空气" in sample_type:
                    experiment_type = "air_quality"
        
        logger.info(f"实验类型: {experiment_type}")
        
        # 3. 检索知识
        knowledge = self.retrieve_knowledge(intent, experiment_type)
        
        # 4. 生成回答
        answer_text = self.generate_answer(intent, experiment_type, knowledge)
        
        # 5. 计算置信度
        confidence = 0.9 if experiment_type and knowledge else 0.5
        
        return {
            "question": question,
            "answer": answer_text,
            "confidence": confidence,
            "sources": ["knowledge_graph"] if knowledge else []
        }
    
    def classify_intent(self, question: str) -> QuestionIntent:
        """
        识别问题意图
        
        Args:
            question: 用户问题
            
        Returns:
            QuestionIntent 枚举值
        """
        question_lower = question.lower()
        
        # 计算每个意图的匹配分数
        scores = {}
        for intent, keywords in self.intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in question_lower)
            if score > 0:
                scores[intent] = score
        
        # 返回分数最高的意图
        if scores:
            return max(scores, key=scores.get)
        
        return QuestionIntent.UNKNOWN
    
    def retrieve_knowledge(
        self,
        intent: QuestionIntent,
        experiment_type: Optional[str]
    ) -> List[Any]:
        """
        检索相关知识
        
        Args:
            intent: 问题意图
            experiment_type: 实验类型 ID
            
        Returns:
            知识列表
        """
        if not experiment_type:
            return []
        
        try:
            if intent == QuestionIntent.EQUIPMENT:
                return self.kg.query_equipment(experiment_type)
            elif intent == QuestionIntent.MATERIALS:
                return self.kg.query_materials(experiment_type)
            elif intent == QuestionIntent.STEPS:
                return self.kg.query_steps(experiment_type)
            elif intent == QuestionIntent.INDICATORS:
                return self.kg.query_indicators(experiment_type)
            else:
                return []
        except Exception as e:
            logger.error(f"检索知识失败: {e}")
            return []
    
    def generate_answer(
        self,
        intent: QuestionIntent,
        experiment_type: Optional[str],
        knowledge: List[Any]
    ) -> str:
        """
        生成回答
        
        Args:
            intent: 问题意图
            experiment_type: 实验类型
            knowledge: 检索到的知识
            
        Returns:
            回答文本
        """
        if not knowledge:
            return self.templates.get("default", "抱歉，我没有找到相关信息。")
        
        # 获取实验类型名称
        exp_name = "该实验"
        if experiment_type:
            exp = self.kg.get_experiment_type(experiment_type)
            if exp:
                exp_name = exp.name
        
        # 根据意图生成回答
        if intent == QuestionIntent.EQUIPMENT:
            equipment_list = "\n".join(
                f"{i+1}. {eq.name}" + (f" (型号：{eq.model})" if eq.model else "")
                for i, eq in enumerate(knowledge)
            )
            template = self.templates.get("equipment", "{equipment_list}")
            return template.format(experiment_type=exp_name, equipment_list=equipment_list)
        
        elif intent == QuestionIntent.MATERIALS:
            material_list = "\n".join(
                f"{i+1}. {mat.name}" + (f" (浓度：{mat.concentration})" if mat.concentration else "")
                for i, mat in enumerate(knowledge)
            )
            template = self.templates.get("materials", "{material_list}")
            return template.format(experiment_type=exp_name, material_list=material_list)
        
        elif intent == QuestionIntent.STEPS:
            step_list = "\n".join(
                f"{step.order}. {step.title}\n   {step.description}"
                for step in knowledge
            )
            template = self.templates.get("steps", "{step_list}")
            return template.format(experiment_type=exp_name, step_list=step_list)
        
        elif intent == QuestionIntent.INDICATORS:
            indicator_list = "\n".join(
                f"{i+1}. {ind.name}" + (f" ({ind.unit})" if ind.unit else "")
                for i, ind in enumerate(knowledge)
            )
            template = self.templates.get("indicators", "{indicator_list}")
            return template.format(experiment_type=exp_name, indicator_list=indicator_list)
        
        else:
            return self.templates.get("default", "抱歉，我没有找到相关信息。")


# 全局单例实例
_qa_engine_instance: Optional[QAEngine] = None


def get_qa_engine() -> QAEngine:
    """获取问答引擎单例实例"""
    global _qa_engine_instance
    if _qa_engine_instance is None:
        _qa_engine_instance = QAEngine()
    return _qa_engine_instance
