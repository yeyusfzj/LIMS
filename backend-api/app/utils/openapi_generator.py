"""
OpenAPI 文档生成工具

提供 API 文档的生成、导出和版本管理功能
"""
import json
import yaml
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi


class OpenAPIGenerator:
    """OpenAPI 文档生成器"""
    
    def __init__(self, app: FastAPI, docs_dir: str = "docs/api"):
        """
        初始化文档生成器
        
        Args:
            app: FastAPI 应用实例
            docs_dir: 文档输出目录
        """
        self.app = app
        self.docs_dir = Path(docs_dir)
        self.docs_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_openapi_spec(self) -> Dict[str, Any]:
        """
        生成 OpenAPI 规范
        
        Returns:
            OpenAPI 规范字典
        """
        # 获取 OpenAPI 规范
        openapi_schema = get_openapi(
            title=self.app.title,
            version=self.app.version,
            description=self.app.description,
            routes=self.app.routes,
            tags=self.app.openapi_tags,
            servers=self.app.servers,
            terms_of_service=self.app.terms_of_service,
            contact=self.app.contact,
            license_info=self.app.license_info,
        )
        
        # 添加构建信息
        openapi_schema["info"]["x-build-info"] = {
            "buildTime": datetime.now().isoformat(),
            "environment": "production"
        }
        
        return openapi_schema
    
    def export_to_json(self, output_path: Optional[str] = None) -> str:
        """
        导出为 JSON 格式
        
        Args:
            output_path: 输出文件路径，默认为 docs/api/openapi.json
            
        Returns:
            输出文件路径
        """
        if output_path is None:
            output_path = str(self.docs_dir / "openapi.json")
        
        spec = self.generate_openapi_spec()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(spec, f, indent=2, ensure_ascii=False)
        
        return output_path
    
    def export_to_yaml(self, output_path: Optional[str] = None) -> str:
        """
        导出为 YAML 格式
        
        Args:
            output_path: 输出文件路径，默认为 docs/api/openapi.yaml
            
        Returns:
            输出文件路径
        """
        if output_path is None:
            output_path = str(self.docs_dir / "openapi.yaml")
        
        spec = self.generate_openapi_spec()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(spec, f, allow_unicode=True, sort_keys=False)
        
        return output_path
    
    def generate_html_index(self, output_path: Optional[str] = None) -> str:
        """
        生成 HTML 索引页
        
        Args:
            output_path: 输出文件路径，默认为 docs/api/index.html
            
        Returns:
            输出文件路径
        """
        if output_path is None:
            output_path = str(self.docs_dir / "index.html")
        
        spec = self.generate_openapi_spec()
        version = spec["info"]["version"]
        build_time = spec["info"].get("x-build-info", {}).get("buildTime", "")
        
        # 统计信息
        paths_count = len(spec.get("paths", {}))
        schemas_count = len(spec.get("components", {}).get("schemas", {}))
        tags_count = len(spec.get("tags", []))
        
        # 生成 HTML
        html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{spec["info"]["title"]} - API 文档</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 1200px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
      background: #f5f5f5;
    }}
    .container {{
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }}
    h1 {{
      color: #333;
      margin-bottom: 10px;
    }}
    .subtitle {{
      color: #666;
      font-size: 1.1em;
      margin-bottom: 30px;
    }}
    .info {{
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      border-left: 4px solid #007bff;
    }}
    .info-item {{
      margin: 8px 0;
    }}
    .info-label {{
      font-weight: bold;
      color: #555;
    }}
    .stats {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 30px 0;
    }}
    .stat-card {{
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
      padding: 25px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }}
    .stat-number {{
      font-size: 2.5em;
      font-weight: bold;
      margin-bottom: 5px;
    }}
    .stat-label {{
      font-size: 0.9em;
      opacity: 0.9;
    }}
    .links {{
      margin: 30px 0;
    }}
    .link-button {{
      display: inline-block;
      margin: 10px 10px 10px 0;
      padding: 12px 24px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      transition: background 0.3s;
    }}
    .link-button:hover {{
      background: #0056b3;
    }}
    .link-button.secondary {{
      background: #6c757d;
    }}
    .link-button.secondary:hover {{
      background: #545b62;
    }}
    .section {{
      margin: 30px 0;
    }}
    .section h2 {{
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }}
    .tag-list {{
      list-style: none;
      padding: 0;
    }}
    .tag-item {{
      background: #f8f9fa;
      padding: 12px;
      margin: 8px 0;
      border-radius: 5px;
      border-left: 3px solid #007bff;
    }}
    .tag-name {{
      font-weight: bold;
      color: #007bff;
    }}
    .tag-description {{
      color: #666;
      margin-top: 5px;
    }}
  </style>
