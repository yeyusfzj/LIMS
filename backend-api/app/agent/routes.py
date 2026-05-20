"""
API 路由 - 本地轻量化 AI 智能体

提供以下 API 端点：
- POST /api/agent/parse - 解析实验需求文本
- POST /api/agent/plan - 生成实验计划
- POST /api/agent/qa - 智能问答
- POST /api/agent/result-analysis - 结果分析（暂未实现）
"""

import logging
import time
from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any, Optional

from app.agent.schemas import (
    ParseRequest, PlanRequest, QARequest, AnalysisRequest,
    APIResponse, ParseResponse, PlanResponse, QAResponse, AnalysisResponse,
    ErrorResponse
)
from app.agent.nlp_parser import get_nlp_parser
from app.agent.plan_generator import get_plan_generator
from app.agent.qa_engine import get_qa_engine
from app.agent.result_analyzer import ResultAnalyzer
from app.agent.models import ParsedFields
from app.agent.exceptions import (
    AgentException,
    EmptyInputException,
    UnrecognizedTextException,
    LowConfidenceException,
    ParseException,
    PlanGenerationException,
    AnalysisException
)
from app.agent.logger import get_agent_logger

logger = logging.getLogger(__name__)
agent_logger = get_agent_logger()  # 获取 AI Agent 专用日志记录器

# 创建路由器
router = APIRouter(prefix="/api/agent", tags=["AI Agent"])

# 获取核心模块实例
nlp_parser = get_nlp_parser()
plan_generator = get_plan_generator()
qa_engine = get_qa_engine()
result_analyzer = ResultAnalyzer()


