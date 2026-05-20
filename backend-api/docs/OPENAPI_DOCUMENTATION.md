# OpenAPI 文档配置指南

本文档介绍 FastAPI 样品管理后端服务的 OpenAPI 文档配置和使用方法。

## 目录

- [访问 API 文档](#访问-api-文档)
- [文档配置](#文档配置)
- [安全方案](#安全方案)
- [示例和测试](#示例和测试)
- [自定义文档](#自定义文档)
- [导出和版本管理](#导出和版本管理)

## 访问 API 文档

### Swagger UI

交互式 API 文档，支持直接测试 API：

```
http://localhost:8000/docs
```

特性：
- 交互式界面
- 支持直接发送请求测试
- 自动生成请求示例
- 显示响应模型和状态码
- 支持 JWT 认证测试

### ReDoc

更美观的 API 文档，适合阅读：

```
http://localhost:8000/redoc
```

特性：
- 清晰的文档结构
- 响应式设计
- 支持搜索
- 代码示例
- 更好的可读性

### OpenAPI JSON

原始 OpenAPI 规范文件：

```
http://localhost:8000/openapi.json
```

用途：
- 生成客户端 SDK
- 导入到 Postman 等工具
- 自动化测试
- 文档版本管理

## 文档配置

### 基本配置

在 `app/main.py` 中配置 FastAPI 应用：

```python
app = FastAPI(
    title="样品管理 FastAPI 后端服务",
    description="实验室样品管理微服务",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "技术支持",
        "email": "support@example.com",
    },
    license_info={
        "name": "MIT License",
    }
)
```

### 标签配置

为 API 端点分组：

```python
app = FastAPI(
    # ... 其他配置
    openapi_tags=[
        {
            "name": "health",
            "description": "健康检查和系统状态"
        },
        {
            "name": "samples",
            "description": "样品管理操作"
        },
        {
            "name": "transfers",
            "description": "样品流转操作"
        }
    ]
)
```

### 路由文档

为每个端点添加详细文档：

```python
@router.post(
    "",
    response_model=SuccessResponse[SampleResponse],
    status_code=status.HTTP_201_CREATED,
    summary="创建样品",
    description="创建新样品，自动生成条码和样品编号",
    responses={
        201: {
            "description": "样品创建成功",
            "content": {
                "application/json": {
                    "example": {
                        "message": "样品创建成功",
                        "data": {
                            "id": "sample-001",
                            "barcode": "SP202604110001",
                            "sample_number": "20260001",
                            "name": "水样",
                            "type": "环境样品",
                            "status": "REGISTERED"
                        }
                    }
                }
            }
        },
        400: {"description": "请求参数错误"},
        401: {"description": "未授权"},
        422: {"description": "数据验证失败"}
    }
)
async def create_sample(...):
    """
    创建新样品
    
    详细说明...
    """
    pass
```

## 安全方案

### JWT 认证配置

在 OpenAPI 文档中配置 JWT 认证：

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

# 在 FastAPI 应用中添加安全方案
app = FastAPI(
    # ... 其他配置
    swagger_ui_init_oauth={
        "usePkceWithAuthorizationCodeGrant": True,
    }
)

# 添加安全方案到 OpenAPI schema
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # 添加安全方案
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "输入 JWT 令牌（格式：Bearer <token>）"
        }
    }
    
    # 为所有端点添加安全要求
    for path in openapi_schema["paths"].values():
        for operation in path.values():
            if isinstance(operation, dict) and "security" not in operation:
                operation["security"] = [{"BearerAuth": []}]
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

### 在 Swagger UI 中使用认证

1. 访问 Swagger UI: `http://localhost:8000/docs`
2. 点击右上角的 "Authorize" 按钮
3. 输入 JWT 令牌（格式：`Bearer <your-token>`）
4. 点击 "Authorize" 确认
5. 现在可以测试需要认证的端点

### 获取测试令牌

如果有 Node.js 后端的登录接口：

```bash
# 登录获取令牌
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# 响应示例
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## 示例和测试

### 添加请求示例

在 Pydantic 模型中添加示例：

```python
from pydantic import BaseModel, Field

class SampleCreate(BaseModel):
    name: str = Field(..., description="样品名称", example="水样")
    type: str = Field(..., description="样品类型", example="环境样品")
    source: Optional[str] = Field(None, description="样品来源", example="长江")
    description: Optional[str] = Field(None, description="样品描述", example="采集自长江中游")
    
    class Config:
        schema_extra = {
            "example": {
                "name": "水样",
                "type": "环境样品",
                "source": "长江",
                "description": "采集自长江中游",
                "storage_location": "冷藏室A-01",
                "retention_days": 30
            }
        }
```

### 添加响应示例

在路由装饰器中添加响应示例：

```python
@router.post(
    "",
    responses={
        201: {
            "description": "样品创建成功",
            "content": {
                "application/json": {
                    "example": {
                        "message": "样品创建成功",
                        "data": {
                            "id": "clx1234567890",
                            "barcode": "SP202604110001",
                            "sample_number": "20260001",
                            "name": "水样",
                            "type": "环境样品",
                            "source": "长江",
                            "status": "REGISTERED",
                            "created_at": "2026-04-11T10:30:00Z"
                        },
                        "error": None
                    }
                }
            }
        }
    }
)
async def create_sample(...):
    pass
```

### 在 Swagger UI 中测试

1. 展开要测试的端点
2. 点击 "Try it out" 按钮
3. 填写请求参数或请求体
4. 点击 "Execute" 执行请求
5. 查看响应结果

## 自定义文档

### 自定义 Swagger UI

创建自定义 Swagger UI 配置：

```python
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url=app.openapi_url,
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
        swagger_ui_parameters={
            "defaultModelsExpandDepth": -1,  # 隐藏模型
            "docExpansion": "list",  # 展开列表
            "filter": True,  # 启用搜索
            "syntaxHighlight.theme": "monokai"  # 代码高亮主题
        }
    )
```

### 自定义 ReDoc

```python
from fastapi.openapi.docs import get_redoc_html

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url=app.openapi_url,
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
        redoc_favicon_url="/static/favicon.ico",
        with_google_fonts=True
    )
```

### 添加自定义 CSS

```python
from fastapi.responses import HTMLResponse

custom_css = """
<style>
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 50px 0 }
</style>
"""

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    html = get_swagger_ui_html(...)
    return HTMLResponse(content=html.body.decode() + custom_css)
```

## 导出和版本管理

### 导出 OpenAPI 规范

#### 方法 1: 通过 HTTP 请求

```bash
# 导出为 JSON
curl http://localhost:8000/openapi.json > openapi.json

# 转换为 YAML
pip install pyyaml
python -c "
import json
import yaml

with open('openapi.json') as f:
    spec = json.load(f)

with open('openapi.yaml', 'w') as f:
    yaml.dump(spec, f, default_flow_style=False)
"
```

#### 方法 2: 使用脚本

创建 `scripts/export-openapi.py`:

```python
import json
import yaml
from app.main import app

# 获取 OpenAPI schema
openapi_schema = app.openapi()

# 导出为 JSON
with open('docs/openapi.json', 'w') as f:
    json.dump(openapi_schema, f, indent=2)

# 导出为 YAML
with open('docs/openapi.yaml', 'w') as f:
    yaml.dump(openapi_schema, f, default_flow_style=False)

print("OpenAPI 规范已导出")
```

运行脚本：

```bash
python scripts/export-openapi.py
```

### 版本管理

#### 创建版本化文档

```bash
# 创建版本目录
mkdir -p docs/api/versions/v1.0.0

# 导出当前版本
curl http://localhost:8000/openapi.json > docs/api/versions/v1.0.0/openapi.json

# 添加版本说明
cat > docs/api/versions/v1.0.0/CHANGELOG.md << EOF
# Version 1.0.0

## 发布日期
2026-04-11

## 新增功能
- 样品管理 CRUD 操作
- 样品流转功能
- 分样合样操作
- 监管链追踪

## API 端点
- POST /api/v1/samples - 创建样品
- GET /api/v1/samples - 查询样品列表
- GET /api/v1/samples/{id} - 获取样品详情
- PATCH /api/v1/samples/{id} - 更新样品
- DELETE /api/v1/samples/{id} - 删除样品
- POST /api/v1/samples/{id}/transfer - 创建流转
- GET /api/v1/samples/{id}/chain-of-custody - 查询监管链
- POST /api/v1/samples/{id}/split - 分样
- POST /api/v1/samples/merge - 合样
EOF
```

#### 自动化版本管理

创建 `scripts/version-api-docs.sh`:

```bash
#!/bin/bash

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Usage: ./version-api-docs.sh <version>"
    exit 1
fi

# 创建版本目录
mkdir -p docs/api/versions/$VERSION

# 导出 OpenAPI 规范
curl http://localhost:8000/openapi.json > docs/api/versions/$VERSION/openapi.json

# 生成 YAML 版本
python -c "
import json
import yaml

with open('docs/api/versions/$VERSION/openapi.json') as f:
    spec = json.load(f)

with open('docs/api/versions/$VERSION/openapi.yaml', 'w') as f:
    yaml.dump(spec, f, default_flow_style=False)
"

# 创建版本索引
cat > docs/api/versions/$VERSION/index.html << EOF
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation - Version $VERSION</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            url: './openapi.json',
            dom_id: '#swagger-ui',
        })
    </script>