</head>
<body>
  <div class="container">
    <h1>{spec["info"]["title"]}</h1>
    <div class="subtitle">{spec["info"].get("description", "").split("##")[0].strip()}</div>
    
    <div class="info">
      <div class="info-item">
        <span class="info-label">版本:</span> {version}
      </div>
      <div class="info-item">
        <span class="info-label">生成时间:</span> {build_time}
      </div>
      <div class="info-item">
        <span class="info-label">环境:</span> 生产环境
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-number">{paths_count}</div>
        <div class="stat-label">API 端点</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{schemas_count}</div>
        <div class="stat-label">数据模型</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{tags_count}</div>
        <div class="stat-label">API 分类</div>
      </div>
    </div>

    <div class="links">
      <a href="/docs" class="link-button" target="_blank">Swagger UI 文档</a>
      <a href="/redoc" class="link-button" target="_blank">ReDoc 文档</a>
      <a href="openapi.json" class="link-button secondary" target="_blank">下载 JSON</a>
      <a href="openapi.yaml" class="link-button secondary" target="_blank">下载 YAML</a>
    </div>

    <div class="section">
      <h2>使用说明</h2>
      <ol>
        <li>访问 <a href="/docs" target="_blank">Swagger UI</a> 进行交互式 API 测试</li>
        <li>访问 <a href="/redoc" target="_blank">ReDoc</a> 查看详细的 API 文档</li>
        <li>下载 JSON 或 YAML 文件导入到 Postman 或其他 API 工具</li>
        <li>使用 OpenAPI Generator 生成客户端 SDK</li>
      </ol>
    </div>

    <div class="section">
      <h2>API 分类</h2>
      <ul class="tag-list">
"""
        
        # 添加标签列表
        for tag in spec.get("tags", []):
            html += f"""        <li class="tag-item">
          <div class="tag-name">{tag.get("name", "")}</div>
          <div class="tag-description">{tag.get("description", "")}</div>
        </li>
"""
        
        html += """      </ul>
    </div>
  </div>
