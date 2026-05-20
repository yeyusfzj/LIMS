import request from 'supertest'
import { app } from '../app'
import { PrismaClient } from '@prisma/client'
import { AuthService } from '../services/authService'

const prisma = new PrismaClient()

describe('Role Management API Integration Tests', () => {
  let authToken: string
  let testUserId: string
  let testRoleId: string
  let testPermissionId: string

  beforeAll(async () => {
    // 创建测试用户和管理员角色
    const passwordHash = await AuthService.hashPassword('Test123456!')
    
    const adminRole = await prisma.role.create({
      data: {
        name: 'admin-test-role',
        description: '测试管理员角色'
      }
    })

    // 创建必要的权限
    const permissions = await Promise.all([
      prisma.permission.create({
        data: { resource: 'role', action: 'create' }
      }),
      prisma.permission.create({
        data: { resource: 'role', action: 'read' }
      }),
      prisma.permission.create({
        data: { resource: 'role', action: 'update' }
      }),
      prisma.permission.create({
        data: { resource: 'role', action: 'delete' }
      }),
      prisma.permission.create({
        data: { resource: 'permission', action: 'create' }
      }),
      prisma.permission.create({
        data: { resource: 'permission', action: 'read' }
      }),
      prisma.permission.create({
        data: { resource: 'permission', action: 'delete' }
      })
    ])

    // 为管理员角色分配所有权限
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: permissions.map(p => ({ id: p.id }))
        }
      }
    })

    const testUser = await prisma.user.create({
      data: {
        username: 'roletest_admin',
        passwordHash,
        email: 'roletest@example.com',
        fullName: '角色测试管理员',
        status: 'ACTIVE'
      }
    })

    testUserId = testUser.id

    // 为用户分配管理员角色
    await prisma.userRole.create({
      data: {
        userId: testUser.id,
        roleId: adminRole.id
      }
    })

    // 登录获取 token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'roletest_admin',
        password: 'Test123456!'
      })

    authToken = loginResponse.body.data.accessToken
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.userRole.deleteMany({
      where: { userId: testUserId }
    })

    await prisma.user.deleteMany({
      where: { username: { startsWith: 'roletest_' } }
    })

    await prisma.role.deleteMany({
      where: { name: { startsWith: 'test-role-' } }
    })

    await prisma.role.deleteMany({
      where: { name: 'admin-test-role' }
    })

    await prisma.permission.deleteMany({
      where: {
        OR: [
          { resource: 'role' },
          { resource: 'permission' },
          { resource: 'test-resource' }
        ]
      }
    })

    await prisma.$disconnect()
  })

  describe('POST /api/roles', () => {
    it('应该成功创建角色', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-role-1',
          description: '测试角色1'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('test-role-1')
      expect(response.body.data.description).toBe('测试角色1')

      testRoleId = response.body.data.id
    })

    it('应该在角色名已存在时返回 409', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-role-1',
          description: '重复的角色'
        })

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('CONFLICT')
    })

    it('应该在缺少必填字段时返回 400', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '缺少名称的角色'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('应该在未认证时返回 401', async () => {
      const response = await request(app)
        .post('/api/roles')
        .send({
          name: 'test-role-unauthorized',
          description: '未授权的请求'
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/roles', () => {
    it('应该成功获取角色列表', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.items).toBeInstanceOf(Array)
      expect(response.body.data.total).toBeGreaterThan(0)
    })

    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/roles?page=1&pageSize=10')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.page).toBe(1)
      expect(response.body.data.pageSize).toBe(10)
    })

    it('应该支持按名称筛选', async () => {
      const response = await request(app)
        .get('/api/roles?name=test-role-1')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.items.length).toBeGreaterThan(0)
    })
  })

  describe('GET /api/roles/:id', () => {
    it('应该成功获取角色详情', async () => {
      const response = await request(app)
        .get(`/api/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testRoleId)
      expect(response.body.data.name).toBe('test-role-1')
    })

    it('应该在角色不存在时返回 404', async () => {
      const response = await request(app)
        .get('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PUT /api/roles/:id', () => {
    it('应该成功更新角色', async () => {
      const response = await request(app)
        .put(`/api/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'test-role-1-updated',
          description: '更新后的描述'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.name).toBe('test-role-1-updated')
      expect(response.body.data.description).toBe('更新后的描述')
    })

    it('应该在角色不存在时返回 404', async () => {
      const response = await request(app)
        .put('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'non-existent-role'
        })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/permissions', () => {
    it('应该成功创建权限', async () => {
      const response = await request(app)
        .post('/api/roles/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resource: 'test-resource',
          action: 'read'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data.resource).toBe('test-resource')
      expect(response.body.data.action).toBe('read')

      testPermissionId = response.body.data.id
    })

    it('应该在权限已存在时返回 409', async () => {
      const response = await request(app)
        .post('/api/roles/permissions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resource: 'test-resource',
          action: 'read'
        })

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('CONFLICT')
    })
  })

  describe('GET /api/roles/permissions', () => {
    it('应该成功获取权限列表', async () => {
      const response = await request(app)
        .get('/api/roles/permissions')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.items).toBeInstanceOf(Array)
    })

    it('应该支持按资源类型筛选', async () => {
      const response = await request(app)
        .get('/api/roles/permissions?resource=test-resource')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.data.items.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/roles/:id/permissions', () => {
    it('应该成功为角色分配权限', async () => {
      const response = await request(app)
        .post(`/api/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissionIds: [testPermissionId]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.permissions.length).toBeGreaterThan(0)
    })

    it('应该在权限ID列表为空时返回 400', async () => {
      const response = await request(app)
        .post(`/api/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissionIds: []
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/roles/:id/permissions', () => {
    it('应该成功从角色移除权限', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          permissionIds: [testPermissionId]
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })

  describe('DELETE /api/roles/:id', () => {
    it('应该成功删除角色', async () => {
      const response = await request(app)
        .delete(`/api/roles/${testRoleId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('应该在角色不存在时返回 404', async () => {
      const response = await request(app)
        .delete('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('DELETE /api/roles/permissions/:id', () => {
    it('应该成功删除权限', async () => {
      const response = await request(app)
        .delete(`/api/roles/permissions/${testPermissionId}`)
        .set('Authorization', `Bearer ${authToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })
  })
})
