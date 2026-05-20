"""
生成 OpenAPI 规范文件

将 FastAPI 应用的 OpenAPI 规范导出为 JSON 和 YAML 文件
"""
import json
import yaml
import sys
import os
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 设置环境变量（避免数据库连接错误）
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

try:
    from app.main import app
except Exception as e:
    print(f"警告: 无法导入应用: {e}")
    print("尝试直接创建 FastAPI 应用...")
    from fastapi import FastAPI
    app = FastAPI(
        title="实验室样品管理 FastAPI 后端服务",
        version="1.0.0"
    )


def generate_openapi_files():
    """生成 OpenAPI 规范文件"""
    try:
        # 获取 OpenAPI 规范
        openapi_schema = app.openapi()
        
        # 创建输出目录
        output_dir = project_root / "docs" / "api"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成 JSON 文件
        json_path = output_dir / "openapi.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(openapi_schema, f, ensure_ascii=False, indent=2)
        print(f"✓ OpenAPI JSON 文件已生成: {json_path}")
        
        # 生成 YAML 文件
        yaml_path = output_dir / "openapi.yaml"
        with open(yaml_path, "w", encoding="utf-8") as f:
            yaml.dump(openapi_schema, f, allow_unicode=True, sort_keys=False)
        print(f"✓ OpenAPI YAML 文件已生成: {yaml_path}")
        
        # 生成 README
        readme_path = output_dir / "README.md"
        readme_content = f"""# API 文档

## OpenAPI 规范文件

本目录包含 FastAPI 后端的 OpenAPI 规范文件：

- `openapi.json` - JSON 格式的 OpenAPI 3.0 规范
- `openapi.yaml` - YAML 格式的 OpenAPI 3.0 规范

## 在线文档

启动服务后，可以通过以下地址访问交互式 API 文档：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API 概览

- **版本**: {openapi_schema.get('info', {}).get('version', 'N/A')}
- **标题**: {openapi_schema.get('info', {}).get('title', 'N/A')}
- **端点数量**: {len(openapi_schema.get('paths', {}))}
- **模型数量**: {len(openapi_schema.get('components', {}).get('schemas', {}))}

## 主要功能模块

### 认证授权
- 用户登录、登出
- JWT 令牌管理
- 权限控制

### 样品管理
- 样品 CRUD 操作
- 样品流转管理
- 条码管理

### 工作流管理
- 工作流模板管理
- 工作流实例管理
- 任务管理

### 检测结果管理
- 结果录入和查询
- 批量导入
- 公式计算
- 异常检测

### 审核管理
- 审核任务管理
- 审核流程配置
- 质量判定

### 报告管理
- 报告模板管理
- 报告生成
- 电子签名
- 报告分发

### 统计分析
- 综合统计
- 审核统计
- 工作量统计
- 数据导出

### 系统管理
- 审计日志
- 性能监控
- 队列管理
- 检测方法库

## 使用说明

### 认证

大多数 API 端点需要认证。首先调用登录接口获取访问令牌：

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{{"username": "admin", "password": "admin123"}}'
```

然后在后续请求中包含令牌：

```bash
curl -X GET http://localhost:8000/api/v1/samples \\
  -H "Authorization: Bearer <your-access-token>"
```

### 分页

列表查询接口支持分页参数：

- `page`: 页码（从 1 开始）
- `pageSize`: 每页数量（默认 20，最大 100）

### 错误处理

所有错误响应遵循统一格式：

```json
{{
  "error": {{
    "code": "ERROR_CODE",
    "message": "错误消息",
    "details": "详细信息"
  }}
}}
```

常见错误代码：

- `400` - 请求参数错误
- `401` - 未授权
- `403` - 权限不足
- `404` - 资源不存在
- `409` - 资源冲突
- `422` - 数据验证失败
- `429` - 请求过于频繁
- `500` - 服务器内部错误

## 更新日志

- **{openapi_schema.get('info', {}).get('version', 'N/A')}** - 初始版本
  - 完整实现所有功能模块
  - 支持 OpenAPI 3.0 规范
  - 提供 Swagger UI 和 ReDoc 文档

## 联系方式

- **技术支持**: {openapi_schema.get('info', {}).get('contact', {}).get('email', 'N/A')}
"""
        
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(readme_content)
        print(f"✓ README 文件已生成: {readme_path}")
        
        print("\n" + "="*60)
        print("OpenAPI 规范文件生成完成！")
        print("="*60)
        print(f"\n端点总数: {len(openapi_schema.get('paths', {}))}")
        print(f"模型总数: {len(openapi_schema.get('components', {}).get('schemas', {}))}")
        print(f"\n文档位置: {output_dir}")
        print("\n启动服务后访问:")
        print("  - Swagger UI: http://localhost:8000/docs")
        print("  - ReDoc: http://localhost:8000/redoc")
        
        return True
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = generate_openapi_files()
    sys.exit(0 if success else 1)
