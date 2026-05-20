import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { PrismaClient, UserStatus } from '@prisma/client'
import app from '../app'
import { AuthService } from '../services/authService'

const prisma = new PrismaClient()

describe('User Management API Integration Tests', () => {
  let adminToken: string
  let adminUserId: string
  let testUserId: string

  beforeAll(async () => {
    // 创建测试管理员用户
    const passwordHash = await AuthService.hashPassword('Admin@1234')
    
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin_user_test',
        passwordHash,
        email: 'admin@test.com',
        fullName: '测试管理员',
        status: UserStatus.ACTIVE
      }
    })
    adminUserId = adminUser.id

    // 创建管理员角色
    const adminRole = await prisma.role.create({
      data: {
        name: 'Admin',
        description: '管理员角色'
      }
    })

    // 分配管理员角色
    await prisma.userRole.create({
      data: {
        userId: adminUserId,
        roleId: adminRole.id
      }
    })

    // 创建用户管理权限
    const userPermission = await prisma.permission.create({
      data: {
        resource: 'user',
        action: 'create'
      }
    })

    await prisma.permission.create({
      data: {
        resource: 'user',
        action: 'read'
      }
    })

    await prisma.permission.create({
      data: {
        resource: 'user',
        action: 'update'
      }
    })

    await prisma.permission.create({
      data: {
        resource: 'user',
        action: 'delete'
      }
    })

    // 关联权限到角色
    await prisma.role.update({
      where: { id: adminRole.id },
      data: {
        permissions: {
          connect: [
            { id: userPermission.id }
          ]
        }
      }
    })

    // 登录获取 token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin_user_test',
        password: 'Admin@1234'
      })

    adminToken = loginResponse.body.data.accessToken
  })

  afterAll(async () => {
    // 清理测试数据
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } })
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
    }

    await prisma.userRole.deleteMany({ where: { userId: adminUserId } })
    await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {})
    await prisma.role.deleteMany({ where: { name: 'Admin' } })
    await prisma.permission.deleteMany({ where: { resource: 'user' } })

    await prisma.$disconnect()
  })

  describe('POST /api/users', () => {
    it('应该成功创建用户', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser123',
          password: 'Test@1234',
          email: 'newuser@test.com',
          fullName: '新用户',
          department: '技术部'
        })

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.username).toBe('newuser123')
      expect(response.body.data.email).toBe('newuser@test.com')
      expect(response.body.data.status).toBe(UserStatus.ACTIVE)

      testUserId = response.body.data.id
    })

    it('应该在用户名已存在时返回 409', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser123', // 重复的用户名
          password: 'Test@1234',
          email: 'another@test.com',
          fullName: '另一个用户'
        })

      expect(response.status).toBe(409)
      expect(response.body.error.code).toBe('CONFLICT')
    })

    it('应该在密码格式不正确时返回 400', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'testuser456',
          password: 'weak', // 弱密码
          email: 'test@test.com',
          fullName: '测试用户'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('应该在未认证时返回 401', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          username: 'testuser789',
          password: 'Test@1234',
          email: 'test@test.com',
          fullName: '测试用户'
        })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/users', () => {
    it('应该成功获取用户列表', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, pageSize: 10 })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('items')
      expect(response.body.data).toHaveProperty('total')
      expect(response.body.data).toHaveProperty('page')
      expect(response.body.data).toHaveProperty('pageSize')
      expect(Array.isArray(response.body.data.items)).toBe(true)
    })

    it('应该支持按用户名过滤', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ username: 'newuser123' })

      expect(response.status).toBe(200)
      expect(response.body.data.items.length).toBeGreaterThan(0)
      expect(response.body.data.items[0].username).toContain('newuser123')
    })

    it('应该支持按状态过滤', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: UserStatus.ACTIVE })

      expect(response.status).toBe(200)
      expect(response.body.data.items.every((user: any) => user.status === UserStatus.ACTIVE)).toBe(true)
    })
  })

  describe('GET /api/users/:id', () => {
    it('应该成功获取用户详情', async () => {
      const response = await request(app)
        .get(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBe(testUserId)
      expect(response.body.data).toHaveProperty('username')
      expect(response.body.data).toHaveProperty('email')
      expect(response.body.data).toHaveProperty('roles')
    })

    it('应该在用户不存在时返回 404', async () => {
      const response = await request(app)
        .get('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PUT /api/users/:id', () => {
    it('应该成功更新用户信息', async () => {
      const response = await request(app)
        .put(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: '更新后的姓名',
          department: '研发部',
          position: '高级工程师'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.fullName).toBe('更新后的姓名')
      expect(response.body.data.department).toBe('研发部')
      expect(response.body.data.position).toBe('高级工程师')
    })

    it('应该在用户不存在时返回 404', async () => {
      const response = await request(app)
        .put('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: '更新后的姓名'
        })

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/users/:id/status', () => {
    it('应该成功更新用户状态', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: UserStatus.INACTIVE
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.data.status).toBe(UserStatus.INACTIVE)
    })

    it('应该在状态值无效时返回 400', async () => {
      const response = await request(app)
        .patch(`/api/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'INVALID_STATUS'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('POST /api/users/:id/reset-password', () => {
    it('应该成功重置用户密码', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newPassword: 'NewPass@1234'
        })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('密码重置成功')
    })

    it('应该在密码格式不正确时返回 400', async () => {
      const response = await request(app)
        .post(`/api/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          newPassword: 'weak'
        })

      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('应该成功删除用户（软删除）', async () => {
      const response = await request(app)
        .delete(`/api/users/${testUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
      expect(response.body.message).toBe('用户删除成功')

      // 验证用户状态已更新为 INACTIVE
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      })
      expect(user?.status).toBe(UserStatus.INACTIVE)
    })

    it('应该在用户不存在时返回 404', async () => {
      const response = await request(app)
        .delete('/api/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)

      expect(response.status).toBe(404)
      expect(response.body.error.code).toBe('NOT_FOUND')
    })
  })
})
