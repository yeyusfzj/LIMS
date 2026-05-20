"""
实验计划生成器 - 本地轻量化 AI 智能体

负责根据结构化字段生成完整的实验计划，包括：
- 知识增强（从知识图谱补充信息）
- 模板填充
- 格式化输出（Markdown）
"""

import json
import logging
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime
import uuid

from app.agent.models import ParsedFields, ExperimentPlan, Equipment, Material, Indicator, Step
from app.agent.knowledge_graph import KnowledgeGraph, get_knowledge_graph
from app.agent.parser_dictionary import get_parser_dictionary

logger = logging.getLogger(__name__)


class PlanGenerator:
    """实验计划生成器"""
    
    def __init__(
        self,
        knowledge_graph: Optional[KnowledgeGraph] = None,
        templates_path: Optional[str] = None
    ):
        """
        初始化实验计划生成器
        
        Args:
            knowledge_graph: 知识图谱实例
            templates_path: 计划模板文件路径
        """
        self.kg = knowledge_graph or get_knowledge_graph()
        self.dictionary = get_parser_dictionary()
        
        # 加载计划模板
        if templates_path is None:
            current_dir = Path(__file__).parent
            templates_path = current_dir / "data" / "plan_templates.json"
        
        self.templates = self._load_templates(templates_path)
        
        logger.info("实验计划生成器初始化完成")
    
    def _load_templates(self, templates_path: Path) -> Dict[str, Any]:
        """加载计划模板"""
        try:
            with open(templates_path, 'r', encoding='utf-8') as f:
                templates = json.load(f)
            logger.info("成功加载计划模板")
            return templates
        except Exception as e:
            logger.error(f"加载计划模板失败: {e}")
            return {"default": {}}
    
    def generate(self, parsed_fields: ParsedFields) -> ExperimentPlan:
        """
        生成实验计划
        
        Args:
            parsed_fields: 解析后的结构化字段
            
        Returns:
            ExperimentPlan 对象
        """
        logger.info("开始生成实验计划")
        
        # 1. 识别实验类型
        experiment_type = self._identify_experiment_type(parsed_fields)
        logger.info(f"识别实验类型: {experiment_type}")
        
        # 2. 使用知识图谱增强字段
        enriched_data = self.enrich_with_knowledge(parsed_fields, experiment_type)
        
        # 3. 生成计划 ID
        plan_id = f"plan_{uuid.uuid4().hex[:8]}"
        
        # 4. 创建实验计划对象
        plan = ExperimentPlan(
            id=plan_id,
            purpose=enriched_data["purpose"],
            sample_type=enriched_data["sample_type"],
            indicators=enriched_data["indicators"],
            equipment=enriched_data["equipment"],
            materials=enriched_data["materials"],
            steps=enriched_data["steps"],
            estimated_time=enriched_data["estimated_time"],
            safety_notes=enriched_data["safety_notes"]
        )
        
        logger.info(f"实验计划生成完成: {plan_id}")
        return plan
    
    def _identify_experiment_type(self, parsed_fields: ParsedFields) -> Optional[str]:
        """
        识别实验类型
        
        Args:
            parsed_fields: 解析后的字段
            
        Returns:
            实验类型 ID
        """
        # 从目的和样品类型中识别
        text = f"{parsed_fields.purpose} {parsed_fields.sample_type}"
        experiment_type = self.dictionary.match_experiment_type(text)
        
        if not experiment_type:
            # 根据样品类型推断
            if "水" in parsed_fields.sample_type:
                experiment_type = "water_heavy_metal"
            elif "土壤" in parsed_fields.sample_type:
                experiment_type = "soil_organic"
            elif "空气" in parsed_fields.sample_type:
                experiment_type = "air_quality"
        
        return experiment_type
    
    def enrich_with_knowledge(
        self,
        parsed_fields: ParsedFields,
        experiment_type: Optional[str]
    ) -> Dict[str, Any]:
        """
        使用知识图谱增强字段
        
        Args:
            parsed_fields: 解析后的字段
            experiment_type: 实验类型 ID
            
        Returns:
            增强后的数据字典
        """
        enriched = {
            "purpose": parsed_fields.purpose,
            "sample_type": parsed_fields.sample_type,
            "indicators": [],
            "equipment": [],
            "materials": [],
            "steps": [],
            "estimated_time": parsed_fields.estimated_time or "待确定",
            "safety_notes": []
        }
        
        if not experiment_type:
            logger.warning("未识别实验类型，无法进行知识增强")
            # 使用用户输入的信息
            enriched["indicators"] = [
                Indicator(id=f"ind_user_{i}", name=ind, unit="", method="")
                for i, ind in enumerate(parsed_fields.indicators)
            ]
            return enriched
        
        try:
            # 从知识图谱查询信息
            kg_equipment = self.kg.query_equipment(experiment_type)
            kg_materials = self.kg.query_materials(experiment_type)
            kg_indicators = self.kg.query_indicators(experiment_type)
            kg_steps = self.kg.query_steps(experiment_type)
            
            # 合并用户输入和知识图谱信息
            
            # 指标：优先使用知识图谱中的详细信息
            if parsed_fields.indicators:
                # 匹配用户输入的指标
                for user_ind in parsed_fields.indicators:
                    matched = False
                    for kg_ind in kg_indicators:
                        if user_ind in kg_ind.name or kg_ind.name in user_ind:
                            if kg_ind not in enriched["indicators"]:
                                enriched["indicators"].append(kg_ind)
                            matched = True
                            break
                    if not matched:
                        # 创建用户自定义指标
                        enriched["indicators"].append(
                            Indicator(id=f"ind_user_{len(enriched['indicators'])}", name=user_ind, unit="", method="")
                        )
            else:
                # 使用知识图谱中的所有指标
                enriched["indicators"] = kg_indicators
            
            # 设备：使用知识图谱中的设备
            enriched["equipment"] = kg_equipment
            
            # 材料：使用知识图谱中的材料
            enriched["materials"] = kg_materials
            
            # 步骤：使用知识图谱中的步骤
            enriched["steps"] = kg_steps
            
            # 安全注意事项：从材料中提取
            for mat in kg_materials:
                if mat.safety_level and mat.safety_level != "低危":
                    note = f"注意{mat.name}的安全使用，安全等级：{mat.safety_level}"
                    enriched["safety_notes"].append(note)
            
            # 预计时间：如果用户没有提供，从步骤中计算
            if not enriched["estimated_time"] or enriched["estimated_time"] == "待确定":
                total_time = self._calculate_total_time(kg_steps)
                if total_time:
                    enriched["estimated_time"] = total_time
            
            logger.info("知识增强完成")
            
        except Exception as e:
            logger.error(f"知识增强失败: {e}")
        
        return enriched
    
    def _calculate_total_time(self, steps: List[Step]) -> str:
        """
        计算总时间
        
        Args:
            steps: 步骤列表
            
        Returns:
            总时间字符串
        """
        # 简单实现：返回第一个步骤的时间或默认值
        if steps and steps[0].duration:
            return f"约{steps[0].duration}（仅供参考，实际时间可能更长）"
        return "待确定"
    
    def fill_template(self, plan: ExperimentPlan) -> str:
        """
        填充模板（已在 ExperimentPlan.to_markdown 中实现）
        
        Args:
            plan: 实验计划对象
            
        Returns:
            Markdown 格式的计划
        """
        return plan.to_markdown()


# 全局单例实例
_plan_generator_instance: Optional[PlanGenerator] = None


def get_plan_generator() -> PlanGenerator:
    """获取实验计划生成器单例实例"""
    global _plan_generator_instance
    if _plan_generator_instance is None:
        _plan_generator_instance = PlanGenerator()
    return _plan_generator_instance
