import { Request, Response, NextFunction } from 'express'
import performanceMonitorService from '../services/performanceMonitorService'
import { ApiPerformanceMetric } from '../types/performance'

/**
 * API 性能监控中间件
 * 记录每个 API 请求的响应时间和相关信息
 */
export function performanceMonitorMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now()

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime

    // 构建性能指标
    const metric: ApiPerformanceMetric = {
      method: req.method,
      path: req.route?.path || req.path, // 使用路由路径而不是实际路径
      statusCode: res.statusCode,
      duration,
      timestamp: new Date(startTime),
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent')
    }

    // 异步记录性能指标（不阻塞响应）
    performanceMonitorService.recordApiMetric(metric).catch(error => {
      // 静默失败，不影响正常请求
      console.error('Failed to record API metric:', error)
    })
  })

  next()
}

/**
 * 数据库查询性能监控
 * 用于 Prisma 查询日志事件
 */
export function setupDatabasePerformanceMonitoring(): void {
  const prisma = require('../config/database').default

  // 监听 Prisma 查询事件
  prisma.$on('query', (e: any) => {
    // 解析查询以提取模型和操作信息
    const queryLower = e.query.toLowerCase()
    let model: string | undefined
    let operation: string | undefined

    // 尝试从查询中提取表名（模型）
    const tableMatch = e.query.match(/FROM\s+["']?(\w+)["']?/i) || 
                       e.query.match(/INTO\s+["']?(\w+)["']?/i) ||
                       e.query.match(/UPDATE\s+["']?(\w+)["']?/i)
    if (tableMatch) {
      model = tableMatch[1]
    }

    // 确定操作类型
    if (queryLower.includes('select')) {
      operation = 'findMany'
    } else if (queryLower.includes('insert')) {
      operation = 'create'
    } else if (queryLower.includes('update')) {
      operation = 'update'
    } else if (queryLower.includes('delete')) {
      operation = 'delete'
    }

    performanceMonitorService.recordDatabaseMetric({
      query: e.query,
      duration: e.duration,
      timestamp: new Date(e.timestamp),
      params: e.params,
      model,
      operation
    }).catch(error => {
      console.error('Failed to record database metric:', error)
    })
  })
}
