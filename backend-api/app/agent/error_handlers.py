"""
统一错误处理器 - 本地轻量化 AI 智能体

提供统一的错误处理机制，确保所有错误响应格式一致。
验证需求：需求 7.13-7.15, 14.1-14.10
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from datetime import datetime
import logging

from app.agent.exceptions import (
    AgentException,
    EmptyInputException,
    UnrecognizedTextException,
    LowConfidenceException,
    ParseException,
    PlanGenerationException,
    AnalysisException,
    KnowledgeGraphException
)

logger = logging.getLogger(__name__)


async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """
    处理请求验证错误（400 Bad Request）
    
    当请求参数不符合 Pydantic 模型定义时触发。
    
    验证需求：需求 7.13, 14.5
    """
    errors = exc.errors()
    error_details = []
    
    for error in errors:
        field = ".".join(str(loc) for loc in error["loc"])
        error_details.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"请求验证失败: {error_details}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "success": False,
            "error": "请求参数验证失败",
            "error_code": "INVALID_INPUT",
            "details": error_details,
            "suggestion": "请检查请求参数是否符合要求",
            "timestamp": datetime.now().isoformat()
        },
        headers={"Content-Type": "application/json"}
    )


async def empty_input_error_handler(request: Request, exc: EmptyInputException) -> JSONResponse:
    """
    处理空输入错误（400 Bad Request）
    
    当用户提交空文本或空数据时触发。
    
    验证需求：需求 1.12, 14.1
    """
    logger.warning(f"空输入错误: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def parse_error_handler(request: Request, exc: ParseException) -> JSONResponse:
    """
    处理解析错误（422 Unprocessable Entity）
    
    当文本解析失败时触发。
    
    验证需求：需求 1.13, 14.1
    """
    logger.warning(f"解析错误: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def unrecognized_text_error_handler(request: Request, exc: UnrecognizedTextException) -> JSONResponse:
    """
    处理无法识别文本错误（422 Unprocessable Entity）
    
    当输入文本无法识别任何字段时触发。
    
    验证需求：需求 1.13, 14.1
    """
    logger.warning(f"无法识别文本: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def low_confidence_error_handler(request: Request, exc: LowConfidenceException) -> JSONResponse:
    """
    处理低置信度错误（422 Unprocessable Entity）
    
    当解析置信度过低时触发。
    
    验证需求：需求 14.1
    """
    logger.warning(f"低置信度: {exc.message}, 置信度: {exc.confidence}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def knowledge_graph_error_handler(request: Request, exc: KnowledgeGraphException) -> JSONResponse:
    """
    处理知识图谱错误（404 Not Found 或 500 Internal Server Error）
    
    当知识图谱查询失败或资源不存在时触发。
    
    验证需求：需求 14.2
    """
    logger.error(f"知识图谱错误: {exc.message}")
    
    # 根据错误消息判断状态码
    if "不存在" in exc.message or "未找到" in exc.message:
        status_code = status.HTTP_404_NOT_FOUND
        error_code = "RESOURCE_NOT_FOUND"
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "KNOWLEDGE_GRAPH_ERROR"
    
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": exc.message,
            "error_code": error_code,
            "suggestion": exc.suggestion,
            "timestamp": datetime.now().isoformat()
        },
        headers={"Content-Type": "application/json"}
    )


async def plan_generation_error_handler(request: Request, exc: PlanGenerationException) -> JSONResponse:
    """
    处理实验计划生成错误（500 Internal Server Error）
    
    当实验计划生成失败时触发。
    
    验证需求：需求 14.3
    """
    logger.error(f"计划生成错误: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def analysis_error_handler(request: Request, exc: AnalysisException) -> JSONResponse:
    """
    处理结果分析错误（500 Internal Server Error）
    
    当结果分析失败时触发。
    
    验证需求：需求 14.4
    """
    logger.error(f"分析错误: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def agent_error_handler(request: Request, exc: AgentException) -> JSONResponse:
    """
    处理通用智能体错误（422 Unprocessable Entity）
    
    当其他智能体异常发生时触发。
    
    验证需求：需求 14.1
    """
    logger.error(f"智能体错误: {exc.message}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=exc.to_dict(),
        headers={"Content-Type": "application/json"}
    )


async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    处理系统内部错误（500 Internal Server Error）
    
    当未预期的系统错误发生时触发。
    
    验证需求：需求 14.6, 14.7, 14.8, 14.9, 14.10
    """
    logger.error(f"系统内部错误: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": "系统处理请求时发生错误",
            "error_code": "INTERNAL_ERROR",
            "suggestion": "请稍后重试，如问题持续请联系管理员",
            "timestamp": datetime.now().isoformat()
        },
        headers={"Content-Type": "application/json"}
    )


def register_error_handlers(app):
    """
    注册所有错误处理器到 FastAPI 应用
    
    Args:
        app: FastAPI 应用实例
    
    验证需求：需求 7.15, 14.1-14.10
    """
    # 请求验证错误
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    
    # 智能体自定义异常
    app.add_exception_handler(EmptyInputException, empty_input_error_handler)
    app.add_exception_handler(ParseException, parse_error_handler)
    app.add_exception_handler(UnrecognizedTextException, unrecognized_text_error_handler)
    app.add_exception_handler(LowConfidenceException, low_confidence_error_handler)
    app.add_exception_handler(KnowledgeGraphException, knowledge_graph_error_handler)
    app.add_exception_handler(PlanGenerationException, plan_generation_error_handler)
    app.add_exception_handler(AnalysisException, analysis_error_handler)
    app.add_exception_handler(AgentException, agent_error_handler)
    
    # 通用系统错误
    app.add_exception_handler(Exception, internal_error_handler)
    
    logger.info("✓ 错误处理器注册完成")
