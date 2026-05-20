"""
测试 NLP 解析器错误处理

验证需求：
- 需求 1.12: 处理空文本输入
- 需求 1.13: 处理无法识别的文本
- 需求 14.1: 返回友好的错误提示
"""

import pytest
from app.agent.nlp_parser import NLPParser
from app.agent.exceptions import (
    EmptyInputException,
    UnrecognizedTextException,
    LowConfidenceException
)


class TestNLPParserErrorHandling:
    """测试 NLP 解析器错误处理"""
    
    def setup_method(self):
        """设置测试环境"""
        self.parser = NLPParser()
    
    def test_empty_text_raises_exception(self):
        """
        测试空文本输入抛出异常
        验证需求 1.12: 当输入文本为空，NLP_Parser 应返回错误提示
        """
        # 测试完全空字符串
        with pytest.raises(EmptyInputException) as exc_info:
            self.parser.parse("")
        
        assert exc_info.value.error_code == "INVALID_INPUT"
        assert "不能为空" in exc_info.value.message
        assert exc_info.value.suggestion != ""
    
    def test_whitespace_only_text_raises_exception(self):
        """
        测试仅包含空白字符的文本抛出异常
        验证需求 1.12: 当输入文本为空，NLP_Parser 应返回错误提示
        """
        # 测试仅包含空格
        with pytest.raises(EmptyInputException):
            self.parser.parse("   ")
        
        # 测试仅包含制表符和换行符
        with pytest.raises(EmptyInputException):
            self.parser.parse("\t\n  \r\n")
    
    def test_unrecognized_text_raises_exception(self):
        """
        测试无法识别的文本抛出异常
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        # 测试完全无关的文本
        unrecognized_texts = [
            "今天天气真好",
            "1234567890",
            "abcdefghijk",
            "这是一段完全无关的文字，没有任何实验相关的内容"
        ]
        
        for text in unrecognized_texts:
            with pytest.raises(UnrecognizedTextException) as exc_info:
                self.parser.parse(text)
            
            assert exc_info.value.error_code == "UNRECOGNIZED_TEXT"
            assert "无法" in exc_info.value.message or "识别" in exc_info.value.message
            assert exc_info.value.suggestion != ""
    
    def test_low_confidence_raises_exception(self):
        """
        测试低置信度文本抛出异常
        验证需求 14.1: 当 NLP_Parser 解析失败，AI_Agent 应返回友好的错误提示
        """
        # 测试置信度很低的文本（只有目的但没有样品类型，置信度会低于 0.3）
        # 根据 _calculate_confidence 方法：purpose=0.3, 没有 sample_type，总分 < 0.3
        low_confidence_text = "我想做个实验"
        
        with pytest.raises((LowConfidenceException, UnrecognizedTextException)) as exc_info:
            self.parser.parse(low_confidence_text)
        
        # 验证抛出了适当的异常
        assert exc_info.value.error_code in ["LOW_CONFIDENCE", "UNRECOGNIZED_TEXT"]
        assert exc_info.value.suggestion != ""
    
    def test_unrecognized_text_is_handled_gracefully(self):
        """
        测试完全无法识别的文本被优雅处理
        验证需求 1.13: 当输入文本无法识别任何字段，NLP_Parser 应返回空字段标记
        """
        # 这些文本应该抛出 UnrecognizedTextException
        unrecognized_texts = ["测试", "实验", "abc123"]
        
        for text in unrecognized_texts:
            with pytest.raises(UnrecognizedTextException) as exc_info:
                self.parser.parse(text)
            
            assert exc_info.value.error_code == "UNRECOGNIZED_TEXT"
            assert "无法" in exc_info.value.message or "识别" in exc_info.value.message
    
    def test_exception_to_dict_format(self):
        """
        测试异常转换为字典格式
        验证需求 14.1: 错误响应应包含错误代码、描述和建议
        """
        try:
            self.parser.parse("")
        except EmptyInputException as e:
            error_dict = e.to_dict()
            
            # 验证字典包含必需字段
            assert "success" in error_dict
            assert error_dict["success"] is False
            assert "error" in error_dict
            assert "error_code" in error_dict
            assert "suggestion" in error_dict
            
            # 验证字段内容
            assert error_dict["error_code"] == "INVALID_INPUT"
            assert len(error_dict["error"]) > 0
            assert len(error_dict["suggestion"]) > 0
    
    def test_valid_text_does_not_raise_exception(self):
        """
        测试有效文本不抛出异常
        """
        valid_text = "我需要检测水样中的重金属含量，包括铅、汞、镉等指标"
        
        # 不应该抛出异常
        result = self.parser.parse(valid_text)
        
        # 验证返回结果
        assert result is not None
        assert result.confidence > 0.3
        assert result.purpose != ""
    
    def test_partial_valid_text_with_low_confidence(self):
        """
        测试部分有效但置信度低的文本
        """
        # 使用能产生一些字段但置信度低的文本
        partial_text = "我想做个实验"
        
        # 应该抛出低置信度异常或无法识别异常
        with pytest.raises((LowConfidenceException, UnrecognizedTextException)) as exc_info:
            self.parser.parse(partial_text)
        
        # 验证异常类型正确
        assert exc_info.value.error_code in ["LOW_CONFIDENCE", "UNRECOGNIZED_TEXT"]
        assert exc_info.value.suggestion != ""
    
    def test_error_messages_are_user_friendly(self):
        """
        测试错误消息是否友好
        验证需求 14.1: 返回友好的错误提示
        """
        test_cases = [
            ("", EmptyInputException),
            ("今天天气真好", UnrecognizedTextException),
        ]
        
        for text, expected_exception in test_cases:
            try:
                self.parser.parse(text)
            except expected_exception as e:
                # 验证错误消息是中文且友好
                assert len(e.message) > 0
                assert len(e.suggestion) > 0
                
                # 错误消息不应包含技术术语或堆栈信息
                assert "Exception" not in e.message
                assert "Traceback" not in e.message
                assert "Error" not in e.message or "错误" in e.message


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
