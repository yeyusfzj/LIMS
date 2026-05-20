"""
API 文档管理路由

提供 API 文档的导出、版本管理等功能
"""
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import FileResponse, JSONResponse
from typing import List, Dict, Any
from pathlib import Path
import json

from app.utils.openapi_generator import OpenAPIGenerator

router = APIRouter(prefix="/api/v1/docs", tags=["文档管理"])

# 创建文档生成器实例
generator = None


def get_generator() -> OpenAPIGenerator:
    """获取文档生成器实例（延迟导入避免循环依赖）"""
    global generator
    if generator is None:
        from app.main import app as fastapi_app
        generator = OpenAPIGenerator(fastapi_app, docs_dir="docs/api")
    return generator


@router.get("/openapi.json", summary="导出 OpenAPI JSON 规范")
async def export_openapi_json():
    """
    导出 OpenAPI JSON 格式规范
    
    返回当前 API 的 OpenAPI 3.0 规范（JSON 格式）
    """
    try:
        gen = get_generator()
        spec = gen.generate_openapi_spec()
        return JSONResponse(content=spec)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/openapi.yaml", summary="导出 OpenAPI YAML 规范")
async def export_openapi_yaml():
    """
    导出 OpenAPI YAML 格式规范
    
    返回当前 API 的 OpenAPI 3.0 规范（YAML 格式）
    """
    try:
        gen = get_generator()
        yaml_path = gen.export_to_yaml()
        
        # 读取 YAML 文件内容
        with open(yaml_path, 'r', encoding='utf-8') as f:
            yaml_content = f.read()
        
        return Response(
            content=yaml_content,
            media_type="application/x-yaml",
            headers={
                "Content-Disposition": "attachment; filename=openapi.yaml"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")


@router.get("/statistics", summary="获取文档统计信息")
async def get_documentation_statistics():
    """
    获取 API 文档统计信息
    
    返回 API 端点数量、数据模型数量、标签数量等统计信息
    """
    try:
        gen = get_generator()
        stats = gen.get_statistics()
        return {
            "message": "获取统计信息成功",
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.post("/versions/archive", summary="归档当前版本文档")
async def archive_current_version(
    version: str = None,
    description: str = ""
):
    """
    归档当前版本的 API 文档
    
    将当前 API 文档保存为指定版本，用于版本管理和历史追溯
    
    - **version**: 版本号（可选，默认使用应用版本）
    - **description**: 版本描述
    """
    try:
        gen = get_generator()
        version_dir = gen.archive_version(version, description)
        return {
            "message": "版本归档成功",
            "data": {
                "version": version or fastapi_app.version,
                "path": version_dir,
                "description": description
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"归档失败: {str(e)}")


@router.get("/versions", summary="列出所有归档版本")
async def list_archived_versions():
    """
    列出所有已归档的 API 文档版本
    
    返回版本号、归档时间、描述等信息
    """
    try:
        gen = get_generator()
        versions = gen.list_versions()
        return {
            "message": "获取版本列表成功",
            "data": {
                "versions": versions,
                "total": len(versions)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取版本列表失败: {str(e)}")


@router.post("/versions/{version}/restore", summary="恢复指定版本文档")
async def restore_archived_version(version: str):
    """
    恢复指定版本的 API 文档
    
    将归档的版本文档恢复为当前文档
    
    - **version**: 要恢复的版本号
    """
    try:
        gen = get_generator()
        success = gen.restore_version(version)
        
        if not success:
            raise HTTPException(status_code=404, detail=f"版本 {version} 不存在")
        
        return {
            "message": f"版本 {version} 恢复成功",
            "data": {
                "version": version
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"恢复失败: {str(e)}")


@router.get("/versions/compare", summary="对比两个版本")
async def compare_two_versions(version1: str, version2: str):
    """
    对比两个版本的 API 文档差异
    
    返回端点变更、数据模型变更等差异信息
    
    - **version1**: 版本1
    - **version2**: 版本2
    """
    try:
        gen = get_generator()
        diff = gen.compare_versions(version1, version2)
        
        if "error" in diff:
            raise HTTPException(status_code=404, detail=diff["error"])
        
        return {
            "message": "版本对比成功",
            "data": diff
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对比失败: {str(e)}")


@router.post("/generate", summary="生成所有格式文档")
async def generate_all_documentation():
    """
    生成所有格式的 API 文档
    
    生成 JSON、YAML 和 HTML 格式的文档文件
    """
    try:
        gen = get_generator()
        files = gen.generate_all()
        return {
            "message": "文档生成成功",
            "data": {
                "files": files
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")
