"""
知识图谱管理器 - 本地轻量化 AI 智能体

负责加载、查询和管理实验相关知识，包括：
- 实验类型与设备、材料、指标、步骤的关联关系
- 知识条目的 CRUD 操作
- 数据导入导出
"""

import json
import os
from typing import List, Optional, Dict, Any
from pathlib import Path
import logging

from app.agent.models import (
    Equipment, Material, Indicator, Step, ExperimentType
)

logger = logging.getLogger(__name__)


class KnowledgeGraph:
    """知识图谱管理器"""
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        初始化知识图谱
        
        Args:
            storage_path: JSON 数据文件路径，默认为 app/agent/data/knowledge_graph.json
        """
        if storage_path is None:
            # 默认路径
            current_dir = Path(__file__).parent
            storage_path = current_dir / "data" / "knowledge_graph.json"
        
        self.storage_path = Path(storage_path)
        self.data: Dict[str, Any] = {}
        
        # 内存缓存（字典索引）
        self._experiment_types: Dict[str, ExperimentType] = {}
        self._equipment: Dict[str, Equipment] = {}
        self._materials: Dict[str, Material] = {}
        self._indicators: Dict[str, Indicator] = {}
        self._steps: Dict[str, Step] = {}
        
        # 加载数据
        self._load_data()
    
    def _load_data(self) -> None:
        """从 JSON 文件加载数据到内存"""
        try:
            if not self.storage_path.exists():
                logger.warning(f"知识图谱文件不存在: {self.storage_path}")
                self.data = {
                    "experiment_types": [],
                    "equipment": [],
                    "materials": [],
                    "indicators": [],
                    "steps": []
                }
                return
            
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            
            # 构建内存索引
            self._build_indexes()
            
            logger.info(f"成功加载知识图谱: {len(self._experiment_types)} 个实验类型")
            
        except Exception as e:
            logger.error(f"加载知识图谱失败: {e}")
            raise
    
    def _build_indexes(self) -> None:
        """构建内存索引以加速查询"""
        # 索引实验类型
        for exp_data in self.data.get("experiment_types", []):
            exp = ExperimentType.from_dict(exp_data)
            self._experiment_types[exp.id] = exp
        
        # 索引设备
        for eq_data in self.data.get("equipment", []):
            eq = Equipment.from_dict(eq_data)
            self._equipment[eq.id] = eq
        
        # 索引材料
        for mat_data in self.data.get("materials", []):
            mat = Material.from_dict(mat_data)
            self._materials[mat.id] = mat
        
        # 索引指标
        for ind_data in self.data.get("indicators", []):
            ind = Indicator.from_dict(ind_data)
            self._indicators[ind.id] = ind
        
        # 索引步骤
        for step_data in self.data.get("steps", []):
            step = Step.from_dict(step_data)
            self._steps[step.id] = step
    
    def query_equipment(self, experiment_type: str) -> List[Equipment]:
        """
        查询实验类型相关的设备
        
        Args:
            experiment_type: 实验类型 ID
            
        Returns:
            设备列表
        """
        exp = self._experiment_types.get(experiment_type)
        if not exp:
            logger.warning(f"未找到实验类型: {experiment_type}")
            return []
        
        equipment_list = []
        for eq_id in exp.equipment_ids:
            eq = self._equipment.get(eq_id)
            if eq:
                equipment_list.append(eq)
        
        return equipment_list
    
    def query_materials(self, experiment_type: str) -> List[Material]:
        """
        查询实验类型相关的材料
        
        Args:
            experiment_type: 实验类型 ID
            
        Returns:
            材料列表
        """
        exp = self._experiment_types.get(experiment_type)
        if not exp:
            logger.warning(f"未找到实验类型: {experiment_type}")
            return []
        
        material_list = []
        for mat_id in exp.material_ids:
            mat = self._materials.get(mat_id)
            if mat:
                material_list.append(mat)
        
        return material_list
    
    def query_indicators(self, experiment_type: str) -> List[Indicator]:
        """
        查询实验类型相关的指标
        
        Args:
            experiment_type: 实验类型 ID
            
        Returns:
            指标列表
        """
        exp = self._experiment_types.get(experiment_type)
        if not exp:
            logger.warning(f"未找到实验类型: {experiment_type}")
            return []
        
        indicator_list = []
        for ind_id in exp.indicator_ids:
            ind = self._indicators.get(ind_id)
            if ind:
                indicator_list.append(ind)
        
        return indicator_list
    
    def query_steps(self, experiment_type: str) -> List[Step]:
        """
        查询实验类型相关的步骤
        
        Args:
            experiment_type: 实验类型 ID
            
        Returns:
            步骤列表（按 order 排序）
        """
        exp = self._experiment_types.get(experiment_type)
        if not exp:
            logger.warning(f"未找到实验类型: {experiment_type}")
            return []
        
        step_list = []
        for step_id in exp.step_ids:
            step = self._steps.get(step_id)
            if step:
                step_list.append(step)
        
        # 按 order 排序
        step_list.sort(key=lambda s: s.order)
        
        return step_list
    
    def get_experiment_type(self, experiment_id: str) -> Optional[ExperimentType]:
        """
        获取实验类型
        
        Args:
            experiment_id: 实验类型 ID
            
        Returns:
            实验类型对象，如果不存在返回 None
        """
        return self._experiment_types.get(experiment_id)
    
    def search_experiment_by_name(self, name: str) -> List[ExperimentType]:
        """
        根据名称搜索实验类型（模糊匹配）
        
        Args:
            name: 实验类型名称关键词
            
        Returns:
            匹配的实验类型列表
        """
        results = []
        name_lower = name.lower()
        
        for exp in self._experiment_types.values():
            if name_lower in exp.name.lower() or name_lower in exp.category.lower():
                results.append(exp)
        
        return results
    
    def _validate_entry(self, entry: Any) -> None:
        """
        验证知识条目的数据完整性
        
        Args:
            entry: 知识条目对象
            
        Raises:
            ValueError: 如果数据不完整或格式不正确
        """
        # 验证所有条目的必填字段
        if not hasattr(entry, 'id') or not entry.id:
            raise ValueError("条目必须包含非空的 id 字段")
        
        # 验证 ID 格式（只允许字母、数字、下划线、连字符）
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', entry.id):
            raise ValueError(f"ID 格式不正确: {entry.id}，只允许字母、数字、下划线和连字符")
        
        # 针对不同类型的特定验证
        if isinstance(entry, Step):
            # Step 使用 title 而不是 name
            if not hasattr(entry, 'order') or entry.order < 1:
                raise ValueError("步骤的 order 字段必须是大于 0 的整数")
            if not hasattr(entry, 'title') or not entry.title:
                raise ValueError("步骤必须包含非空的 title 字段")
            if not hasattr(entry, 'description') or not entry.description:
                raise ValueError("步骤必须包含非空的 description 字段")
        
        else:
            # 其他类型都有 name 字段
            if not hasattr(entry, 'name') or not entry.name:
                raise ValueError("条目必须包含非空的 name 字段")
        
        # 指标的阈值验证
        if isinstance(entry, Indicator):
            if hasattr(entry, 'threshold_min') and hasattr(entry, 'threshold_max'):
                if entry.threshold_min is not None and entry.threshold_max is not None:
                    if entry.threshold_min > entry.threshold_max:
                        raise ValueError(f"阈值下限 ({entry.threshold_min}) 不能大于上限 ({entry.threshold_max})")
        
        # 实验类型的关联 ID 验证
        elif isinstance(entry, ExperimentType):
            if hasattr(entry, 'equipment_ids') and entry.equipment_ids:
                for eq_id in entry.equipment_ids:
                    if eq_id not in self._equipment:
                        raise ValueError(f"关联的设备 ID 不存在: {eq_id}")
            
            if hasattr(entry, 'material_ids') and entry.material_ids:
                for mat_id in entry.material_ids:
                    if mat_id not in self._materials:
                        raise ValueError(f"关联的材料 ID 不存在: {mat_id}")
            
            if hasattr(entry, 'indicator_ids') and entry.indicator_ids:
                for ind_id in entry.indicator_ids:
                    if ind_id not in self._indicators:
                        raise ValueError(f"关联的指标 ID 不存在: {ind_id}")
            
            if hasattr(entry, 'step_ids') and entry.step_ids:
                for step_id in entry.step_ids:
                    if step_id not in self._steps:
                        raise ValueError(f"关联的步骤 ID 不存在: {step_id}")
    
    def add_entry(self, entry: Any) -> bool:
        """
        添加知识条目
        
        Args:
            entry: 知识条目对象（Equipment, Material, Indicator, Step, ExperimentType）
            
        Returns:
            是否添加成功
            
        Raises:
            ValueError: 如果条目已存在或数据不完整
        """
        try:
            # 验证数据完整性
            self._validate_entry(entry)
            
            # 检查重复并添加条目
            if isinstance(entry, Equipment):
                if entry.id in self._equipment:
                    raise ValueError(f"设备 ID 已存在: {entry.id}")
                self._equipment[entry.id] = entry
                self.data["equipment"].append(entry.to_dict())
                
            elif isinstance(entry, Material):
                if entry.id in self._materials:
                    raise ValueError(f"材料 ID 已存在: {entry.id}")
                self._materials[entry.id] = entry
                self.data["materials"].append(entry.to_dict())
                
            elif isinstance(entry, Indicator):
                if entry.id in self._indicators:
                    raise ValueError(f"指标 ID 已存在: {entry.id}")
                self._indicators[entry.id] = entry
                self.data["indicators"].append(entry.to_dict())
                
            elif isinstance(entry, Step):
                if entry.id in self._steps:
                    raise ValueError(f"步骤 ID 已存在: {entry.id}")
                self._steps[entry.id] = entry
                self.data["steps"].append(entry.to_dict())
                
            elif isinstance(entry, ExperimentType):
                if entry.id in self._experiment_types:
                    raise ValueError(f"实验类型 ID 已存在: {entry.id}")
                self._experiment_types[entry.id] = entry
                self.data["experiment_types"].append(entry.to_dict())
                
            else:
                raise ValueError(f"不支持的条目类型: {type(entry)}")
            
            # 持久化到文件
            self._save_data()
            logger.info(f"成功添加知识条目: {entry.id}")
            return True
            
        except Exception as e:
            logger.error(f"添加知识条目失败: {e}")
            raise
    
    def _save_data(self) -> None:
        """保存数据到 JSON 文件"""
        try:
            # 确保目录存在
            self.storage_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            
            logger.debug("知识图谱数据已保存")
            
        except Exception as e:
            logger.error(f"保存知识图谱失败: {e}")
            raise
    
    def export_to_json(self, output_path: str) -> bool:
        """
        导出知识图谱为 JSON 格式
        
        Args:
            output_path: 输出文件路径
            
        Returns:
            是否导出成功
        """
        try:
            output_file = Path(output_path)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"知识图谱已导出到: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"导出知识图谱失败: {e}")
            return False
    
    def import_from_json(self, input_path: str) -> bool:
        """
        从 JSON 文件导入知识图谱
        
        Args:
            input_path: 输入文件路径
            
        Returns:
            是否导入成功
        """
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                raise FileNotFoundError(f"文件不存在: {input_path}")
            
            with open(input_file, 'r', encoding='utf-8') as f:
                imported_data = json.load(f)
            
            # 验证数据格式
            required_keys = ["experiment_types", "equipment", "materials", "indicators", "steps"]
            for key in required_keys:
                if key not in imported_data:
                    raise ValueError(f"缺少必需字段: {key}")
            
            # 更新数据
            self.data = imported_data
            self._build_indexes()
            self._save_data()
            
            logger.info(f"知识图谱已从 {input_path} 导入")
            return True
            
        except Exception as e:
            logger.error(f"导入知识图谱失败: {e}")
            return False
    
    def get_all_experiment_types(self) -> List[ExperimentType]:
        """获取所有实验类型"""
        return list(self._experiment_types.values())
    
    def get_statistics(self) -> Dict[str, int]:
        """获取知识图谱统计信息"""
        return {
            "experiment_types": len(self._experiment_types),
            "equipment": len(self._equipment),
            "materials": len(self._materials),
            "indicators": len(self._indicators),
            "steps": len(self._steps)
        }


# 全局单例实例
_knowledge_graph_instance: Optional[KnowledgeGraph] = None


def get_knowledge_graph() -> KnowledgeGraph:
    """获取知识图谱单例实例"""
    global _knowledge_graph_instance
    if _knowledge_graph_instance is None:
        _knowledge_graph_instance = KnowledgeGraph()
    return _knowledge_graph_instance
