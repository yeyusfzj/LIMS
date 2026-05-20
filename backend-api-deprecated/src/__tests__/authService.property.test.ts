import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../services/authService'
import fc from 'fast-check'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()
const authService = new AuthService()

/**
 * 属性测试：认证服务
 * 
 * 本测试套件使用基于属性的测试方法验证认证服务的核心不变量。
 * 使用 fast-check 库生成随机测试数据，每个属性至少运行 100 次。
 */
describe('Feature: laboratory-backend-api, Property 1: 认证令牌往返一致性', () => {
  let testRoleId: string

  beforeAll(async () => {
    // 创建测试角色
    const testRole = await prisma.role.upsert({
      where: { name: 'property_test_role' },
      update: {},
      create: {
        name: 'property_test_role',
        description: '属性测试角色'
      }
    })
    testRoleId = testRole.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { roleId: testRoleId }
    })
    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: 'proptest_'
        }
      }
    })
    await prisma.role.delete({
      where: { id: testRoleId }
    })
    await prisma.$disconnect()
  })

  /**
   * 属性 1: 认证令牌往返一致性
   * 
   * **验证需求: 1.1, 1.3**
   * 
   * 对于任何有效的用户凭据，如果登录成功生成令牌，
   * 那么使用该令牌验证应该返回相同的用户信息。
   * 
   * 这个属性确保了：
   * 1. JWT 令牌正确编码用户信息
   * 2. 令牌验证能够准确解码用户信息
   * 3. 用户信息在往返过程中保持一致
   */
  it('对于任何有效的用户凭据，令牌验证应返回相同的用户信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机用户凭据
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `proptest_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 })
        }),
        async (userCredentials) => {
          // 创建测试用户
          const passwordHash = await bcrypt.hash(userCredentials.password, 12)
          const user = await prisma.user.create({
            data: {
              username: userCredentials.username,
              passwordHash,
              email: userCredentials.email,
              fullName: userCredentials.fullName,
              status: 'ACTIVE',
              roles: {
                create: {
                  roleId: testRoleId
                }
              }
            }
          })

          try {
            // 执行登录
            const authResult = await authService.login({
              username: userCredentials.username,
              password: userCredentials.password
            })

            // 验证访问令牌
            const tokenPayload = await authService.verifyToken(authResult.accessToken)

            // 属性验证：令牌载荷应包含正确的用户信息
            expect(tokenPayload.userId).toBe(user.id)
            expect(tokenPayload.username).toBe(userCredentials.username)
            expect(tokenPayload.roles).toContain('property_test_role')

            // 属性验证：认证结果中的用户信息应与令牌载荷一致
            expect(authResult.user.id).toBe(tokenPayload.userId)
            expect(authResult.user.username).toBe(tokenPayload.username)
            expect(authResult.user.roles).toEqual(tokenPayload.roles)

            // 属性验证：用户信息应与数据库中的用户一致
            expect(authResult.user.id).toBe(user.id)
            expect(authResult.user.username).toBe(user.username)
            expect(authResult.user.email).toBe(user.email)
            expect(authResult.user.fullName).toBe(user.fullName)
          } finally {
            // 清理测试用户
            await prisma.userRole.deleteMany({
              where: { userId: user.id }
            })
            await prisma.user.delete({
              where: { id: user.id }
            })
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 1.1: 刷新令牌往返一致性
   * 
   * **验证需求: 1.5**
   * 
   * 对于任何有效的刷新令牌，使用刷新令牌获取新的访问令牌后，
   * 新令牌应该包含相同的用户信息。
   */
  it('对于任何有效的刷新令牌，刷新后的令牌应包含相同的用户信息', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机用户凭据
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `proptest_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 })
        }),
        async (userCredentials) => {
          // 创建测试用户
          const passwordHash = await bcrypt.hash(userCredentials.password, 12)
          const user = await prisma.user.create({
            data: {
              username: userCredentials.username,
              passwordHash,
              email: userCredentials.email,
              fullName: userCredentials.fullName,
              status: 'ACTIVE',
              roles: {
                create: {
                  roleId: testRoleId
                }
              }
            }
          })

          try {
            // 执行登录
            const loginResult = await authService.login({
              username: userCredentials.username,
              password: userCredentials.password
            })

            // 验证原始访问令牌
            const originalPayload = await authService.verifyToken(loginResult.accessToken)

            // 刷新令牌
            const refreshResult = await authService.refreshToken(loginResult.refreshToken)

            // 验证新的访问令牌
            const newPayload = await authService.verifyToken(refreshResult.accessToken)

            // 属性验证：刷新后的令牌应包含相同的用户信息
            expect(newPayload.userId).toBe(originalPayload.userId)
            expect(newPayload.username).toBe(originalPayload.username)
            expect(newPayload.roles).toEqual(originalPayload.roles)

            // 属性验证：刷新结果中的用户信息应与原始登录结果一致
            expect(refreshResult.user.id).toBe(loginResult.user.id)
            expect(refreshResult.user.username).toBe(loginResult.user.username)
            expect(refreshResult.user.email).toBe(loginResult.user.email)
            expect(refreshResult.user.fullName).toBe(loginResult.user.fullName)
            expect(refreshResult.user.roles).toEqual(loginResult.user.roles)
          } finally {
            // 清理测试用户
            await prisma.userRole.deleteMany({
              where: { userId: user.id }
            })
            await prisma.user.delete({
              where: { id: user.id }
            })
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 1.2: 令牌验证幂等性
   * 
   * **验证需求: 1.3**
   * 
   * 对于任何有效的访问令牌，多次验证应该返回相同的结果。
   */
  it('对于任何有效的访问令牌，多次验证应返回相同的结果', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机用户凭据
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `proptest_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 })
        }),
        // 生成验证次数（2-5次）
        fc.integer({ min: 2, max: 5 }),
        async (userCredentials, verifyCount) => {
          // 创建测试用户
          const passwordHash = await bcrypt.hash(userCredentials.password, 12)
          const user = await prisma.user.create({
            data: {
              username: userCredentials.username,
              passwordHash,
              email: userCredentials.email,
              fullName: userCredentials.fullName,
              status: 'ACTIVE',
              roles: {
                create: {
                  roleId: testRoleId
                }
              }
            }
          })

          try {
            // 执行登录
            const authResult = await authService.login({
              username: userCredentials.username,
              password: userCredentials.password
            })

            // 多次验证令牌
            const payloads = []
            for (let i = 0; i < verifyCount; i++) {
              const payload = await authService.verifyToken(authResult.accessToken)
              payloads.push(payload)
            }

            // 属性验证：所有验证结果应该相同
            for (let i = 1; i < payloads.length; i++) {
              expect(payloads[i].userId).toBe(payloads[0].userId)
              expect(payloads[i].username).toBe(payloads[0].username)
              expect(payloads[i].roles).toEqual(payloads[0].roles)
              expect(payloads[i].jti).toBe(payloads[0].jti)
              expect(payloads[i].iat).toBe(payloads[0].iat)
              expect(payloads[i].exp).toBe(payloads[0].exp)
            }
          } finally {
            // 清理测试用户
            await prisma.userRole.deleteMany({
              where: { userId: user.id }
            })
            await prisma.user.delete({
              where: { id: user.id }
            })
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)

  /**
   * 属性 1.3: 登出后令牌失效
   * 
   * **验证需求: 1.4**
   * 
   * 对于任何有效的访问令牌，登出后该令牌应该被加入黑名单，
   * 后续验证应该失败。
   */
  it('对于任何有效的访问令牌，登出后验证应该失败', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成随机用户凭据
        fc.record({
          username: fc.string({ minLength: 5, maxLength: 20 }).map(s => `proptest_${s.replace(/[^a-zA-Z0-9]/g, '')}`),
          password: fc.string({ minLength: 8, maxLength: 30 }),
          email: fc.emailAddress(),
          fullName: fc.string({ minLength: 2, maxLength: 50 })
        }),
        async (userCredentials) => {
          // 创建测试用户
          const passwordHash = await bcrypt.hash(userCredentials.password, 12)
          const user = await prisma.user.create({
            data: {
              username: userCredentials.username,
              passwordHash,
              email: userCredentials.email,
              fullName: userCredentials.fullName,
              status: 'ACTIVE',
              roles: {
                create: {
                  roleId: testRoleId
                }
              }
            }
          })

          try {
            // 执行登录
            const authResult = await authService.login({
              username: userCredentials.username,
              password: userCredentials.password
            })

            // 验证登录后令牌有效
            const payloadBeforeLogout = await authService.verifyToken(authResult.accessToken)
            expect(payloadBeforeLogout.userId).toBe(user.id)

            // 执行登出
            await authService.logout(user.id, authResult.accessToken)

            // 属性验证：登出后访问令牌应该失效
            await expect(
              authService.verifyToken(authResult.accessToken)
            ).rejects.toThrow('令牌已被撤销')

            // 属性验证：登出后刷新令牌应该失效
            await expect(
              authService.refreshToken(authResult.refreshToken)
            ).rejects.toThrow()
          } finally {
            // 清理测试用户
            await prisma.userRole.deleteMany({
              where: { userId: user.id }
            })
            await prisma.user.delete({
              where: { id: user.id }
            })
          }
        }
      ),
      { numRuns: 100, timeout: 120000 }
    )
  }, 150000)
})

