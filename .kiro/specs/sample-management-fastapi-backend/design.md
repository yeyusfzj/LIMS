# 设计文档

## 概述

本文档描述了样品管理 FastAPI 后端服务的技术设计。该服务作为独立的微服务运行，专门处理样品管理相关的业务逻辑，与现有的 Node.js/Express 后端并存，共享同一个 PostgreSQL 数据库。

### 设计目标

1. **高性能**: 利用 FastAPI 的异步特性和 Python 的性能优势
2. **无缝集成**: 与现有 Node.js 后端和 PostgreSQL 数据库完全兼容
3. **类型安全**: 使用 Pydantic 实现端到端的类型验证
4. **易于维护**: 清晰的分层架构和完整的文档
5. **可扩展性**: 为未来的微服务架构演进做准备

### 技术选型理由

- **FastAPI**: 现代、高性能的 Python Web 框架，自动生成 OpenAPI 文档
- **SQLAlchemy**: 成熟的 Python ORM，支持异步操作
- **Pydantic**: 强大的数据验证和序列化库
- **asyncpg**: 高性能的异步 PostgreSQL 驱动
- **Python 3.11+**: 最新的 Python 版本，性能提升显著


## 架构设计

### 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     前端 (Vue.js)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway (可选)                          │
│              - 路由                                          │
│              - 负载均衡                                       │
│              - 限流                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ↓                       ↓
┌──────────────────────────┐  ┌──────────────────────────┐
│  Node.js Backend         │  │  FastAPI Backend         │
│  (Express)               │  │  (样品管理服务)           │
│  - 其他业务模块           │  │  - 样品 CRUD             │
│  - 工作流                │  │  - 样品流转              │
│  - 报告                  │  │  - 分样/合样             │
│  - 审核                  │  │  - 监管链追踪            │
│  Port: 3000              │  │  Port: 8000              │
└──────────────────────────┘  └──────────────────────────┘
                │                       │
                └───────────┬───────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │  PostgreSQL Database  │
                │  - 共享数据库          │
                │  - Prisma Schema      │
                │  Port: 5432           │
                └───────────────────────┘
                            │
                            ↓
                ┌───────────────────────┐
                │  Redis (可选)         │
                │  - 缓存               │
                │  - 会话存储           │
                │  Port: 6379           │
                └───────────────────────┘
```

### 分层架构

FastAPI 服务采用经典的分层架构：

```
┌─────────────────────────────────────────┐
│         API Layer (路由层)               │
│  - FastAPI 路由定义                      │
│  - 请求参数解析                          │
│  - 响应格式化                            │
│  - OpenAPI 文档生成                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Middleware Layer (中间件层)         │
│  - JWT 认证                              │
│  - RBAC 权限检查                         │
│  - 请求日志                              │
│  - 错误处理                              │
│  - CORS 配置                             │
│  - 限流保护                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Schema Layer (数据模型层)           │
│  - Pydantic 模型定义                     │
│  - 请求验证                              │
│  - 响应序列化                            │
│  - 类型检查                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Service Layer (业务逻辑层)          │
│  - 样品管理业务逻辑                       │
│  - 流转管理                              │
│  - 分样/合样逻辑                         │
│  - 条码生成                              │
│  - 事务管理                              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      Repository Layer (数据访问层)       │
│  - SQLAlchemy 模型                       │
│  - 数据库查询                            │
│  - 事务控制                              │
│  - 连接池管理                            │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Database Layer (数据层)          │
│  PostgreSQL + asyncpg                    │
└─────────────────────────────────────────┘
```

### 目录结构

```
fastapi-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # 应用入口
│   ├── config.py               # 配置管理
│   ├── dependencies.py         # 依赖注入
│   │
│   ├── api/                    # API 路由层
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── samples.py      # 样品路由
│   │   │   ├── transfers.py    # 流转路由
│   │   │   └── health.py       # 健康检查
│   │   └── deps.py             # API 依赖
│   │
│   ├── schemas/                # Pydantic 模型层
│   │   ├── __init__.py
│   │   ├── sample.py           # 样品模型
│   │   ├── transfer.py         # 流转模型
│   │   ├── common.py           # 通用模型
│   │   └── response.py         # 响应模型
│   │
│   ├── models/                 # SQLAlchemy 模型层
│   │   ├── __init__.py
│   │   ├── sample.py           # 样品数据模型
│   │   ├── transfer.py         # 流转数据模型
│   │   └── base.py             # 基础模型
│   │
│   ├── services/               # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── sample_service.py   # 样品服务
│   │   ├── transfer_service.py # 流转服务
│   │   ├── barcode_service.py  # 条码生成服务
│   │   └── auth_service.py     # 认证服务
│   │
│   ├── repositories/           # 数据访问层
│   │   ├── __init__.py
│   │   ├── sample_repository.py
│   │   ├── transfer_repository.py
│   │   └── base_repository.py
│   │
│   ├── middleware/             # 中间件层
│   │   ├── __init__.py
│   │   ├── auth.py             # 认证中间件
│   │   ├── logging.py          # 日志中间件
│   │   ├── error_handler.py    # 错误处理
│   │   └── rate_limit.py       # 限流中间件
│   │
│   ├── core/                   # 核心功能
│   │   ├── __init__.py
│   │   ├── security.py         # 安全相关
│   │   ├── database.py         # 数据库连接
│   │   ├── logging.py          # 日志配置
│   │   └── exceptions.py       # 自定义异常
│   │
│   └── utils/                  # 工具函数
│       ├── __init__.py
│       ├── barcode.py          # 条码生成
│       ├── validators.py       # 验证器
│       └── helpers.py          # 辅助函数
│
├── tests/                      # 测试目录
│   ├── __init__.py
│   ├── conftest.py             # pytest 配置
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── property/               # 属性测试
│
├── alembic/                    # 数据库迁移
│   ├── versions/
│   └── env.py
│
├── .env.example                # 环境变量示例
├── .gitignore
├── Dockerfile                  # Docker 配置
├── docker-compose.yml
├── requirements.txt            # 依赖列表
├── pyproject.toml              # 项目配置
└── README.md
```


## 组件和接口

### 核心组件

#### 1. API 路由层 (API Router)

**职责**: 定义 RESTful API 端点，处理 HTTP 请求和响应

**主要路由**:

```python
# app/api/v1/samples.py
from fastapi import APIRouter, Depends, Query, Path, Body
from typing import List, Optional
from app.schemas.sample import (
    SampleCreate, SampleUpdate, SampleResponse,
    SampleListResponse, SampleQuery
)
from app.services.sample_service import SampleService
from app.api.deps import get_current_user, check_permission

router = APIRouter(prefix="/samples", tags=["samples"])

@router.post("/", response_model=SampleResponse, status_code=201)
async def create_sample(
    sample: SampleCreate,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """创建新样品"""
    pass

@router.get("/", response_model=SampleListResponse)
async def list_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    barcode: Optional[str] = None,
    sample_number: Optional[str] = None,
    client_name: Optional[str] = None,
    sample_type: Optional[str] = None,
    status: Optional[str] = None,
    service: SampleService = Depends()
):
    """查询样品列表（分页）"""
    pass

@router.get("/{sample_id}", response_model=SampleResponse)
async def get_sample(
    sample_id: str = Path(...),
    service: SampleService = Depends()
):
    """获取样品详情"""
    pass

