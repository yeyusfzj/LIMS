# Swagger/OpenAPI 配置文档

## 概述

本文档说明实验室管理系统后端 API 的 Swagger/OpenAPI 文档配置。

## 已完成的配置

### 1. 依赖包安装

已安装以下 npm 包：

```bash
# 生产依赖
npm install swagger-jsdoc swagger-ui-express

# 开发依赖
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### 2. Swagger 配置文件

创建了 `src/config/swagger.ts` 配置文件，包含：

- **OpenAPI 3.0.0 规范**
- **API 基本信息**：标题、版本、描述、联系方式、许可证
- **服务器配置**：开发环境和生产环境的 URL
- **安全方案**：JWT Bearer 认证配置
- **通用组件**：
  - 错误响应模型（ErrorResponse）
  - 分页响应模型（PaginatedResponse）
  - 通用错误响应（401、403、404、409、500）
  - 通用查询参数（page、pageSize、sort）
- **API 标签分类**：认证、样品管理、工作流、任务管理、检测结果、审核判定、报告管理、统计分析、系统管理、权限管理

### 3. 应用集成

在 `src/app.ts` 中集成了 Swagger UI：

```typescript
// API 文档路由（公开访问）
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '实验室管理系统 API 文档',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true
  }
}))

// Swagger JSON 规范（供其他工具使用）
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})
```

### 4. 启动日志

在 `src/main.ts` 中添加了 API 文档访问信息：

```typescript
logger.info(`API Documentation: http://localhost:${config.port}/api-docs`)
```

## 访问 API 文档

启动服务器后，可以通过以下方式访问 API 文档：

### 交互式文档界面

```
http://localhost:3000/api-docs
```

提供完整的交互式 API 文档，支持：
- 浏览所有 API 端点
- 查看请求和响应模型
- 在线测试 API（Try it out）
- JWT 认证配置（Authorize 按钮）

### JSON 规范文件

```
http://localhost:3000/api-docs.json
```

返回完整的 OpenAPI 3.0 JSON 规范，可用于：
- 导入到 Postman
- 生成客户端 SDK
- 集成到其他工具

## 功能特性

### 1. 认证支持

- 配置了 JWT Bearer 认证方案
- 在 Swagger UI 中点击 "Authorize" 按钮输入令牌
- 令牌格式：`Bearer <your-token>`
- 认证后的请求会自动携带 Authorization 头

### 2. 交互式测试

- 每个 API 端点都可以直接在浏览器中测试
- 支持填写请求参数、请求体
- 实时查看响应结果
- 显示请求耗时

### 3. 文档过滤

- 支持按标签过滤 API
- 支持搜索功能
- 可折叠/展开 API 分组

### 4. 响应示例

- 提供标准错误响应示例
- 包含所有 HTTP 状态码的说明
- 展示完整的数据模型结构

## 下一步工作

### 为 API 端点添加文档注释

需要在各个路由和控制器文件中添加 JSDoc 注释，Swagger 会自动扫描并生成文档。

示例：

```typescript
/**
 * @swagger
 * /api/samples:
 *   post:
 *     summary: 创建样品
 *     description: 创建新的样品记录并生成唯一条码
 *     tags: [样品管理]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientName
 *               - sampleName
 *               - sampleType
 *             properties:
 *               clientName:
 *                 type: string
 *                 description: 客户名称
 *                 example: 测试公司
 *               sampleName:
 *                 type: string
 *                 description: 样品名称
 *                 example: 水样
 *     responses:
 *       201:
 *         description: 样品创建成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sample'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post('/samples', authenticate, createSample)
```

### 定义数据模型

在 `src/config/swagger.ts` 的 `components.schemas` 中添加数据模型定义：

```typescript
components: {
  schemas: {
    Sample: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          description: '样品 ID'
        },
        barcode: {
          type: 'string',
          description: '样品条码'
        },
        // ... 其他字段
      }
    }
  }
}
```

## 配置说明

### 自动扫描路径

Swagger 会自动扫描以下路径中的 JSDoc 注释：

```typescript
apis: [
  './src/routes/*.ts',
  './src/controllers/*.ts',
  './src/types/*.ts'
]
```

### 自定义配置

可以在 `src/config/swagger.ts` 中修改：

- API 标题和描述
- 服务器 URL
- 安全方案
- 标签分类
- 通用组件

## 验证需求

本配置满足以下需求：

- **需求 23.1**：自动生成 API 文档（使用 OpenAPI/Swagger 规范）✓
- **需求 23.3**：提供交互式 API 测试界面 ✓

## 注意事项

1. **公开访问**：API 文档路由 `/api-docs` 不需要认证，可以公开访问
2. **生产环境**：建议在生产环境中限制文档访问或完全禁用
3. **文档更新**：添加或修改 API 时，需要同步更新 JSDoc 注释
4. **类型安全**：使用 TypeScript 类型定义可以提高文档准确性

## 故障排除

### 文档不显示

1. 检查服务器是否正常启动
2. 确认访问 URL 正确：`http://localhost:3000/api-docs`
3. 查看浏览器控制台是否有错误

### API 端点未显示

1. 确认路由文件路径在 `apis` 配置中
2. 检查 JSDoc 注释格式是否正确
3. 重启服务器以重新扫描文件

### 认证测试失败

1. 确认已点击 "Authorize" 按钮
2. 检查令牌格式：`Bearer <token>`
3. 确认令牌未过期

## 参考资源

- [OpenAPI 3.0 规范](https://swagger.io/specification/)
- [swagger-jsdoc 文档](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express 文档](https://github.com/scottie1984/swagger-ui-express)
