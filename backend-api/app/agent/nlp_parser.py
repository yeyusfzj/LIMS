"""
NLP 解析器 - 本地轻量化 AI 智能体

负责解析用户输入的实验需求文本，提取结构化字段，包括：
- 实验目的
- 样品类型
- 检测指标
- 所需设备
- 所需材料
- 实验步骤
- 预计时间
"""

import logging
from typing import List, Optional
import re

from app.agent.models import ParsedFields
from app.agent.parser_dictionary import ParserDictionary, get_parser_dictionary
from app.agent.exceptions import (
    EmptyInputException,
    UnrecognizedTextException,
    LowConfidenceException
)

logger = logging.getLogger(__name__)


class NLPParser:
    """自然语言处理解析器"""
    
    def __init__(self, dictionary: Optional[ParserDictionary] = None):
        """
        初始化 NLP 解析器
        
        Args:
            dictionary: 解析器词典，如果为 None 则使用默认词典
        """
        self.dictionary = dictionary or get_parser_dictionary()
        logger.info("NLP 解析器初始化完成")
    
    def parse(self, text: str) -> ParsedFields:
        """
        解析实验需求文本
        
        Args:
            text: 实验需求文本
            
        Returns:
            ParsedFields 对象
            
        Raises:
            EmptyInputException: 如果文本为空
            UnrecognizedTextException: 如果无法识别任何字段
            LowConfidenceException: 如果解析置信度过低
        """
        # 验证输入：处理空文本（需求 1.12）
        if not text or not text.strip():
            logger.warning("接收到空文本输入")
            raise EmptyInputException()
        
        text = text.strip()
        logger.info(f"开始解析文本: {text[:50]}...")
        
        # 提取各个字段
        purpose = self.extract_purpose(text)
        sample_type = self.extract_sample_type(text)
        indicators = self.extract_indicators(text)
        equipment = self.extract_equipment(text)
        materials = self.extract_materials(text)
        steps = self.extract_steps(text)
        estimated_time = self.extract_time(text)
        
        # 计算置信度
        confidence = self._calculate_confidence(
            purpose, sample_type, indicators, equipment, materials, steps
        )
        
        # 检查是否无法识别任何有效字段（需求 1.13）
        # 至少需要识别样品类型或指标之一
        has_any_field = any([
            sample_type,
            indicators,
            equipment,
            materials
        ])
        
        if not has_any_field:
            logger.warning(f"无法从文本中识别任何字段: {text[:100]}")
            raise UnrecognizedTextException()
        
        # 检查置信度是否过低（需求 14.1）
        if confidence < 0.3:
            logger.warning(f"解析置信度过低: {confidence:.2f}")
            parsed_fields = ParsedFields(
                purpose=purpose,
                sample_type=sample_type,
                indicators=indicators,
                equipment=equipment,
                materials=materials,
                steps=steps,
                estimated_time=estimated_time,
                confidence=confidence
            )
            raise LowConfidenceException(confidence, parsed_fields.to_dict())
        
        parsed_fields = ParsedFields(
            purpose=purpose,
            sample_type=sample_type,
            indicators=indicators,
            equipment=equipment,
            materials=materials,
            steps=steps,
            estimated_time=estimated_time,
            confidence=confidence
        )
        
        logger.info(f"解析完成，置信度: {confidence:.2f}")
        return parsed_fields
    
    def extract_purpose(self, text: str) -> str:
        """
        提取实验目的
        
        Args:
            text: 输入文本
            
        Returns:
            实验目的字符串
        """
        purpose_keywords = self.dictionary.get_purpose_keywords()
        
        # 查找包含目的关键词的句子
        for keyword in purpose_keywords:
            if keyword in text:
                # 简单提取：返回包含关键词的部分
                # 更复杂的实现可以使用句子分割
                return text
        
        # 如果没有明确的目的关键词，返回整个文本作为目的
        return text
    
    def extract_sample_type(self, text: str) -> str:
        """
        提取样品类型
        
        Args:
            text: 输入文本
            
        Returns:
            样品类型字符串
        """
        sample_type = self.dictionary.match_sample_type(text)
        return sample_type or ""
    
    def extract_indicators(self, text: str) -> List[str]:
        """
        提取检测指标
        
        Args:
            text: 输入文本
            
        Returns:
            检测指标列表
        """
        indicators = self.dictionary.match_indicators(text)
        return indicators
    
    def extract_equipment(self, text: str) -> List[str]:
        """
        提取所需设备
        
        Args:
            text: 输入文本
            
        Returns:
            设备列表
        """
        equipment = self.dictionary.match_equipment(text)
        return equipment
    
    def extract_materials(self, text: str) -> List[str]:
        """
        提取所需材料
        
        Args:
            text: 输入文本
            
        Returns:
            材料列表
        """
        materials = self.dictionary.match_materials(text)
        return materials
    
    def extract_steps(self, text: str) -> List[str]:
        """
        提取实验步骤
        
        Args:
            text: 输入文本
            
        Returns:
            步骤列表
        """
        steps = []
        action_keywords = self.dictionary.get_action_keywords()
        
        # 查找包含动作关键词的部分
        for action_type, keywords in action_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    # 简单提取：记录动作类型
                    if action_type not in steps:
                        steps.append(action_type)
        
        return steps
    
    def extract_time(self, text: str) -> str:
        """
        提取预计时间
        
        Args:
            text: 输入文本
            
        Returns:
            时间字符串
        """
        time_expressions = self.dictionary.extract_time(text)
        
        if time_expressions:
            # 返回第一个匹配的时间表达式
            return time_expressions[0]
        
        return ""
    
    def _calculate_confidence(
        self,
        purpose: str,
        sample_type: str,
        indicators: List[str],
        equipment: List[str],
        materials: List[str],
        steps: List[str]
    ) -> float:
        """
        计算解析置信度
        
        Args:
            purpose: 实验目的
            sample_type: 样品类型
            indicators: 检测指标
            equipment: 设备
            materials: 材料
            steps: 步骤
            
        Returns:
            置信度（0.0-1.0）
        """
        # 基于提取字段的完整性计算置信度
        score = 0.0
        
        # 必需字段
        if purpose:
            score += 0.3
        if sample_type:
            score += 0.3
        
        # 可选字段
        if indicators:
            score += 0.2
        if equipment or materials:
            score += 0.1
        if steps:
            score += 0.1
        
        return min(score, 1.0)
    
    def get_experiment_type(self, text: str) -> Optional[str]:
        """
        识别实验类型
        
        Args:
            text: 输入文本
            
        Returns:
            实验类型 ID，如果无法识别返回 None
        """
        return self.dictionary.match_experiment_type(text)


# 全局单例实例
_nlp_parser_instance: Optional[NLPParser] = None


def get_nlp_parser() -> NLPParser:
    """获取 NLP 解析器单例实例"""
    global _nlp_parser_instance
    if _nlp_parser_instance is None:
        _nlp_parser_instance = NLPParser()
    return _nlp_parser_instance
