"""
仓库层模块

提供数据访问层的基础类和具体实现。
"""
from app.repositories.base_repository import (
    BaseRepository,
    PaginatedResponse,
    ModelType,
    CreateSchemaType,
    UpdateSchemaType
)
from app.repositories.sample_repository import SampleRepository

__all__ = [
    "BaseRepository",
    "PaginatedResponse",
    "ModelType",
    "CreateSchemaType",
    "UpdateSchemaType",
    "SampleRepository",
]