@router.patch("/{sample_id}", response_model=SampleResponse)
async def update_sample(
    sample_id: str = Path(...),
    sample: SampleUpdate,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """更新样品信息"""
    pass

@router.post("/{sample_id}/transfer", response_model=TransferResponse, status_code=201)
async def transfer_sample(
    sample_id: str = Path(...),
    transfer: TransferCreate,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """创建样品流转记录"""
    pass

@router.post("/{sample_id}/split", response_model=List[SampleResponse], status_code=201)
async def split_sample(
    sample_id: str = Path(...),
    split_data: SampleSplitRequest,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """分样操作"""
    pass

@router.post("/merge", response_model=SampleResponse, status_code=201)
async def merge_samples(
    merge_data: SampleMergeRequest,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """合样操作"""
    pass

@router.delete("/{sample_id}", status_code=200)
async def delete_sample(
    sample_id: str = Path(...),
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """删除样品（软删除）"""
    pass
```

#### 2. Pydantic 模型层 (Schema Layer)

**职责**: 定义请求和响应的数据结构，自动验证和序列化

**样品模型**:

```python
# app/schemas/sample.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from enum import Enum

class SampleStatus(str, Enum):
    REGISTERED = "REGISTERED"
    IN_TESTING = "IN_TESTING"
    TESTING_COMPLETE = "TESTING_COMPLETE"
    IN_AUDIT = "IN_AUDIT"
    AUDIT_COMPLETE = "AUDIT_COMPLETE"
    RELEASED = "RELEASED"
    ARCHIVED = "ARCHIVED"

class Priority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

class SampleBase(BaseModel):
    client_name: str = Field(..., min_length=1, max_length=200)
    client_contact: Optional[str] = Field(None, max_length=100)
    sample_name: str = Field(..., min_length=1, max_length=200)
    sample_type: str = Field(..., min_length=1, max_length=100)
    sample_category: str = Field(..., min_length=1, max_length=100)
    quantity: float = Field(..., gt=0)
    unit: str = Field(..., min_length=1, max_length=20)
    received_date: datetime
    sampling_date: Optional[datetime] = None
    sampling_location: Optional[str] = Field(None, max_length=200)
    sampling_person: Optional[str] = Field(None, max_length=100)
    storage_location: Optional[str] = Field(None, max_length=200)
    storage_condition: Optional[str] = Field(None, max_length=200)
    priority: Priority = Priority.NORMAL
    description: Optional[str] = None
    remarks: Optional[str] = None

    @validator('client_name', 'sample_name', 'sample_type', pre=True)
    def strip_strings(cls, v):
        """清洗字符串，去除首尾空格"""
        return v.strip() if isinstance(v, str) else v

class SampleCreate(SampleBase):
    """创建样品请求模型"""
    pass

class SampleUpdate(BaseModel):
    """更新样品请求模型（所有字段可选）"""
    client_name: Optional[str] = Field(None, min_length=1, max_length=200)
    client_contact: Optional[str] = Field(None, max_length=100)
    sample_name: Optional[str] = Field(None, min_length=1, max_length=200)
    sample_type: Optional[str] = Field(None, min_length=1, max_length=100)
    sample_category: Optional[str] = Field(None, min_length=1, max_length=100)
    quantity: Optional[float] = Field(None, gt=0)
    unit: Optional[str] = Field(None, min_length=1, max_length=20)
    sampling_date: Optional[datetime] = None
    sampling_location: Optional[str] = Field(None, max_length=200)
    sampling_person: Optional[str] = Field(None, max_length=100)
    storage_location: Optional[str] = Field(None, max_length=200)
    storage_condition: Optional[str] = Field(None, max_length=200)
    priority: Optional[Priority] = None
    description: Optional[str] = None
    remarks: Optional[str] = None
    status: Optional[SampleStatus] = None

class SampleResponse(SampleBase):
    """样品响应模型"""
    id: str
    barcode: str
    sample_number: str
    status: SampleStatus
    version: int
    parent_sample_id: Optional[str] = None
    merged_from_ids: List[str] = []
    created_by: str
    created_at: datetime
    updated_at: datetime
    released_at: Optional[datetime] = None
    released_by: Optional[str] = None

    class Config:
        orm_mode = True

class SampleListResponse(BaseModel):
    """样品列表响应模型"""
    items: List[SampleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
```

**流转模型**:

```python
# app/schemas/transfer.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TransferStatus(str, Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class TransferCreate(BaseModel):
    from_location: str = Field(..., min_length=1, max_length=200)
    to_location: str = Field(..., min_length=1, max_length=200)
    from_person: str = Field(..., min_length=1, max_length=100)
    to_person: str = Field(..., min_length=1, max_length=100)
    remarks: Optional[str] = None

class TransferConfirm(BaseModel):
    confirmation_type: str = Field(..., pattern="^(sender|receiver)$")

class TransferResponse(BaseModel):
    id: str
    sample_id: str
    from_location: str
    to_location: str
    from_person: str
    to_person: str
    transfer_date: datetime
    received_date: Optional[datetime] = None
    status: TransferStatus
    remarks: Optional[str] = None
    sender_confirmed: bool
    receiver_confirmed: bool
    created_at: datetime

    class Config:
        orm_mode = True
```

**通用响应模型**:

```python
# app/schemas/response.py
from pydantic import BaseModel
from typing import Optional, Any, Dict

class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None

class APIResponse(BaseModel):
    """统一 API 响应格式（与 Node.js 后端兼容）"""
    message: str
    data: Optional[Any] = None
    error: Optional[ErrorDetail] = None

class HealthResponse(BaseModel):
    status: str
    database: str
    timestamp: datetime
```

#### 3. 业务逻辑层 (Service Layer)

**职责**: 实现核心业务逻辑，协调数据访问层

**样品服务**:

```python
# app/services/sample_service.py
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from app.models.sample import Sample
from app.models.transfer import Transfer
from app.repositories.sample_repository import SampleRepository
from app.repositories.transfer_repository import TransferRepository
from app.services.barcode_service import BarcodeService
from app.schemas.sample import SampleCreate, SampleUpdate, SampleStatus
from app.core.exceptions import NotFoundException, ValidationException
import logging

logger = logging.getLogger(__name__)

class SampleService:
    def __init__(
        self,
        db: AsyncSession,
        sample_repo: SampleRepository,
        transfer_repo: TransferRepository,
        barcode_service: BarcodeService
    ):
        self.db = db
        self.sample_repo = sample_repo
        self.transfer_repo = transfer_repo
        self.barcode_service = barcode_service

    async def create_sample(
        self,
        sample_data: SampleCreate,
        created_by: str
    ) -> Sample:
        """创建样品"""
        try:
            # 生成唯一条码和样品编号
            barcode = await self.barcode_service.generate_barcode()
            sample_number = await self.barcode_service.generate_sample_number()
            
            logger.info(f"Creating sample with barcode: {barcode}")
            
            # 创建样品记录
            sample = await self.sample_repo.create({
                **sample_data.dict(),
                "barcode": barcode,
                "sample_number": sample_number,
                "status": SampleStatus.REGISTERED,
                "created_by": created_by
            })
            
            await self.db.commit()
            await self.db.refresh(sample)
            
            logger.info(f"Sample created successfully: {sample.id}")
            return sample
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to create sample: {str(e)}")
            raise

    async def list_samples(
        self,
        page: int = 1,
        page_size: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """查询样品列表（分页）"""
        # 构建查询条件
        conditions = []
        
        # 默认排除已归档的样品
        if not filters or filters.get("status") is None:
            conditions.append(Sample.status != SampleStatus.ARCHIVED)
        
        if filters:
            if filters.get("barcode"):
                conditions.append(Sample.barcode.contains(filters["barcode"]))
            if filters.get("sample_number"):
                conditions.append(Sample.sample_number.contains(filters["sample_number"]))
            if filters.get("client_name"):
                conditions.append(Sample.client_name.contains(filters["client_name"]))
            if filters.get("sample_type"):
                conditions.append(Sample.sample_type == filters["sample_type"])
            if filters.get("status"):
                conditions.append(Sample.status == filters["status"])
        
        # 查询数据
        samples, total = await self.sample_repo.find_with_pagination(
            conditions=conditions,
            page=page,
            page_size=page_size,
            order_by=[Sample.created_at.desc()]
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        return {
            "items": samples,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages
        }

    async def get_sample(self, sample_id: str) -> Sample:
        """获取样品详情"""
        sample = await self.sample_repo.find_by_id(
            sample_id,
            include_relations=["test_items", "transfers", "audit_tasks"]
        )
        
        if not sample:
            raise NotFoundException(f"样品不存在: {sample_id}")
        
        return sample

    async def update_sample(
        self,
        sample_id: str,
        sample_data: SampleUpdate
    ) -> Sample:
        """更新样品信息"""
        sample = await self.get_sample(sample_id)
        
        # 过滤掉 None 值和受保护字段
        update_data = {
            k: v for k, v in sample_data.dict(exclude_unset=True).items()
            if v is not None and k not in ["barcode", "sample_number", "created_at"]
        }
        
        if not update_data:
            return sample
        
        try:
            updated_sample = await self.sample_repo.update(sample_id, update_data)
            await self.db.commit()
            await self.db.refresh(updated_sample)
            
            logger.info(f"Sample updated: {sample_id}")
            return updated_sample
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to update sample: {str(e)}")
            raise

    async def transfer_sample(
        self,
        sample_id: str,
        transfer_data: Dict[str, Any],
        created_by: str
    ) -> Transfer:
        """样品流转（使用事务确保原子性）"""
        try:
            # 检查样品是否存在
            sample = await self.get_sample(sample_id)
            
            # 创建流转记录
            transfer = await self.transfer_repo.create({
                **transfer_data,
                "sample_id": sample_id,
                "status": "PENDING",
                "sender_confirmed": False,
                "receiver_confirmed": False
            })
            
            # 更新样品位置
            await self.sample_repo.update(
                sample_id,
                {"storage_location": transfer_data["to_location"]}
            )
            
            await self.db.commit()
            await self.db.refresh(transfer)
            
            logger.info(f"Sample transferred: {sample_id}")
            return transfer
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to transfer sample: {str(e)}")
            raise

    async def split_sample(
        self,
        parent_sample_id: str,
        child_samples_data: List[Dict[str, Any]],
        created_by: str
    ) -> List[Sample]:
        """分样操作（使用事务确保原子性）"""
        try:
            # 检查母样品
            parent_sample = await self.get_sample(parent_sample_id)
            
            if parent_sample.status == SampleStatus.ARCHIVED:
                raise ValidationException("已归档的样品不能进行分样操作")
            
            # 创建所有子样品
            child_samples = []
            for child_data in child_samples_data:
                barcode = await self.barcode_service.generate_barcode()
                sample_number = await self.barcode_service.generate_sample_number()
                
                child_sample = await self.sample_repo.create({
                    **child_data,
                    "barcode": barcode,
                    "sample_number": sample_number,
                    "parent_sample_id": parent_sample_id,
                    "client_name": parent_sample.client_name,
                    "client_contact": parent_sample.client_contact,
                    "sample_type": parent_sample.sample_type,
                    "sample_category": parent_sample.sample_category,
                    "status": SampleStatus.REGISTERED,
                    "created_by": created_by
                })
                child_samples.append(child_sample)
            
            await self.db.commit()
            
            logger.info(f"Sample split: {parent_sample_id} -> {len(child_samples)} children")
            return child_samples
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to split sample: {str(e)}")
            raise

    async def merge_samples(
        self,
        source_sample_ids: List[str],
        merged_sample_data: Dict[str, Any],
        created_by: str
    ) -> Sample:
        """合样操作（使用事务确保原子性）"""
        try:
            # 检查所有来源样品
            source_samples = []
            for sample_id in source_sample_ids:
                sample = await self.get_sample(sample_id)
                if sample.status == SampleStatus.ARCHIVED:
                    raise ValidationException(f"已归档的样品不能进行合样操作: {sample_id}")
                source_samples.append(sample)
            
            # 生成条码和编号
            barcode = await self.barcode_service.generate_barcode()
            sample_number = await self.barcode_service.generate_sample_number()
            
            # 使用第一个来源样品的客户信息
            first_source = source_samples[0]
            
            # 创建合并样品
            merged_sample = await self.sample_repo.create({
                **merged_sample_data,
                "barcode": barcode,
                "sample_number": sample_number,
                "client_name": first_source.client_name,
                "client_contact": first_source.client_contact,
                "merged_from_ids": source_sample_ids,
                "status": SampleStatus.REGISTERED,
                "created_by": created_by
            })
            
            await self.db.commit()
            await self.db.refresh(merged_sample)
            
            logger.info(f"Samples merged: {source_sample_ids} -> {merged_sample.id}")
            return merged_sample
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to merge samples: {str(e)}")
            raise

    async def delete_sample(self, sample_id: str) -> None:
        """删除样品（软删除）"""
        sample = await self.get_sample(sample_id)
        
        # 检查是否有关联数据
        if sample.audit_tasks or sample.reports:
            raise ValidationException("该样品已有审核任务或报告，无法删除")
        
        try:
            # 软删除：更新状态为 ARCHIVED
            await self.sample_repo.update(
                sample_id,
                {"status": SampleStatus.ARCHIVED}
            )
            
            await self.db.commit()
            logger.info(f"Sample deleted (archived): {sample_id}")
            
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Failed to delete sample: {str(e)}")
            raise
```

**条码生成服务**:

```python
# app/services/barcode_service.py
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.sample import Sample
import asyncio

class BarcodeService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._lock = asyncio.Lock()

    async def generate_barcode(self) -> str:
        """生成唯一条码：SP{YYYYMMDD}{6位序列号}"""
        async with self._lock:
            now = datetime.now()
            date_prefix = now.strftime("%Y%m%d")
            barcode_prefix = f"SP{date_prefix}"
            
            # 查询今天已有的最大序列号
            stmt = select(func.max(Sample.barcode)).where(
                Sample.barcode.startswith(barcode_prefix)
            )
            result = await self.db.execute(stmt)
            last_barcode = result.scalar()
            
            if last_barcode:
                last_sequence = int(last_barcode[-6:])
                sequence = last_sequence + 1
            else:
                sequence = 1
            
            if sequence > 999999:
                raise ValueError("今日条码序列号已达上限")
            
            return f"{barcode_prefix}{sequence:06d}"

    async def generate_sample_number(self) -> str:
        """生成唯一样品编号：{YYYY}{6位序列号}"""
        async with self._lock:
            now = datetime.now()
            year_prefix = str(now.year)
            
            # 查询今年已有的最大序列号
            stmt = select(func.max(Sample.sample_number)).where(
                Sample.sample_number.startswith(year_prefix)
            )
            result = await self.db.execute(stmt)
            last_number = result.scalar()
            
            if last_number:
                last_sequence = int(last_number[-6:])
                sequence = last_sequence + 1
            else:
                sequence = 1
            
            if sequence > 999999:
                raise ValueError("今年样品编号序列号已达上限")
            
            return f"{year_prefix}{sequence:06d}"
```


#### 4. 数据访问层 (Repository Layer)

**职责**: 封装数据库操作，提供统一的数据访问接口

**基础仓库**:

```python
# app/repositories/base_repository.py
from typing import TypeVar, Generic, List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model: type[T], db: AsyncSession):
        self.model = model
        self.db = db

    async def create(self, data: Dict[str, Any]) -> T:
        """创建记录"""
        instance = self.model(**data)
        self.db.add(instance)
        await self.db.flush()
        return instance

    async def find_by_id(
        self,
        id: str,
        include_relations: Optional[List[str]] = None
    ) -> Optional[T]:
        """根据 ID 查询"""
        stmt = select(self.model).where(self.model.id == id)
        
        if include_relations:
            for relation in include_relations:
                stmt = stmt.options(selectinload(getattr(self.model, relation)))
        
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_with_pagination(
        self,
        conditions: Optional[List] = None,
        page: int = 1,
        page_size: int = 20,
        order_by: Optional[List] = None
    ) -> tuple[List[T], int]:
        """分页查询"""
        # 构建查询
        stmt = select(self.model)
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        # 计算总数
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await self.db.execute(count_stmt)
        total = total_result.scalar()
        
        # 分页和排序
        if order_by:
            for order in order_by:
                stmt = stmt.order_by(order)
        
        stmt = stmt.offset((page - 1) * page_size).limit(page_size)
        
        # 执行查询
        result = await self.db.execute(stmt)
        items = result.scalars().all()
        
        return items, total

    async def update(self, id: str, data: Dict[str, Any]) -> T:
        """更新记录"""
        instance = await self.find_by_id(id)
        if not instance:
            raise ValueError(f"Record not found: {id}")
        
        for key, value in data.items():
            setattr(instance, key, value)
        
        await self.db.flush()
        return instance

    async def delete(self, id: str) -> None:
        """删除记录"""
        instance = await self.find_by_id(id)
        if instance:
            await self.db.delete(instance)
            await self.db.flush()
```

**样品仓库**:

```python
# app/repositories/sample_repository.py
from app.repositories.base_repository import BaseRepository
from app.models.sample import Sample

class SampleRepository(BaseRepository[Sample]):
    def __init__(self, db):
        super().__init__(Sample, db)

    async def find_by_barcode(self, barcode: str) -> Optional[Sample]:
        """根据条码查询"""
        stmt = select(Sample).where(Sample.barcode == barcode)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def find_by_sample_number(self, sample_number: str) -> Optional[Sample]:
        """根据样品编号查询"""
        stmt = select(Sample).where(Sample.sample_number == sample_number)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()
```

#### 5. SQLAlchemy 模型层 (ORM Models)

**职责**: 定义数据库表结构，与 Prisma Schema 兼容

**样品模型**:

```python
# app/models/sample.py
from sqlalchemy import Column, String, Float, DateTime, Integer, Enum as SQLEnum, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.models.base import Base
import enum

class SampleStatus(str, enum.Enum):
    REGISTERED = "REGISTERED"
    IN_TESTING = "IN_TESTING"
    TESTING_COMPLETE = "TESTING_COMPLETE"
    IN_AUDIT = "IN_AUDIT"
    AUDIT_COMPLETE = "AUDIT_COMPLETE"
    RELEASED = "RELEASED"
    ARCHIVED = "ARCHIVED"

class Priority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"

class Sample(Base):
    __tablename__ = "samples"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    barcode = Column(String, unique=True, nullable=False, index=True)
    sample_number = Column(String, unique=True, nullable=False, index=True)
    
    # 客户信息
    client_name = Column(String(200), nullable=False, index=True)
    client_contact = Column(String(100))
    
    # 样品信息
    sample_name = Column(String(200), nullable=False)
    sample_type = Column(String(100), nullable=False)
    sample_category = Column(String(100), nullable=False)
    quantity = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    
    # 日期信息
    received_date = Column(DateTime, nullable=False)
    sampling_date = Column(DateTime)
    sampling_location = Column(String(200))
    sampling_person = Column(String(100))
    
    # 存储信息
    storage_location = Column(String(200))
    storage_condition = Column(String(200))
    
    # 状态和优先级
    status = Column(SQLEnum(SampleStatus), default=SampleStatus.REGISTERED, nullable=False, index=True)
    priority = Column(SQLEnum(Priority), default=Priority.NORMAL, nullable=False)
    
    # 描述和备注
    description = Column(String)
    remarks = Column(String)
    
    # 版本控制（乐观锁）
    version = Column(Integer, default=1, nullable=False)
    
    # 分样/合样关系
    parent_sample_id = Column(String, nullable=True)
    merged_from_ids = Column(ARRAY(String), default=[])
    
    # 审计字段
    created_by = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    released_at = Column(DateTime)
    released_by = Column(String)
    
    # 关联关系（可选，用于预加载）
    # test_items = relationship("TestItem", back_populates="sample")
    # transfers = relationship("Transfer", back_populates="sample")
    # audit_tasks = relationship("AuditTask", back_populates="sample")
```

**流转模型**:

```python
# app/models/transfer.py
from sqlalchemy import Column, String, DateTime, Boolean, Enum as SQLEnum
from sqlalchemy.sql import func
from app.models.base import Base
import enum

class TransferStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"

class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    sample_id = Column(String, nullable=False, index=True)
    
    from_location = Column(String(200), nullable=False)
    to_location = Column(String(200), nullable=False)
    from_person = Column(String(100), nullable=False)
    to_person = Column(String(100), nullable=False)
    
    transfer_date = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    received_date = Column(DateTime)
    
    status = Column(SQLEnum(TransferStatus), default=TransferStatus.PENDING, nullable=False)
    remarks = Column(String)
    
    # 双方确认
    sender_confirmed = Column(Boolean, default=False, nullable=False)
    receiver_confirmed = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
```

**基础模型**:

```python
# app/models/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
```

## 数据模型

### 数据库连接

使用 SQLAlchemy 异步引擎连接 PostgreSQL：

```python
# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    poolclass=NullPool if settings.TESTING else None
)

# 创建会话工厂
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

async def get_db() -> AsyncSession:
    """依赖注入：获取数据库会话"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

### 数据模型映射

FastAPI 服务的 SQLAlchemy 模型与 Prisma Schema 完全兼容：

| Prisma 类型 | SQLAlchemy 类型 | 说明 |
|------------|----------------|------|
| String | String | 字符串 |
| Int | Integer | 整数 |
| Float | Float | 浮点数 |
| Boolean | Boolean | 布尔值 |
| DateTime | DateTime | 日期时间 |
| Json | JSON | JSON 对象 |
| Enum | Enum | 枚举类型 |
| String[] | ARRAY(String) | 字符串数组 |

### 字段命名约定

- 使用 snake_case 命名（与 Prisma 一致）
- 表名使用复数形式（samples, transfers）
- 外键字段使用 `_id` 后缀（parent_sample_id）
- 时间戳字段：created_at, updated_at


## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性反思

在编写正确性属性之前，我们需要识别和消除冗余属性：

**识别的冗余**:
- 条码生成和样品编号生成的唯一性属性可以合并为一个综合属性
- 样品创建时的状态初始化和流转创建时的状态初始化是相同模式，可以统一表述
- 字段验证属性（必填字段、格式验证）可以合并为输入验证的综合属性

**消除冗余后的核心属性**:

### 属性 1: 条码和编号唯一性

*对于任意*数量的并发样品创建操作，生成的条码和样品编号应该全部唯一，不存在重复。

**验证需求**: 4.1, 4.2, 16.1, 16.2, 16.3, 16.4, 16.5

**测试策略**: 使用属性测试生成大量并发创建请求，验证所有生成的条码和编号都是唯一的，且符合格式规范（条码：`SP{YYYYMMDD}{6位序列号}`，编号：`{YYYY}{6位序列号}`）。

### 属性 2: 输入验证完整性

*对于任意*样品创建或更新请求，如果缺少必填字段或字段格式不正确，系统应该拒绝请求并返回详细的验证错误信息。

**验证需求**: 4.3, 4.6, 6.3, 8.3, 14.2, 14.4

**测试策略**: 生成随机的无效输入（缺失字段、错误类型、超出范围等），验证系统正确拒绝并返回 400/422 状态码和详细错误信息。

### 属性 3: 状态初始化不变量

*对于任意*新创建的实体（样品、流转记录），其初始状态应该符合预定义的规则：样品状态为 REGISTERED，流转状态为 PENDING。

**验证需求**: 4.4, 8.4

**测试策略**: 生成随机样品和流转创建请求，验证所有新创建实体的状态字段符合初始化规则。

### 属性 4: 事务原子性

*对于任意*需要多步操作的业务流程（流转、分样、合样），如果任何一步失败，整个操作应该回滚，数据库状态应该保持不变。

**验证需求**: 2.5, 8.2, 9.2

**测试策略**: 模拟事务中的各种失败场景（数据库连接中断、约束违反、业务规则失败），验证所有操作都被回滚，没有部分提交的数据。

### 属性 5: 查询过滤正确性

*对于任意*查询条件组合（条码、样品编号、客户名称、样品类型、状态、日期范围），返回的结果应该全部满足所有指定的过滤条件。

**验证需求**: 5.2, 5.3

**测试策略**: 生成随机数据集和随机过滤条件组合，验证查询结果中的每个样品都满足所有过滤条件。

### 属性 6: 默认过滤行为

*对于任意*未指定状态过滤的样品查询，返回的结果应该不包含状态为 ARCHIVED 的样品。

**验证需求**: 5.4

**测试策略**: 创建包含各种状态的样品数据集，执行不带状态过滤的查询，验证结果中没有 ARCHIVED 状态的样品。

### 属性 7: 分页元数据一致性

*对于任意*分页查询，返回的分页元数据（总数、页码、每页数量、总页数）应该与实际数据一致，且满足数学关系：`total_pages = ceil(total / page_size)`。

**验证需求**: 5.7

**测试策略**: 生成随机数据集和随机分页参数，验证分页元数据的计算正确性和一致性。

### 属性 8: 部分更新语义

*对于任意*样品更新请求，只有请求中明确指定的字段应该被更新，未指定的字段应该保持原值不变。

**验证需求**: 6.2

**测试策略**: 生成随机字段子集进行更新，验证只有指定字段被修改，其他字段保持不变。

### 属性 9: 时间戳自动更新

*对于任意*样品更新操作，updated_at 时间戳应该自动更新为当前时间，且新时间应该晚于旧时间。

**验证需求**: 6.6, 7.3

**测试策略**: 执行随机更新操作，验证每次更新后 updated_at 字段都被更新且单调递增。

### 属性 10: 受保护字段不可变

*对于任意*样品更新请求，系统生成的字段（条码、样品编号、创建时间）应该不能被修改，即使请求中包含这些字段。

**验证需求**: 6.7

**测试策略**: 尝试更新受保护字段，验证这些字段的值保持不变或请求被拒绝。

### 属性 11: 枚举值验证

*对于任意*状态更新请求，只有有效的枚举值应该被接受，无效值应该被拒绝并返回验证错误。

**验证需求**: 7.2

**测试策略**: 生成随机字符串作为状态值，验证只有预定义的枚举值被接受，其他值被拒绝。

### 属性 12: 流转位置同步

*对于任意*样品流转操作，样品的当前存储位置应该更新为流转的目标位置，且流转记录和样品记录应该在同一事务中更新。

**验证需求**: 8.5

**测试策略**: 执行流转操作，验证样品的 storage_location 字段与流转记录的 to_location 字段一致。

### 属性 13: 流转确认状态转换

*对于任意*流转记录，当且仅当发送方和接收方都确认时，流转状态应该更新为 RECEIVED；如果只有一方确认，状态应该为 IN_TRANSIT。

**验证需求**: 8.7

**测试策略**: 生成随机确认序列（发送方先确认、接收方先确认、双方同时确认），验证状态转换逻辑的正确性。

### 属性 14: 分样关系完整性

*对于任意*分样操作，所有子样品的 parent_sample_id 应该指向母样品的 ID，且母样品应该能够查询到所有子样品。

**验证需求**: 9.4

**测试策略**: 执行随机分样操作，验证父子关系的双向一致性。

### 属性 15: 合样来源记录

*对于任意*合样操作，合并后样品的 merged_from_ids 数组应该包含所有来源样品的 ID，且顺序和数量应该与输入一致。

**验证需求**: 9.7

**测试策略**: 执行随机合样操作，验证来源 ID 列表的完整性和准确性。

### 属性 16: 软删除不变量

*对于任意*样品删除操作，样品记录应该仍然存在于数据库中，但状态应该更新为 ARCHIVED，且在默认查询中不可见。

**验证需求**: 10.2

**测试策略**: 执行删除操作，验证样品记录仍然可以通过 ID 查询到，但状态为 ARCHIVED，且不出现在默认列表查询中。

### 属性 17: 批量操作统计准确性

*对于任意*批量删除操作，返回的成功和失败统计信息应该与实际操作结果一致，且 `success + failed = total_requested`。

**验证需求**: 10.5

**测试策略**: 执行包含部分成功和部分失败的批量删除操作，验证统计信息的准确性。

### 属性 18: JWT 令牌验证

*对于任意*JWT 令牌，系统应该能够正确验证其签名、过期时间和格式，且能够从有效令牌中提取用户 ID 和角色信息。

**验证需求**: 3.1, 3.4

**测试策略**: 生成各种有效和无效的 JWT 令牌（过期、签名错误、格式错误、缺少字段），验证验证逻辑的正确性。

### 属性 19: RBAC 权限判断

*对于任意*用户角色和资源操作组合，权限判断结果应该与预定义的权限规则一致。

**验证需求**: 3.5

**测试策略**: 生成随机用户角色和资源操作组合，验证权限判断逻辑与权限配置的一致性。

### 属性 20: 业务规则验证

*对于任意*违反业务规则的操作（如对已归档样品进行分样/合样、删除有关联数据的样品），系统应该拒绝操作并返回明确的错误信息。

**验证需求**: 9.8, 10.3

**测试策略**: 尝试执行各种违反业务规则的操作，验证系统正确拒绝并返回适当的错误代码和消息。


## 错误处理

### 错误响应格式

所有错误响应遵循统一格式（与 Node.js 后端兼容）：

```json
{
  "message": "操作失败",
  "error": {
    "code": "ERROR_CODE",
    "message": "详细错误信息",
    "details": {
      "field": "具体字段错误"
    }
  }
}
```

### 错误代码定义

```python
# app/core/exceptions.py
from fastapi import HTTPException, status
from typing import Optional, Any, Dict

class APIException(HTTPException):
    """基础 API 异常"""
    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: Optional[Any] = None
    ):
        self.error_code = error_code
        self.details = details
        super().__init__(
            status_code=status_code,
            detail={
                "code": error_code,
                "message": message,
                "details": details
            }
        )

class NotFoundException(APIException):
    """资源不存在异常"""
    def __init__(self, message: str = "资源不存在"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            message=message
        )

class ValidationException(APIException):
    """验证异常"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            message=message,
            details=details
        )

class UnauthorizedException(APIException):
    """未授权异常"""
    def __init__(self, message: str = "用户未认证"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
            message=message
        )

class ForbiddenException(APIException):
    """权限不足异常"""
    def __init__(self, message: str = "权限不足"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
            message=message
        )

class ConflictException(APIException):
    """冲突异常（如版本冲突）"""
    def __init__(self, message: str = "数据冲突"):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
            message=message
        )

class RateLimitException(APIException):
    """限流异常"""
    def __init__(self, message: str = "请求过于频繁", retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_EXCEEDED",
            message=message,
            details={"retry_after": retry_after}
        )

class InternalServerException(APIException):
    """内部服务器错误"""
    def __init__(self, message: str = "服务器内部错误"):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            error_code="INTERNAL_ERROR",
            message=message
        )
```

### 全局异常处理器

```python
# app/middleware/error_handler.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from app.core.exceptions import APIException
import logging

logger = logging.getLogger(__name__)

async def api_exception_handler(request: Request, exc: APIException):
    """处理自定义 API 异常"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "message": "操作失败",
            "error": {
                "code": exc.error_code,
                "message": exc.detail["message"],
                "details": exc.detail.get("details")
            }
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """处理 Pydantic 验证异常"""
    errors = {}
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"][1:])
        errors[field] = error["msg"]
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "message": "请求参数验证失败",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "请求参数格式不正确",
                "details": errors
            }
        }
    )

async def integrity_error_handler(request: Request, exc: IntegrityError):
    """处理数据库完整性约束异常"""
    logger.error(f"Database integrity error: {str(exc)}")
    
    # 解析约束违反类型
    error_msg = str(exc.orig)
    if "unique constraint" in error_msg.lower():
        message = "数据已存在，违反唯一性约束"
        code = "DUPLICATE_ERROR"
    elif "foreign key constraint" in error_msg.lower():
        message = "关联数据不存在"
        code = "FOREIGN_KEY_ERROR"
    else:
        message = "数据完整性约束违反"
        code = "INTEGRITY_ERROR"
    
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={
            "message": "操作失败",
            "error": {
                "code": code,
                "message": message
            }
        }
    )

async def database_error_handler(request: Request, exc: OperationalError):
    """处理数据库操作异常"""
    logger.error(f"Database operational error: {str(exc)}")
    
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "message": "服务暂时不可用",
            "error": {
                "code": "DATABASE_ERROR",
                "message": "数据库连接失败，请稍后重试"
            }
        }
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """处理未捕获的异常"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "message": "服务器内部错误",
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "服务器处理请求时发生错误"
            }
        }
    )
