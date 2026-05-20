import { Request, Response, NextFunction } from 'express'
import { authService } from '../services/authService'
import { logger } from '../config/logger'

/**
 * JWT 认证中间件
 * 验证请求头中的 Bearer Token
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 获取 Authorization 头
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '缺少认证令牌'
        }
      })
      return
    }

    // 提取令牌
    const token = authHeader.substring(7)

    // 验证令牌
    const payload = await authService.verifyToken(token)

    // 将用户信息附加到请求对象
    ;(req as any).user = {
      userId: payload.userId,
      username: payload.username,
      roles: payload.roles
    }

    next()
  } catch (error) {
    logger.error('Authentication error:', error)
    res.status(401).json({
      error: {
        code: 'AUTH_FAILED',
        message: error instanceof Error ? error.message : '认证失败'
      }
    })
  }
}

/**
 * 可选认证中间件
 * 如果有令牌则验证，没有令牌则继续
 */
export async function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = await authService.verifyToken(token)

      ;(req as any).user = {
        userId: payload.userId,
        username: payload.username,
        roles: payload.roles
      }
    }

    next()
  } catch (error) {
    // 可选认证失败不阻止请求
    logger.warn('Optional authentication failed:', error)
    next()
  }
}

// 导出默认中间件
export const authMiddleware = authenticate
