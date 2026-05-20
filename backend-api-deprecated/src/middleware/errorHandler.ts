import { Request, Response, NextFunction } from 'express'
import logger from '../config/logger'
import { randomUUID } from 'crypto'

// 标准错误响应接口
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    path: string
    requestId: string
  }
}

// 自定义应用错误类
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }
}

// 错误处理中间件
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 生成请求 ID
  const requestId = randomUUID()

  // 默认错误信息
  let statusCode = 500
  let errorCode = 'INTERNAL_SERVER_ERROR'
  let message = '服务器内部错误'
  let details: any = undefined

  // 处理自定义应用错误
  if (err instanceof AppError) {
    statusCode = err.statusCode
    errorCode = err.code
    message = err.message
    details = err.details
  }
  // 处理 Prisma 错误
  else if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400
    errorCode = 'DATABASE_ERROR'
    message = '数据库操作失败'
  }
  // 处理验证错误
  else if (err.name === 'ValidationError') {
    statusCode = 400
    errorCode = 'VALIDATION_ERROR'
    message = '请求参数验证失败'
  }

  // 记录错误日志
  logger.error('Request error', {
    requestId,
    statusCode,
    errorCode,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id
  })

  // 构建错误响应
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId
    }
  }

  // 开发环境下返回详细错误信息
  if (process.env.NODE_ENV === 'development' && details) {
    errorResponse.error.details = details
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse)
}

// 404 错误处理
export function notFoundHandler(req: Request, res: Response): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: '请求的资源不存在',
      timestamp: new Date().toISOString(),
      path: req.path,
      requestId: randomUUID()
    }
  }

  res.status(404).json(errorResponse)
}

// 异步路由错误包装器
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
