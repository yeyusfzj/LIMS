import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { dataPermissionService, DataScope } from '../services/dataPermissionService'
import { permissionService } from '../services/permissionService'
import { AuthService } from '../services/authService'

const prisma = new PrismaClient()

describe('数据权限服务测试', () => {
  let adminUserId: string
  let deptUserId: string
  let normalUserId: string
  let testSampleId: string

  beforeAll(async () => {
    const hashedPassword = await AuthService.hashPassword('test123456')

    // 创建管理员用户
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin_user',
        email: 'admin@example.com',
        fullName: '管理员',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        department: '技术部'
      }
    })
    adminUserId = adminUser.id

    // 创建部门用户
    const deptUser = await prisma.user.create({
      data: {
        username: 'dept_user',
        email: 'dept@example.com',
        fullName: '部门用户',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        department: '技术部'
      }
    })
    deptUserId = deptUser.id

    // 创建普通用户
    const normalUser = await prisma.user.create({
      data: {
        username: 'normal_user',
        email: 'normal@example.com',
        fullName: '普通用户',
        passwordHash: hashedPassword,
        status: 'ACTIVE',
        department: '质量部'
      }
    })
    normalUserId = normalUser.id

    // 创建管理员角色和权限
    const adminRole = await permissionService.createRole('系统管理员')
    const adminPermission = await permissionService.createPermission('*', '*')
    await permissionService.assignPermissionToRole(adminRole.id, adminPermission.id)
    await permissionService.assignRoleToUser(adminUserId, adminRole.id)

    // 创建部门角色
    const deptRole = await permissionService.createRole('部门主管')
    await permissionService.assignRoleToUser(deptUserId, deptRole.id)

    // 创建测试样品
    const sample = await prisma.sample.create({
      data: {
        barcode: 'TEST-SAMPLE-001',
        sampleNumber: 'S-2024-001',
        clientName: '测试客户',
        sampleName: '测试样品',
        sampleType: '水样',
        sampleCategory: '环境',
        quantity: 100,
        unit: 'ml',
        receivedDate: new Date(),
        createdBy: deptUserId
      }
    })
    testSampleId = sample.id
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.sample.deleteMany({
      where: { barcode: { startsWith: 'TEST-SAMPLE' } }
    })
    await prisma.userRole.deleteMany({
      where: {
        userId: { in: [adminUserId, deptUserId, normalUserId] }
      }
    })
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUserId, deptUserId, normalUserId] }
      }
    })
    await prisma.role.deleteMany({
      where: {
        name: { in: ['系统管理员', '部门主管'] }
      }
    })
    await prisma.permission.deleteMany({
      where: {
        resource: '*',
        action: '*'
      }
    })
    await prisma.$disconnect()
  })

  describe('数据权限范围', () => {
    it('管理员应该有全局数据权限', async () => {
      const scope = await dataPermissionService.getUserDataScope(adminUserId, 'sample')
      expect(scope).toBe(DataScope.ALL)
    })

    it('部门主管应该有部门数据权限', async () => {
      const scope = await dataPermissionService.getUserDataScope(deptUserId, 'sample')
      expect(scope).toBe(DataScope.DEPARTMENT)
    })

    it('普通用户应该只有自己的数据权限', async () => {
      const scope = await dataPermissionService.getUserDataScope(normalUserId, 'sample')
      expect(scope).toBe(DataScope.OWN)
    })
  })

  describe('样品数据访问控制', () => {
    it('管理员应该能访问所有样品', async () => {
      const canAccess = await dataPermissionService.canAccessSample(
        adminUserId,
        testSampleId
      )
      expect(canAccess).toBe(true)
    })

    it('部门用户应该能访问同部门的样品', async () => {
      const canAccess = await dataPermissionService.canAccessSample(
        deptUserId,
        testSampleId
      )
      expect(canAccess).toBe(true)
    })

    it('其他部门用户不应该能访问样品', async () => {
      const canAccess = await dataPermissionService.canAccessSample(
        normalUserId,
        testSampleId
      )
      expect(canAccess).toBe(false)
    })
  })

  describe('数据过滤', () => {
    it('应该为管理员返回不带过滤的查询条件', async () => {
      const filter = await dataPermissionService.applySampleDataFilter(adminUserId, {})
      expect(filter).toEqual({})
    })

    it('应该为部门用户添加部门过滤条件', async () => {
      const filter = await dataPermissionService.applySampleDataFilter(deptUserId, {})
      expect(filter).toHaveProperty('OR')
    })

    it('应该为普通用户添加创建者过滤条件', async () => {
      const filter = await dataPermissionService.applySampleDataFilter(normalUserId, {})
      expect(filter).toHaveProperty('createdBy', normalUserId)
    })

    it('应该保留基础查询条件', async () => {
      const baseWhere = { status: 'REGISTERED' as const }
      const filter = await dataPermissionService.applySampleDataFilter(
        normalUserId,
        baseWhere
      )
      expect(filter).toHaveProperty('status', 'REGISTERED')
      expect(filter).toHaveProperty('createdBy', normalUserId)
    })
  })
})
