import express, { Application } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config/env'
import { helmetConfig, corsConfig, bodySizeConfig } from './config/security'
import { requestLogger } from './middleware/requestLogger'
import { performanceMonitorMiddleware } from './middleware/performanceMonitorMiddleware'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'
import { globalRateLimiter } from './middleware/rateLimitMiddleware'
import { auditLogMiddleware } from './middleware/auditLogMiddleware'
import { sanitizeMiddleware } from './middleware/validationMiddleware'
import { handleConcurrencyConflict } from './middleware/concurrencyMiddleware'

// 创建 Express 应用
const app: Application = express()

// 安全中间件 - Helmet（设置安全 HTTP 头）
app.use(helmet(helmetConfig))

// CORS 配置（控制跨域访问）
app.use(cors(corsConfig))

// 请求体解析（带大小限制）
app.use(express.json({ limit: bodySizeConfig.json }))
app.use(express.urlencoded({ extended: true, limit: bodySizeConfig.urlencoded }))

// 输入清洗中间件（防止 XSS 攻击）
app.use(sanitizeMiddleware)

// 响应压缩
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false
    }
    return compression.filter(req, res)
  }
}))

// 全局速率限制
app.use(globalRateLimiter)

// 请求日志
app.use(requestLogger)

// 性能监控中间件
app.use(performanceMonitorMiddleware)

// 审计日志中间件（在路由之前注册）
app.use(auditLogMiddleware)

// Swagger API 文档
import swaggerUi = require('swagger-ui-express')
import swaggerSpec from './config/swagger'

// API 文档路由（在认证之前，公开访问）
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

// 健康检查路由（在 API 路由之前，不需要认证）
import healthRoutes from './routes/healthRoutes'
app.use('/', healthRoutes)

// API 路由
import apiRoutes from './routes'
app.use('/api', apiRoutes)

// 404 处理
app.use(notFoundHandler)

// 并发冲突处理（在通用错误处理之前）
app.use(handleConcurrencyConflict)

// 错误处理
app.use(errorHandler)

export default app
export { app }
