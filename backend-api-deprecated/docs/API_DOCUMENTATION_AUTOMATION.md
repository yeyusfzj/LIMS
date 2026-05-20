# API 文档自动化系统

## 概述

本文档说明实验室管理系统后端 API 的文档自动化系统，包括 CI/CD 自动生成、版本管理和发布流程。

## 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    代码变更                              │
│              (src/**/*.ts 文件修改)                      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              GitHub Actions 触发                         │
│         (.github/workflows/api-docs.yml)                │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ 验证文档  │  │ 生成文档  │  │ 发布文档  │
│ 完整性   │  │ 和变更日志│  │ 到 Pages │
└──────────┘  └──────────┘  └──────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              文档版本归档                                │
│         (docs/api/versions/<version>/)                  │
└─────────────────────────────────────────────────────────┘
```

## 功能特性

### 1. CI/CD 自动生成

#### 触发条件

文档自动生成在以下情况下触发：

- **Push 到 main 分支**：生成并发布正式版本文档
- **Push 到 develop 分支**：生成开发版本文档
- **Pull Request**：验证文档完整性（不发布）

#### 工作流程

1. **验证阶段**
   - 检出代码
   - 安装依赖
   - 构建项目
   - 验证 Swagger 配置
   - 检查文档覆盖率

2. **生成阶段**
   - 生成 OpenAPI JSON 规范
   - 生成 OpenAPI YAML 规范
   - 添加构建信息（提交哈希、分支、时间）
   - 生成文档变更日志

3. **发布阶段**
   - 上传文档制品（保留 90 天）
   - 提交到 gh-pages 分支
   - 生成 HTML 索引页面
   - 发送更新通知

### 2. 文档版本管理

#### 版本归档

系统支持自动归档 API 文档的不同版本：

```bash
# 归档当前版本
npm run docs:archive

# 归档指定版本并添加描述
node scripts/version-docs.js archive 1.0.0 "初始版本"
```

归档内容包括：
- OpenAPI JSON 规范
- OpenAPI YAML 规范
- 版本元数据（版本号、描述、归档时间）

#### 版本查询

```bash
# 列出所有已归档版本
npm run docs:list

# 输出示例：
# 版本号              归档时间                      描述
# --------------------------------------------------------------------------------
# 1.2.0              2024-03-10 10:30:00          添加报告管理接口
# 1.1.0              2024-03-05 15:20:00          添加样品流转功能
# 1.0.0              2024-03-01 09:00:00          初始版本
```

#### 版本恢复

```bash
# 恢复指定版本的文档
node scripts/version-docs.js restore 1.0.0
```

#### 版本对比

```bash
# 对比两个版本的差异
node scripts/version-docs.js compare 1.0.0 1.1.0

# 输出示例：
# 端点变更:
#   新增: 5
#   删除: 0
#   保持: 20
#
# 新增端点:
#   + POST /api/samples/{id}/transfer
#   + GET /api/samples/{id}/custody
#   ...
```

### 3. 变更日志生成

系统自动检测 API 变更并生成变更日志：

```bash
# 生成变更日志
npm run docs:changelog
```

变更日志包括：
- ✨ 新增端点
- 🔄 修改的端点
- ❌ 删除的端点
- 📦 数据模型变更

变更日志保存在 `docs/CHANGELOG.md`，每次更新会追加到文件开头。

### 4. 本地文档生成

开发环境可以手动生成文档：

```bash
# 生成本地文档
npm run docs:generate
```

生成的文档位于 `docs/api/` 目录：
- `openapi.json` - JSON 格式规范
- `openapi.yaml` - YAML 格式规范
- `index.html` - HTML 索引页面

## 使用指南

### 开发者工作流

#### 1. 添加新的 API 端点

在路由文件中添加 Swagger 注释：

```typescript
/**
 * @swagger
 * /api/samples:
 *   post:
 *     summary: 创建样品
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSampleRequest'
 *     responses:
 *       201:
 *         description: 样品创建成功
 */
router.post('/samples', authenticate, createSample)
```

#### 2. 本地验证文档

```bash
# 构建项目
npm run build

# 生成文档
npm run docs:generate

# 启动服务器查看文档
npm run dev
# 访问 http://localhost:3000/api-docs
```

#### 3. 提交代码

```bash
git add .
git commit -m "feat: 添加样品创建接口"
git push origin develop
```

#### 4. 自动化流程

- GitHub Actions 自动触发
- 验证文档完整性
- 生成文档和变更日志
- 发布到 GitHub Pages（main 分支）

### 版本发布流程

#### 1. 准备发布

```bash
# 确保所有测试通过
npm run test:run

# 构建项目
npm run build

# 生成并验证文档
npm run docs:generate
```

#### 2. 归档当前版本

```bash
# 归档版本（在合并到 main 之前）
npm run docs:archive

# 或指定版本号和描述
node scripts/version-docs.js archive 1.1.0 "添加样品流转功能"
```

#### 3. 合并到 main 分支

```bash
git checkout main
git merge develop
git push origin main
```

#### 4. 自动发布

- GitHub Actions 自动生成文档
- 发布到 GitHub Pages
- 文档地址：`https://<username>.github.io/<repo>/`

### 查看历史版本

#### 在线查看

访问 GitHub Pages 上的版本目录：
```
https://<username>.github.io/<repo>/versions/1.0.0/openapi.json
```

#### 本地查看

```bash
# 列出所有版本
npm run docs:list

# 恢复指定版本
node scripts/version-docs.js restore 1.0.0

# 查看恢复的文档
open docs/api/index.html
```

## 配置说明

### GitHub Actions 配置

