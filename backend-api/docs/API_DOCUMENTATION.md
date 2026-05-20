# API 文档自动生成指南

本文档介绍 FastAPI 后端的 API 文档自动生成功能，包括文档配置、生成、导出和版本管理。

## 目录

- [功能概述](#功能概述)
- [文档访问](#文档访问)
- [文档生成](#文档生成)
- [文档导出](#文档导出)
- [版本管理](#版本管理)
- [API 端点](#api-端点)
- [自动化集成](#自动化集成)

## 功能概述

FastAPI 后端提供完整的 API 文档自动生成功能：

### 核心功能

1. **自动生成 OpenAPI 规范**
   - 基于 FastAPI 路由和 Pydantic 模型自动生成
   - 符合 OpenAPI 3.0 标准
   - 包含完整的端点、参数、响应定义

2. **交互式文档界面**
   - Swagger UI：提供交互式 API 测试
   - ReDoc：提供美观的文档阅读界面

3. **多格式导出**
   - JSON 格式：标准 OpenAPI JSON 规范
   - YAML 格式：易读的 YAML 格式
   - HTML 格式：独立的 HTML 索引页

4. **版本管理**
   - 文档版本归档
   - 版本历史查询
   - 版本恢复
   - 版本对比

5. **统计信息**
   - API 端点统计
   - 数据模型统计
   - 方法分布统计

## 文档访问

### 在线文档

启动 FastAPI 服务后，可以通过以下 URL 访问文档：

```bash
# 启动服务
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Swagger UI（交互式文档）**
```
http://localhost:8000/docs
```

**ReDoc（阅读文档）**
```
http://localhost:8000/redoc
```

**OpenAPI JSON 规范**
```
http://localhost:8000/openapi.json
```

### 文档特性

#### Swagger UI 特性

- 交互式 API 测试
- 请求参数填写
- 实时响应查看
- 认证令牌配置
- 示例值自动填充

#### ReDoc 特性

- 清晰的文档结构
- 搜索功能
- 代码示例
- 响应模型展示
- 下载 OpenAPI 规范

## 文档生成

### 使用脚本生成

#### 生成所有格式文档

```bash
# 进入项目目录
cd fastapi-backend

# 运行生成脚本
python scripts/generate_docs.py
```

输出：
```
开始生成 API 文档...

正在生成文档...

✓ 文档生成完成！

生成的文件:
  - JSON: docs/api/openapi.json
  - YAML: docs/api/openapi.yaml
  - HTML: docs/api/index.html

文档统计:
  API 版本: 1.0.0
  API 端点: 85
  数据模型: 120
  API 分类: 23

端点方法分布:
  GET: 45
  POST: 25
  PUT: 10
  DELETE: 5

查看文档:
  - 本地文件: file:///path/to/docs/api/index.html
  - Swagger UI: http://localhost:8000/docs
  - ReDoc: http://localhost:8000/redoc
```

### 使用 API 生成

```bash
# 生成所有格式文档
curl -X POST http://localhost:8000/api/v1/docs/generate

# 响应
{
  "message": "文档生成成功",
  "data": {
    "files": {
      "json": "docs/api/openapi.json",
      "yaml": "docs/api/openapi.yaml",
      "html": "docs/api/index.html"
    }
  }
}
```

## 文档导出

### 导出 JSON 格式

```bash
# 通过 API 导出
curl http://localhost:8000/api/v1/docs/openapi.json -o openapi.json

# 或直接访问
curl http://localhost:8000/openapi.json -o openapi.json
```

### 导出 YAML 格式

```bash
# 通过 API 导出
curl http://localhost:8000/api/v1/docs/openapi.yaml -o openapi.yaml
```

### 获取统计信息

```bash
# 获取文档统计
curl http://localhost:8000/api/v1/docs/statistics

# 响应
{
  "message": "获取统计信息成功",
  "data": {
    "version": "1.0.0",
    "title": "实验室样品管理 FastAPI 后端服务",
    "endpoints": {
      "total": 85,
      "by_method": {
        "GET": 45,
        "POST": 25,
        "PUT": 10,
        "DELETE": 5
      }
    },
    "paths": 85,
    "schemas": 120,
    "tags": 23,
    "tag_names": ["auth", "samples", "workflows", ...]
  }
}
```

## 版本管理

### 归档当前版本

#### 使用脚本

```bash
# 归档当前版本（使用应用版本号）
python scripts/version_docs.py archive --description "初始版本"

# 归档指定版本
python scripts/version_docs.py archive --version 1.0.0 --description "正式发布版本"
```

#### 使用 API

```bash
# 归档当前版本
curl -X POST "http://localhost:8000/api/v1/docs/versions/archive?description=初始版本"

# 归档指定版本
curl -X POST "http://localhost:8000/api/v1/docs/versions/archive?version=1.0.0&description=正式发布版本"

# 响应
{
  "message": "版本归档成功",
  "data": {
    "version": "1.0.0",
    "path": "docs/api/versions/1.0.0",
    "description": "正式发布版本"
  }
}
```

### 列出所有版本

#### 使用脚本

```bash
python scripts/version_docs.py list
```

输出：
```
已归档的 API 文档版本:

版本号               归档时间                       描述
--------------------------------------------------------------------------------
1.2.0               2026-04-09 15:30:00           新增审核功能
1.1.0               2026-04-08 10:20:00           新增工作流功能
1.0.0               2026-04-07 09:00:00           正式发布版本

共 3 个版本
```

#### 使用 API

```bash
curl http://localhost:8000/api/v1/docs/versions

# 响应
{
  "message": "获取版本列表成功",
  "data": {
    "versions": [
      {
        "version": "1.2.0",
        "description": "新增审核功能",
        "archivedAt": "2026-04-09T15:30:00",
        "path": "versions/1.2.0"
      },
      {
        "version": "1.1.0",
        "description": "新增工作流功能",
        "archivedAt": "2026-04-08T10:20:00",
        "path": "versions/1.1.0"
      }
    ],
    "total": 2
  }
}
```

### 恢复指定版本

#### 使用脚本

```bash
python scripts/version_docs.py restore 1.0.0
```

#### 使用 API

```bash
curl -X POST http://localhost:8000/api/v1/docs/versions/1.0.0/restore

# 响应
{
  "message": "版本 1.0.0 恢复成功",
  "data": {
    "version": "1.0.0"
  }
}
```

### 对比两个版本

#### 使用脚本

```bash
python scripts/version_docs.py compare 1.0.0 1.1.0
```

输出：
```
对比版本 1.0.0 和 1.1.0...

端点变更:
  新增: 15
  删除: 2
  保持: 70
  总计: 72 -> 85

新增端点:
  + /api/v1/workflows
  + /api/v1/workflows/{id}
  + /api/v1/tasks
  ...

删除端点:
  - /api/v1/deprecated/old-endpoint

数据模型变更:
  新增: 8
  删除: 1
  总计: 112 -> 119

新增模型:
  + WorkflowTemplate
  + WorkflowInstance
  + Task
  ...

删除模型:
  - OldModel
```

#### 使用 API

```bash
curl "http://localhost:8000/api/v1/docs/versions/compare?version1=1.0.0&version2=1.1.0"

# 响应
{
  "message": "版本对比成功",
  "data": {
    "version1": "1.0.0",
    "version2": "1.1.0",
    "paths": {
      "added": ["/api/v1/workflows", ...],
      "removed": ["/api/v1/deprecated/old-endpoint"],
      "common": 70,
      "total_v1": 72,
      "total_v2": 85
    },
    "schemas": {
      "added": ["WorkflowTemplate", ...],
      "removed": ["OldModel"],
      "total_v1": 112,
      "total_v2": 119
    }
  }
}
```

## API 端点

### 文档管理 API

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/api/v1/docs/openapi.json` | 导出 OpenAPI JSON 规范 |
| GET | `/api/v1/docs/openapi.yaml` | 导出 OpenAPI YAML 规范 |
| GET | `/api/v1/docs/statistics` | 获取文档统计信息 |
| POST | `/api/v1/docs/generate` | 生成所有格式文档 |
| POST | `/api/v1/docs/versions/archive` | 归档当前版本文档 |
| GET | `/api/v1/docs/versions` | 列出所有归档版本 |
| POST | `/api/v1/docs/versions/{version}/restore` | 恢复指定版本文档 |
| GET | `/api/v1/docs/versions/compare` | 对比两个版本 |

### 内置文档端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/docs` | Swagger UI 交互式文档 |
| GET | `/redoc` | ReDoc 阅读文档 |
| GET | `/openapi.json` | OpenAPI JSON 规范 |

## 自动化集成

### CI/CD 集成

#### GitHub Actions 示例

```yaml
name: Generate API Documentation

on:
  push:
    branches: [ main ]
  release:
    types: [ published ]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd fastapi-backend
          pip install -r requirements.txt
      
      - name: Generate documentation
        run: |
          cd fastapi-backend
          python scripts/generate_docs.py
      
      - name: Archive version
        run: |
          cd fastapi-backend
          python scripts/version_docs.py archive --version ${{ github.ref_name }} --description "Release ${{ github.ref_name }}"
      
      - name: Upload documentation
        uses: actions/upload-artifact@v2
        with:
          name: api-docs
          path: fastapi-backend/docs/api/
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./fastapi-backend/docs/api
```

### 定时生成

#### Cron 任务

```bash
# 每天凌晨 2 点生成文档
0 2 * * * cd /path/to/fastapi-backend && python scripts/generate_docs.py

# 每周一归档版本
0 3 * * 1 cd /path/to/fastapi-backend && python scripts/version_docs.py archive --description "Weekly backup"
```

### Docker 集成

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 生成文档
RUN python scripts/generate_docs.py

# 暴露端口
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 最佳实践

### 1. 文档注释

为所有 API 端点添加详细的文档字符串：

```python
@router.post("/samples", summary="创建样品")
async def create_sample(
    sample: SampleCreate,
    current_user: User = Depends(get_current_user)
):
    """
    创建新样品
    
    创建一个新的样品记录，自动生成条码和样品编号。
    
    - **clientName**: 客户名称（必填）
    - **sampleName**: 样品名称（必填）
    - **sampleType**: 样品类型（必填）
    - **quantity**: 样品数量（必填）
    - **unit**: 数量单位（必填）
    
    返回创建的样品信息，包括自动生成的条码和样品编号。
    """
    # 实现代码
    pass
```

### 2. 响应模型

使用 Pydantic 模型定义响应格式：

```python
class SampleResponse(BaseModel):
    """样品响应模型"""
    id: str = Field(..., description="样品 ID")
    barcode: str = Field(..., description="样品条码")
    sampleNumber: str = Field(..., description="样品编号")
    clientName: str = Field(..., description="客户名称")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": "uuid",
                "barcode": "SP20260409123456",
                "sampleNumber": "2026-001",
                "clientName": "测试客户"
            }
        }
```

### 3. 标签分组

使用标签对 API 进行分组：

```python
router = APIRouter(prefix="/api/v1/samples", tags=["samples"])
```

### 4. 版本管理策略

- 每次发布新版本时归档文档
- 保留最近 20 个版本
- 为重要版本添加详细描述
- 定期对比版本差异

### 5. 文档更新

- 代码变更后自动生成文档
- 在 CI/CD 中集成文档生成
- 定期检查文档完整性
- 及时更新示例和说明

## 故障排查

### 问题 1：文档生成失败

**症状**：运行生成脚本时报错

**解决方案**：
```bash
# 检查依赖
pip install -r requirements.txt

# 检查 Python 版本
python --version  # 需要 3.11+

# 检查项目路径
cd fastapi-backend
python scripts/generate_docs.py
```

### 问题 2：版本归档失败

**症状**：归档版本时提示权限错误

**解决方案**：
```bash
# 检查目录权限
chmod -R 755 docs/api/

# 创建版本目录
mkdir -p docs/api/versions
```

### 问题 3：文档访问 404

**症状**：访问 /docs 或 /redoc 返回 404

**解决方案**：
```python
# 检查 main.py 配置
app = FastAPI(
    docs_url="/docs",  # 确保配置正确
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
```

## 总结

FastAPI 后端提供了完整的 API 文档自动生成功能，包括：

- ✅ 自动生成 OpenAPI 3.0 规范
- ✅ Swagger UI 和 ReDoc 交互式文档
- ✅ 多格式导出（JSON、YAML、HTML）
- ✅ 版本管理和历史追溯
- ✅ 版本对比和差异分析
- ✅ 统计信息和监控
- ✅ CI/CD 集成支持

通过这些功能，可以轻松维护和管理 API 文档，提高开发效率和文档质量。
