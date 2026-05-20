import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { permissionService } from '../services/permissionService'
import { AuthService } from '../services/authService'

const prisma = new PrismaClient()

describe('权限服务测试', () => {
  let testUserId: string
  let testRoleId: string
  let testPermissionId: string

  beforeAll(async () => {
    // 创建测试用户
    const hashedPassword = await AuthService.hashPassword('test123456')
    const user = await prisma.user.create({
      data: {
        username: 'permission_test_user',
        email: 'permission_test@example.com',
        fullName: '权限测试用户',
        passwordHash: hashedPassword,
        status: 'ACTIVE'
      }
    })
    testUserId = user.id

    // 创建或获取测试权限(使用 upsert 避免冲突)
    const permission = await prisma.permission.upsert({
      where: { resource_action: { resource: 'sample', action: 'read' } },
      update: {},
      create: { resource: 'sample', action: 'read' }
    })
    testPermissionId = permission.id

    // 创建测试角色
    const role = await permissionService.createRole('测试角色', '用于测试的角色')
    testRoleId = role.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })
    await prisma.user.delete({
      where: { id: testUserId }
    })
    
    // 先删除角色(会自动解除权限关联)
    const role = await prisma.role.findUnique({ where: { id: testRoleId } })
    if (role) {
      await prisma.role.delete({
        where: { id: testRoleId }
      })
    }
    
    // 只在权限存在时删除
    const permission = await prisma.permission.findUnique({ where: { id: testPermissionId } })
    if (permission) {
      await prisma.permission.delete({
        where: { id: testPermissionId }
      })
    }
    
    await prisma.$disconnect()
  })

  describe('角色和权限管理', () => {
    it('应该能够为角色分配权限', async () => {
      await permissionService.assignPermissionToRole(testRoleId, testPermissionId)

      const role = await prisma.role.findUnique({
        where: { id: testRoleId },
        include: { permissions: true }
      })

      expect(role).toBeDefined()
      expect(role?.permissions).toHaveLength(1)
      expect(role?.permissions[0].id).toBe(testPermissionId)
    })

    it('应该能够为用户分配角色', async () => {
      await permissionService.assignRoleToUser(testUserId, testRoleId)

      const userRoles = await permissionService.getUserRoles(testUserId)
      expect(userRoles).toContain('测试角色')
    })

    it('应该能够检查用户权限', async () => {
      const hasPermission = await permissionService.checkPermission(
        testUserId,
        'sample',
        'read'
      )
      expect(hasPermission).toBe(true)

      const noPermission = await permissionService.checkPermission(
        testUserId,
        'sample',
        'delete'
      )
      expect(noPermission).toBe(false)
    })

    it('应该能够获取用户的所有权限', async () => {
      const permissions = await permissionService.getUserPermissions(testUserId)
      expect(permissions).toHaveLength(1)
      expect(permissions[0]).toEqual({
        resource: 'sample',
        action: 'read'
      })
    })

    it('应该能够从角色移除权限', async () => {
      await permissionService.removePermissionFromRole(testRoleId, testPermissionId)

      const hasPermission = await permissionService.checkPermission(
        testUserId,
        'sample',
        'read'
      )
      expect(hasPermission).toBe(false)
    })

    it('应该能够从用户移除角色', async () => {
      await permissionService.removeRoleFromUser(testUserId, testRoleId)

      const userRoles = await permissionService.getUserRoles(testUserId)
      expect(userRoles).not.toContain('测试角色')
    })
  })

  describe('通配符权限', () => {
    let wildcardRoleId: string
    let wildcardPermissionId: string

    beforeAll(async () => {
      // 创建通配符权限
      const permission = await permissionService.createPermission('*', 'read')
      wildcardPermissionId = permission.id

      // 创建角色并分配权限
      const role = await permissionService.createRole('通配符测试角色')
      wildcardRoleId = role.id

      await permissionService.assignPermissionToRole(wildcardRoleId, wildcardPermissionId)
      await permissionService.assignRoleToUser(testUserId, wildcardRoleId)
    })

    afterAll(async () => {
      await permissionService.removeRoleFromUser(testUserId, wildcardRoleId)
      await prisma.role.delete({ where: { id: wildcardRoleId } })
      await prisma.permission.delete({ where: { id: wildcardPermissionId } })
    })

    it('应该支持资源通配符权限', async () => {
      const hasSampleRead = await permissionService.checkPermission(
        testUserId,
        'sample',
        'read'
      )
      expect(hasSampleRead).toBe(true)

      const hasWorkflowRead = await permissionService.checkPermission(
        testUserId,
        'workflow',
        'read'
      )
      expect(hasWorkflowRead).toBe(true)
    })
  })

  describe('非活跃用户权限检查', () => {
    let inactiveUserId: string

    beforeAll(async () => {
      const hashedPassword = await AuthService.hashPassword('test123456')
      const user = await prisma.user.create({
        data: {
          username: 'inactive_user',
          email: 'inactive@example.com',
          fullName: '非活跃用户',
          passwordHash: hashedPassword,
          status: 'INACTIVE'
        }
      })
      inactiveUserId = user.id

      await permissionService.assignRoleToUser(inactiveUserId, testRoleId)
    })

    afterAll(async () => {
      await prisma.userRole.deleteMany({ where: { userId: inactiveUserId } })
      await prisma.user.delete({ where: { id: inactiveUserId } })
    })

    it('非活跃用户应该没有任何权限', async () => {
      const hasPermission = await permissionService.checkPermission(
        inactiveUserId,
        'sample',
        'read'
      )
      expect(hasPermission).toBe(false)
    })
  })
})
