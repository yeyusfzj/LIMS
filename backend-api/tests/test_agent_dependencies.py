"""
AI Agent 模块依赖测试

验证所有必要的依赖是否可以正常导入和使用。
"""

import pytest


def test_fastapi_import():
    """测试 FastAPI 导入"""
    from fastapi import FastAPI
    app = FastAPI()
    assert app is not None


def test_pydantic_import():
    """测试 Pydantic 导入"""
    from pydantic import BaseModel
    
    class TestModel(BaseModel):
        name: str
        value: int
    
    model = TestModel(name="test", value=42)
    assert model.name == "test"
    assert model.value == 42


def test_hypothesis_import():
    """测试 Hypothesis 导入"""
    from hypothesis import given, strategies as st
    
    @given(st.integers())
    def test_property(x):
        assert isinstance(x, int)
    
    test_property()


def test_pytest_asyncio_import():
    """测试 pytest-asyncio 导入"""
    import pytest_asyncio
    assert pytest_asyncio is not None


def test_httpx_import():
    """测试 httpx 导入"""
    import httpx
    assert httpx is not None


def test_uvicorn_import():
    """测试 uvicorn 导入"""
    import uvicorn
    assert uvicorn is not None


def test_python_dateutil_import():
    """测试 python-dateutil 导入"""
    from dateutil import parser
    date = parser.parse("2024-01-01")
    assert date.year == 2024


def test_dotenv_import():
    """测试 python-dotenv 导入"""
    from dotenv import load_dotenv
    assert load_dotenv is not None


def test_agent_models_import():
    """测试 AI Agent 数据模型导入"""
    from app.agent.models import (
        ParsedFields,
        Equipment,
        Material,
        Indicator,
        Step,
        ExperimentType,
        ExperimentPlan,
    )
    
    # 测试 ParsedFields
    fields = ParsedFields(
        purpose="测试目的",
        sample_type="测试样品",
        confidence=0.85
    )
    assert fields.purpose == "测试目的"
    assert fields.confidence == 0.85


def test_agent_schemas_import():
    """测试 AI Agent API 模型导入"""
    from app.agent.schemas import (
        ParseRequest,
        PlanRequest,
        QARequest,
        APIResponse,
    )
    
    # 测试 ParseRequest
    request = ParseRequest(text="测试文本")
    assert request.text == "测试文本"


def test_knowledge_graph_import():
    """测试知识图谱模块导入"""
    from app.agent.knowledge_graph import KnowledgeGraph
    assert KnowledgeGraph is not None


def test_parser_dictionary_import():
    """测试解析器词典模块导入"""
    from app.agent.parser_dictionary import ParserDictionary
    assert ParserDictionary is not None


def test_nlp_parser_import():
    """测试 NLP 解析器模块导入"""
    from app.agent.nlp_parser import NLPParser
    assert NLPParser is not None


def test_qa_engine_import():
    """测试问答引擎模块导入"""
    from app.agent.qa_engine import QAEngine
    assert QAEngine is not None


def test_plan_generator_import():
    """测试实验计划生成器模块导入"""
    from app.agent.plan_generator import PlanGenerator
    assert PlanGenerator is not None


@pytest.mark.asyncio
async def test_async_functionality():
    """测试异步功能"""
    import asyncio
    
    async def async_task():
        await asyncio.sleep(0.01)
        return "success"
    
    result = await async_task()
    assert result == "success"


def test_hypothesis_property_example():
    """测试 Hypothesis 属性测试示例"""
    from hypothesis import given, strategies as st
    
    @given(st.text(min_size=1, max_size=100))
    def test_string_length(s):
        assert len(s) >= 1
        assert len(s) <= 100
    
    test_string_length()


def test_pydantic_validation():
    """测试 Pydantic 数据验证"""
    from pydantic import BaseModel, ValidationError, field_validator
    
    class TestModel(BaseModel):
        value: int
        
        @field_validator('value')
        @classmethod
        def value_must_be_positive(cls, v):
            if v <= 0:
                raise ValueError('value must be positive')
            return v
    
    # 正常情况
    model = TestModel(value=10)
    assert model.value == 10
    
    # 验证失败
    with pytest.raises(ValidationError):
        TestModel(value=-1)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
