# 自定义异常使用指南

本文档说明如何使用 FastAPI 后端的自定义异常类。

## 概述

FastAPI 后端实现了一套统一的异常处理机制，与 Node.js 后端保持兼容。所有自定义异常都继承自 `APIException` 基类，并返回统一格式的错误响应。

## 错误响应格式

所有异常都返回以下格式的 JSON 响应：

```json
{
  "message": "操作失败",
  "error": {
    "code": "ERROR_CODE",
    "message": "详细错误信息",
    "details": {...}
  }
}
```

这个格式与 Node.js 后端完全兼容，确保前端可以统一处理错误。

## 可用的异常类

### 1. NotFoundException (404)

**用途**: 当请求的资源不存在时使用。

**示例**:
```python
from app.core.exceptions import NotFoundException

# 默认消息
raise NotFoundException()

# 自定义消息
raise NotFoundException(message="样品不存在")
raise NotFoundException(message=f"ID 为 {sample_id} 的样品不存在")
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "NOT_FOUND",
    "message": "样品不存在",
    "details": null
  }
}
```

### 2. ValidationException (400)

**用途**: 当请求数据验证失败时使用。

**示例**:
```python
from app.core.exceptions import ValidationException

# 简单验证错误
raise ValidationException(message="请求参数格式不正确")

# 带详细信息的验证错误
raise ValidationException(
    message="验证失败",
    details={
        "fields": [
            {"field": "name", "error": "名称不能为空"},
            {"field": "quantity", "error": "数量必须大于0"}
        ]
    }
)
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "验证失败",
    "details": {
      "fields": [
        {"field": "name", "error": "名称不能为空"},
        {"field": "quantity", "error": "数量必须大于0"}
      ]
    }
  }
}
```

### 3. UnauthorizedException (401)

**用途**: 当用户未认证或令牌无效时使用。

**示例**:
```python
from app.core.exceptions import UnauthorizedException

# 默认消息
raise UnauthorizedException()

# 自定义消息
raise UnauthorizedException(message="令牌已过期")
raise UnauthorizedException(message="无效的认证令牌")
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "令牌已过期",
    "details": null
  }
}
```

### 4. ForbiddenException (403)

**用途**: 当用户已认证但权限不足时使用。

**示例**:
```python
from app.core.exceptions import ForbiddenException

# 默认消息
raise ForbiddenException()

# 自定义消息
raise ForbiddenException(message="无权访问此资源")
raise ForbiddenException(message="只有管理员可以执行此操作")
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "FORBIDDEN",
    "message": "无权访问此资源",
    "details": null
  }
}
```

### 5. ConflictException (409)

**用途**: 当发生数据冲突时使用（如版本冲突、并发更新冲突）。

**示例**:
```python
from app.core.exceptions import ConflictException

# 默认消息
raise ConflictException()

# 自定义消息
raise ConflictException(message="版本冲突，请刷新后重试")
raise ConflictException(message="样品已被其他用户修改")
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "CONFLICT",
    "message": "版本冲突，请刷新后重试",
    "details": null
  }
}
```

### 6. RateLimitException (429)

**用途**: 当用户请求超过限流阈值时使用。

**示例**:
```python
from app.core.exceptions import RateLimitException

# 默认消息和重试时间
raise RateLimitException()

# 自定义消息和重试时间
raise RateLimitException(
    message="超过每分钟请求限制",
    retry_after=120
)
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求过于频繁",
    "details": {
      "retry_after": 60
    }
  }
}
```

### 7. InternalServerException (500)

**用途**: 当服务器内部发生未预期的错误时使用。

**示例**:
```python
from app.core.exceptions import InternalServerException

# 默认消息
raise InternalServerException()

# 自定义消息（注意：不要暴露内部实现细节）
raise InternalServerException(message="服务暂时不可用")
```

**响应**:
```json
{
  "message": "操作失败",
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "服务器内部错误",
    "details": null
  }
}
```

## 在路由处理器中使用

### 示例 1: 查询单个资源

```python
from fastapi import APIRouter
from app.core.exceptions import NotFoundException
from app.services.sample_service import SampleService

router = APIRouter()

@router.get("/samples/{sample_id}")
async def get_sample(sample_id: int):
    sample = await SampleService.get_by_id(sample_id)
    
    if not sample:
        raise NotFoundException(message=f"ID 为 {sample_id} 的样品不存在")
    
    return {"message": "查询成功", "data": sample}
```

