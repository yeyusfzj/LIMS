/**
 * JWT 工具函数
 */

import jwt from 'jsonwebtoken'
import { config } from '../config/env'

export interface TokenPayload {
  userId: string
  username: string
  roles: string[]
}

/**
 * 生成访问令牌
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtAccessExpiry
  })
}

/**
 * 验证令牌
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload
}