```

### 错误处理注册

```python
# app/main.py
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError, OperationalError
from app.core.exceptions import APIException
from app.middleware.error_handler import (
    api_exception_handler,
    validation_exception_handler,
    integrity_error_handler,
    database_error_handler,
    generic_exception_handler
)

app = FastAPI()

# 注册异常处理器
app.add_exception_handler(APIException, api_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_error_handler)
app.add_exception_handler(OperationalError, database_error_handler)
app.add_exception_handler(Exception, generic_exception_handler)
```

### 日志配置

```python
# app/core/logging.py
import logging
import sys
from datetime import datetime
import json
from typing import Any, Dict

class JSONFormatter(logging.Formatter):
    """JSON 格式日志"""
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # 添加额外字段
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False)

def setup_logging(log_level: str = "INFO"):
    """配置日志系统"""
    # 创建根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # 清除现有处理器
    root_logger.handlers.clear()
    
    # 创建控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JSONFormatter())
    root_logger.addHandler(console_handler)
    
    # 创建文件处理器（可选）
    # file_handler = logging.FileHandler("app.log")
    # file_handler.setFormatter(JSONFormatter())
    # root_logger.addHandler(file_handler)
    
    return root_logger
```

### 请求日志中间件

```python
# app/middleware/logging.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
import time
import uuid
import logging

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 生成请求 ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 记录请求开始
        start_time = time.time()
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host
            }
        )
        
        # 处理请求
        try:
            response = await call_next(request)
            
            # 计算处理时间
            process_time = time.time() - start_time
            
            # 记录请求完成
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "process_time": f"{process_time:.3f}s"
                }
            )
            
            # 添加响应头
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            
            return response
            
        except Exception as e:
            # 记录错误
            process_time = time.time() - start_time
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "process_time": f"{process_time:.3f}s"
                },
                exc_info=True
            )
            raise
