import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'

// 请求日志中间件
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now()

  // 记录请求开始
  logger.info('Request started', {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent')
  })

  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - startTime

    // 根据状态码选择日志级别
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info'

    logger.log(logLevel, 'Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    })

    // 记录慢请求
    if (duration > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        duration: `${duration}ms`
      })
    }
  })

  next()
}
