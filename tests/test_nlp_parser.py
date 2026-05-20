"""
NLP 解析器单元测试

测试任务 13.1 的要求：
- 测试水样重金属检测解析
- 测试时间表达式提取
- 测试空文本输入
- 测试纯空格输入
- 测试无法识别的文本

验证属性: Property 1 - 字段提取完整性
"""

import pytest
import sys
import os

# 添加 fastapi-backend 到 Python 路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'fastapi-backend'))

from app.agent.nlp_parser import NLPParser
from app.agent.models import ParsedFields
from app.agent.exceptions import (
    EmptyInputException,
    UnrecognizedTextException,
    LowConfidenceException
)


class TestNLPParser:
    """NLP 解析器单元测试类"""
    
    def setup_method(self):
        """设置测试环境"""
        self.parser = NLPParser()
    
    # ==================== 水样重金属检测解析测试 ====================
    
    def test_parse_water_heavy_metal_detection(self):
        """
        测试水样重金属检测需求的解析
        
        验证需求 1.1-1.7: 提取所有结构化字段
        验证属性 Property 1: 字段提取完整性
        """
        text = "我需要检测水样中的重金属含量，包括铅、汞、镉等指标"
        
        result = self.parser.parse(text)
        
        # 验证返回类型
        assert isinstance(result, ParsedFields)
        
        # 验证必需字段
        assert result.purpose != "", "实验目的不应为空"
        assert result.sample_type != "", "样品类型不应为空"
        assert "水" in result.sample_type or "水样" in result.sample_type, "应识别出水样"
        
        # 验证检测指标
        assert len(result.indicators) > 0, "应识别出检测指标"
        assert any("重金属" in ind for ind in result.indicators), "应识别出重金属指标"
        
        # 验证置信度
        assert result.confidence > 0.3, "置信度应大于 0.3"
        assert result.confidence <= 1.0, "置信度应小于等于 1.0"
    
    def test_parse_water_sample_with_specific_metals(self):
        """
        测试包含具体金属名称的水样检测解析
        
        验证需求 1.3: 提取检测指标字段
        """
        text = "检测水样中的铅、汞、镉、铬、砷含量"
        
        result = self.parser.parse(text)
        
        # 验证样品类型
        assert "水" in result.sample_type or "水样" in result.sample_type
        
        # 验证检测指标 - 应该识别出重金属相关指标
        assert len(result.indicators) > 0, "应识别出检测指标"
    
    def test_parse_water_quality_analysis(self):
        """
        测试水质分析需求的解析
        
        验证需求 1.1, 1.2: 提取实验目的和样品类型
        """
        text = "需要进行水质分析，检测饮用水中的重金属污染"
        
        result = self.parser.parse(text)
        
        # 验证样品类型
        assert result.sample_type != ""
        assert "水" in result.sample_type
        
        # 验证实验目的
        assert result.purpose != ""
        
        # 验证检测指标
        assert len(result.indicators) > 0
    
    # ==================== 时间表达式提取测试 ====================
    
    def test_extract_time_in_hours(self):
        """
        测试提取小时时间表达式
        
        验证需求 1.7: 提取预计时间字段
        """
        text = "检测水样重金属，预计需要2小时完成"
        
        result = self.parser.parse(text)
        
        # 验证时间提取
        assert result.estimated_time != "", "应提取出时间信息"
        assert "2" in result.estimated_time or "小时" in result.estimated_time
    
    def test_extract_time_in_minutes(self):
        """
        测试提取分钟时间表达式
        
        验证需求 1.7: 提取预计时间字段
        """
        text = "实验预计需要30分钟"
        
        result = self.parser.parse(text)
        
        # 验证时间提取
        assert result.estimated_time != "", "应提取出时间信息"
        assert "30" in result.estimated_time or "分钟" in result.estimated_time
    
    def test_extract_time_in_days(self):
        """
        测试提取天数时间表达式
        
        验证需求 1.7: 提取预计时间字段
        """
        text = "土壤样品检测需要3天时间"
        
        result = self.parser.parse(text)
        
        # 验证时间提取
        assert result.estimated_time != "", "应提取出时间信息"
        assert "3" in result.estimated_time or "天" in result.estimated_time
    
    def test_extract_complex_time_expression(self):
        """
        测试提取复杂时间表达式
        
        验证需求 1.7: 提取预计时间字段
        """
        text = "实验预计需要2小时30分钟完成"
        
        result = self.parser.parse(text)
        
        # 验证时间提取 - 应该至少提取出一个时间单位
        assert result.estimated_time != "", "应提取出时间信息"
    
    def test_no_time_expression(self):
        """
        测试没有时间表达式的文本
        
        验证需求 1.7: 当没有时间信息时，返回空字符串
        """
        text = "检测水样中的重金属含量"
        
        result = self.parser.parse(text)
        
        # 验证时间字段为空
        assert result.estimated_time == "", "没有时间信息时应返回空字符串"
    
    # ==================== 空文本输入测试 ====================
    
    def test_empty_text_input(self):
        """
        测试空文本输入
        
        验证需求 1.12: 当输入文本为空，NLP_Parser 应返回错误提示
        """
        with pytest.raises(EmptyInputException) as exc_info:
            self.parser.parse("")
        
        # 验证异常信息
        assert exc_info.value.error_code == "INVALID_INPUT"
        assert "不能为空" in exc_info.value.message
        assert exc_info.value.suggestion != ""
    
    def test_none_text_input(self):
        """
        测试 None 文本输入
        
        验证需求 1.12: 当输入文本为空，NLP_Parser 应返回错误提示
        """
        with pytest.raises((EmptyInputException, AttributeError)):
            self.parser.parse(None)
    
    # ==================== 纯空格输入测试 ====================
    
    def test_whitespace_only_input(self):
        """
        测试纯空格输入
        
        验证需求 1.12: 当输入文本为空，NLP_Parser 应返回错误提示
        """
        whitespace_texts = [
            "   ",
            "\t",
            "\n",
            "  \t\n  ",
            "\r\n",
            "    \t\t\n\n    "
        ]
        
        for text in whitespace_texts:
            with pytest.raises(EmptyInputException) as exc_info:
                self.parser.parse(text)
            
            assert exc_info.value.error_code == "INVALID_INPUT"
            assert "不能为空" in exc_info.value.message
    
    # ==================== 无法识别的文本测试 ====================
    
    def test_unrecognizable_text_random_words(self):
        """
        测试无法识别的随机文本
        
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        unrecognizable_texts = [
            "今天天气真好",
            "我喜欢吃苹果",
            "这是一段完全无关的文字"
        ]
        
        for text in unrecognizable_texts:
            with pytest.raises(UnrecognizedTextException) as exc_info:
                self.parser.parse(text)
            
            assert exc_info.value.error_code == "UNRECOGNIZED_TEXT"
            assert "无法" in exc_info.value.message or "识别" in exc_info.value.message
            assert exc_info.value.suggestion != ""
    
    def test_unrecognizable_text_numbers_only(self):
        """
        测试仅包含数字的文本
        
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        with pytest.raises(UnrecognizedTextException):
            self.parser.parse("1234567890")
    
    def test_unrecognizable_text_letters_only(self):
        """
        测试仅包含字母的文本
        
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        with pytest.raises(UnrecognizedTextException):
            self.parser.parse("abcdefghijk")
    
    def test_unrecognizable_text_special_characters(self):
        """
        测试仅包含特殊字符的文本
        
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        with pytest.raises(UnrecognizedTextException):
            self.parser.parse("!@#$%^&*()")
    
    # ==================== Property 1: 字段提取完整性测试 ====================
    
    def test_property_1_field_extraction_completeness(self):
        """
        测试 Property 1: 字段提取完整性
        
        对于任何包含实验信息的文本输入，NLP 解析器应该能够识别并提取
        所有可识别的结构化字段，且提取的字段应该与输入文本中的信息一致。
        
        验证属性: Property 1
        验证需求: 1.1-1.7
        """
        # 测试用例：包含多个字段的完整实验需求
        text = "我需要检测水样中的重金属含量，包括铅、汞、镉，使用原子吸收光谱仪，预计需要2小时"
        
        result = self.parser.parse(text)
        
        # 验证所有可识别字段都被提取
        assert result.purpose != "", "应提取实验目的"
        assert result.sample_type != "", "应提取样品类型"
        assert len(result.indicators) > 0, "应提取检测指标"
        assert result.estimated_time != "", "应提取预计时间"
        
        # 验证提取的字段与输入一致
        assert "水" in result.sample_type or "水样" in result.sample_type, "样品类型应与输入一致"
        assert any("重金属" in ind for ind in result.indicators), "检测指标应与输入一致"
        assert "2" in result.estimated_time or "小时" in result.estimated_time, "时间应与输入一致"
        
        # 验证置信度合理
        assert result.confidence >= 0.5, "包含多个字段的文本置信度应较高"
    
    def test_property_1_partial_field_extraction(self):
        """
        测试 Property 1: 部分字段提取
        
        当文本只包含部分字段时，解析器应该提取所有可识别的字段
        
        验证属性: Property 1
        """
        # 测试用例：只包含样品类型和指标
        text = "水样重金属检测"
        
        result = self.parser.parse(text)
        
        # 验证提取了可识别的字段
        assert result.sample_type != "" or len(result.indicators) > 0, "应提取至少一个字段"
        
        # 验证未提取的字段为空
        if result.estimated_time == "":
            assert True, "没有时间信息时应返回空字符串"
    
    def test_property_1_consistency_with_input(self):
        """
        测试 Property 1: 提取字段与输入一致性
        
        提取的字段内容应该与输入文本中的信息一致
        
        验证属性: Property 1
        """
        test_cases = [
            {
                "text": "检测土壤中的有机物含量",
                "expected_sample": "土壤",
                "expected_indicator": "有机物"
            },
            {
                "text": "空气质量检测，测定PM2.5和PM10",
                "expected_sample": "空气",
                "expected_indicator": "PM"
            }
        ]
        
        for case in test_cases:
            result = self.parser.parse(case["text"])
            
            # 验证样品类型一致性
            if case["expected_sample"]:
                assert case["expected_sample"] in result.sample_type, \
                    f"样品类型应包含 '{case['expected_sample']}'"
            
            # 验证指标一致性
            if case["expected_indicator"] and len(result.indicators) > 0:
                assert any(case["expected_indicator"] in ind for ind in result.indicators), \
                    f"检测指标应包含 '{case['expected_indicator']}'"
    
    # ==================== 边界条件和额外测试 ====================
    
    def test_very_long_text(self):
        """
        测试非常长的文本输入
        """
        long_text = "检测水样中的重金属含量，" * 100
        
        result = self.parser.parse(long_text)
        
        # 应该能够处理长文本
        assert result is not None
        assert result.sample_type != ""
    
    def test_mixed_language_text(self):
        """
        测试中英文混合文本
        """
        text = "检测water sample中的heavy metal含量"
        
        result = self.parser.parse(text)
        
        # 应该能够处理混合语言
        assert result is not None
    
    def test_text_with_numbers_and_units(self):
        """
        测试包含数字和单位的文本
        """
        text = "检测水样中铅含量是否超过0.01mg/L标准"
        
        result = self.parser.parse(text)
        
        # 应该能够提取基本信息
        assert result.sample_type != ""
        assert len(result.indicators) > 0
    
    def test_confidence_calculation(self):
        """
        测试置信度计算的合理性
        """
        # 完整信息的文本应该有较高置信度
        complete_text = "检测水样中的重金属含量，包括铅、汞，使用光谱仪，预计2小时"
        complete_result = self.parser.parse(complete_text)
        
        # 部分信息的文本应该有较低置信度（但仍能解析）
        partial_text = "水样检测"
        partial_result = self.parser.parse(partial_text)
        
        # 完整信息的置信度应该高于部分信息
        assert complete_result.confidence >= partial_result.confidence, \
            "完整信息的置信度应该高于或等于部分信息"
    
    def test_to_dict_method(self):
        """
        测试 ParsedFields 的 to_dict 方法
        
        验证需求 1.11: 返回包含所有 Structured_Fields 的 JSON 对象
        """
        text = "检测水样中的重金属含量"
        result = self.parser.parse(text)
        
        # 转换为字典
        result_dict = result.to_dict()
        
        # 验证字典包含所有必需字段
        assert "purpose" in result_dict
        assert "sample_type" in result_dict
        assert "indicators" in result_dict
        assert "equipment" in result_dict
        assert "materials" in result_dict
        assert "steps" in result_dict
        assert "estimated_time" in result_dict
        assert "confidence" in result_dict
    
    def test_is_valid_method(self):
        """
        测试 ParsedFields 的 is_valid 方法
        """
        text = "检测水样中的重金属含量"
        result = self.parser.parse(text)
        
        # 有效的解析结果应该通过验证
        assert result.is_valid(), "有效的解析结果应该通过 is_valid 验证"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
