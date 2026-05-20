"""
验证 API 文档完整性

检查所有端点是否有完整的文档
"""
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import os
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://user:pass@localhost/db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key")

try:
    from app.main import app
except Exception as e:
    print(f"错误: 无法导入应用: {e}")
    sys.exit(1)


def verify_documentation():
    """验证文档完整性"""
    print("="*60)
    print("API 文档完整性验证")
    print("="*60)
    
    # 获取 OpenAPI 规范
    openapi_schema = app.openapi()
    
    # 统计信息
    total_paths = len(openapi_schema.get('paths', {}))
    total_schemas = len(openapi_schema.get('components', {}).get('schemas', {}))
    
    print(f"\n📊 统计信息:")
    print(f"  - 总端点数: {total_paths}")
    print(f"  - 总模型数: {total_schemas}")
    
    # 检查端点文档
    print(f"\n🔍 检查端点文档...")
    
    missing_summary = []
    missing_description = []
    missing_tags = []
    endpoints_with_examples = 0
    total_endpoints = 0
    
    for path, methods in openapi_schema.get('paths', {}).items():
        for method, details in methods.items():
            if method in ['get', 'post', 'put', 'patch', 'delete']:
                total_endpoints += 1
                endpoint_name = f"{method.upper()} {path}"
                
                # 检查 summary
                if not details.get('summary'):
                    missing_summary.append(endpoint_name)
                
                # 检查 description
                if not details.get('description'):
                    missing_description.append(endpoint_name)
                
                # 检查 tags
                if not details.get('tags'):
                    missing_tags.append(endpoint_name)
                
                # 检查是否有示例
                has_example = False
                if 'requestBody' in details:
                    content = details['requestBody'].get('content', {})
                    for media_type, media_details in content.items():
                        if 'example' in media_details or 'examples' in media_details:
                            has_example = True
                            break
                
                if 'responses' in details:
                    for status_code, response in details['responses'].items():
                        content = response.get('content', {})
                        for media_type, media_details in content.items():
                            if 'example' in media_details or 'examples' in media_details:
                                has_example = True
                                break
                
                if has_example:
                    endpoints_with_examples += 1
    
    # 输出检查结果
    print(f"\n✅ 文档完整性:")
    print(f"  - 有 summary 的端点: {total_endpoints - len(missing_summary)}/{total_endpoints}")
    print(f"  - 有 description 的端点: {total_endpoints - len(missing_description)}/{total_endpoints}")
    print(f"  - 有 tags 的端点: {total_endpoints - len(missing_tags)}/{total_endpoints}")
    print(f"  - 有示例的端点: {endpoints_with_examples}/{total_endpoints}")
    
    # 检查模型示例
    print(f"\n🔍 检查模型示例...")
    
    schemas_with_examples = 0
    schemas_without_examples = []
    
    for schema_name, schema_details in openapi_schema.get('components', {}).get('schemas', {}).items():
        if 'example' in schema_details or 'examples' in schema_details:
            schemas_with_examples += 1
        else:
            # 检查是否是枚举或简单类型
            if schema_details.get('type') not in ['string', 'integer', 'number', 'boolean']:
                if schema_details.get('enum') is None:
                    schemas_without_examples.append(schema_name)
    
    print(f"\n✅ 模型示例:")
    print(f"  - 有示例的模型: {schemas_with_examples}/{total_schemas}")
    print(f"  - 缺少示例的模型: {len(schemas_without_examples)}/{total_schemas}")
    
    # 详细报告
    if missing_summary:
        print(f"\n⚠️  缺少 summary 的端点 ({len(missing_summary)}):")
        for endpoint in missing_summary[:10]:  # 只显示前 10 个
            print(f"  - {endpoint}")
        if len(missing_summary) > 10:
            print(f"  ... 还有 {len(missing_summary) - 10} 个")
    
    if missing_description:
        print(f"\n⚠️  缺少 description 的端点 ({len(missing_description)}):")
        for endpoint in missing_description[:10]:
            print(f"  - {endpoint}")
        if len(missing_description) > 10:
            print(f"  ... 还有 {len(missing_description) - 10} 个")
    
    if schemas_without_examples:
        print(f"\n⚠️  缺少示例的模型 ({len(schemas_without_examples)}):")
        for schema in schemas_without_examples[:20]:  # 只显示前 20 个
            print(f"  - {schema}")
        if len(schemas_without_examples) > 20:
            print(f"  ... 还有 {len(schemas_without_examples) - 20} 个")
    
    # 计算完整性分数
    summary_score = (total_endpoints - len(missing_summary)) / total_endpoints * 100 if total_endpoints > 0 else 0
    description_score = (total_endpoints - len(missing_description)) / total_endpoints * 100 if total_endpoints > 0 else 0
    tags_score = (total_endpoints - len(missing_tags)) / total_endpoints * 100 if total_endpoints > 0 else 0
    example_score = endpoints_with_examples / total_endpoints * 100 if total_endpoints > 0 else 0
    model_example_score = schemas_with_examples / total_schemas * 100 if total_schemas > 0 else 0
    
    overall_score = (summary_score + description_score + tags_score + example_score + model_example_score) / 5
    
    print(f"\n📈 文档完整性评分:")
    print(f"  - Summary 完整性: {summary_score:.1f}%")
    print(f"  - Description 完整性: {description_score:.1f}%")
    print(f"  - Tags 完整性: {tags_score:.1f}%")
    print(f"  - 端点示例完整性: {example_score:.1f}%")
    print(f"  - 模型示例完整性: {model_example_score:.1f}%")
    print(f"  - 总体评分: {overall_score:.1f}%")
    
    # 检查文档访问
    print(f"\n🌐 文档访问地址:")
    print(f"  - Swagger UI: http://localhost:8000/docs")
    print(f"  - ReDoc: http://localhost:8000/redoc")
    print(f"  - OpenAPI JSON: http://localhost:8000/openapi.json")
    
    print(f"\n" + "="*60)
    
    if overall_score >= 90:
        print("✅ 文档质量优秀！")
        return 0
    elif overall_score >= 70:
        print("⚠️  文档质量良好，但仍有改进空间")
        return 0
    else:
        print("❌ 文档质量需要改进")
        return 1


if __name__ == "__main__":
    try:
        exit_code = verify_documentation()
        sys.exit(exit_code)
    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
