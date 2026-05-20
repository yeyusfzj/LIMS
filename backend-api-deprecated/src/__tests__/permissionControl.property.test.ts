import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { permissionService } from '../services/permissionService'
import { dataPermissionService, DataScope } from '../services/dataPermissionService'
import { AuthService } from '../services/authService'
import fc from 'fast-check'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

/**
 * 属性测试：权限控制系统
 * 
 * 本测试套件使用基于属性的测试方法验证权限控制系统的核心不变量。
 * 使用 fast-check 库生成随机测试数据，每个属性至少运行 100 次。
 */
describe('Feature: laboratory-backend-api, 权限控制属性测试', () => {
  let testPermissionIds: string[] = []
  let testRoleIds: string[] = []

  beforeAll(async () => {
    // 创建测试权限 - 包含所有资源和操作的组合
    const resources = ['sample', 'workflow', 'report']
    const actions = ['read', 'create', 'update', 'delete']
    
    for (const resource of resources) {
      for (const action of actions) {
        const permission = await prisma.permission.upsert({
          where: { resource_action: { resource, action } },
          update: {},
          create: { resource, action }
        })
        testPermissionIds.push(permission.id)
      }
    }

    // 创建通配符权限用于管理员
    const wildcardPermission = await prisma.permission.upsert({
      where: { resource_action: { resource: '*', action: '*' } },
      update: {},
      create: { resource: '*', action: '*' }
    })
    testPermissionIds.push(wildcardPermission.id)

    // 创建测试角色
    const adminRole = await prisma.role.upsert({
      where: { name: 'prop_test_admin' },
      update: {},
      create: {
        name: 'prop_test_admin',
        description: '属性测试管理员角色'
      }
    })
    testRoleIds.push(adminRole.id)

    const userRole = await prisma.role.upsert({
      where: { name: 'prop_test_user' },
      update: {},
      create: {
        name: 'prop_test_user',
        description: '属性测试普通用户角色'
      }
    })
    testRoleIds.push(userRole.id)

    // 为管理员角色分配通配符权限
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: { id: wildcardPermission.id }
        }
      }
    })

    // 为普通用户角色只分配 sample:read 权限
    const sampleReadPerm = testPermissionIds.find((id, idx) => {
      // 第一个权限是 sample:read
      return idx === 0
    })
    if (sampleReadPerm) {
      await prisma.role.update({
        where: { id: userRole.id },
        data: {
          permissions: {
            connect: { id: sampleReadPerm }
          }
        }
      })
    }
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { roleId: { in: testRoleIds } }
    })
    await prisma.user.deleteMany({
      where: {
        username: {
          startsWith: 'proptest_perm_'
        }
      }
    })
    await prisma.sample.deleteMany({
      where: {
        barcode: {
          startsWith: 'PROPTEST-'
        }
      }
    })
    
    // 删除角色（会自动解除权限关联）
    for (const roleId of testRoleIds) {
      await prisma.role.delete({ where: { id: roleId } }).catch(() => {})
    }
    
    await prisma.$disconnect()
  })

  /**
   * 属性 30: 权限验证一致性
   * 
   * **验证需求: 18.2, 18.5**
   * 
   * 对于任何 API 请求，系统必须验证用户是否具有所需权限，
   * 无权限的请求必须被拒绝并记录。
   * 
   * 这个属性确保了：
   * 1. 权限检查对所有用户一致执行
   * 2. 有权限的用户可以访问资源
   * 3. 无权限的用户被拒绝访问
   * 4. 权限验证结果是确定性的（相同输入产生相同输出）
   */
  describe('Property 30: 权限验证一致性', () => {
    it('对于任何用户和权限组合，权限检查应该返回一致的结果', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户凭据
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress().map(e => `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            fullName: fc.string({ minLength: 2, maxLength: 50 }),
            department: fc.constantFrom('技术部', '质量部', '研发部')
          }),
          // 生成随机角色选择（管理员或普通用户）
          fc.boolean(),
          // 生成随机资源和操作
          fc.record({
            resource: fc.constantFrom('sample', 'workflow', 'report'),
            action: fc.constantFrom('read', 'create', 'update', 'delete')
          }),
          // 生成验证次数（2-5次）
          fc.integer({ min: 2, max: 5 }),
          async (userCredentials, isAdmin, permission, checkCount) => {
            // 创建测试用户
            const passwordHash = await bcrypt.hash(userCredentials.password, 12)
            const user = await prisma.user.create({
              data: {
                username: userCredentials.username,
                passwordHash,
                email: userCredentials.email,
                fullName: userCredentials.fullName,
                department: userCredentials.department,
                status: 'ACTIVE'
              }
            })

            try {
              // 分配角色
              const roleId = isAdmin ? testRoleIds[0] : testRoleIds[1]
              await permissionService.assignRoleToUser(user.id, roleId)

              // 多次检查权限
              const results: boolean[] = []
              for (let i = 0; i < checkCount; i++) {
                const hasPermission = await permissionService.checkPermission(
                  user.id,
                  permission.resource,
                  permission.action
                )
                results.push(hasPermission)
              }

              // 属性验证：所有检查结果应该相同（一致性）
              const firstResult = results[0]
              for (const result of results) {
                expect(result).toBe(firstResult)
              }

              // 属性验证：管理员应该有所有权限
              if (isAdmin) {
                expect(firstResult).toBe(true)
              }

              // 属性验证：普通用户只有 sample:read 权限
              if (!isAdmin) {
                if (permission.resource === 'sample' && permission.action === 'read') {
                  expect(firstResult).toBe(true)
                } else {
                  expect(firstResult).toBe(false)
                }
              }

              // 属性验证：权限检查结果应该与用户角色权限匹配
              const hasPermissionInList = await permissionService.hasPermissionInList(
                user.id,
                permission.resource,
                permission.action
              )
              expect(firstResult).toBe(hasPermissionInList)
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

    it('对于任何非活跃用户，权限检查应该始终返回 false', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户凭据
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress().map(e => `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            fullName: fc.string({ minLength: 2, maxLength: 50 })
          }),
          // 生成随机用户状态（非活跃）
          fc.constantFrom('INACTIVE', 'LOCKED'),
          // 生成随机资源和操作
          fc.record({
            resource: fc.constantFrom('sample', 'workflow', 'report'),
            action: fc.constantFrom('read', 'create', 'update', 'delete')
          }),
          async (userCredentials, status, permission) => {
            // 创建非活跃测试用户
            const passwordHash = await bcrypt.hash(userCredentials.password, 12)
            const user = await prisma.user.create({
              data: {
                username: userCredentials.username,
                passwordHash,
                email: userCredentials.email,
                fullName: userCredentials.fullName,
                status
              }
            })

            try {
              // 即使分配了管理员角色
              await permissionService.assignRoleToUser(user.id, testRoleIds[0])

              // 检查权限
              const hasPermission = await permissionService.checkPermission(
                user.id,
                permission.resource,
                permission.action
              )

              // 属性验证：非活跃用户应该没有任何权限
              expect(hasPermission).toBe(false)
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

    it('对于任何用户，权限验证失败应该被正确记录', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户凭据
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress().map(e => `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            fullName: fc.string({ minLength: 2, maxLength: 50 })
          }),
          // 生成随机资源和操作（用户没有的权限）
          fc.record({
            resource: fc.constantFrom('workflow', 'report'),
            action: fc.constantFrom('create', 'update', 'delete')
          }),
          async (userCredentials, permission) => {
            // 创建测试用户（只有 sample:read 权限）
            const passwordHash = await bcrypt.hash(userCredentials.password, 12)
            const user = await prisma.user.create({
              data: {
                username: userCredentials.username,
                passwordHash,
                email: userCredentials.email,
                fullName: userCredentials.fullName,
                status: 'ACTIVE'
              }
            })

            try {
              // 分配普通用户角色
              await permissionService.assignRoleToUser(user.id, testRoleIds[1])

              // 检查权限（应该失败）
              const hasPermission = await permissionService.checkPermission(
                user.id,
                permission.resource,
                permission.action
              )

              // 属性验证：用户应该没有这些权限
              expect(hasPermission).toBe(false)

              // 注意：实际的日志记录在中间件层完成
              // 这里我们验证权限检查本身的正确性
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

  /**
   * 属性 31: 数据级权限过滤
   * 
   * **验证需求: 18.4**
   * 
   * 对于任何数据查询请求，系统必须只返回用户有权限访问的数据，
   * 自动过滤无权限数据。
   * 
   * 这个属性确保了：
   * 1. 管理员可以访问所有数据
   * 2. 部门用户只能访问本部门的数据
   * 3. 普通用户只能访问自己创建的数据
   * 4. 数据过滤是自动且一致的
   */
  describe('Property 31: 数据级权限过滤', () => {
    it('对于任何用户，数据权限范围应该与其角色一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户凭据
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress().map(e => `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            fullName: fc.string({ minLength: 2, maxLength: 50 }),
            department: fc.constantFrom('技术部', '质量部', '研发部')
          }),
          // 生成随机角色选择
          fc.constantFrom('admin', 'department', 'normal'),
          async (userCredentials, roleType) => {
            // 创建测试用户
            const passwordHash = await bcrypt.hash(userCredentials.password, 12)
            const user = await prisma.user.create({
              data: {
                username: userCredentials.username,
                passwordHash,
                email: userCredentials.email,
                fullName: userCredentials.fullName,
                department: userCredentials.department,
                status: 'ACTIVE'
              }
            })

            try {
              // 根据角色类型分配角色
              if (roleType === 'admin') {
                await permissionService.assignRoleToUser(user.id, testRoleIds[0])
              } else if (roleType === 'department') {
                // 创建部门角色
                const deptRole = await prisma.role.upsert({
                  where: { name: `prop_test_dept_${userCredentials.department}` },
                  update: {},
                  create: {
                    name: `prop_test_dept_${userCredentials.department}`,
                    description: `${userCredentials.department}主管`
                  }
                })
                await permissionService.assignRoleToUser(user.id, deptRole.id)
              } else {
                await permissionService.assignRoleToUser(user.id, testRoleIds[1])
              }

              // 获取数据权限范围
              const dataScope = await dataPermissionService.getUserDataScope(user.id, 'sample')

              // 属性验证：数据权限范围应该与角色类型匹配
              if (roleType === 'admin') {
                expect(dataScope).toBe(DataScope.ALL)
              } else if (roleType === 'department') {
                expect(dataScope).toBe(DataScope.DEPARTMENT)
              } else {
                expect(dataScope).toBe(DataScope.OWN)
              }

              // 多次获取数据权限范围，验证一致性
              for (let i = 0; i < 3; i++) {
                const scope = await dataPermissionService.getUserDataScope(user.id, 'sample')
                expect(scope).toBe(dataScope)
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

    it('对于任何样品，用户访问权限应该与数据权限范围一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成创建者用户
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_creator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            email: fc.emailAddress().map(e => `creator_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            department: fc.constantFrom('技术部', '质量部', '研发部')
          }),
          // 生成访问者用户
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_accessor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            email: fc.emailAddress().map(e => `accessor_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            department: fc.constantFrom('技术部', '质量部', '研发部')
          }),
          // 生成访问者角色类型
          fc.constantFrom('admin', 'department', 'normal'),
          async (creatorData, accessorData, accessorRoleType) => {
            const passwordHash = await bcrypt.hash('test123456', 12)

            // 创建样品创建者
            const creator = await prisma.user.create({
              data: {
                username: creatorData.username,
                passwordHash,
                email: creatorData.email,
                fullName: '创建者',
                department: creatorData.department,
                status: 'ACTIVE'
              }
            })

            // 创建样品访问者
            const accessor = await prisma.user.create({
              data: {
                username: accessorData.username,
                passwordHash,
                email: accessorData.email,
                fullName: '访问者',
                department: accessorData.department,
                status: 'ACTIVE'
              }
            })

            try {
              // 为访问者分配角色
              if (accessorRoleType === 'admin') {
                await permissionService.assignRoleToUser(accessor.id, testRoleIds[0])
              } else if (accessorRoleType === 'department') {
                const deptRole = await prisma.role.upsert({
                  where: { name: `prop_test_dept_${accessorData.department}` },
                  update: {},
                  create: {
                    name: `prop_test_dept_${accessorData.department}`,
                    description: `${accessorData.department}主管`
                  }
                })
                await permissionService.assignRoleToUser(accessor.id, deptRole.id)
              } else {
                await permissionService.assignRoleToUser(accessor.id, testRoleIds[1])
              }

              // 创建测试样品
              const sample = await prisma.sample.create({
                data: {
                  barcode: `PROPTEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  sampleNumber: `S-${Date.now()}`,
                  clientName: '测试客户',
                  sampleName: '测试样品',
                  sampleType: '水样',
                  sampleCategory: '环境',
                  quantity: 100,
                  unit: 'ml',
                  receivedDate: new Date(),
                  createdBy: creator.id
                }
              })

              // 检查访问权限
              const canAccess = await dataPermissionService.canAccessSample(
                accessor.id,
                sample.id
              )

              // 属性验证：访问权限应该与角色和部门匹配
              if (accessorRoleType === 'admin') {
                // 管理员可以访问所有样品
                expect(canAccess).toBe(true)
              } else if (accessorRoleType === 'department') {
                // 部门用户只能访问同部门的样品
                expect(canAccess).toBe(creatorData.department === accessorData.department)
              } else {
                // 普通用户只能访问自己创建的样品
                expect(canAccess).toBe(creator.id === accessor.id)
              }

              // 清理样品
              await prisma.sample.delete({ where: { id: sample.id } })
            } finally {
              // 清理测试用户
              await prisma.userRole.deleteMany({
                where: { userId: { in: [creator.id, accessor.id] } }
              })
              await prisma.user.deleteMany({
                where: { id: { in: [creator.id, accessor.id] } }
              })
            }
          }
        ),
        { numRuns: 100, timeout: 120000 }
      )
    }, 150000)

    it('对于任何查询，数据过滤应该自动应用且结果一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机用户凭据
          fc.record({
            username: fc.string({ minLength: 5, maxLength: 15 }).map(s => `proptest_perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`),
            password: fc.string({ minLength: 8, maxLength: 30 }),
            email: fc.emailAddress().map(e => `test_${Date.now()}_${Math.random().toString(36).substr(2, 5)}_${e}`),
            fullName: fc.string({ minLength: 2, maxLength: 50 }),
            department: fc.constantFrom('技术部', '质量部', '研发部')
          }),
          // 生成随机角色类型
          fc.constantFrom('admin', 'normal'),
          // 生成查询次数
          fc.integer({ min: 2, max: 5 }),
          async (userCredentials, roleType, queryCount) => {
            // 创建测试用户
            const passwordHash = await bcrypt.hash(userCredentials.password, 12)
            const user = await prisma.user.create({
              data: {
                username: userCredentials.username,
                passwordHash,
                email: userCredentials.email,
                fullName: userCredentials.fullName,
                department: userCredentials.department,
                status: 'ACTIVE'
              }
            })

            try {
              // 分配角色
              if (roleType === 'admin') {
                await permissionService.assignRoleToUser(user.id, testRoleIds[0])
              } else {
                await permissionService.assignRoleToUser(user.id, testRoleIds[1])
              }

              // 多次应用数据过滤
              const filters = []
              for (let i = 0; i < queryCount; i++) {
                const filter = await dataPermissionService.applySampleDataFilter(
                  user.id,
                  { status: 'REGISTERED' }
                )
                filters.push(filter)
              }

              // 属性验证：所有过滤结果应该相同（一致性）
              const firstFilter = JSON.stringify(filters[0])
              for (const filter of filters) {
                expect(JSON.stringify(filter)).toBe(firstFilter)
              }

              // 属性验证：过滤条件应该包含基础查询条件
              for (const filter of filters) {
                expect(filter).toHaveProperty('status', 'REGISTERED')
              }

              // 属性验证：管理员不应该有额外的过滤条件
              if (roleType === 'admin') {
                expect(filters[0]).toEqual({ status: 'REGISTERED' })
              } else {
                // 普通用户应该有 createdBy 过滤
                expect(filters[0]).toHaveProperty('createdBy', user.id)
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
  })
})