</body>
</html>"""
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        return output_path
    
    def generate_all(self) -> Dict[str, str]:
        """
        生成所有格式的文档
        
        Returns:
            生成的文件路径字典
        """
        return {
            "json": self.export_to_json(),
            "yaml": self.export_to_yaml(),
            "html": self.generate_html_index()
        }
    
    def archive_version(self, version: Optional[str] = None, description: str = "") -> str:
        """
        归档当前版本的文档
        
        Args:
            version: 版本号，默认使用应用版本
            description: 版本描述
            
        Returns:
            归档目录路径
        """
        if version is None:
            version = self.app.version
        
        # 创建版本目录
        version_dir = self.docs_dir / "versions" / version
        version_dir.mkdir(parents=True, exist_ok=True)
        
        # 生成文档
        spec = self.generate_openapi_spec()
        
        # 保存 JSON
        json_path = version_dir / "openapi.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(spec, f, indent=2, ensure_ascii=False)
        
        # 保存 YAML
        yaml_path = version_dir / "openapi.yaml"
        with open(yaml_path, 'w', encoding='utf-8') as f:
            yaml.dump(spec, f, allow_unicode=True, sort_keys=False)
        
        # 保存元数据
        metadata = {
            "version": version,
            "description": description,
            "archivedAt": datetime.now().isoformat(),
            "files": ["openapi.json", "openapi.yaml"]
        }
        
        metadata_path = version_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        
        # 更新版本索引
        self._update_version_index(version, metadata)
        
        return str(version_dir)
    
    def _update_version_index(self, version: str, metadata: Dict[str, Any]) -> None:
        """
        更新版本索引
        
        Args:
            version: 版本号
            metadata: 版本元数据
        """
        versions_dir = self.docs_dir / "versions"
        index_path = versions_dir / "index.json"
        
        # 读取现有索引
        if index_path.exists():
            with open(index_path, 'r', encoding='utf-8') as f:
                index = json.load(f)
        else:
            index = {"versions": []}
        
        # 移除旧的同版本记录
        index["versions"] = [v for v in index["versions"] if v["version"] != version]
        
        # 添加新版本
        index["versions"].insert(0, {
            "version": version,
            "description": metadata["description"],
            "archivedAt": metadata["archivedAt"],
            "path": f"versions/{version}"
        })
        
        # 保持最近 20 个版本
        if len(index["versions"]) > 20:
            removed = index["versions"][20:]
            index["versions"] = index["versions"][:20]
            
            # 删除旧版本文件
            for v in removed:
                old_dir = versions_dir / v["version"]
                if old_dir.exists():
                    import shutil
                    shutil.rmtree(old_dir)
        
        # 保存索引
        with open(index_path, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
    
    def list_versions(self) -> List[Dict[str, Any]]:
        """
        列出所有归档版本
        
        Returns:
            版本列表
        """
        index_path = self.docs_dir / "versions" / "index.json"
        
        if not index_path.exists():
            return []
        
        with open(index_path, 'r', encoding='utf-8') as f:
            index = json.load(f)
        
        return index.get("versions", [])
    
    def restore_version(self, version: str) -> bool:
        """
        恢复指定版本的文档
        
        Args:
            version: 版本号
            
        Returns:
            是否成功
        """
        version_dir = self.docs_dir / "versions" / version
        
        if not version_dir.exists():
            return False
        
        # 读取版本元数据
        metadata_path = version_dir / "metadata.json"
        if not metadata_path.exists():
            return False
        
        with open(metadata_path, 'r', encoding='utf-8') as f:
            metadata = json.load(f)
        
        # 恢复文档文件
        import shutil
        for file in metadata["files"]:
            source = version_dir / file
            target = self.docs_dir / file
            if source.exists():
                shutil.copy2(source, target)
        
        return True
    
    def compare_versions(self, version1: str, version2: str) -> Dict[str, Any]:
        """
        对比两个版本的差异
        
        Args:
            version1: 版本1
            version2: 版本2
            
        Returns:
            差异信息
        """
        # 读取两个版本的规范
        v1_path = self.docs_dir / "versions" / version1 / "openapi.json"
        v2_path = self.docs_dir / "versions" / version2 / "openapi.json"
        
        if not v1_path.exists() or not v2_path.exists():
            return {"error": "版本文件不存在"}
        
        with open(v1_path, 'r', encoding='utf-8') as f:
            spec1 = json.load(f)
        
        with open(v2_path, 'r', encoding='utf-8') as f:
            spec2 = json.load(f)
        
        # 比较端点
        paths1 = set(spec1.get("paths", {}).keys())
        paths2 = set(spec2.get("paths", {}).keys())
        
        added_paths = list(paths2 - paths1)
        removed_paths = list(paths1 - paths2)
        common_paths = list(paths1 & paths2)
        
        # 比较数据模型
        schemas1 = set(spec1.get("components", {}).get("schemas", {}).keys())
        schemas2 = set(spec2.get("components", {}).get("schemas", {}).keys())
        
        added_schemas = list(schemas2 - schemas1)
        removed_schemas = list(schemas1 - schemas2)
        
        return {
            "version1": version1,
            "version2": version2,
            "paths": {
                "added": added_paths,
                "removed": removed_paths,
                "common": len(common_paths),
                "total_v1": len(paths1),
                "total_v2": len(paths2)
            },
            "schemas": {
                "added": added_schemas,
                "removed": removed_schemas,
                "total_v1": len(schemas1),
                "total_v2": len(schemas2)
            }
        }
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        获取文档统计信息
        
        Returns:
            统计信息
        """
        spec = self.generate_openapi_spec()
        
        paths = spec.get("paths", {})
        components = spec.get("components", {})
        
        # 统计端点数量
        total_endpoints = 0
        methods_count = {}
        
        for path, methods in paths.items():
            for method in methods.keys():
                if method in ["get", "post", "put", "delete", "patch"]:
                    total_endpoints += 1
                    methods_count[method.upper()] = methods_count.get(method.upper(), 0) + 1
        
        # 统计标签
        tags = spec.get("tags", [])
        
        return {
            "version": spec["info"]["version"],
            "title": spec["info"]["title"],
            "endpoints": {
                "total": total_endpoints,
                "by_method": methods_count
            },
            "paths": len(paths),
            "schemas": len(components.get("schemas", {})),
            "tags": len(tags),
            "tag_names": [tag["name"] for tag in tags]
        }


def create_generator(app: FastAPI) -> OpenAPIGenerator:
    """
    创建文档生成器实例
    
    Args:
        app: FastAPI 应用实例
        
    Returns:
        文档生成器实例
    """
    return OpenAPIGenerator(app)