```

## 测试策略

### 测试金字塔

```
        ┌─────────────────┐
        │  属性测试 (20%)  │  ← 验证通用属性和不变量
        ├─────────────────┤
        │  集成测试 (30%)  │  ← 测试 API 端点和数据库交互
        ├─────────────────┤
        │  单元测试 (50%)  │  ← 测试独立函数和类
        └─────────────────┘
```

### 单元测试

**目标**: 测试独立的函数和类，不依赖外部资源

**工具**: pytest, pytest-asyncio

**覆盖范围**:
- 业务逻辑层（Service Layer）
- 工具函数（Utils）
- 数据验证（Pydantic Models）
- 异常处理

**示例**:

```python
# tests/unit/test_barcode_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.barcode_service import BarcodeService
from datetime import datetime

@pytest.mark.asyncio
async def test_generate_barcode_format():
    """测试条码格式"""
    db_mock = AsyncMock()
    db_mock.execute = AsyncMock(return_value=MagicMock(scalar=lambda: None))
    
    service = BarcodeService(db_mock)
    barcode = await service.generate_barcode()
    
    # 验证格式：SP{YYYYMMDD}{6位序列号}
    assert barcode.startswith("SP")
    assert len(barcode) == 16
    assert barcode[2:10].isdigit()  # 日期部分
    assert barcode[10:].isdigit()   # 序列号部分

