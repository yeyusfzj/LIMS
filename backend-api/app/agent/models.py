"""
数据模型 - 本地轻量化 AI 智能体

定义所有核心数据结构，包括：
- ParsedFields: 解析后的结构化字段
- KnowledgeEntry: 知识图谱实体（设备、材料、指标、步骤、实验类型）
- ExperimentPlan: 实验计划
- AnalysisReport: 分析报告
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ==================== 解析字段模型 ====================

@dataclass
class ParsedFields:
    """解析后的结构化字段"""
    purpose: str = ""                    # 实验目的
    sample_type: str = ""                # 样品类型
    indicators: List[str] = field(default_factory=list)  # 检测指标
    equipment: List[str] = field(default_factory=list)   # 所需设备
    materials: List[str] = field(default_factory=list)   # 所需材料
    steps: List[str] = field(default_factory=list)       # 实验步骤
    estimated_time: str = ""             # 预计时间
    confidence: float = 0.0              # 解析置信度
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ParsedFields':
        """从字典创建实例"""
        return cls(**data)
    
    def is_valid(self) -> bool:
        """验证字段完整性"""
        return bool(self.purpose and self.sample_type)


# ==================== 知识图谱实体模型 ====================

@dataclass
class Equipment:
    """设备实体"""
    id: str
    name: str
    model: str = ""
    category: str = ""
    specifications: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Equipment':
        """从字典创建实例"""
        return cls(**data)


@dataclass
class Material:
    """材料实体"""
    id: str
    name: str
    concentration: str = ""
    cas_number: str = ""
    safety_level: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Material':
        """从字典创建实例"""
        return cls(**data)


@dataclass
class Indicator:
    """指标实体"""
    id: str
    name: str
    unit: str = ""
    method: str = ""
    threshold_min: Optional[float] = None
    threshold_max: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Indicator':
        """从字典创建实例"""
        return cls(**data)


@dataclass
class Step:
    """步骤实体"""
    id: str
    order: int
    title: str
    description: str
    duration: str = ""
    temperature: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Step':
        """从字典创建实例"""
        return cls(**data)


@dataclass
class ExperimentType:
    """实验类型实体"""
    id: str
    name: str
    category: str = ""
    equipment_ids: List[str] = field(default_factory=list)
    material_ids: List[str] = field(default_factory=list)
    indicator_ids: List[str] = field(default_factory=list)
    step_ids: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExperimentType':
        """从字典创建实例"""
        return cls(**data)


# ==================== 实验计划模型 ====================

@dataclass
class ExperimentPlan:
    """实验计划"""
    id: str
    purpose: str
    sample_type: str
    indicators: List[Indicator]
    equipment: List[Equipment]
    materials: List[Material]
    steps: List[Step]
    estimated_time: str
    safety_notes: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_simple_format(self) -> str:
        """
        转换为简洁格式（用于快速查看）
        
        Returns:
            简洁格式的实验方案文本
        """
        lines = []
        
        # 实验名称
        exp_name = "未知实验"
        if self.indicators:
            # 从指标推断实验名称
            indicator_names = [ind.name for ind in self.indicators[:3]]
            if any("重金属" in name or "铅" in name or "汞" in name or "镉" in name for name in indicator_names):
                exp_name = "水样重金属检测"
            elif any("有机" in name or "苯" in name for name in indicator_names):
                exp_name = "土壤有机物检测"
            elif any("PM" in name or "SO2" in name or "NO2" in name for name in indicator_names):
                exp_name = "空气质量检测"
        
        lines.append(f"实验名称：{exp_name}")
        lines.append(f"实验目的：{self.purpose}")
        
        # 检测指标
        if self.indicators:
            indicator_names = "、".join([ind.name for ind in self.indicators[:5]])
            if len(self.indicators) > 5:
                indicator_names += f"等{len(self.indicators)}项指标"
            lines.append(f"检测指标：{indicator_names}")
        
        # 样品类型
        lines.append(f"样品类型：{self.sample_type}")
        
        # 建议设备（最多3个）
        if self.equipment:
            equipment_names = "、".join([eq.name for eq in self.equipment[:3]])
            if len(self.equipment) > 3:
                equipment_names += f"等{len(self.equipment)}台设备"
            lines.append(f"建议设备：{equipment_names}")
        
        # 建议材料（最多3个）
        if self.materials:
            material_names = "、".join([mat.name for mat in self.materials[:3]])
            if len(self.materials) > 3:
                material_names += f"等{len(self.materials)}种材料"
            lines.append(f"建议材料：{material_names}")
        
        # 建议流程（简化步骤）
        if self.steps:
            lines.append("建议流程：")
            for i, step in enumerate(self.steps, 1):
                lines.append(f"{i}. {step.title}")
        
        # 风险提示
        if self.safety_notes:
            lines.append("风险提示：")
            for note in self.safety_notes[:2]:  # 最多显示2条
                lines.append(f"- {note}")
        
        # 添加通用风险提示
        if self.indicators:
            # 检查是否有阈值
            has_threshold = any(
                ind.threshold_max is not None 
                for ind in self.indicators
            )
            if has_threshold:
                lines.append("- 检测结果超标触发复测流程")
        
        return "\n".join(lines)
    
    def to_markdown(self) -> str:
        """转换为 Markdown 格式"""
        md = f"# 实验计划\n\n"
        md += f"## 1. 实验目的\n{self.purpose}\n\n"
        md += f"## 2. 样品信息\n- 样品类型：{self.sample_type}\n\n"
        
        md += f"## 3. 检测指标\n"
        for ind in self.indicators:
            md += f"- {ind.name}"
            if ind.unit:
                md += f" ({ind.unit})"
            if ind.method:
                md += f" - 方法：{ind.method}"
            md += "\n"
        md += "\n"
        
        md += f"## 4. 所需设备\n"
        for eq in self.equipment:
            md += f"- {eq.name}"
            if eq.model:
                md += f" (型号：{eq.model})"
            if eq.specifications:
                md += f"\n  - 规格：{eq.specifications}"
            md += "\n"
        md += "\n"
        
        md += f"## 5. 所需材料\n"
        for mat in self.materials:
            md += f"- {mat.name}"
            if mat.concentration:
                md += f" (浓度：{mat.concentration})"
            if mat.safety_level:
                md += f" - 安全等级：{mat.safety_level}"
            md += "\n"
        md += "\n"
        
        md += f"## 6. 实验步骤\n"
        for step in self.steps:
            md += f"### 步骤 {step.order}: {step.title}\n"
            md += f"{step.description}\n"
            if step.duration:
                md += f"- 时间：{step.duration}\n"
            if step.temperature:
                md += f"- 温度：{step.temperature}\n"
            md += "\n"
        
        md += f"## 7. 预计时间\n{self.estimated_time}\n\n"
        
        if self.safety_notes:
            md += f"## 8. 注意事项\n"
            for note in self.safety_notes:
                md += f"- {note}\n"
            md += "\n"
        
        return md
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "id": self.id,
            "purpose": self.purpose,
            "sample_type": self.sample_type,
            "indicators": [ind.to_dict() for ind in self.indicators],
            "equipment": [eq.to_dict() for eq in self.equipment],
            "materials": [mat.to_dict() for mat in self.materials],
            "steps": [step.to_dict() for step in self.steps],
            "estimated_time": self.estimated_time,
            "safety_notes": self.safety_notes,
            "created_at": self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ExperimentPlan':
        """从字典创建实例"""
        return cls(
            id=data["id"],
            purpose=data["purpose"],
            sample_type=data["sample_type"],
            indicators=[Indicator.from_dict(ind) for ind in data["indicators"]],
            equipment=[Equipment.from_dict(eq) for eq in data["equipment"]],
            materials=[Material.from_dict(mat) for mat in data["materials"]],
            steps=[Step.from_dict(step) for step in data["steps"]],
            estimated_time=data["estimated_time"],
            safety_notes=data.get("safety_notes", []),
            created_at=data.get("created_at", datetime.now().isoformat())
        )


# ==================== 分析报告模型 ====================

class SeverityLevel(str, Enum):
    """异常严重程度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ReportStatus(str, Enum):
    """报告状态"""
    NORMAL = "normal"
    WARNING = "warning"
    ERROR = "error"


