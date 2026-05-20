"""
解析器词典管理器 - 本地轻量化 AI 智能体

负责管理 NLP 解析器使用的词典，包括：
- 关键词列表（实验目的、样品类型、指标等）
- 正则表达式模式（时间、数值等）
- 词典的 CRUD 操作
"""

import json
import re
from typing import List, Dict, Any, Optional, Set
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class ParserDictionary:
    """解析器词典管理器"""
    
    def __init__(self, dictionary_path: Optional[str] = None):
        """
        初始化解析器词典
        
        Args:
            dictionary_path: 词典 JSON 文件路径，默认为 app/agent/data/parser_dictionary.json
        """
        if dictionary_path is None:
            # 默认路径
            current_dir = Path(__file__).parent
            dictionary_path = current_dir / "data" / "parser_dictionary.json"
        
        self.dictionary_path = Path(dictionary_path)
        self.data: Dict[str, Any] = {}
        
        # 编译后的正则表达式缓存
        self._time_patterns: List[re.Pattern] = []
        self._value_patterns: List[re.Pattern] = []
        
        # 加载词典
        self._load_dictionary()
    
    def _load_dictionary(self) -> None:
        """从 JSON 文件加载词典"""
        try:
            if not self.dictionary_path.exists():
                logger.warning(f"词典文件不存在: {self.dictionary_path}")
                self.data = {}
                return
            
            with open(self.dictionary_path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            
            # 编译正则表达式
            self._compile_patterns()
            
            logger.info("成功加载解析器词典")
            
        except Exception as e:
            logger.error(f"加载解析器词典失败: {e}")
            raise
    
    def _compile_patterns(self) -> None:
        """编译正则表达式模式"""
        self._time_patterns = []
        for pattern in self.data.get("time_patterns", []):
            try:
                self._time_patterns.append(re.compile(pattern))
            except re.error as e:
                logger.warning(f"无效的时间正则模式: {pattern}, 错误: {e}")
        
        self._value_patterns = []
        for pattern in self.data.get("value_patterns", []):
            try:
                self._value_patterns.append(re.compile(pattern))
            except re.error as e:
                logger.warning(f"无效的数值正则模式: {pattern}, 错误: {e}")
    
    def get_purpose_keywords(self) -> List[str]:
        """获取实验目的关键词列表"""
        return self.data.get("purpose_keywords", [])
    
    def get_sample_type_keywords(self) -> Dict[str, List[str]]:
        """获取样品类型关键词字典"""
        return self.data.get("sample_type_keywords", {})
    
    def get_indicator_keywords(self) -> Dict[str, List[str]]:
        """获取检测指标关键词字典"""
        return self.data.get("indicator_keywords", {})
    
    def get_equipment_keywords(self) -> List[str]:
        """获取设备关键词列表"""
        return self.data.get("equipment_keywords", [])
    
    def get_material_keywords(self) -> List[str]:
        """获取材料关键词列表"""
        return self.data.get("material_keywords", [])
    
    def get_action_keywords(self) -> Dict[str, List[str]]:
        """获取动作关键词字典"""
        return self.data.get("action_keywords", {})
    
    def get_safety_keywords(self) -> List[str]:
        """获取安全关键词列表"""
        return self.data.get("safety_keywords", [])
    
    def get_experiment_type_mapping(self) -> Dict[str, str]:
        """获取实验类型映射"""
        return self.data.get("experiment_type_mapping", {})
    
    def match_sample_type(self, text: str) -> Optional[str]:
        """
        匹配样品类型
        
        Args:
            text: 输入文本
            
        Returns:
            匹配的样品类型，如果没有匹配返回 None
        """
        sample_types = self.get_sample_type_keywords()
        text_lower = text.lower()
        
        for sample_type, keywords in sample_types.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    return sample_type
        
        return None
    
    def match_indicators(self, text: str) -> List[str]:
        """
        匹配检测指标
        
        Args:
            text: 输入文本
            
        Returns:
            匹配的指标列表
        """
        indicators = []
        indicator_groups = self.get_indicator_keywords()
        text_lower = text.lower()
        
        for group_name, keywords in indicator_groups.items():
            for keyword in keywords:
                if keyword.lower() in text_lower:
                    # 添加具体指标
                    if keyword not in indicators:
                        indicators.append(keyword)
        
        return indicators
    
    def match_equipment(self, text: str) -> List[str]:
        """
        匹配设备
        
        Args:
            text: 输入文本
            
        Returns:
            匹配的设备列表
        """
        equipment = []
        keywords = self.get_equipment_keywords()
        text_lower = text.lower()
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                if keyword not in equipment:
                    equipment.append(keyword)
        
        return equipment
    
    def match_materials(self, text: str) -> List[str]:
        """
        匹配材料
        
        Args:
            text: 输入文本
            
        Returns:
            匹配的材料列表
        """
        materials = []
        keywords = self.get_material_keywords()
        text_lower = text.lower()
        
        for keyword in keywords:
            if keyword.lower() in text_lower:
                if keyword not in materials:
                    materials.append(keyword)
        
        return materials
    
    def extract_time(self, text: str) -> List[str]:
        """
        提取时间表达式
        
        Args:
            text: 输入文本
            
        Returns:
            提取的时间表达式列表
        """
        time_expressions = []
        
        for pattern in self._time_patterns:
            matches = pattern.findall(text)
            for match in matches:
                if isinstance(match, tuple):
                    # 处理多个捕获组
                    time_expr = ''.join(str(m) for m in match if m)
                else:
                    time_expr = match
                
                if time_expr and time_expr not in time_expressions:
                    time_expressions.append(time_expr)
        
        return time_expressions
    
    def extract_values(self, text: str) -> List[str]:
        """
        提取数值表达式
        
        Args:
            text: 输入文本
            
        Returns:
            提取的数值表达式列表
        """
        value_expressions = []
        
        for pattern in self._value_patterns:
            matches = pattern.findall(text)
            for match in matches:
                if isinstance(match, tuple):
                    # 处理多个捕获组
                    value_expr = ''.join(str(m) for m in match if m)
                else:
                    value_expr = match
                
                if value_expr and value_expr not in value_expressions:
                    value_expressions.append(value_expr)
        
        return value_expressions
    
    def match_experiment_type(self, text: str) -> Optional[str]:
        """
        匹配实验类型
        
        Args:
            text: 输入文本
            
        Returns:
            实验类型 ID，如果没有匹配返回 None
        """
        mapping = self.get_experiment_type_mapping()
        text_lower = text.lower()
        
        for keyword, exp_type_id in mapping.items():
            if keyword.lower() in text_lower:
                return exp_type_id
        
        return None
    
    def add_keyword(self, category: str, keyword: str, subcategory: Optional[str] = None) -> bool:
        """
        添加关键词
        
        Args:
            category: 类别（如 "purpose_keywords", "equipment_keywords", "sample_type_keywords"）
            keyword: 关键词
            subcategory: 子类别（用于字典类型的类别，如 "水样"、"重金属"）
            
        Returns:
            是否添加成功
        """
        try:
            if category not in self.data:
                # 根据类别名称判断应该创建列表还是字典
                if any(x in category for x in ['type', 'indicator', 'action', 'category', 'mapping']):
                    self.data[category] = {}
                else:
                    self.data[category] = []
            
            # 处理列表类型的类别
            if isinstance(self.data[category], list):
                if keyword not in self.data[category]:
                    self.data[category].append(keyword)
                    self._save_dictionary()
                    logger.info(f"添加关键词: {category} -> {keyword}")
                    return True
                else:
                    logger.info(f"关键词已存在: {category} -> {keyword}")
                    return True
            
            # 处理字典类型的类别
            elif isinstance(self.data[category], dict):
                if subcategory is None:
                    logger.warning(f"字典类型的类别 {category} 需要提供 subcategory 参数")
                    return False
                
                if subcategory not in self.data[category]:
                    self.data[category][subcategory] = []
                
                if keyword not in self.data[category][subcategory]:
                    self.data[category][subcategory].append(keyword)
                    self._save_dictionary()
                    logger.info(f"添加关键词: {category}.{subcategory} -> {keyword}")
                    return True
                else:
                    logger.info(f"关键词已存在: {category}.{subcategory} -> {keyword}")
                    return True
            
            else:
                logger.warning(f"类别 {category} 类型不支持: {type(self.data[category])}")
                return False
            
        except Exception as e:
            logger.error(f"添加关键词失败: {e}")
            return False
    
    def remove_keyword(self, category: str, keyword: str, subcategory: Optional[str] = None) -> bool:
        """
        删除关键词
        
        Args:
            category: 类别
            keyword: 关键词
            subcategory: 子类别（用于字典类型的类别）
            
        Returns:
            是否删除成功
        """
        try:
            if category not in self.data:
                logger.warning(f"类别不存在: {category}")
                return False
            
            # 处理列表类型的类别
            if isinstance(self.data[category], list):
                if keyword in self.data[category]:
                    self.data[category].remove(keyword)
                    self._save_dictionary()
                    logger.info(f"删除关键词: {category} -> {keyword}")
                    return True
                else:
                    logger.warning(f"关键词不存在: {category} -> {keyword}")
                    return False
            
            # 处理字典类型的类别
            elif isinstance(self.data[category], dict):
                if subcategory is None:
                    logger.warning(f"字典类型的类别 {category} 需要提供 subcategory 参数")
                    return False
                
                if subcategory not in self.data[category]:
                    logger.warning(f"子类别不存在: {category}.{subcategory}")
                    return False
                
                if keyword in self.data[category][subcategory]:
                    self.data[category][subcategory].remove(keyword)
                    self._save_dictionary()
                    logger.info(f"删除关键词: {category}.{subcategory} -> {keyword}")
                    return True
                else:
                    logger.warning(f"关键词不存在: {category}.{subcategory} -> {keyword}")
                    return False
            
            else:
                logger.warning(f"类别 {category} 类型不支持: {type(self.data[category])}")
                return False
            
        except Exception as e:
            logger.error(f"删除关键词失败: {e}")
            return False
    
    def update_pattern(self, pattern_type: str, old_pattern: str, new_pattern: str) -> bool:
        """
        更新正则模式
        
        Args:
            pattern_type: 模式类型（"time_patterns" 或 "value_patterns"）
            old_pattern: 旧模式
            new_pattern: 新模式
            
        Returns:
            是否更新成功
        """
        try:
            if pattern_type not in self.data:
                logger.warning(f"模式类型不存在: {pattern_type}")
                return False
            
            # 验证新模式
            try:
                re.compile(new_pattern)
            except re.error as e:
                logger.error(f"无效的正则模式: {new_pattern}, 错误: {e}")
                return False
            
            if old_pattern in self.data[pattern_type]:
                index = self.data[pattern_type].index(old_pattern)
                self.data[pattern_type][index] = new_pattern
                self._compile_patterns()
                self._save_dictionary()
                logger.info(f"更新正则模式: {pattern_type}")
                return True
            else:
                logger.warning(f"旧模式不存在: {old_pattern}")
                return False
            
        except Exception as e:
            logger.error(f"更新正则模式失败: {e}")
            return False
    
    def add_pattern(self, pattern_type: str, pattern: str) -> bool:
        """
        添加正则模式
        
        Args:
            pattern_type: 模式类型（"time_patterns" 或 "value_patterns"）
            pattern: 正则模式
            
        Returns:
            是否添加成功
        """
        try:
            # 验证模式
            try:
                re.compile(pattern)
            except re.error as e:
                logger.error(f"无效的正则模式: {pattern}, 错误: {e}")
                return False
            
            if pattern_type not in self.data:
                self.data[pattern_type] = []
            
            if pattern not in self.data[pattern_type]:
                self.data[pattern_type].append(pattern)
                self._compile_patterns()
                self._save_dictionary()
                logger.info(f"添加正则模式: {pattern_type} -> {pattern}")
                return True
            else:
                logger.info(f"模式已存在: {pattern}")
                return True
            
        except Exception as e:
            logger.error(f"添加正则模式失败: {e}")
            return False
    
    def remove_pattern(self, pattern_type: str, pattern: str) -> bool:
        """
        删除正则模式
        
        Args:
            pattern_type: 模式类型（"time_patterns" 或 "value_patterns"）
            pattern: 正则模式
            
        Returns:
            是否删除成功
        """
        try:
            if pattern_type not in self.data:
                logger.warning(f"模式类型不存在: {pattern_type}")
                return False
            
            if pattern in self.data[pattern_type]:
                self.data[pattern_type].remove(pattern)
                self._compile_patterns()
                self._save_dictionary()
                logger.info(f"删除正则模式: {pattern_type} -> {pattern}")
                return True
            else:
                logger.warning(f"模式不存在: {pattern}")
                return False
            
        except Exception as e:
            logger.error(f"删除正则模式失败: {e}")
            return False
    
    def add_subcategory(self, category: str, subcategory: str) -> bool:
        """
        添加子类别（用于字典类型的类别）
        
        Args:
            category: 类别名称
            subcategory: 子类别名称
            
        Returns:
            是否添加成功
        """
        try:
            if category not in self.data:
                self.data[category] = {}
            
            if not isinstance(self.data[category], dict):
                logger.warning(f"类别 {category} 不是字典类型")
                return False
            
            if subcategory not in self.data[category]:
                self.data[category][subcategory] = []
                self._save_dictionary()
                logger.info(f"添加子类别: {category}.{subcategory}")
                return True
            else:
                logger.info(f"子类别已存在: {category}.{subcategory}")
                return True
            
        except Exception as e:
            logger.error(f"添加子类别失败: {e}")
            return False
    
    def remove_subcategory(self, category: str, subcategory: str) -> bool:
        """
        删除子类别（用于字典类型的类别）
        
        Args:
            category: 类别名称
            subcategory: 子类别名称
            
        Returns:
            是否删除成功
        """
        try:
            if category not in self.data:
                logger.warning(f"类别不存在: {category}")
                return False
            
            if not isinstance(self.data[category], dict):
                logger.warning(f"类别 {category} 不是字典类型")
                return False
            
            if subcategory in self.data[category]:
                del self.data[category][subcategory]
                self._save_dictionary()
                logger.info(f"删除子类别: {category}.{subcategory}")
                return True
            else:
                logger.warning(f"子类别不存在: {category}.{subcategory}")
                return False
            
        except Exception as e:
            logger.error(f"删除子类别失败: {e}")
            return False
    
    def add_mapping(self, category: str, key: str, value: str) -> bool:
        """
        添加映射关系（用于 experiment_type_mapping 等）
        
        Args:
            category: 类别名称（如 "experiment_type_mapping"）
            key: 映射键
            value: 映射值
            
        Returns:
            是否添加成功
        """
        try:
            if category not in self.data:
                self.data[category] = {}
            
            if not isinstance(self.data[category], dict):
                logger.warning(f"类别 {category} 不是字典类型")
                return False
            
            self.data[category][key] = value
            self._save_dictionary()
            logger.info(f"添加映射: {category}[{key}] = {value}")
            return True
            
        except Exception as e:
            logger.error(f"添加映射失败: {e}")
            return False
    
    def remove_mapping(self, category: str, key: str) -> bool:
        """
        删除映射关系
        
        Args:
            category: 类别名称
            key: 映射键
            
        Returns:
            是否删除成功
        """
        try:
            if category not in self.data:
                logger.warning(f"类别不存在: {category}")
                return False
            
            if not isinstance(self.data[category], dict):
                logger.warning(f"类别 {category} 不是字典类型")
                return False
            
            if key in self.data[category]:
                del self.data[category][key]
                self._save_dictionary()
                logger.info(f"删除映射: {category}[{key}]")
                return True
            else:
                logger.warning(f"映射键不存在: {category}[{key}]")
                return False
            
        except Exception as e:
            logger.error(f"删除映射失败: {e}")
            return False
    
    def _save_dictionary(self) -> None:
        """保存词典到 JSON 文件"""
        try:
            # 确保目录存在
            self.dictionary_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.dictionary_path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, ensure_ascii=False, indent=2)
            
            logger.debug("解析器词典已保存")
            
        except Exception as e:
            logger.error(f"保存解析器词典失败: {e}")
            raise
    
    def export_to_json(self, output_path: str) -> bool:
        """
        导出词典为 JSON 格式
        
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
            
            logger.info(f"解析器词典已导出到: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"导出解析器词典失败: {e}")
            return False
    
    def import_from_json(self, input_path: str) -> bool:
        """
        从 JSON 文件导入词典
        
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
            
            # 更新数据
            self.data = imported_data
            self._compile_patterns()
            self._save_dictionary()
            
            logger.info(f"解析器词典已从 {input_path} 导入")
            return True
            
        except Exception as e:
            logger.error(f"导入解析器词典失败: {e}")
            return False


# 全局单例实例
_parser_dictionary_instance: Optional[ParserDictionary] = None


def get_parser_dictionary() -> ParserDictionary:
    """获取解析器词典单例实例"""
    global _parser_dictionary_instance
    if _parser_dictionary_instance is None:
        _parser_dictionary_instance = ParserDictionary()
    return _parser_dictionary_instance