@pytest.mark.asyncio
async def test_generate_barcode_sequence():
    """测试条码序列号递增"""
    db_mock = AsyncMock()
    
    # 模拟已有条码
    last_barcode = f"SP{datetime.now().strftime('%Y%m%d')}000001"
    db_mock.execute = AsyncMock(
        return_value=MagicMock(scalar=lambda: last_barcode)
    )
    
    service = BarcodeService(db_mock)
    barcode = await service.generate_barcode()
    
    # 验证序列号递增
    assert barcode.endswith("000002")
```

### 集成测试

**目标**: 测试 API 端点和数据库交互

**工具**: pytest, httpx, TestClient

**覆盖范围**:
- API 路由
- 数据库操作
- 认证和授权
- 错误处理

**示例**:

```python
# tests/integration/test_sample_api.py
import pytest
from httpx import AsyncClient
from app.main import app
from app.core.database import get_db
from tests.conftest import override_get_db, test_db

@pytest.mark.asyncio
async def test_create_sample(async_client: AsyncClient, auth_headers: dict):
    """测试创建样品"""
    sample_data = {
        "client_name": "测试客户",
        "sample_name": "水样",
        "sample_type": "环境样品",
        "sample_category": "水质",
        "quantity": 500,
        "unit": "ml",
        "received_date": "2026-04-09T10:00:00Z"
    }
    
    response = await async_client.post(
        "/api/v1/samples/",
        json=sample_data,
        headers=auth_headers
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "样品创建成功"
    assert "data" in data
    assert data["data"]["barcode"].startswith("SP")
    assert data["data"]["status"] == "REGISTERED"

@pytest.mark.asyncio
async def test_list_samples_pagination(async_client: AsyncClient):
    """测试样品列表分页"""
    response = await async_client.get(
        "/api/v1/samples/?page=1&page_size=10"
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "items" in data["data"]
    assert "total" in data["data"]
    assert "page" in data["data"]
    assert "page_size" in data["data"]
    assert "total_pages" in data["data"]
    assert len(data["data"]["items"]) <= 10
```

### 属性测试

**目标**: 验证系统的通用属性和不变量

**工具**: pytest, hypothesis

**覆盖范围**:
- 条码和编号唯一性
- 输入验证完整性
- 事务原子性
- 查询过滤正确性
- 状态转换逻辑

**配置**:

```python
# tests/property/conftest.py
from hypothesis import settings, HealthCheck

# 配置 Hypothesis
settings.register_profile("ci", max_examples=100, deadline=None)
settings.register_profile("dev", max_examples=20, deadline=None)
settings.load_profile("dev")
```

**示例**:

```python
# tests/property/test_barcode_uniqueness.py
import pytest
from hypothesis import given, strategies as st
from hypothesis import settings
import asyncio
from app.services.barcode_service import BarcodeService
from tests.conftest import test_db

@pytest.mark.asyncio
@given(count=st.integers(min_value=10, max_value=100))
@settings(max_examples=100, deadline=None)
async def test_barcode_uniqueness_property(count: int, test_db):
    """
    属性测试：条码唯一性
    
    Feature: sample-management-fastapi-backend, Property 1: 条码和编号唯一性
    
    对于任意数量的并发样品创建操作，生成的条码应该全部唯一
    """
    service = BarcodeService(test_db)
    
    # 并发生成多个条码
    tasks = [service.generate_barcode() for _ in range(count)]
    barcodes = await asyncio.gather(*tasks)
    
    # 验证唯一性
    assert len(barcodes) == len(set(barcodes)), "生成的条码存在重复"
    
    # 验证格式
    for barcode in barcodes:
        assert barcode.startswith("SP"), f"条码格式错误: {barcode}"
        assert len(barcode) == 16, f"条码长度错误: {barcode}"
        assert barcode[2:10].isdigit(), f"日期部分格式错误: {barcode}"
        assert barcode[10:].isdigit(), f"序列号部分格式错误: {barcode}"
```

```python
# tests/property/test_input_validation.py
import pytest
from hypothesis import given, strategies as st
from hypothesis import settings
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
@given(
    client_name=st.one_of(st.none(), st.text(max_size=0)),
    sample_name=st.one_of(st.none(), st.text(max_size=0)),
    quantity=st.one_of(st.none(), st.floats(max_value=0))
)
@settings(max_examples=50)
async def test_input_validation_property(
    async_client: AsyncClient,
    auth_headers: dict,
    client_name,
    sample_name,
    quantity
):
    """
    属性测试：输入验证完整性
    
    Feature: sample-management-fastapi-backend, Property 2: 输入验证完整性
    
    对于任意无效输入，系统应该拒绝请求并返回验证错误
    """
    sample_data = {
        "client_name": client_name,
        "sample_name": sample_name,
        "sample_type": "环境样品",
        "sample_category": "水质",
        "quantity": quantity,
        "unit": "ml",
        "received_date": "2026-04-09T10:00:00Z"
    }
    
    response = await async_client.post(
        "/api/v1/samples/",
        json=sample_data,
        headers=auth_headers
    )
    
    # 验证请求被拒绝
    assert response.status_code in [400, 422], "无效输入应该被拒绝"
    
    # 验证错误响应格式
    data = response.json()
    assert "error" in data, "响应应该包含错误信息"
    assert "code" in data["error"], "错误应该包含错误代码"
    assert "message" in data["error"], "错误应该包含错误消息"
```

```python
# tests/property/test_transaction_atomicity.py
import pytest
from hypothesis import given, strategies as st
from hypothesis import settings
from app.services.sample_service import SampleService
from app.core.exceptions import ValidationException
from tests.conftest import test_db

@pytest.mark.asyncio
@given(
    child_count=st.integers(min_value=1, max_value=5),
    should_fail=st.booleans()
)
@settings(max_examples=50)
async def test_split_transaction_atomicity(
    test_db,
    sample_service: SampleService,
    child_count: int,
    should_fail: bool
):
    """
    属性测试：事务原子性
    
    Feature: sample-management-fastapi-backend, Property 4: 事务原子性
    
    对于任意分样操作，如果失败，所有操作应该回滚
    """
    # 创建母样品
    parent_sample = await sample_service.create_sample(
        sample_data={...},
        created_by="test_user"
    )
    
    # 准备子样品数据
    child_samples_data = [
        {
            "sample_name": f"子样品{i}",
            "quantity": 100 if not (should_fail and i == child_count - 1) else -100,  # 最后一个可能无效
            "unit": "ml"
        }
        for i in range(child_count)
    ]
    
    # 记录操作前的样品数量
    initial_count = await sample_service.count_samples()
    
    try:
        # 执行分样操作
        child_samples = await sample_service.split_sample(
            parent_sample_id=parent_sample.id,
            child_samples_data=child_samples_data,
            created_by="test_user"
        )
        
        # 如果应该失败但成功了，验证失败
        assert not should_fail, "操作应该失败但成功了"
        
        # 验证所有子样品都创建成功
        final_count = await sample_service.count_samples()
        assert final_count == initial_count + child_count
        
    except (ValidationException, Exception) as e:
        # 如果应该成功但失败了，验证失败
        assert should_fail, f"操作应该成功但失败了: {str(e)}"
        
        # 验证事务回滚：样品数量不变
        final_count = await sample_service.count_samples()
        assert final_count == initial_count, "事务应该回滚，样品数量应该不变"
```

### 测试配置

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.main import app
from app.core.database import get_db, Base
from app.config import settings

# 测试数据库 URL
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_db"

# 创建测试引擎
test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False
)

@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="function")
async def test_db():
    """创建测试数据库会话"""
    # 创建表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # 创建会话
    async with TestSessionLocal() as session:
        yield session
    
    # 清理表
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def async_client(test_db):
    """创建测试客户端"""
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers():
    """创建认证头"""
    # 生成测试 JWT token
    token = "test_jwt_token"
    return {"Authorization": f"Bearer {token}"}
```

### 测试覆盖率目标

- **总体覆盖率**: ≥ 80%
- **业务逻辑层**: ≥ 90%
- **API 路由层**: ≥ 85%
- **数据访问层**: ≥ 75%

### 持续集成

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov hypothesis
      
      - name: Run tests
        env:
          DATABASE_URL: postgresql+asyncpg://test:test@localhost:5432/test_db
        run: |
          pytest tests/ -v --cov=app --cov-report=xml --cov-report=term
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```


## 认证和授权设计

### JWT 认证

**认证流程**:

```
客户端 → 携带 JWT Token → FastAPI 服务
                              ↓
                        验证 Token 签名
                              ↓
                        验证 Token 过期时间
                              ↓
                        提取用户信息
                              ↓
                        检查权限
                              ↓
                        执行业务逻辑
```

**JWT 验证实现**:

```python
# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from app.config import settings
from app.core.exceptions import UnauthorizedException

class JWTHandler:
    def __init__(self):
        self.secret_key = settings.JWT_SECRET
        self.algorithm = "HS256"
        self.expires_delta = timedelta(minutes=settings.JWT_EXPIRES_IN_MINUTES)

    def decode_token(self, token: str) -> Dict:
        """解码并验证 JWT Token"""
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # 验证过期时间
            exp = payload.get("exp")
            if exp is None:
                raise UnauthorizedException("Token 缺少过期时间")
            
            if datetime.fromtimestamp(exp) < datetime.now():
                raise UnauthorizedException("Token 已过期")
            
            # 验证必需字段
            if "userId" not in payload:
                raise UnauthorizedException("Token 缺少用户 ID")
            
            return payload
            
        except JWTError as e:
            raise UnauthorizedException(f"Token 验证失败: {str(e)}")

    def extract_user_info(self, payload: Dict) -> Dict:
        """从 Token payload 中提取用户信息"""
        return {
            "user_id": payload.get("userId"),
            "username": payload.get("username"),
            "roles": payload.get("roles", []),
            "permissions": payload.get("permissions", [])
        }
```

**认证依赖**:

```python
# app/api/deps.py
from fastapi import Depends, Header
from typing import Optional
from app.core.security import JWTHandler
from app.core.exceptions import UnauthorizedException

jwt_handler = JWTHandler()

async def get_token_from_header(
    authorization: Optional[str] = Header(None)
) -> str:
    """从请求头中提取 Token"""
    if not authorization:
        raise UnauthorizedException("缺少认证令牌")
    
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise UnauthorizedException("认证令牌格式错误")
    
    return parts[1]

async def get_current_user(
    token: str = Depends(get_token_from_header)
) -> Dict:
    """获取当前用户信息"""
    payload = jwt_handler.decode_token(token)
    user_info = jwt_handler.extract_user_info(payload)
    return user_info
```

### RBAC 权限控制

**权限模型**:

```
用户 (User) → 拥有 → 角色 (Role) → 拥有 → 权限 (Permission)
                                              ↓
                                        资源:操作 (Resource:Action)
```

**权限检查实现**:

```python
# app/core/permissions.py
from typing import List, Dict
from app.core.exceptions import ForbiddenException

class PermissionChecker:
    """权限检查器"""
    
    # 权限定义：资源 -> 操作 -> 所需角色
    PERMISSIONS = {
        "sample": {
            "create": ["admin", "lab_staff"],
            "read": ["admin", "lab_staff", "auditor"],
            "update": ["admin", "lab_staff"],
            "delete": ["admin"],
            "transfer": ["admin", "lab_staff"],
            "split": ["admin", "lab_staff"],
            "merge": ["admin", "lab_staff"]
        },
        "transfer": {
            "confirm": ["admin", "lab_staff"],
            "cancel": ["admin"]
        }
    }
    
    def check_permission(
        self,
        user_roles: List[str],
        resource: str,
        action: str
    ) -> bool:
        """检查用户是否有权限执行操作"""
        if not user_roles:
            return False
        
        # 获取所需角色
        required_roles = self.PERMISSIONS.get(resource, {}).get(action, [])
        
        if not required_roles:
            # 如果没有定义权限，默认拒绝
            return False
        
        # 检查用户角色是否包含所需角色
        return any(role in required_roles for role in user_roles)
    
    def require_permission(
        self,
        user_roles: List[str],
        resource: str,
        action: str
    ):
        """要求权限，如果没有权限则抛出异常"""
        if not self.check_permission(user_roles, resource, action):
            raise ForbiddenException(
                f"没有权限执行操作: {resource}:{action}"
            )

permission_checker = PermissionChecker()
```

**权限依赖**:

```python
# app/api/deps.py (续)
from functools import wraps
from app.core.permissions import permission_checker

def require_permission(resource: str, action: str):
    """权限检查装饰器"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 从 kwargs 中获取 current_user
            current_user = kwargs.get("current_user")
            if not current_user:
                raise UnauthorizedException("用户未认证")
            
            # 检查权限
            user_roles = current_user.get("roles", [])
            permission_checker.require_permission(user_roles, resource, action)
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# 使用示例
@router.post("/", response_model=SampleResponse, status_code=201)
@require_permission("sample", "create")
async def create_sample(
    sample: SampleCreate,
    current_user: dict = Depends(get_current_user),
    service: SampleService = Depends()
):
    """创建样品"""
    pass
```

## 性能优化设计

### 异步 I/O

**异步数据库操作**:

```python
# 使用 asyncpg 驱动和 SQLAlchemy 异步引擎
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# 所有数据库操作都是异步的
async def get_sample(sample_id: str) -> Sample:
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Sample).where(Sample.id == sample_id)
        )
        return result.scalar_one_or_none()
```

**并发处理**:

```python
# 使用 asyncio.gather 并发执行多个操作
async def get_samples_with_details(sample_ids: List[str]):
    tasks = [get_sample(sample_id) for sample_id in sample_ids]
    samples = await asyncio.gather(*tasks)
    return samples
```

### 数据库连接池

**连接池配置**:

```python
# app/core/database.py
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,           # 连接池大小
    max_overflow=20,        # 最大溢出连接数
    pool_pre_ping=True,     # 连接前检查
    pool_recycle=3600,      # 连接回收时间（秒）
    echo=False              # 不打印 SQL（生产环境）
)
```

### 查询优化

**索引使用**:

```python
# 确保查询字段有索引
# - barcode (unique index)
# - sample_number (unique index)
# - status (index)
# - client_name (index)
# - created_at (index)

# 使用索引的查询示例
stmt = select(Sample).where(
    and_(
        Sample.barcode.startswith("SP20260409"),  # 使用索引
        Sample.status != SampleStatus.ARCHIVED    # 使用索引
    )
)
```

**预加载关联数据**:

```python
# 使用 selectinload 避免 N+1 查询问题
from sqlalchemy.orm import selectinload

stmt = select(Sample).options(
    selectinload(Sample.test_items),
    selectinload(Sample.transfers),
    selectinload(Sample.audit_tasks)
).where(Sample.id == sample_id)
```

**分页优化**:

```python
# 使用 offset/limit 分页
stmt = select(Sample).offset((page - 1) * page_size).limit(page_size)

# 使用游标分页（更高效，适用于大数据集）
stmt = select(Sample).where(
    Sample.created_at < last_created_at
).order_by(Sample.created_at.desc()).limit(page_size)
```

### 乐观锁

**版本控制**:

```python
# 使用版本号实现乐观锁
async def update_sample_with_optimistic_lock(
    sample_id: str,
    update_data: Dict,
    expected_version: int
):
    stmt = update(Sample).where(
        and_(
            Sample.id == sample_id,
            Sample.version == expected_version
        )
    ).values(
        **update_data,
        version=expected_version + 1
    )
    
    result = await session.execute(stmt)
    
    if result.rowcount == 0:
        raise ConflictException("数据已被其他用户修改，请刷新后重试")
```

### 缓存策略（可选）

**Redis 缓存**:

```python
# app/core/cache.py
from redis import asyncio as aioredis
from typing import Optional, Any
import json

class CacheService:
    def __init__(self, redis_url: str):
        self.redis = aioredis.from_url(redis_url)
    
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存"""
        value = await self.redis.get(key)
        if value:
            return json.loads(value)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300):
        """设置缓存"""
        await self.redis.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )
    
    async def delete(self, key: str):
        """删除缓存"""
        await self.redis.delete(key)