</body>
</html>
EOF

echo "API 文档版本 $VERSION 已创建"
```

使用：

```bash
chmod +x scripts/version-api-docs.sh
./scripts/version-api-docs.sh v1.0.0
```

### 生成客户端 SDK

使用 OpenAPI Generator 生成客户端代码：

```bash
# 安装 OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# 生成 Python 客户端
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g python \
  -o clients/python

# 生成 TypeScript 客户端
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g typescript-axios \
  -o clients/typescript

# 生成 Java 客户端
openapi-generator-cli generate \
  -i http://localhost:8000/openapi.json \
  -g java \
  -o clients/java
```

### 导入到 Postman

1. 导出 OpenAPI 规范：
   ```bash
   curl http://localhost:8000/openapi.json > openapi.json
   ```

2. 在 Postman 中：
   - 点击 "Import"
   - 选择 "openapi.json" 文件
   - Postman 会自动创建集合和请求

3. 配置环境变量：
   - 创建环境（如 "Development"）
   - 添加变量：
     - `base_url`: `http://localhost:8000`
     - `jwt_token`: `<your-token>`

4. 在请求中使用：
   - URL: `{{base_url}}/api/v1/samples`
   - Headers: `Authorization: Bearer {{jwt_token}}`

## 最佳实践

### 1. 保持文档更新