@router.post("/parse", response_model=APIResponse, summary="解析实验需求文本")
async def parse_experiment(request: ParseRequest) -> APIResponse:
    """
    解析实验需求文本，提取结构化字段
    
    此端点接收用户输入的自然语言实验需求，使用 NLP 解析器提取关键信息，
    包括实验目的、样品类型、检测指标、所需设备、材料、步骤和预计时间。
    
    ## 请求参数
    
    - **text** (string, required): 实验需求文本
      - 最小长度: 1 字符
      - 最大长度: 5000 字符
      - 不能为空或纯空格
    
    ## 返回字段
    
    - **purpose** (string): 实验目的
    - **sample_type** (string): 样品类型
    - **indicators** (array): 检测指标列表
    - **equipment** (array): 所需设备列表
    - **materials** (array): 所需材料列表
    - **steps** (array): 实验步骤列表
    - **estimated_time** (string): 预计时间
    - **confidence** (float): 解析置信度 (0.0-1.0)
    
    ## 示例请求
    
    ```json
    {
        "text": "我需要检测水样中的重金属含量，包括铅、汞、镉"
    }
    ```
    
    ## 示例响应（成功）
    
    ```json
    {
        "success": true,
        "data": {
            "purpose": "检测水样重金属含量",
            "sample_type": "水样",
            "indicators": ["铅", "汞", "镉"],
            "equipment": [],
            "materials": [],
            "steps": [],
            "estimated_time": "",
            "confidence": 0.85
        },
        "error": null,
        "error_code": null,
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ## 错误响应
    
    ### 400 Bad Request - 输入验证失败
    ```json
    {
        "success": false,
        "error": "输入文本不能为空",
        "error_code": "INVALID_INPUT",
        "suggestion": "请输入包含实验需求的文本",
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ### 422 Unprocessable Entity - 无法识别文本
    ```json
    {
        "success": false,
        "error": "无法从输入文本中识别实验信息",
        "error_code": "UNRECOGNIZED_TEXT",
        "suggestion": "请使用更清晰的描述，例如：'我需要检测水样中的重金属含量'",
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ### 422 Unprocessable Entity - 低置信度
    ```json
    {
        "success": false,
        "error": "解析置信度过低 (0.35)，可能无法准确识别实验信息",
        "error_code": "LOW_CONFIDENCE",
        "confidence": 0.35,
        "partial_result": {...},
        "suggestion": "请提供更详细的实验描述，包括实验目的、样品类型、检测指标等信息",
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ## 性能指标
    
    - 响应时间: < 500ms
    - 解析准确率: > 85%
    
    ## 验证需求
    
    需求 1.1-1.13, 7.1-7.3, 14.1
    """
    start_time = time.time()  # 记录开始时间
    
    # 记录请求日志 (需求 13.1)
    agent_logger.log_request(
        endpoint="/api/agent/parse",
        method="POST",
        params={"text_length": len(request.text)}
    )
    
    try:
        logger.info(f"收到解析请求: {request.text[:50]}...")
        
        # 解析文本
        parsed_fields = nlp_parser.parse(request.text)
        
        # 构建响应
        response_data = parsed_fields.to_dict()
        
        # 计算处理耗时 (需求 13.7)
        duration_ms = (time.time() - start_time) * 1000
        
        # 记录响应日志 (需求 13.2)
        agent_logger.log_response(
            endpoint="/api/agent/parse",
            status_code=200,
            duration_ms=duration_ms
        )
        
        return APIResponse(
            success=True,
            data=response_data,
            error=None,
            error_code=None
        )
    
    except EmptyInputException as e:
        # 处理空输入异常（需求 1.12）
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"空输入异常: {e.message}")
        
        # 记录错误日志 (需求 13.3)
        agent_logger.log_error(
            endpoint="/api/agent/parse",
            error_type="EmptyInputException",
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/parse", 400, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=e.to_dict()
        )
    
    except UnrecognizedTextException as e:
        # 处理无法识别文本异常（需求 1.13）
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"无法识别文本: {e.message}")
        
        agent_logger.log_error(
            endpoint="/api/agent/parse",
            error_type="UnrecognizedTextException",
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/parse", 422, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )
    
    except LowConfidenceException as e:
        # 处理低置信度异常（需求 14.1）
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"低置信度: {e.message}")
        
        agent_logger.log_error(
            endpoint="/api/agent/parse",
            error_type="LowConfidenceException",
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/parse", 422, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )
    
    except AgentException as e:
        # 处理其他智能体异常（需求 14.1）
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"智能体异常: {e.message}")
        
        agent_logger.log_error(
            endpoint="/api/agent/parse",
            error_type=type(e).__name__,
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/parse", 422, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )
    
    except Exception as e:
        # 处理未预期的系统错误
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"解析失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint="/api/agent/parse",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response("/api/agent/parse", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.post("/plan", response_model=APIResponse, summary="生成实验计划")
async def generate_plan(request: PlanRequest) -> APIResponse:
    """
    根据解析后的结构化字段生成完整的实验计划
    
    此端点接收解析后的结构化字段，查询知识图谱获取相关设备、材料和步骤信息，
    然后生成包含详细信息的完整实验计划文档。
    
    ## 请求参数
    
    - **parsed_fields** (object, required): 解析后的结构化字段
      - **purpose** (string, required): 实验目的
      - **sample_type** (string, required): 样品类型
      - **indicators** (array): 检测指标列表
      - **equipment** (array): 所需设备列表
      - **materials** (array): 所需材料列表
      - **steps** (array): 实验步骤列表
      - **estimated_time** (string): 预计时间
      - **confidence** (float): 解析置信度
    - **format** (string, optional): 输出格式，可选值：
      - "detailed" (默认): 详细的 Markdown 格式
      - "simple": 简洁格式，适合快速查看
    
    ## 返回字段
    
    - **id** (string): 计划ID
    - **purpose** (string): 实验目的
    - **sample_type** (string): 样品类型
    - **indicators** (array): 检测指标详细信息列表
    - **equipment** (array): 设备详细信息列表
    - **materials** (array): 材料详细信息列表
    - **steps** (array): 详细步骤列表
    - **estimated_time** (string): 预计时间
    - **safety_notes** (array): 安全注意事项
    - **markdown** (string): Markdown 格式的计划文档（format=detailed）
    - **simple_text** (string): 简洁格式的计划文本（format=simple）
    - **created_at** (string): 创建时间
    
    ## 示例请求（简洁格式）
    
    ```json
    {
        "parsed_fields": {
            "purpose": "检测水样重金属含量",
            "sample_type": "水样",
            "indicators": ["铅", "汞", "镉"],
            "equipment": [],
            "materials": [],
            "steps": [],
            "estimated_time": "",
            "confidence": 0.85
        },
        "format": "simple"
    }
    ```
    
    ## 示例响应（简洁格式）
    
    ```json
    {
        "success": true,
        "data": {
            "id": "plan_001",
            "simple_text": "实验名称：水样重金属检测\n实验目的：检测水样中铅、镉、汞指标\n检测指标：铅含量、汞含量、镉含量\n样品类型：水样\n建议设备：原子吸收光谱仪、电热消解仪、分析天平\n建议材料：硝酸、盐酸、重金属标准溶液\n建议流程：\n1. 样品采集\n2. 样品消解\n3. 定容\n4. 仪器测定\n5. 数据处理\n风险提示：\n- 注意硝酸的安全使用，安全等级：危险\n- 检测结果超标触发复测流程",
            "created_at": "2026-05-06T10:30:00"
        },
        "error": null,
        "error_code": null,
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ## 性能指标
    
    - 响应时间: < 1s
    - 计划完整性: 100%
    
    ## 验证需求
    
    需求 5.1-5.14, 7.4-7.6, 14.3
    """
    start_time = time.time()
    
    # 记录请求日志
    agent_logger.log_request(
        endpoint="/api/agent/plan",
        method="POST",
        params={"has_parsed_fields": bool(request.parsed_fields), "format": request.format}
    )
    
    try:
        logger.info(f"收到计划生成请求，格式: {request.format}")
        
        # 将字典转换为 ParsedFields 对象
        parsed_fields = ParsedFields.from_dict(request.parsed_fields)
        
        # 生成实验计划
        plan = plan_generator.generate(parsed_fields)
        
        # 根据格式构建响应
        if request.format == "simple":
            # 简洁格式
            response_data = {
                "id": plan.id,
                "simple_text": plan.to_simple_format(),
                "created_at": plan.created_at
            }
        else:
            # 详细格式（默认）
            response_data = {
                "id": plan.id,
                "purpose": plan.purpose,
                "sample_type": plan.sample_type,
                "indicators": [ind.to_dict() for ind in plan.indicators],
                "equipment": [eq.to_dict() for eq in plan.equipment],
                "materials": [mat.to_dict() for mat in plan.materials],
                "steps": [step.to_dict() for step in plan.steps],
                "estimated_time": plan.estimated_time,
                "safety_notes": plan.safety_notes,
                "markdown": plan.to_markdown(),
                "created_at": plan.created_at
            }
        
        # 计算处理耗时
        duration_ms = (time.time() - start_time) * 1000
        
        # 记录响应日志
        agent_logger.log_response(
            endpoint="/api/agent/plan",
            status_code=200,
            duration_ms=duration_ms
        )
        
        return APIResponse(
            success=True,
            data=response_data,
            error=None,
            error_code=None
        )
        
    except ValueError as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"输入验证失败: {e}")
        
        agent_logger.log_error(
            endpoint="/api/agent/plan",
            error_type="ValueError",
            error_message=str(e)
        )
        agent_logger.log_response("/api/agent/plan", 400, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": str(e),
                "error_code": "INVALID_INPUT",
                "suggestion": "请确保提供了实验目的和样品类型"
            }
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"计划生成失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint="/api/agent/plan",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response("/api/agent/plan", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.post("/qa", response_model=APIResponse, summary="智能问答")
async def ask_question(request: QARequest) -> APIResponse:
    """
    回答用户关于实验的问题
    
    此端点接收用户问题，识别问题意图（设备、材料、步骤、指标查询），
    从知识图谱中检索相关信息，并生成格式化的回答。
    
    ## 请求参数
    
    - **question** (string, required): 用户问题
      - 最小长度: 1 字符
      - 最大长度: 1000 字符
      - 不能为空或纯空格
    - **context** (object, optional): 上下文信息
      - **experiment_type** (string): 实验类型
    
    ## 返回字段
    
    - **question** (string): 用户问题
    - **answer** (string): 回答内容
    - **confidence** (float): 回答置信度 (0.0-1.0)
    - **sources** (array): 信息来源列表
    
    ## 示例请求
    
    ```json
    {
        "question": "水质检测需要什么设备？",
        "context": {
            "experiment_type": "water_heavy_metal"
        }
    }
    ```
    
    ## 示例响应（成功）
    
    ```json
    {
        "success": true,
        "data": {
            "question": "水质检测需要什么设备？",
            "answer": "进行水质检测需要以下设备：\n1. 原子吸收光谱仪 (AAS-2000)\n2. pH计\n3. 浊度仪",
            "confidence": 0.9,
            "sources": ["knowledge_graph"]
        },
        "error": null,
        "error_code": null,
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ## 支持的问题类型
    
    - **设备查询**: "需要什么设备？"、"用什么仪器？"
    - **材料查询**: "需要哪些试剂？"、"用什么材料？"
    - **步骤查询**: "怎么做？"、"实验步骤是什么？"
    - **指标查询**: "检测什么指标？"、"测什么？"
    - **时间查询**: "需要多久？"、"时间多长？"
    
    ## 错误响应
    
    ### 400 Bad Request - 问题为空
    ```json
    {
        "success": false,
        "error": "问题不能为空",
        "error_code": "INVALID_INPUT",
        "suggestion": "请提供有效的问题",
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ### 500 Internal Server Error - 问答失败
    ```json
    {
        "success": false,
        "error": "系统处理请求时发生错误",
        "error_code": "INTERNAL_ERROR",
        "suggestion": "请稍后重试，如问题持续请联系管理员",
        "timestamp": "2026-05-06T10:30:00"
    }
    ```
    
    ## 性能指标
    
    - 响应时间: < 300ms
    - 意图识别准确率: > 90%
    
    ## 验证需求
    
    需求 4.1-4.10, 7.7-7.9
    """
    start_time = time.time()
    
    # 记录请求日志
    agent_logger.log_request(
        endpoint="/api/agent/qa",
        method="POST",
        params={"question": request.question[:50]}
    )
    
    try:
        logger.info(f"收到问答请求: {request.question}")
        
        # 回答问题
        result = qa_engine.answer(request.question, request.context)
        
        # 计算处理耗时
        duration_ms = (time.time() - start_time) * 1000
        
        # 记录响应日志
        agent_logger.log_response(
            endpoint="/api/agent/qa",
            status_code=200,
            duration_ms=duration_ms
        )
        
        return APIResponse(
            success=True,
            data=result,
            error=None,
            error_code=None
        )
        
    except ValueError as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"输入验证失败: {e}")
        
        agent_logger.log_error(
            endpoint="/api/agent/qa",
            error_type="ValueError",
            error_message=str(e)
        )
        agent_logger.log_response("/api/agent/qa", 400, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": str(e),
                "error_code": "INVALID_INPUT",
                "suggestion": "请提供有效的问题"
            }
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"问答失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint="/api/agent/qa",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response("/api/agent/qa", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.post("/result-analysis", response_model=APIResponse, summary="结果分析")
async def analyze_result(request: AnalysisRequest) -> APIResponse:
    """
    分析实验结果并检测异常
    
    - **result_data**: 实验结果数据（必需），格式为 {indicator_name: value}
    - **experiment_type**: 实验类型（可选）
    
    返回分析报告，包括：
    - result_id: 结果ID
    - status: 状态（normal/warning/error）
    - anomalies: 异常列表
    - summary: 分析摘要
    - analyzed_at: 分析时间
    
    **示例请求**:
    ```json
    {
        "result_data": {
            "铅含量": 0.005,
            "汞含量": 0.0001,
            "镉含量": 0.003
        },
        "experiment_type": "water_heavy_metal"
    }
    ```
    
    **示例响应**:
    ```json
    {
        "success": true,
        "data": {
            "result_id": "result_001",
            "status": "normal",
            "anomalies": [],
            "summary": "分析摘要：共检测 3 项指标，其中 3 项正常，0 项异常。",
            "analyzed_at": "2026-05-06T10:30:00"
        }
    }
    ```
    """
    start_time = time.time()
    
    # 记录请求日志
    agent_logger.log_request(
        endpoint="/api/agent/result-analysis",
        method="POST",
        params={"result_data_count": len(request.result_data)}
    )
    
    try:
        logger.info(f"收到结果分析请求，数据项数: {len(request.result_data)}")
        
        # 生成结果 ID
        import uuid
        result_id = f"result_{uuid.uuid4().hex[:8]}"
        
        # 分析结果
        report = result_analyzer.analyze(result_id, request.result_data)
        
        # 构建响应
        response_data = report.to_dict()
        
        # 计算处理耗时
        duration_ms = (time.time() - start_time) * 1000
        
        # 记录响应日志
        agent_logger.log_response(
            endpoint="/api/agent/result-analysis",
            status_code=200,
            duration_ms=duration_ms
        )
        
        return APIResponse(
            success=True,
            data=response_data,
            error=None,
            error_code=None
        )
        
    except ValueError as e:
        # 处理输入验证错误
        duration_ms = (time.time() - start_time) * 1000
        logger.warning(f"输入验证失败: {e}")
        
        agent_logger.log_error(
            endpoint="/api/agent/result-analysis",
            error_type="ValueError",
            error_message=str(e)
        )
        agent_logger.log_response("/api/agent/result-analysis", 400, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": str(e),
                "error_code": "INVALID_INPUT",
                "suggestion": "请确保提供了有效的结果数据"
            }
        )
    
    except AnalysisException as e:
        # 处理分析异常
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"分析异常: {e.message}")
        
        agent_logger.log_error(
            endpoint="/api/agent/result-analysis",
            error_type="AnalysisException",
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/result-analysis", 422, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )
    
    except AgentException as e:
        # 处理其他智能体异常
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"智能体异常: {e.message}")
        
        agent_logger.log_error(
            endpoint="/api/agent/result-analysis",
            error_type=type(e).__name__,
            error_message=e.message
        )
        agent_logger.log_response("/api/agent/result-analysis", 422, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=e.to_dict()
        )
    
    except Exception as e:
        # 处理未预期的系统错误
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"结果分析失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint="/api/agent/result-analysis",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response("/api/agent/result-analysis", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.get("/sample-results/{sample_id}", response_model=APIResponse, summary="获取样品检测结果用于AI分析")
async def get_sample_results_for_analysis(sample_id: str) -> APIResponse:
    """
    获取指定样品的检测结果数据，用于 AI 智能分析
    
    此端点从数据库中获取真实的样品检测结果，并格式化为适合 AI 分析的格式。
    
    ## 路径参数
    
    - **sample_id** (string, required): 样品 ID
    
    ## 返回字段
    
    - **sample_id** (string): 样品 ID
    - **sample_number** (string): 样品编号
    - **sample_name** (string): 样品名称
    - **sample_type** (string): 样品类型
    - **result_data** (object): 检测结果数据，格式为 {parameter: value}
    - **result_count** (int): 检测结果数量
    
    ## 示例响应
    
    ```json
    {
        "success": true,
        "data": {
            "sample_id": "sample_001",
            "sample_number": "S202605080001",
            "sample_name": "河水样品",
            "sample_type": "水样",
            "result_data": {
                "铅含量": 0.015,
                "镉含量": 0.003,
                "汞含量": 0.0005
            },
            "result_count": 3
        }
    }
    ```
    """
    start_time = time.time()
    
    # 记录请求日志
    agent_logger.log_request(
        endpoint=f"/api/agent/sample-results/{sample_id}",
        method="GET",
        params={"sample_id": sample_id}
    )
    
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.core.database import get_db
        from app.models.sample import Sample
        from app.models.result import Result
        from sqlalchemy import select
        
        logger.info(f"获取样品 {sample_id} 的检测结果用于 AI 分析")
        
        # 创建数据库会话
        async for db in get_db():
            # 查询样品信息
            sample_stmt = select(Sample).where(Sample.id == sample_id)
            sample_result = await db.execute(sample_stmt)
            sample = sample_result.scalar_one_or_none()
            
            if not sample:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "success": False,
                        "error": f"样品 {sample_id} 不存在",
                        "error_code": "SAMPLE_NOT_FOUND",
                        "suggestion": "请检查样品 ID 是否正确"
                    }
                )
            
            # 查询检测结果
            results_stmt = select(Result).where(Result.sampleId == sample_id)
            results_result = await db.execute(results_stmt)
            results = results_result.scalars().all()
            
            if not results:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={
                        "success": False,
                        "error": f"样品 {sample_id} 没有检测结果",
                        "error_code": "NO_RESULTS_FOUND",
                        "suggestion": "请先录入检测结果"
                    }
                )
            
            # 格式化检测结果数据
            result_data = {}
            for result in results:
                if result.value is not None:
                    # 使用参数名称作为键，检测值作为值
                    result_data[result.parameter] = result.value
            
            # 构建响应数据
            response_data = {
                "sample_id": sample.id,
                "sample_number": sample.sample_number,
                "sample_name": sample.sample_name,
                "sample_type": sample.sample_type,
                "result_data": result_data,
                "result_count": len(result_data)
            }
            
            # 计算处理耗时
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录响应日志
            agent_logger.log_response(
                endpoint=f"/api/agent/sample-results/{sample_id}",
                status_code=200,
                duration_ms=duration_ms
            )
            
            return APIResponse(
                success=True,
                data=response_data,
                error=None,
                error_code=None
            )
    
    except HTTPException:
        # 重新抛出 HTTP 异常
        raise
    
    except Exception as e:
        # 处理未预期的系统错误
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"获取样品检测结果失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint=f"/api/agent/sample-results/{sample_id}",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response(f"/api/agent/sample-results/{sample_id}", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.get("/search-sample", response_model=APIResponse, summary="搜索样品（支持名称或编号）")
async def search_sample(query: str) -> APIResponse:
    """
    根据样品名称或编号搜索样品及其检测结果
    
    此端点支持通过样品名称或样品编号搜索样品，并返回样品信息和检测结果。
    
    ## 查询参数
    
    - **query** (string, required): 搜索关键词（样品名称或样品编号）
    
    ## 返回字段
    
    - **samples** (array): 匹配的样品列表
      - **sample_id** (string): 样品 ID
      - **sample_number** (string): 样品编号
      - **sample_name** (string): 样品名称
      - **sample_type** (string): 样品类型
      - **status** (string): 样品状态
      - **result_data** (object): 检测结果数据（如果有）
      - **result_count** (int): 检测结果数量
    - **total** (int): 匹配的样品总数
    
    ## 示例请求
    
    ```
    GET /api/agent/search-sample?query=河水
    GET /api/agent/search-sample?query=S202605080001
    ```
    
    ## 示例响应
    
    ```json
    {
        "success": true,
        "data": {
            "samples": [
                {
                    "sample_id": "sample_001",
                    "sample_number": "S202605080001",
                    "sample_name": "河水样品",
                    "sample_type": "水样",
                    "status": "TESTING_COMPLETE",
                    "result_data": {
                        "铅含量": 0.008,
                        "镉含量": 0.003,
                        "汞含量": 0.0005
                    },
                    "result_count": 3
                }
            ],
            "total": 1
        }
    }
    ```
    """
    start_time = time.time()
    
    # 记录请求日志
    agent_logger.log_request(
        endpoint="/api/agent/search-sample",
        method="GET",
        params={"query": query}
    )
    
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.core.database import get_db
        from app.models.sample import Sample
        from app.models.result import Result
        from sqlalchemy import select, or_
        
        logger.info(f"搜索样品: {query}")
        
        if not query or not query.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "success": False,
                    "error": "搜索关键词不能为空",
                    "error_code": "INVALID_INPUT",
                    "suggestion": "请输入样品名称或样品编号"
                }
            )
        
        # 创建数据库会话
        async for db in get_db():
            # 搜索样品（支持样品名称和样品编号的模糊匹配）
            search_pattern = f"%{query}%"
            sample_stmt = select(Sample).where(
                or_(
                    Sample.sample_name.ilike(search_pattern),
                    Sample.sample_number.ilike(search_pattern)
                )
            ).limit(10)  # 限制返回 10 条结果
            
            sample_result = await db.execute(sample_stmt)
            samples = sample_result.scalars().all()
            
            if not samples:
                return APIResponse(
                    success=True,
                    data={
                        "samples": [],
                        "total": 0,
                        "message": f"未找到匹配 '{query}' 的样品"
                    },
                    error=None,
                    error_code=None
                )
            
            # 为每个样品查询检测结果
            samples_data = []
            for sample in samples:
                # 查询检测结果
                results_stmt = select(Result).where(Result.sampleId == sample.id)
                results_result = await db.execute(results_stmt)
                results = results_result.scalars().all()
                
                # 格式化检测结果数据
                result_data = {}
                for result in results:
                    if result.value is not None:
                        result_data[result.parameter] = result.value
                
                # 构建样品数据
                sample_data = {
                    "sample_id": sample.id,
                    "sample_number": sample.sample_number,
                    "sample_name": sample.sample_name,
                    "sample_type": sample.sample_type,
                    "status": sample.status.value if hasattr(sample.status, 'value') else str(sample.status),
                    "result_data": result_data,
                    "result_count": len(result_data)
                }
                samples_data.append(sample_data)
            
            # 构建响应数据
            response_data = {
                "samples": samples_data,
                "total": len(samples_data)
            }
            
            # 计算处理耗时
            duration_ms = (time.time() - start_time) * 1000
            
            # 记录响应日志
            agent_logger.log_response(
                endpoint="/api/agent/search-sample",
                status_code=200,
                duration_ms=duration_ms
            )
            
            return APIResponse(
                success=True,
                data=response_data,
                error=None,
                error_code=None
            )
    
    except HTTPException:
        # 重新抛出 HTTP 异常
        raise
    
    except Exception as e:
        # 处理未预期的系统错误
        duration_ms = (time.time() - start_time) * 1000
        logger.error(f"搜索样品失败: {e}", exc_info=True)
        
        import traceback
        agent_logger.log_error(
            endpoint="/api/agent/search-sample",
            error_type=type(e).__name__,
            error_message=str(e),
            stack_trace=traceback.format_exc()
        )
        agent_logger.log_response("/api/agent/search-sample", 500, duration_ms)
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "系统处理请求时发生错误",
                "error_code": "INTERNAL_ERROR",
                "suggestion": "请稍后重试，如问题持续请联系管理员"
            }
        )


