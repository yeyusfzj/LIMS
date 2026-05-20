import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../services/authService'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const authService = new AuthService()

describe('AuthService', () => {
  let testUserId: string
  const testUsername = 'testauth'
  const testPassword = 'Test@123456'

  beforeAll(async () => {
    // 创建测试角色
    const testRole = await prisma.role.upsert({
      where: { name: 'test_role' },
      update: {},
      create: {
        name: 'test_role',
        description: '测试角色'
      }
    })

    // 创建测试用户
    const passwordHash = await bcrypt.hash(testPassword, 12)
    const user = await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash,
        email: 'testauth@example.com',
        fullName: '测试用户',
        status: 'ACTIVE',
        roles: {
          create: {
            roleId: testRole.id
          }
        }
      }
    })
    testUserId = user.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
    await prisma.role.delete({
      where: { name: 'test_role' }
    })
    await prisma.$disconnect()
  })

  describe('login', () => {
    it('应该成功登录并返回令牌', async () => {
      const result = await authService.login({
        username: testUsername,
        password: testPassword
      })

      expect(result).toHaveProperty('accessToken')
      expect(result).toHaveProperty('refreshToken')
      expect(result).toHaveProperty('expiresIn')
      expect(result).toHaveProperty('user')
      expect(result.user.username).toBe(testUsername)
      expect(result.user.roles).toContain('test_role')
      expect(result.expiresIn).toBe(15 * 60) // 15分钟
    })

    it('应该在用户名错误时抛出异常', async () => {
      await expect(
        authService.login({
          username: 'nonexistent',
          password: testPassword
        })
      ).rejects.toThrow('用户名或密码错误')
    })

    it('应该在密码错误时抛出异常', async () => {
      await expect(
        authService.login({
          username: testUsername,
          password: 'wrongpassword'
        })
      ).rejects.toThrow('用户名或密码错误')
    })

    it('应该在用户被锁定时抛出异常', async () => {
      // 临时锁定用户
      await prisma.user.update({
        where: { id: testUserId },
        data: { status: 'LOCKED' }
      })

      await expect(
        authService.login({
          username: testUsername,
          password: testPassword
        })
      ).rejects.toThrow('用户账户已被锁定或停用')

      // 恢复用户状态
      await prisma.user.update({
        where: { id: testUserId },
        data: { status: 'ACTIVE' }
      })
    })
  })

  describe('verifyToken', () => {
    it('应该成功验证有效令牌', async () => {
      const loginResult = await authService.login({
        username: testUsername,
        password: testPassword
      })

      const payload = await authService.verifyToken(loginResult.accessToken)

      expect(payload.userId).toBe(testUserId)
      expect(payload.username).toBe(testUsername)
      expect(payload.roles).toContain('test_role')
    })

    it('应该在令牌无效时抛出异常', async () => {
      await expect(
        authService.verifyToken('invalid.token.here')
      ).rejects.toThrow('令牌无效')
    })
  })

  describe('refreshToken', () => {
    it('应该成功刷新令牌', async () => {
      const loginResult = await authService.login({
        username: testUsername,
        password: testPassword
      })

      const refreshResult = await authService.refreshToken(loginResult.refreshToken)

      expect(refreshResult).toHaveProperty('accessToken')
      expect(refreshResult).toHaveProperty('refreshToken')
      expect(refreshResult.accessToken).not.toBe(loginResult.accessToken)
      expect(refreshResult.refreshToken).not.toBe(loginResult.refreshToken)
    })

    it('应该在刷新令牌无效时抛出异常', async () => {
      await expect(
        authService.refreshToken('invalid.refresh.token')
      ).rejects.toThrow('刷新令牌无效或已过期')
    })
  })

  describe('logout', () => {
    it('应该成功登出', async () => {
      const loginResult = await authService.login({
        username: testUsername,
        password: testPassword
      })

      await expect(
        authService.logout(testUserId, loginResult.accessToken)
      ).resolves.not.toThrow()

      // 验证刷新令牌已被撤销
      await expect(
        authService.refreshToken(loginResult.refreshToken)
      ).rejects.toThrow()
    })
  })

  describe('hashPassword', () => {
    it('应该成功哈希密码', async () => {
      const password = 'TestPassword123'
      const hash = await AuthService.hashPassword(password)

      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })
  })

  describe('verifyPassword', () => {
    it('应该验证正确的密码', async () => {
      const password = 'TestPassword123'
      const hash = await AuthService.hashPassword(password)

      const isValid = await AuthService.verifyPassword(password, hash)
      expect(isValid).toBe(true)
    })

    it('应该拒绝错误的密码', async () => {
      const password = 'TestPassword123'
      const hash = await AuthService.hashPassword(password)

      const isValid = await AuthService.verifyPassword('WrongPassword', hash)
      expect(isValid).toBe(false)
    })
  })
})