- 每次修改 API 时更新文档
- 使用 Pydantic 模型自动生成文档
- 添加详细的描述和示例

### 2. 使用语义化版本

- 主版本号：不兼容的 API 修改
- 次版本号：向下兼容的功能性新增
- 修订号：向下兼容的问题修正

### 3. 提供完整示例

- 为每个端点提供请求示例
- 包含成功和错误响应示例
- 说明所有可能的状态码

### 4. 文档测试

- 定期测试文档中的示例
- 确保示例代码可以运行
- 验证响应格式正确

### 5. 版本控制

- 保存每个版本的 OpenAPI 规范
- 维护版本变更日志
- 提供版本迁移指南

## 故障排查

### 文档无法访问

检查配置：

```python
# 确保启用了文档
app = FastAPI(
    docs_url="/docs",  # 不要设置为 None
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
```

### 认证测试失败

1. 检查 JWT 令牌格式
2. 确保令牌未过期
3. 验证 JWT 密钥配置
4. 检查权限配置

### 示例不显示

确保在 Pydantic 模型中添加了示例：

```python
class Config:
    schema_extra = {
        "example": { ... }
    }
```

## 参考资源

- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [OpenAPI 规范](https://swagger.io/specification/)
- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [ReDoc](https://github.com/Redocly/redoc)
- [OpenAPI Generator](https://openapi-generator.tech/)