@dataclass
class Anomaly:
    """异常信息"""
    indicator: str
    value: float
    threshold_min: Optional[float]
    threshold_max: Optional[float]
    severity: str  # "low", "medium", "high"
    message: str
    suggestion: str
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Anomaly':
        """从字典创建实例"""
        return cls(**data)


@dataclass
class AnalysisReport:
    """分析报告"""
    result_id: str
    status: str  # "normal", "warning", "error"
    anomalies: List[Anomaly] = field(default_factory=list)
    summary: str = ""
    analyzed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "result_id": self.result_id,
            "status": self.status,
            "anomalies": [anomaly.to_dict() for anomaly in self.anomalies],
            "summary": self.summary,
            "analyzed_at": self.analyzed_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AnalysisReport':
        """从字典创建实例"""
        return cls(
            result_id=data["result_id"],
            status=data["status"],
            anomalies=[Anomaly.from_dict(a) for a in data.get("anomalies", [])],
            summary=data.get("summary", ""),
            analyzed_at=data.get("analyzed_at", datetime.now().isoformat())
        )


# ==================== 阈值模型 ====================

@dataclass
class Threshold:
    """阈值配置"""
    min: float
    max: float
    unit: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Threshold':
        """从字典创建实例"""
        return cls(**data)
    
    def is_within(self, value: float) -> bool:
        """检查数值是否在阈值范围内"""
        return self.min <= value <= self.max