@router.get("/health", summary="健康检查")
async def health_check() -> Dict[str, Any]:
    """
    检查 AI Agent 服务健康状态
    
    此端点用于监控服务是否正常运行，检查核心模块的状态。
    
    ## 返回字段
    
    - **status** (string): 服务状态 ("healthy" 或 "unhealthy")
    - **service** (string): 服务名称
    - **knowledge_graph** (object): 知识图谱统计信息
      - **experiment_types** (int): 实验类型数量
      - **equipment** (int): 设备数量
      - **materials** (int): 材料数量
      - **indicators** (int): 指标数量
      - **steps** (int): 步骤数量
    - **modules** (object): 核心模块状态
      - **nlp_parser** (string): NLP 解析器状态
      - **plan_generator** (string): 计划生成器状态
      - **qa_engine** (string): 问答引擎状态
      - **result_analyzer** (string): 结果分析器状态
    
    ## 示例响应（健康）
    
    ```json
    {
        "status": "healthy",
        "service": "ai-agent",
        "knowledge_graph": {
            "experiment_types": 5,
            "equipment": 15,
            "materials": 20,
            "indicators": 25,
            "steps": 30
        },
        "modules": {
            "nlp_parser": "ok",
            "plan_generator": "ok",
            "qa_engine": "ok",
            "result_analyzer": "ok"
        }
    }
    ```
    
    ## 示例响应（不健康）
    
    ```json
    {
        "status": "unhealthy",
        "service": "ai-agent",
        "error": "知识图谱加载失败"
    }
    ```
    
    ## 使用场景
    
    - 服务启动后验证
    - 监控系统定期检查
    - 负载均衡器健康探测
    
    ## 验证需求
    
    需求 9.1, 9.5
    """
    try:
        # 检查核心模块是否正常
        from app.agent.knowledge_graph import get_knowledge_graph
        kg = get_knowledge_graph()
        stats = kg.get_statistics()
        
        return {
            "status": "healthy",
            "service": "ai-agent",
            "knowledge_graph": stats,
            "modules": {
                "nlp_parser": "ok",
                "plan_generator": "ok",
                "qa_engine": "ok",
                "result_analyzer": "ok"
            }
        }
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return {
            "status": "unhealthy",
            "service": "ai-agent",
            "error": str(e)
        }