# 使用示例
cache_service = CacheService(settings.REDIS_URL)

async def get_sample_cached(sample_id: str) -> Sample:
    # 尝试从缓存获取
    cache_key = f"sample:{sample_id}"
    cached = await cache_service.get(cache_key)
    
    if cached:
        return Sample(**cached)
    
    # 从数据库查询
    sample = await sample_repository.find_by_id(sample_id)
    
    # 写入缓存
    if sample:
        await cache_service.set(cache_key, sample.dict(), ttl=300)
    
    return sample
```

### 限流保护

**基于 IP 的限流**:

```python
# app/middleware/rate_limit.py
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from datetime import datetime, timedelta
from app.core.exceptions import RateLimitException

class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
    
    async def dispatch(self, request: Request, call_next):
        # 获取客户端 IP
        client_ip = request.client.host
        
        # 清理过期记录
        now = datetime.now()
        cutoff = now - timedelta(minutes=1)
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if req_time > cutoff
        ]
        
        # 检查限流
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            raise RateLimitException(
                message=f"请求过于频繁，每分钟最多 {self.requests_per_minute} 次请求",
                retry_after=60
            )
        
        # 记录请求
        self.requests[client_ip].append(now)
        
        # 继续处理请求
        response = await call_next(request)
        
        # 添加限流响应头
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(
            self.requests_per_minute - len(self.requests[client_ip])
        )
        
        return response