### 示例 2: 验证请求数据

```python
from fastapi import APIRouter
from app.core.exceptions import ValidationException
from app.schemas.sample import SampleCreate

router = APIRouter()

@router.post("/samples")
async def create_sample(data: SampleCreate):
    # 业务逻辑验证
    if data.quantity <= 0:
        raise ValidationException(
            message="验证失败",
            details={"field": "quantity", "error": "数量必须大于0"}
        )
    
    # 创建样品...
    return {"message": "创建成功", "data": sample}
```

### 示例 3: 权限检查

```python
from fastapi import APIRouter, Depends
from app.core.exceptions import ForbiddenException
from app.dependencies.auth import get_current_user

router = APIRouter()

@router.delete("/samples/{sample_id}")
async def delete_sample(
    sample_id: int,
    current_user = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise ForbiddenException(message="只有管理员可以删除样品")
    
    # 删除样品...
    return {"message": "删除成功"}
```

### 示例 4: 处理并发冲突

```python
from fastapi import APIRouter
from app.core.exceptions import ConflictException
from app.services.sample_service import SampleService

router = APIRouter()

@router.put("/samples/{sample_id}")
async def update_sample(sample_id: int, data: SampleUpdate):
    try:
        sample = await SampleService.update(sample_id, data)
        return {"message": "更新成功", "data": sample}
    except VersionConflictError:
        raise ConflictException(
            message="样品已被其他用户修改，请刷新后重试"
        )
```

## 在服务层使用

服务层也可以抛出这些异常，它们会自动传播到路由处理器：

```python
# app/services/sample_service.py
from app.core.exceptions import NotFoundException, ValidationException

class SampleService:
    @staticmethod
    async def get_by_id(sample_id: int):
        sample = await db.query(Sample).filter(Sample.id == sample_id).first()
        
        if not sample:
            raise NotFoundException(message=f"样品 {sample_id} 不存在")
        
        return sample
    
    @staticmethod
    async def create(data: SampleCreate):
        # 验证条码唯一性
        existing = await db.query(Sample).filter(
            Sample.barcode == data.barcode
        ).first()
        
        if existing:
            raise ValidationException(
                message="条码已存在",
                details={"field": "barcode", "value": data.barcode}
            )
        
        # 创建样品...
        return sample
```

## 全局异常处理

这些异常会被全局异常处理器自动捕获并转换为统一格式的响应。你不需要在每个路由中手动处理这些异常。

全局异常处理器的配置在 `app/main.py` 中：

```python
from fastapi import FastAPI
from app.core.exceptions import APIException
from app.middleware.error_handler import api_exception_handler

app = FastAPI()

# 注册异常处理器
app.add_exception_handler(APIException, api_exception_handler)
```

## 最佳实践

1. **使用合适的异常类型**: 根据错误类型选择正确的异常类。
2. **提供清晰的错误消息**: 错误消息应该清晰、具体，帮助用户理解问题。
3. **包含详细信息**: 对于验证错误，使用 `details` 参数提供字段级别的错误信息。
4. **不要暴露内部细节**: 对于 500 错误，不要在消息中暴露内部实现细节或敏感信息。
5. **保持一致性**: 使用统一的错误代码和消息格式，与 Node.js 后端保持一致。

## 与 Node.js 后端的兼容性

这些异常类的设计确保了与 Node.js 后端的完全兼容：

- **相同的 HTTP 状态码**: 404, 400, 401, 403, 409, 429, 500
- **相同的错误代码**: NOT_FOUND, VALIDATION_ERROR, UNAUTHORIZED 等
- **相同的响应格式**: `{ message, error: { code, message, details } }`

前端可以使用相同的错误处理逻辑来处理来自两个后端的错误响应。

## 测试

可以使用以下命令运行异常类的测试：

```bash
# 使用 pytest
python -m pytest tests/test_exceptions.py -v

# 使用独立测试脚本
python test_exceptions_standalone.py
```

## 相关文档

- [需求文档](../.kiro/specs/sample-management-fastapi-backend/requirements.md) - 需求 12.1
- [设计文档](../.kiro/specs/sample-management-fastapi-backend/design.md) - 异常处理部分
- [错误处理中间件](./ERROR_HANDLER.md) - 全局异常处理器文档（待创建）
