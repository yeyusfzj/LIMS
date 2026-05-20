# API 文档目录

本目录包含实验室管理系统后端 API 的自动生成文档。

## 文档文件

- **openapi.json** - OpenAPI 3.0 JSON 格式规范
- **openapi.yaml** - OpenAPI 3.0 YAML 格式规范
- **index.html** - HTML 索引页面

## 查看文档

### 在线查看（推荐）

启动开发服务器后访问：
```
http://localhost:3000/api-docs
```

### 本地查看

直接打开 HTML 文件：
```bash
open index.html  # macOS
start index.html # Windows
```

### 导入到 Postman

1. 打开 Postman
2. 点击 Import
3. 选择 `openapi.json` 或 `openapi.yaml`
4. 导入完成

## 生成文档

### 本地生成

```bash
# 生成所有格式的文档
npm run docs:generate

# 生成变更日志
npm run docs:changelog
```

### CI/CD 自动生成

代码推送到 main 或 develop 分支时，GitHub Actions 会自动：
- 生成最新文档
- 生成变更日志
- 发布到 GitHub Pages

## 版本管理

### 归档当前版本

```bash
# 使用当前版本号
npm run docs:archive

# 指定版本号和描述
node scripts/version-docs.js archive 1.0.0 "初始版本"
```

### 查看所有版本

```bash
npm run docs:list
```

### 恢复历史版本

```bash
node scripts/version-docs.js restore 1.0.0
```

### 对比版本差异

```bash
node scripts/version-docs.js compare 1.0.0 1.1.0
```

## 历史版本

历史版本存储在 `versions/` 目录下，每个版本包含：
- openapi.json
- openapi.yaml
- metadata.json（版本元数据）

## 更多信息

详细文档请参考：
- [API 文档自动化系统](../API_DOCUMENTATION_AUTOMATION.md)
- [Swagger 配置文档](../SWAGGER_SETUP.md)
- [任务完成总结](../TASK_21.3_SUMMARY.md)