@router.get("/logs", summary="查询日志")
async def query_logs(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    level: Optional[str] = None,
    operation_type: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    查询系统日志 (需求 13.10)
    
    此端点提供日志查询功能，支持按时间范围、日志级别和操作类型过滤。
    
    ## 查询参数
    
    - **start_time** (string, optional): 开始时间（ISO 8601 格式，如 "2026-05-06T10:00:00"）
    - **end_time** (string, optional): 结束时间（ISO 8601 格式）
    - **level** (string, optional): 日志级别（INFO, WARNING, ERROR）
    - **operation_type** (string, optional): 操作类型（request, response, error）
    - **limit** (int, optional): 返回结果数量限制（默认 100，最大 1000）
    
    ## 返回字段
    
    - **total** (int): 返回的日志数量
    - **logs** (array): 日志记录列表
      - **timestamp** (string): 时间戳
      - **level** (string): 日志级别
      - **module** (string): 模块名称
      - **operation_type** (string): 操作类型
      - **message** (string): 日志消息
      - **data** (object): 结构化数据
    
    ## 示例请求
    
    ```
    GET /api/agent/logs?level=ERROR&limit=50
    ```
    
    ## 示例响应
    
    ```json
    {
        "total": 5,
        "logs": [
            {
                "timestamp": "2026-05-06T10:30:00",
                "level": "ERROR",
                "module": "routes",
                "operation_type": "error",
                "message": "ERROR - {...}",
                "data": {
                    "type": "error",
                    "endpoint": "/api/agent/parse",
                    "error_type": "ValueError",
                    "error_message": "输入文本不能为空"
                }
            }
        ]
    }
    ```
    
    ## 验证需求
    
    需求 13.10
    """
    from datetime import datetime
    from app.agent.logger import LogQuery
    
    try:
        # 限制最大返回数量
        limit = min(limit, 1000)
        
        # 解析时间参数
        start_dt = datetime.fromisoformat(start_time) if start_time else None
        end_dt = datetime.fromisoformat(end_time) if end_time else None
        
        # 查询日志
        log_query = LogQuery()
        logs = log_query.query_logs(
            start_time=start_dt,
            end_time=end_dt,
            level=level,
            operation_type=operation_type,
            limit=limit
        )
        
        return {
            "total": len(logs),
            "logs": logs
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"时间格式错误: {e}",
                "error_code": "INVALID_TIME_FORMAT",
                "suggestion": "请使用 ISO 8601 格式，如 '2026-05-06T10:00:00'"
            }
        )
    
    except Exception as e:
        logger.error(f"日志查询失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "日志查询失败",
                "error_code": "QUERY_ERROR",
                "suggestion": "请稍后重试"
            }
        )


@router.get("/logs/statistics", summary="日志统计")
async def get_log_statistics(
    start_time: Optional[str] = None,
    end_time: Optional[str] = None
) -> Dict[str, Any]:
    """
    获取日志统计信息
    
    此端点提供日志统计功能，包括按级别、操作类型统计和平均响应时间。
    
    ## 查询参数
    
    - **start_time** (string, optional): 开始时间（ISO 8601 格式）
    - **end_time** (string, optional): 结束时间（ISO 8601 格式）
    
    ## 返回字段
    
    - **total_logs** (int): 总日志数量
    - **by_level** (object): 按级别统计
      - **INFO** (int): INFO 级别日志数量
      - **WARNING** (int): WARNING 级别日志数量
      - **ERROR** (int): ERROR 级别日志数量
    - **by_operation** (object): 按操作类型统计
      - **request** (int): 请求日志数量
      - **response** (int): 响应日志数量
      - **error** (int): 错误日志数量
    - **avg_duration_ms** (float): 平均响应时间（毫秒）
    - **error_count** (int): 错误总数
    
    ## 示例响应
    
    ```json
    {
        "total_logs": 1000,
        "by_level": {
            "INFO": 850,
            "WARNING": 100,
            "ERROR": 50
        },
        "by_operation": {
            "request": 400,
            "response": 400,
            "error": 50
        },
        "avg_duration_ms": 125.5,
        "error_count": 50
    }
    ```
    """
    from datetime import datetime
    from app.agent.logger import LogQuery
    
    try:
        # 解析时间参数
        start_dt = datetime.fromisoformat(start_time) if start_time else None
        end_dt = datetime.fromisoformat(end_time) if end_time else None
        
        # 获取统计信息
        log_query = LogQuery()
        stats = log_query.get_statistics(start_time=start_dt, end_time=end_dt)
        
        return stats
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": f"时间格式错误: {e}",
                "error_code": "INVALID_TIME_FORMAT",
                "suggestion": "请使用 ISO 8601 格式，如 '2026-05-06T10:00:00'"
            }
        )
    
    except Exception as e:
        logger.error(f"统计查询失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "success": False,
                "error": "统计查询失败",
                "error_code": "QUERY_ERROR",
                "suggestion": "请稍后重试"
            }
        )
