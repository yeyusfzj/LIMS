"""
自定义异常 - 本地轻量化 AI 智能体

定义智能体模块的自定义异常类，提供友好的错误提示
"""


class AgentException(Exception):
    """智能体基础异常类"""
    
    def __init__(self, message: str, error_code: str, suggestion: str = ""):
        """
        初始化异常
        
        Args:
            message: 错误消息
            error_code: 错误代码
            suggestion: 建议的解决方案
        """
        self.message = message
        self.error_code = error_code
        self.suggestion = suggestion
        super().__init__(self.message)
    
    def to_dict(self):
        """转换为字典格式"""
        return {
            "success": False,
            "error": self.message,
            "error_code": self.error_code,
            "suggestion": self.suggestion
        }


class ParseException(AgentException):
    """解析异常"""
    
    def __init__(self, message: str, suggestion: str = ""):
        """
        初始化解析异常
        
        Args:
            message: 错误消息
            suggestion: 建议的解决方案
        """
        super().__init__(
            message=message,
            error_code="PARSE_FAILED",
            suggestion=suggestion or "请确保文本包含实验目的、样品类型等关键信息"
        )


class EmptyInputException(AgentException):
    """空输入异常"""
    
    def __init__(self):
        """初始化空输入异常"""
        super().__init__(
            message="输入文本不能为空",
            error_code="INVALID_INPUT",
            suggestion="请输入包含实验需求的文本"
        )


class LowConfidenceException(AgentException):
    """低置信度异常"""
    
    def __init__(self, confidence: float, parsed_fields: dict):
        """
        初始化低置信度异常
        
        Args:
            confidence: 解析置信度
            parsed_fields: 已解析的字段
        """
        self.confidence = confidence
        self.parsed_fields = parsed_fields
        
        super().__init__(
            message=f"解析置信度过低 ({confidence:.2f})，可能无法准确识别实验信息",
            error_code="LOW_CONFIDENCE",
            suggestion="请提供更详细的实验描述，包括实验目的、样品类型、检测指标等信息"
        )
    
    def to_dict(self):
        """转换为字典格式，包含部分解析结果"""
        result = super().to_dict()
        result["confidence"] = self.confidence
        result["partial_result"] = self.parsed_fields
        return result


class UnrecognizedTextException(AgentException):
    """无法识别文本异常"""
    
    def __init__(self):
        """初始化无法识别文本异常"""
        super().__init__(
            message="无法从输入文本中识别实验信息",
            error_code="UNRECOGNIZED_TEXT",
            suggestion="请使用更清晰的描述，例如：'我需要检测水样中的重金属含量'"
        )


class KnowledgeGraphException(AgentException):
    """知识图谱异常"""
    
    def __init__(self, message: str, suggestion: str = ""):
        """
        初始化知识图谱异常
        
        Args:
            message: 错误消息
            suggestion: 建议的解决方案
        """
        super().__init__(
            message=message,
            error_code="KNOWLEDGE_GRAPH_ERROR",
            suggestion=suggestion or "请检查知识图谱数据是否正确加载"
        )


class PlanGenerationException(AgentException):
    """实验计划生成异常"""
    
    def __init__(self, message: str, suggestion: str = ""):
        """
        初始化实验计划生成异常
        
        Args:
            message: 错误消息
            suggestion: 建议的解决方案
        """
        super().__init__(
            message=message,
            error_code="PLAN_GENERATION_FAILED",
            suggestion=suggestion or "请确保提供了完整的实验信息"
        )


class AnalysisException(AgentException):
    """结果分析异常"""
    
    def __init__(self, message: str, suggestion: str = ""):
        """
        初始化结果分析异常
        
        Args:
            message: 错误消息
            suggestion: 建议的解决方案
        """
        super().__init__(
            message=message,
            error_code="ANALYSIS_FAILED",
            suggestion=suggestion or "请检查输入的结果数据格式是否正确"
        )
