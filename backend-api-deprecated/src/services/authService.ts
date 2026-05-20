import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'
import { config } from '../config/env'
import { LoginDto, AuthResult, TokenPayload, UserInfo } from '../types/auth'
import { logger } from '../config/logger'
import { EncryptionUtils } from '../utils/encryption'

const prisma = new PrismaClient()
const redis = createClient({
  socket: {
    host: config.redisHost,
    port: config.redisPort
  },
  password: config.redisPassword
})

let redisConnected = false

// 连接 Redis
redis.connect().then(() => {
  redisConnected = true
  logger.info('Redis connected successfully')
}).catch(err => {
  logger.error('Redis connection error:', err)
  logger.warn('继续运行但不使用Redis缓存功能')
  redisConnected = false
})

export class AuthService {
  /**
   * 用户登录
   * @param loginDto 登录信息
   * @returns 认证结果（包含令牌和用户信息）
   */
  async login(loginDto: LoginDto): Promise<AuthResult> {
    const { username, password } = loginDto

    // 查询用户
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    // 验证用户是否存在
    if (!user) {
      throw new Error('用户名或密码错误')
    }

    // 验证用户状态
    if (user.status !== 'ACTIVE') {
      throw new Error('用户账户已被锁定或停用')
    }

    // 验证密码
    const isPasswordValid = await EncryptionUtils.verifyPassword(password, user.passwordHash)
    if (!isPasswordValid) {
      // 记录登录失败
      logger.warn('Login failed', { username, reason: 'invalid_password' })
      throw new Error('用户名或密码错误')
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    // 提取角色名称
    const roles = user.roles.map(ur => ur.role.name)

    // 生成令牌
    const accessToken = this.generateAccessToken(user.id, username, roles)
    const refreshToken = this.generateRefreshToken(user.id, username, roles)

    // 将刷新令牌存储到 Redis（用于令牌轮换和撤销）
    if (redisConnected) {
      try {
        const refreshTokenKey = `refresh_token:${user.id}`
        await redis.setEx(refreshTokenKey, 7 * 24 * 60 * 60, refreshToken) // 7天过期
      } catch (error) {
        logger.warn('Failed to store refresh token in Redis', { error })
      }
    }

    // 记录登录成功
    logger.info('User logged in', { userId: user.id, username })

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15分钟（秒）
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        roles
      }
    }
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的认证结果
   */
  async refreshToken(refreshToken: string): Promise<AuthResult> {
    try {
      // 验证刷新令牌
      const payload = jwt.verify(refreshToken, config.jwtSecret) as TokenPayload

      // 检查令牌是否在 Redis 中（未被撤销）
      if (redisConnected) {
        try {
          const storedToken = await redis.get(`refresh_token:${payload.userId}`)
          if (!storedToken || storedToken !== refreshToken) {
            throw new Error('刷新令牌无效或已被撤销')
          }
        } catch (error) {
          logger.warn('Failed to check refresh token in Redis', { error })
          // 如果Redis不可用，跳过检查继续处理
        }
      }

      // 查询用户信息
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          roles: {
            include: {
              role: true
            }
          }
        }
      })

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('用户不存在或已被停用')
      }

      // 提取角色名称
      const roles = user.roles.map(ur => ur.role.name)

      // 生成新的令牌对
      const newAccessToken = this.generateAccessToken(user.id, user.username, roles)
      const newRefreshToken = this.generateRefreshToken(user.id, user.username, roles)

      // 更新 Redis 中的刷新令牌（令牌轮换）
      if (redisConnected) {
        try {
          const refreshTokenKey = `refresh_token:${user.id}`
          await redis.setEx(refreshTokenKey, 7 * 24 * 60 * 60, newRefreshToken)
        } catch (error) {
          logger.warn('Failed to update refresh token in Redis', { error })
        }
      }

      logger.info('Token refreshed', { userId: user.id })

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 15 * 60,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          roles
        }
      }
    } catch (error) {
      logger.error('Token refresh failed', { error })
      throw new Error('刷新令牌无效或已过期')
    }
  }

  /**
   * 验证访问令牌
   * @param token 访问令牌
   * @returns 令牌载荷
   */
  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // 检查令牌是否在黑名单中
      if (redisConnected) {
        try {
          const isBlacklisted = await redis.exists(`blacklist:${token}`)
          if (isBlacklisted) {
            throw new Error('令牌已被撤销')
          }
        } catch (error) {
          logger.warn('Failed to check token blacklist in Redis', { error })
          // 如果Redis不可用，跳过黑名单检查
        }
      }

      // 验证令牌
      const payload = jwt.verify(token, config.jwtSecret) as TokenPayload
      return payload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('令牌已过期')
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('令牌无效')
      }
      throw error
    }
  }

  /**
   * 用户登出
   * @param userId 用户ID
   * @param accessToken 访问令牌（用于加入黑名单）
   */
  async logout(userId: string, accessToken: string): Promise<void> {
    try {
      if (redisConnected) {
        try {
          // 删除 Redis 中的刷新令牌
          await redis.del(`refresh_token:${userId}`)

          // 将访问令牌加入黑名单（直到过期）
          const payload = jwt.decode(accessToken) as TokenPayload
          if (payload && payload.exp) {
            const ttl = payload.exp - Math.floor(Date.now() / 1000)
            if (ttl > 0) {
              await redis.setEx(`blacklist:${accessToken}`, ttl, '1')
            }
          }
        } catch (error) {
          logger.warn('Failed to update Redis during logout', { error })
        }
      }

      logger.info('User logged out', { userId })
    } catch (error) {
      logger.error('Logout failed', { userId, error })
      throw new Error('登出失败')
    }
  }

  /**
   * 生成访问令牌
   * @param userId 用户ID
   * @param username 用户名
   * @param roles 角色列表
   * @returns JWT访问令牌
   */
  private generateAccessToken(userId: string, username: string, roles: string[]): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      username,
      roles,
      jti: this.generateJti()
    }

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtAccessExpiry
    })
  }

  /**
   * 生成刷新令牌
   * @param userId 用户ID
   * @param username 用户名
   * @param roles 角色列表
   * @returns JWT刷新令牌
   */
  private generateRefreshToken(userId: string, username: string, roles: string[]): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      username,
      roles,
      jti: this.generateJti()
    }

    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtRefreshExpiry
    })
  }

  /**
   * 生成令牌唯一标识
   * @returns 随机字符串
   */
  private generateJti(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  /**
   * 哈希密码
   * @param password 明文密码
   * @returns 哈希后的密码
   */
  static async hashPassword(password: string): Promise<string> {
    return EncryptionUtils.hashPassword(password)
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hash 哈希密码
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return EncryptionUtils.verifyPassword(password, hash)
  }
}

export const authService = new AuthService()
