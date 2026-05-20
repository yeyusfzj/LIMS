"""
规则引擎 - 本地轻量化 AI 智能体

规则引擎用于评估实验结果数据，支持多种规则类型：
- 阈值规则（threshold）：检查数值是否在指定范围内
- 范围规则（range）：检查数值是否在最小值和最大值之间
- 枚举规则（enum）：检查值是否在允许的枚举列表中
- 逻辑组合规则（logic）：支持 AND/OR 逻辑组合多个规则

验证需求：需求 6.2, 11.1-11.10
"""

import json
import os
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from enum import Enum

# 从 models.py 导入 Threshold 类
from .models import Threshold


class RuleType(str, Enum):
    """规则类型枚举"""
    THRESHOLD = "threshold"
    RANGE = "range"
    ENUM = "enum"
    LOGIC = "logic"


class SeverityLevel(str, Enum):
    """严重程度枚举"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class LogicOperator(str, Enum):
    """逻辑运算符"""
    AND = "and"
    OR = "or"


@dataclass
class Rule:
    """规则定义"""
    id: str
    name: str
    indicator: str
    type: str  # "threshold", "range", "enum", "logic"
    threshold: Optional[Threshold] = None
    range_config: Optional[Dict[str, float]] = None
    enum_values: Optional[List[Any]] = None
    logic_config: Optional[Dict[str, Any]] = None
    severity: str = "medium"  # "low", "medium", "high"
    message: str = ""
    suggestion: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        result = {
            "id": self.id,
            "name": self.name,
            "indicator": self.indicator,
            "type": self.type,
            "severity": self.severity,
            "message": self.message,
            "suggestion": self.suggestion
        }
        
        if self.threshold:
            result["threshold"] = self.threshold.to_dict()
        if self.range_config:
            result["range"] = self.range_config
        if self.enum_values:
            result["enum_values"] = self.enum_values
        if self.logic_config:
            result["logic"] = self.logic_config
            
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Rule':
        """从字典创建实例"""
        threshold = None
        if "threshold" in data:
            threshold = Threshold.from_dict(data["threshold"])
        
        return cls(
            id=data["id"],
            name=data["name"],
            indicator=data["indicator"],
            type=data["type"],
            threshold=threshold,
            range_config=data.get("range"),
            enum_values=data.get("enum_values"),
            logic_config=data.get("logic"),
            severity=data.get("severity", "medium"),
            message=data.get("message", ""),
            suggestion=data.get("suggestion", "")
        )


@dataclass
class RuleResult:
    """规则评估结果"""
    rule_id: str
    passed: bool
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)


class RuleEngine:
    """
    规则引擎
    
    负责加载、管理和评估规则配置。支持多种规则类型：
    - threshold: 阈值规则
    - range: 范围规则
    - enum: 枚举规则
    - logic: 逻辑组合规则
    
    验证需求：需求 6.2, 11.1-11.10
    """
    
    def __init__(self, rules_config_path: Optional[str] = None):
        """
        初始化规则引擎
        
        Args:
            rules_config_path: 规则配置文件路径，如果为 None 则使用默认路径
        
        验证需求：需求 6.2
        """
        if rules_config_path is None:
            # 使用默认路径
            current_dir = os.path.dirname(os.path.abspath(__file__))
            rules_config_path = os.path.join(current_dir, "data", "rules_config.json")
        
        self.rules_config_path = rules_config_path
        self.rules: Dict[str, Rule] = {}
        self._load_rules()
    
    def _load_rules(self) -> None:
        """
        从 JSON 文件加载规则配置
        
        如果文件不存在，创建一个空的规则配置
        """
        try:
            if os.path.exists(self.rules_config_path):
                with open(self.rules_config_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    rules_list = data.get("rules", [])
                    
                    for rule_data in rules_list:
                        rule = Rule.from_dict(rule_data)
                        self.rules[rule.id] = rule
                    
                    print(f"✓ 成功加载 {len(self.rules)} 条规则")
            else:
                # 创建空的规则配置文件
                self._create_empty_config()
                print(f"✓ 创建空的规则配置文件: {self.rules_config_path}")
        
        except Exception as e:
            print(f"✗ 加载规则配置失败: {str(e)}")
            self.rules = {}
    
    def _create_empty_config(self) -> None:
        """创建空的规则配置文件"""
        os.makedirs(os.path.dirname(self.rules_config_path), exist_ok=True)
        
        empty_config = {
            "rules": [],
            "version": "1.0",
            "description": "规则引擎配置文件"
        }
        
        with open(self.rules_config_path, 'w', encoding='utf-8') as f:
            json.dump(empty_config, f, ensure_ascii=False, indent=2)
    
    def evaluate(self, data: Dict[str, Any], rule_id: str) -> RuleResult:
        """
        评估单个规则
        
        Args:
            data: 要评估的数据字典，格式为 {indicator_name: value}
            rule_id: 规则 ID
        
        Returns:
            RuleResult: 规则评估结果
        
        验证需求：需求 6.3-6.5, 11.1-11.4
        """
        if rule_id not in self.rules:
            return RuleResult(
                rule_id=rule_id,
                passed=False,
                message=f"规则 {rule_id} 不存在",
                details={"error": "rule_not_found"}
            )
        
        rule = self.rules[rule_id]
        
        # 逻辑规则不需要检查指标是否存在，直接评估子规则
        if rule.type == RuleType.LOGIC:
            return self._evaluate_logic(rule, data)
        
        # 其他规则类型需要检查指标是否存在于数据中
        if rule.indicator not in data:
            return RuleResult(
                rule_id=rule_id,
                passed=False,
                message=f"数据中缺少指标: {rule.indicator}",
                details={"error": "indicator_not_found"}
            )
        
        value = data[rule.indicator]
        
        # 根据规则类型进行评估
        if rule.type == RuleType.THRESHOLD:
            return self._evaluate_threshold(rule, value)
        elif rule.type == RuleType.RANGE:
            return self._evaluate_range(rule, value)
        elif rule.type == RuleType.ENUM:
            return self._evaluate_enum(rule, value)
        else:
            return RuleResult(
                rule_id=rule_id,
                passed=False,
                message=f"不支持的规则类型: {rule.type}",
                details={"error": "unsupported_rule_type"}
            )
    
    def _evaluate_threshold(self, rule: Rule, value: Any) -> RuleResult:
        """
        评估阈值规则
        
        验证需求：需求 11.1
        """
        if rule.threshold is None:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message="阈值配置缺失",
                details={"error": "threshold_config_missing"}
            )
        
        try:
            numeric_value = float(value)
        except (ValueError, TypeError):
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message=f"无法将值转换为数字: {value}",
                details={"error": "invalid_numeric_value", "value": value}
            )
        
        passed = rule.threshold.is_within(numeric_value)
        
        return RuleResult(
            rule_id=rule.id,
            passed=passed,
            message=rule.message if not passed else "检测正常",
            details={
                "value": numeric_value,
                "threshold_min": rule.threshold.min,
                "threshold_max": rule.threshold.max,
                "unit": rule.threshold.unit,
                "severity": rule.severity,
                "suggestion": rule.suggestion if not passed else ""
            }
        )
    
    def _evaluate_range(self, rule: Rule, value: Any) -> RuleResult:
        """
        评估范围规则
        
        验证需求：需求 11.2
        """
        if rule.range_config is None:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message="范围配置缺失",
                details={"error": "range_config_missing"}
            )
        
        try:
            numeric_value = float(value)
        except (ValueError, TypeError):
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message=f"无法将值转换为数字: {value}",
                details={"error": "invalid_numeric_value", "value": value}
            )
        
        min_val = rule.range_config.get("min", float('-inf'))
        max_val = rule.range_config.get("max", float('inf'))
        
        passed = min_val <= numeric_value <= max_val
        
        return RuleResult(
            rule_id=rule.id,
            passed=passed,
            message=rule.message if not passed else "检测正常",
            details={
                "value": numeric_value,
                "range_min": min_val,
                "range_max": max_val,
                "severity": rule.severity,
                "suggestion": rule.suggestion if not passed else ""
            }
        )
    
    def _evaluate_enum(self, rule: Rule, value: Any) -> RuleResult:
        """
        评估枚举规则
        
        验证需求：需求 11.3
        """
        if rule.enum_values is None:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message="枚举值配置缺失",
                details={"error": "enum_config_missing"}
            )
        
        passed = value in rule.enum_values
        
        return RuleResult(
            rule_id=rule.id,
            passed=passed,
            message=rule.message if not passed else "检测正常",
            details={
                "value": value,
                "allowed_values": rule.enum_values,
                "severity": rule.severity,
                "suggestion": rule.suggestion if not passed else ""
            }
        )
    
    def _evaluate_logic(self, rule: Rule, data: Dict[str, Any]) -> RuleResult:
        """
        评估逻辑组合规则
        
        验证需求：需求 11.4
        """
        if rule.logic_config is None:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message="逻辑配置缺失",
                details={"error": "logic_config_missing"}
            )
        
        operator = rule.logic_config.get("operator", "and").lower()
        sub_rule_ids = rule.logic_config.get("rules", [])
        
        if not sub_rule_ids:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message="逻辑规则缺少子规则",
                details={"error": "no_sub_rules"}
            )
        
        # 评估所有子规则
        sub_results = []
        for sub_rule_id in sub_rule_ids:
            sub_result = self.evaluate(data, sub_rule_id)
            sub_results.append(sub_result)
        
        # 根据逻辑运算符计算结果
        if operator == LogicOperator.AND:
            passed = all(r.passed for r in sub_results)
        elif operator == LogicOperator.OR:
            passed = any(r.passed for r in sub_results)
        else:
            return RuleResult(
                rule_id=rule.id,
                passed=False,
                message=f"不支持的逻辑运算符: {operator}",
                details={"error": "unsupported_operator"}
            )
        
        return RuleResult(
            rule_id=rule.id,
            passed=passed,
            message=rule.message if not passed else "检测正常",
            details={
                "operator": operator,
                "sub_results": [r.to_dict() for r in sub_results],
                "severity": rule.severity,
                "suggestion": rule.suggestion if not passed else ""
            }
        )
    
    def add_rule(self, rule: Rule) -> bool:
        """
        添加新规则
        
        Args:
            rule: 规则对象
        
        Returns:
            bool: 是否添加成功
        
        验证需求：需求 11.5
        """
        # 验证规则
        if not self._validate_rule(rule):
            return False
        
        # 添加到内存
        self.rules[rule.id] = rule
        
        # 持久化到文件
        return self._save_rules()
    
    def update_threshold(self, indicator: str, threshold: Threshold) -> bool:
        """
        更新指标的阈值
        
        Args:
            indicator: 指标名称
            threshold: 新的阈值配置
        
        Returns:
            bool: 是否更新成功
        
        验证需求：需求 11.6
        """
        # 查找该指标的规则
        updated = False
        for rule in self.rules.values():
            if rule.indicator == indicator and rule.type == RuleType.THRESHOLD:
                # 验证阈值有效性
                if not self._validate_threshold(threshold):
                    return False
                
                rule.threshold = threshold
                updated = True
        
        if not updated:
            return False
        
        # 持久化到文件
        return self._save_rules()
    
    def _validate_rule(self, rule: Rule) -> bool:
        """
        验证规则语法
        
        验证需求：需求 11.5
        """
        # 检查必需字段
        if not rule.id or not rule.name or not rule.indicator:
            print("✗ 规则验证失败: 缺少必需字段")
            return False
        
        # 检查规则类型
        if rule.type not in [t.value for t in RuleType]:
            print(f"✗ 规则验证失败: 不支持的规则类型 {rule.type}")
            return False
        
        # 根据类型验证配置
        if rule.type == RuleType.THRESHOLD:
            if rule.threshold is None:
                print("✗ 规则验证失败: 阈值规则缺少 threshold 配置")
                return False
            if not self._validate_threshold(rule.threshold):
                return False
        
        elif rule.type == RuleType.RANGE:
            if rule.range_config is None:
                print("✗ 规则验证失败: 范围规则缺少 range 配置")
                return False
            if "min" not in rule.range_config or "max" not in rule.range_config:
                print("✗ 规则验证失败: 范围配置缺少 min 或 max")
                return False
        
        elif rule.type == RuleType.ENUM:
            if rule.enum_values is None or len(rule.enum_values) == 0:
                print("✗ 规则验证失败: 枚举规则缺少 enum_values")
                return False
        
        elif rule.type == RuleType.LOGIC:
            if rule.logic_config is None:
                print("✗ 规则验证失败: 逻辑规则缺少 logic 配置")
                return False
            if "operator" not in rule.logic_config or "rules" not in rule.logic_config:
                print("✗ 规则验证失败: 逻辑配置缺少 operator 或 rules")
                return False
        
        # 检查严重程度
        if rule.severity not in [s.value for s in SeverityLevel]:
            print(f"✗ 规则验证失败: 不支持的严重程度 {rule.severity}")
            return False
        
        return True
    
    def _validate_threshold(self, threshold: Threshold) -> bool:
        """
        验证阈值有效性
        
        验证需求：需求 11.6
        """
        if threshold.min > threshold.max:
            print(f"✗ 阈值验证失败: min ({threshold.min}) 大于 max ({threshold.max})")
            return False
        
        return True
    
    def _save_rules(self) -> bool:
        """
        保存规则到文件
        
        验证需求：需求 11.10
        """
        try:
            rules_list = [rule.to_dict() for rule in self.rules.values()]
            
            config = {
                "rules": rules_list,
                "version": "1.0",
                "description": "规则引擎配置文件"
            }
            
            with open(self.rules_config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            
            return True
        
        except Exception as e:
            print(f"✗ 保存规则配置失败: {str(e)}")
            return False
    
    def export_to_json(self, output_path: str) -> bool:
        """
        导出规则配置为 JSON 格式
        
        Args:
            output_path: 输出文件路径
        
        Returns:
            bool: 是否导出成功
        
        验证需求：需求 11.7
        """
        try:
            rules_list = [rule.to_dict() for rule in self.rules.values()]
            
            config = {
                "rules": rules_list,
                "version": "1.0",
                "description": "规则引擎配置文件"
            }
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            
            print(f"✓ 成功导出规则配置到: {output_path}")
            return True
        
        except Exception as e:
            print(f"✗ 导出规则配置失败: {str(e)}")
            return False
    
    def import_from_json(self, input_path: str) -> bool:
        """
        从 JSON 文件导入规则配置
        
        Args:
            input_path: 输入文件路径
        
        Returns:
            bool: 是否导入成功
        
        验证需求：需求 11.8, 11.9
        """
        try:
            with open(input_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # 验证配置完整性
            if "rules" not in data:
                print("✗ 导入失败: 配置文件缺少 rules 字段")
                return False
            
            rules_list = data["rules"]
            new_rules = {}
            
            # 验证并加载每条规则
            for rule_data in rules_list:
                try:
                    rule = Rule.from_dict(rule_data)
                    
                    # 验证规则
                    if not self._validate_rule(rule):
                        print(f"✗ 导入失败: 规则 {rule.id} 验证失败")
                        return False
                    
                    new_rules[rule.id] = rule
                
                except Exception as e:
                    print(f"✗ 导入失败: 解析规则失败 - {str(e)}")
                    return False
            
            # 替换当前规则
            self.rules = new_rules
            
            # 保存到配置文件
            self._save_rules()
            
            print(f"✓ 成功导入 {len(self.rules)} 条规则")
            return True
        
        except FileNotFoundError:
            print(f"✗ 导入失败: 文件不存在 - {input_path}")
            return False
        except json.JSONDecodeError as e:
            print(f"✗ 导入失败: JSON 格式错误 - {str(e)}")
            return False
        except Exception as e:
            print(f"✗ 导入失败: {str(e)}")
            return False
    
    def get_rule(self, rule_id: str) -> Optional[Rule]:
        """
        获取指定规则
        
        Args:
            rule_id: 规则 ID
        
        Returns:
            Rule: 规则对象，如果不存在则返回 None
        """
        return self.rules.get(rule_id)
    
    def get_all_rules(self) -> List[Rule]:
        """
        获取所有规则
        
        Returns:
            List[Rule]: 规则列表
        """
        return list(self.rules.values())
    
    def get_rules_by_indicator(self, indicator: str) -> List[Rule]:
        """
        获取指定指标的所有规则
        
        Args:
            indicator: 指标名称
        
        Returns:
            List[Rule]: 规则列表
        """
        return [rule for rule in self.rules.values() if rule.indicator == indicator]