配置文件：`.github/workflows/api-docs.yml`

关键配置项：

```yaml
# 触发条件
on:
  push:
    branches: [main, develop]
    paths: ['src/**/*.ts', 'src/config/swagger.ts']

# 文档保留时间
retention-days: 90

# 发布分支
git push origin gh-pages
```

### 版本管理配置

配置文件：`scripts/version-docs.js`

关键配置项：

```javascript
// 版本存储目录
const VERSIONS_DIR = path.join(__dirname, '../docs/api/versions');

// 最大保留版本数
if (index.versions.length > 20) {
  // 清理旧版本
}
```

### Swagger 配置

配置文件：`src/config/swagger.ts`

关键配置项：

```typescript
// API 扫描路径
apis: [
  './src/routes/*.ts',
  './src/controllers/*.ts',
  './src/types/swagger-schemas.ts'
]

// 服务器配置
servers: [
  {
    url: config.nodeEnv === 'production' 
      ? 'https://api.lims.example.com' 
      : `http://localhost:${config.port}`
  }
]
```

## 文档结构

```
backend-api/
├── .github/
│   └── workflows/
│       └── api-docs.yml          # CI/CD 工作流配置
├── docs/
│   ├── api/
│   │   ├── openapi.json          # 当前版本 JSON 规范
│   │   ├── openapi.yaml          # 当前版本 YAML 规范
│   │   ├── index.html            # HTML 索引页面
│   │   └── versions/             # 历史版本目录
│   │       ├── index.json        # 版本索引
│   │       ├── 1.0.0/            # 版本 1.0.0
│   │       │   ├── openapi.json
│   │       │   ├── openapi.yaml
│   │       │   └── metadata.json
│   │       └── 1.1.0/            # 版本 1.1.0
│   │           ├── openapi.json
│   │           ├── openapi.yaml
│   │           └── metadata.json
│   └── CHANGELOG.md              # API 变更日志
├── scripts/
│   ├── generate-changelog.js    # 变更日志生成脚本
│   ├── generate-docs-local.js   # 本地文档生成脚本
│   └── version-docs.js           # 版本管理脚本
└── src/
    └── config/
        └── swagger.ts            # Swagger 配置
```

## 最佳实践

### 1. 文档注释规范

- **完整性**：每个端点都应有 summary 和 description
- **一致性**：使用统一的标签和命名规范
- **准确性**：确保文档与实际实现一致
- **示例**：提供真实的请求和响应示例

### 2. 版本管理策略

- **语义化版本**：遵循 SemVer 规范（主版本.次版本.修订版本）
- **定期归档**：每次发布前归档当前版本
- **描述清晰**：为每个版本添加有意义的描述
- **保留历史**：保留至少最近 20 个版本

### 3. CI/CD 集成

- **自动触发**：代码变更自动触发文档生成
- **验证检查**：PR 阶段验证文档完整性
- **自动发布**：main 分支自动发布到 GitHub Pages
- **通知机制**：文档更新后发送通知

### 4. 文档维护

- **同步更新**：代码变更时同步更新文档
- **定期审查**：定期审查文档准确性
- **版本对比**：发布前对比版本差异
- **变更记录**：维护完整的变更日志

## 故障排除

### 问题 1：文档生成失败

**症状**：运行 `npm run docs:generate` 报错

**解决方案**：
```bash
# 1. 确保项目已构建
npm run build

# 2. 检查 Swagger 配置
node -e "require('./dist/config/swagger').swaggerSpec"

# 3. 查看详细错误信息
node scripts/generate-docs-local.js
```

### 问题 2：CI/CD 工作流失败

**症状**：GitHub Actions 工作流失败

**解决方案**：
1. 查看 Actions 日志
2. 检查依赖安装是否成功
3. 验证 Prisma 生成是否正常
4. 确认构建步骤无错误

### 问题 3：版本归档失败

**症状**：运行 `npm run docs:archive` 报错

**解决方案**：
```bash
# 1. 确保文档已生成
npm run docs:generate

# 2. 检查目录权限
ls -la docs/api/

# 3. 手动创建版本目录
mkdir -p docs/api/versions

# 4. 重新尝试归档
npm run docs:archive
```

### 问题 4：文档覆盖率低

**症状**：CI 显示文档覆盖率低于 80%

**解决方案**：
1. 检查哪些端点缺少文档
2. 为缺失的端点添加 Swagger 注释
3. 确保所有端点都有 summary 或 description
4. 重新生成文档验证

## 验证需求

本系统满足以下需求：

- ✅ **需求 23.4**：在代码变更时自动更新文档
- ✅ **需求 23.5**：支持文档的版本管理
- ✅ **需求 23.1**：自动生成 API 文档（使用 OpenAPI/Swagger 规范）
- ✅ **需求 23.2**：在文档中包含所有端点、参数、响应和错误码
- ✅ **需求 23.3**：提供交互式 API 测试界面

## 相关文档

- [Swagger 配置文档](./SWAGGER_SETUP.md)
- [API 错误码文档](./API_ERROR_CODES.md)
- [快速开始指南](./QUICK_START.md)

## 总结

API 文档自动化系统提供了完整的文档生成、版本管理和发布流程：

1. **自动化**：代码变更自动触发文档生成和发布
2. **版本化**：支持文档版本归档、查询、恢复和对比
3. **可追溯**：完整的变更日志记录所有 API 变更
4. **易用性**：简单的命令行工具和清晰的工作流程

通过这套系统，开发团队可以：
- 保持文档与代码同步
- 追踪 API 的演进历史
- 快速回溯和对比不同版本
- 为用户提供准确的 API 文档