```

## 部署设计

### Docker 容器化

**Dockerfile**:

```dockerfile
# Dockerfile
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini .

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/health')"

# 启动命令
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**docker-compose.yml**:

```yaml
version: '3.8'

services:
  fastapi-backend:
    build: .
    container_name: fastapi-sample-service
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/lab_db
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN_MINUTES=15
      - REDIS_URL=redis://redis:6379/0
      - LOG_LEVEL=INFO
      - CORS_ORIGINS=http://localhost:5173,http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped
    networks:
      - lab-network

  postgres:
    image: postgres:15
    container_name: postgres-db
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=lab_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - lab-network

  redis:
    image: redis:7-alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - lab-network

volumes:
  postgres-data:
  redis-data:

networks:
  lab-network:
    driver: bridge
```

### 环境配置

**配置管理**:

```python
# app/config.py
from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "FastAPI Sample Management Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # 数据库配置
    DATABASE_URL: str
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    
    # JWT 配置
    JWT_SECRET: str
    JWT_EXPIRES_IN_MINUTES: int = 15
    
    # Redis 配置（可选）
    REDIS_URL: str = None
    
    # CORS 配置
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    
    # 限流配置
    RATE_LIMIT_PER_MINUTE: int = 60
    
    # 测试模式
    TESTING: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

**.env.example**:

```bash
# 数据库配置
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/lab_db

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN_MINUTES=15

# Redis 配置（可选）
REDIS_URL=redis://localhost:6379/0

# CORS 配置
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# 日志级别
LOG_LEVEL=INFO

# 限流配置
RATE_LIMIT_PER_MINUTE=60
```

### 健康检查

**健康检查端点**:

```python
# app/api/v1/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.database import get_db
from app.schemas.response import HealthResponse
from datetime import datetime

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    """健康检查端点"""
    # 检查数据库连接
    try:
        await db.execute(text("SELECT 1"))
        database_status = "healthy"
    except Exception as e:
        database_status = f"unhealthy: {str(e)}"
    
    return {
        "status": "healthy" if database_status == "healthy" else "unhealthy",
        "database": database_status,
        "timestamp": datetime.now()
    }
```

### 监控指标（可选）

**Prometheus 指标**:

```python
# app/core/metrics.py
from prometheus_client import Counter, Histogram, Gauge
from prometheus_fastapi_instrumentator import Instrumentator

# 定义指标
request_count = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration",
    ["method", "endpoint"]
)

active_connections = Gauge(
    "active_database_connections",
    "Number of active database connections"
)

# 在 main.py 中注册
from app.main import app
from app.core.metrics import Instrumentator

instrumentator = Instrumentator()
instrumentator.instrument(app).expose(app, endpoint="/metrics")
```

### 部署流程

1. **构建镜像**:
```bash
docker build -t fastapi-sample-service:latest .
```

2. **运行服务**:
```bash
docker-compose up -d
```

3. **数据库迁移**:
```bash
docker-compose exec fastapi-backend alembic upgrade head
```

4. **查看日志**:
```bash
docker-compose logs -f fastapi-backend
```

5. **健康检查**:
```bash
curl http://localhost:8000/health
```

### 生产环境优化

**使用 Gunicorn + Uvicorn Workers**:

```bash
# 启动命令
gunicorn app.main:app \
    --workers 4 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
```

**Nginx 反向代理**:

```nginx
# nginx.conf
upstream fastapi_backend {
    server fastapi-backend:8000;
}

server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://fastapi_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```


## API 设计

### API 路径规范

所有 API 路径遵循 RESTful 规范，与 Node.js 后端保持一致：

- 基础路径: `/api/v1`
- 资源路径: `/api/v1/samples`
- 子资源路径: `/api/v1/samples/{id}/transfers`

### 完整 API 端点列表

#### 样品管理

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| POST | `/api/v1/samples` | 创建样品 | 是 | sample:create |
| GET | `/api/v1/samples` | 查询样品列表（分页） | 否 | - |
| GET | `/api/v1/samples/{id}` | 获取样品详情 | 否 | - |
| PATCH | `/api/v1/samples/{id}` | 更新样品信息 | 是 | sample:update |
| DELETE | `/api/v1/samples/{id}` | 删除样品（软删除） | 是 | sample:delete |
| POST | `/api/v1/samples/batch-delete` | 批量删除样品 | 是 | sample:delete |
| PATCH | `/api/v1/samples/{id}/status` | 更新样品状态 | 是 | sample:update |
| GET | `/api/v1/samples/barcode/{barcode}` | 通过条码查询样品 | 否 | - |

#### 样品流转

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| POST | `/api/v1/samples/{id}/transfer` | 创建流转记录 | 是 | sample:transfer |
| GET | `/api/v1/samples/{id}/chain-of-custody` | 获取监管链 | 否 | - |
| GET | `/api/v1/transfers` | 查询流转记录列表 | 否 | - |
| GET | `/api/v1/transfers/{id}` | 获取流转记录详情 | 否 | - |
| POST | `/api/v1/transfers/{id}/confirm` | 确认流转 | 是 | transfer:confirm |
| POST | `/api/v1/transfers/{id}/cancel` | 取消流转 | 是 | transfer:cancel |

#### 分样和合样

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| POST | `/api/v1/samples/{id}/split` | 分样操作 | 是 | sample:split |
| POST | `/api/v1/samples/merge` | 合样操作 | 是 | sample:merge |

#### 系统

| 方法 | 路径 | 描述 | 认证 | 权限 |
|------|------|------|------|------|
| GET | `/health` | 健康检查 | 否 | - |
| GET | `/docs` | Swagger UI 文档 | 否 | - |
| GET | `/redoc` | ReDoc 文档 | 否 | - |
| GET | `/openapi.json` | OpenAPI 规范 | 否 | - |
| GET | `/metrics` | Prometheus 指标 | 否 | - |

### 请求和响应示例

#### 创建样品

**请求**:
```http
POST /api/v1/samples HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "client_name": "测试客户",
  "client_contact": "13800138000",
  "sample_name": "水样",
  "sample_type": "环境样品",
  "sample_category": "水质",
  "quantity": 500,
  "unit": "ml",
  "received_date": "2026-04-09T10:00:00Z",
  "sampling_date": "2026-04-08T14:30:00Z",
  "sampling_location": "某河流上游",
  "sampling_person": "张三",
  "storage_location": "冷藏室A-01",
  "storage_condition": "4°C冷藏",
  "priority": "NORMAL",
  "description": "河流水质监测样品",
  "remarks": "需要尽快检测"
}
```

**响应**:
```http
HTTP/1.1 201 Created
Content-Type: application/json
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000
X-Process-Time: 0.123

{
  "message": "样品创建成功",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "barcode": "SP202604090000001",
    "sample_number": "20260000001",
    "client_name": "测试客户",
    "client_contact": "13800138000",
    "sample_name": "水样",
    "sample_type": "环境样品",
    "sample_category": "水质",
    "quantity": 500.0,
    "unit": "ml",
    "received_date": "2026-04-09T10:00:00Z",
    "sampling_date": "2026-04-08T14:30:00Z",
    "sampling_location": "某河流上游",
    "sampling_person": "张三",
    "storage_location": "冷藏室A-01",
    "storage_condition": "4°C冷藏",
    "status": "REGISTERED",
    "priority": "NORMAL",
    "description": "河流水质监测样品",
    "remarks": "需要尽快检测",
    "version": 1,
    "parent_sample_id": null,
    "merged_from_ids": [],
    "created_by": "user123",
    "created_at": "2026-04-09T10:00:00Z",
    "updated_at": "2026-04-09T10:00:00Z",
    "released_at": null,
    "released_by": null
  }
}
```

#### 查询样品列表

**请求**:
```http
GET /api/v1/samples?page=1&page_size=20&status=REGISTERED&client_name=测试 HTTP/1.1
Host: localhost:8000
```

**响应**:
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "message": "查询成功",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "barcode": "SP202604090000001",
        "sample_number": "20260000001",
        "client_name": "测试客户",
        "sample_name": "水样",
        "status": "REGISTERED",
        "created_at": "2026-04-09T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
}
```

#### 样品流转

**请求**:
```http
POST /api/v1/samples/123e4567-e89b-12d3-a456-426614174000/transfer HTTP/1.1
Host: localhost:8000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "from_location": "冷藏室A-01",
  "to_location": "检测室B-03",
  "from_person": "张三",
  "to_person": "李四",
  "remarks": "送检"
}
```

**响应**:
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "样品流转成功",
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "sample_id": "123e4567-e89b-12d3-a456-426614174000",
    "from_location": "冷藏室A-01",
    "to_location": "检测室B-03",
    "from_person": "张三",
    "to_person": "李四",
    "transfer_date": "2026-04-09T11:00:00Z",
    "received_date": null,
    "status": "PENDING",
    "remarks": "送检",
    "sender_confirmed": false,
    "receiver_confirmed": false,
    "created_at": "2026-04-09T11:00:00Z"
  }
}
```

#### 错误响应

**验证错误**:
```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "message": "请求参数验证失败",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数格式不正确",
    "details": {
      "client_name": "field required",
      "quantity": "ensure this value is greater than 0"
    }
  }
}
```

**资源不存在**:
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "message": "操作失败",
  "error": {
    "code": "NOT_FOUND",
    "message": "样品不存在: 123e4567-e89b-12d3-a456-426614174000"
  }
}
```

**权限不足**:
```http
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "message": "操作失败",
  "error": {
    "code": "FORBIDDEN",
    "message": "没有权限执行操作: sample:delete"
  }
}
```

### OpenAPI 文档配置

```python
# app/main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="FastAPI Sample Management Service",
    description="实验室样品管理微服务",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="FastAPI Sample Management Service",
        version="1.0.0",
        description="实验室样品管理微服务 API 文档",
        routes=app.routes,
    )
    
    # 添加安全方案
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    # 添加全局安全要求
    openapi_schema["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

## 与现有系统的集成

### 数据库共享

FastAPI 服务和 Node.js 后端共享同一个 PostgreSQL 数据库：

- **表结构兼容**: SQLAlchemy 模型与 Prisma Schema 完全兼容
- **字段命名一致**: 使用 snake_case 命名
- **枚举类型一致**: 使用相同的枚举值
- **外键约束**: 保持相同的关联关系

### JWT 令牌互通

两个服务使用相同的 JWT 密钥和算法：

- **密钥**: 从环境变量 `JWT_SECRET` 读取
- **算法**: HS256
- **Payload 格式**: 相同的字段名（userId, username, roles）
- **过期时间**: 相同的配置

### API 响应格式统一

两个服务返回相同格式的响应：

```json
{
  "message": "操作描述",
  "data": { /* 数据对象 */ },
  "error": {
    "code": "ERROR_CODE",
    "message": "错误信息",
    "details": { /* 详细信息 */ }
  }
}
```

### 前端路由配置

前端可以通过配置路由到不同的后端服务：

```typescript
// Vue.js 前端配置
const API_CONFIG = {
  nodeBackend: 'http://localhost:3000/api',
  fastApiBackend: 'http://localhost:8000/api/v1'
}

// 样品相关请求路由到 FastAPI
const sampleApi = axios.create({
  baseURL: API_CONFIG.fastApiBackend
})

// 其他请求路由到 Node.js
const generalApi = axios.create({
  baseURL: API_CONFIG.nodeBackend
})
```

### API 网关（可选）

使用 API 网关统一入口，根据路径路由到不同服务：

```nginx
# Nginx 配置示例
location /api/samples {
    proxy_pass http://fastapi-backend:8000/api/v1/samples;
}

location /api {
    proxy_pass http://node-backend:3000/api;
}
```

## 迁移策略

### 渐进式迁移

1. **阶段 1**: FastAPI 服务与 Node.js 后端并行运行
2. **阶段 2**: 前端逐步切换样品相关请求到 FastAPI
3. **阶段 3**: 监控和性能对比
4. **阶段 4**: 完全切换到 FastAPI（可选）

### 数据一致性

- 两个服务共享数据库，数据自动同步
- 使用数据库事务确保一致性
- 乐观锁防止并发冲突

### 回滚方案

- 保留 Node.js 后端的样品管理功能
- 前端可以快速切换回 Node.js 后端
- 数据库结构不变，无需迁移数据

## 总结

### 设计亮点

1. **高性能**: 异步 I/O、连接池、查询优化
2. **类型安全**: Pydantic 端到端类型验证
3. **易于维护**: 清晰的分层架构
4. **完整测试**: 单元测试、集成测试、属性测试
5. **无缝集成**: 与现有系统完全兼容
6. **自动文档**: OpenAPI/Swagger 自动生成
7. **容器化**: Docker 部署，易于扩展

### 技术优势

- **FastAPI**: 现代、高性能、自动文档
- **SQLAlchemy**: 成熟的 ORM，异步支持
- **Pydantic**: 强大的数据验证
- **asyncpg**: 高性能异步驱动
- **pytest**: 完整的测试框架
- **hypothesis**: 属性测试支持

### 下一步工作

1. 实现核心功能（样品 CRUD、流转、分样/合样）
2. 编写单元测试和集成测试
3. 实现属性测试验证正确性属性
4. 配置 CI/CD 流程
5. 性能测试和优化
6. 部署到测试环境
7. 前端集成测试
8. 生产环境部署

### 预期收益

- **性能提升**: 异步 I/O 提升并发处理能力
- **开发效率**: 自动文档和类型检查减少错误
- **代码质量**: 完整的测试覆盖确保可靠性
- **可维护性**: 清晰的架构易于理解和修改
- **可扩展性**: 微服务架构便于未来扩展

