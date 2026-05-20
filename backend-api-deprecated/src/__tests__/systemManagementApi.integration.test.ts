/**
 * 系统管理 API 集成测试
 * 
 * 测试所有系统管理相关的 API 端点:
 * - 用户管理 API
 * - 角色管理 API
 * - 数据备份 API
 */

import request from 'supertest'
import { app } from '../app'
import prisma from '../config/database'
import bcrypt from 'bcrypt'

describe('系统管理 API 集成测试', () => {
  let adminToken: string
  let adminUserId: string
  let testUserId: string
  let testRoleId: string
  let testPermissionId: string

  beforeAll(async () => {
    // 清理测试数据
    await prisma.backupRecord.deleteMany({})
    await prisma.userRole.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.role.deleteMany({})
    await prisma.permission.deleteMany({})

    // 创建测试权限
    const permissions = await Promise.all([
      prisma.permission.create({
        data: { resource: 'user', action: 'create' }
      }),
      prisma.permission.create({
        data: { resource: 'user', action: 'read' }
      }),
      prisma.permission.create({
        data: { resource: 'user', action: 'update' }
      }),
      prisma.permission.create({
        data: { resource: 'user', action: 'delete' }
      }),
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
      }),
      prisma.permission.create({
        data: { resource: 'system', action: 'manage' }
      })
    ])

    testPermissionId = permissions[0].id

    // 创建管理员角色
    const adminRole = await prisma.role.create({
      data: {
        name: '系统管理员',
        description: '拥有所有权限的管理员',
        permissions: {
          connect: permissions.map(p => ({ id: p.id }))
        }
      }
    })

    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('Admin@123', 12)
    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash: hashedPassword,
        email: 'admin@test.com',
        fullName: '系统管理员',
        status: 'ACTIVE',
        roles: {
          create: {
            roleId: adminRole.id
          }
        }
      }
    })

    adminUserId = adminUser.id

    // 登录获取 token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin@123'
      })

    adminToken = loginResponse.body.data.accessToken
  })

  afterAll(async () => {
    // 清理测试数据
    await prisma.backupRecord.deleteMany({})
    await prisma.userRole.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.role.deleteMany({})
    await prisma.permission.deleteMany({})
    await prisma.$disconnect()
  })

  describe('用户管理 API', () => {
    describe('POST /api/users - 创建用户', () => {
      it('应该成功创建用户', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'testuser',
            password: 'Test@1234',
            email: 'testuser@test.com',
            fullName: '测试用户',
            department: '技术部',
            position: '工程师',
            phone: '13800138000'
          })

        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('id')
        expect(response.body.data.username).toBe('testuser')
        expect(response.body.data.email).toBe('testuser@test.com')
        expect(response.body.data.fullName).toBe('测试用户')
        expect(response.body.data).not.toHaveProperty('passwordHash')

        testUserId = response.body.data.id
      })

      it('用户名重复时应该返回 409 错误', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'testuser',
            password: 'Test@1234',
            email: 'another@test.com',
            fullName: '另一个用户'
          })

        expect(response.status).toBe(409)
        expect(response.body.success).toBe(false)
        expect(response.body.error.message).toContain('用户名已存在')
      })

      it('密码格式不正确时应该返回 400 错误', async () => {
        const response = await request(app)
          .post('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            username: 'weakpassuser',
            password: '123456',
            email: 'weak@test.com',
            fullName: '弱密码用户'
          })

        expect(response.status).toBe(400)
        expect(response.body.success).toBe(false)
      })
    })

    describe('GET /api/users - 查询用户列表', () => {
      it('应该返回分页的用户列表', async () => {
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
        expect(response.body.data.items.length).toBeGreaterThan(0)
      })

      it('应该支持按用户名过滤', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ username: 'testuser' })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.items.length).toBeGreaterThan(0)
        expect(response.body.data.items[0].username).toBe('testuser')
      })

      it('应该支持按状态过滤', async () => {
        const response = await request(app)
          .get('/api/users')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ status: 'ACTIVE' })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.items.every((u: any) => u.status === 'ACTIVE')).toBe(true)
      })
    })

    describe('GET /api/users/:id - 获取用户详情', () => {
      it('应该返回用户详情', async () => {
        const response = await request(app)
          .get(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.id).toBe(testUserId)
        expect(response.body.data.username).toBe('testuser')
        expect(response.body.data).toHaveProperty('roles')
      })

      it('用户不存在时应该返回 404 错误', async () => {
        const response = await request(app)
          .get('/api/users/non-existent-id')
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(404)
        expect(response.body.success).toBe(false)
      })
    })

    describe('PUT /api/users/:id - 更新用户', () => {
      it('应该成功更新用户信息', async () => {
        const response = await request(app)
          .put(`/api/users/${testUserId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            fullName: '更新后的用户',
            department: '研发部',
            position: '高级工程师'
          })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.fullName).toBe('更新后的用户')
        expect(response.body.data.department).toBe('研发部')
        expect(response.body.data.position).toBe('高级工程师')
      })
    })
  })

  describe('角色管理 API', () => {
    describe('POST /api/roles - 创建角色', () => {
      it('应该成功创建角色', async () => {
        const response = await request(app)
          .post('/api/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '测试角色',
            description: '用于测试的角色',
            permissionIds: [testPermissionId]
          })

        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('id')
        expect(response.body.data.name).toBe('测试角色')
        expect(response.body.data.description).toBe('用于测试的角色')
        expect(response.body.data.permissions).toHaveLength(1)

        testRoleId = response.body.data.id
      })

      it('角色名重复时应该返回 409 错误', async () => {
        const response = await request(app)
          .post('/api/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '测试角色',
            description: '重复的角色'
          })

        expect(response.status).toBe(409)
        expect(response.body.success).toBe(false)
      })
    })

    describe('GET /api/roles - 查询角色列表', () => {
      it('应该返回分页的角色列表', async () => {
        const response = await request(app)
          .get('/api/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, pageSize: 10 })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('items')
        expect(response.body.data).toHaveProperty('total')
        expect(Array.isArray(response.body.data.items)).toBe(true)
      })

      it('应该支持按名称过滤', async () => {
        const response = await request(app)
          .get('/api/roles')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ name: '测试角色' })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.items.length).toBeGreaterThan(0)
        expect(response.body.data.items[0].name).toBe('测试角色')
      })
    })

    describe('GET /api/roles/:id - 获取角色详情', () => {
      it('应该返回角色详情', async () => {
        const response = await request(app)
          .get(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.id).toBe(testRoleId)
        expect(response.body.data.name).toBe('测试角色')
        expect(response.body.data).toHaveProperty('permissions')
      })
    })

    describe('PUT /api/roles/:id - 更新角色', () => {
      it('应该成功更新角色信息', async () => {
        const response = await request(app)
          .put(`/api/roles/${testRoleId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: '更新后的角色',
            description: '更新后的描述'
          })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.name).toBe('更新后的角色')
        expect(response.body.data.description).toBe('更新后的描述')
      })
    })

    describe('POST /api/roles/:id/permissions - 分配权限', () => {
      it('应该成功为角色分配权限', async () => {
        // 获取另一个权限
        const permissions = await prisma.permission.findMany({
          where: { resource: 'user', action: 'read' }
        })

        const response = await request(app)
          .post(`/api/roles/${testRoleId}/permissions`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            permissionIds: [permissions[0].id]
          })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })
  })

  describe('数据备份 API', () => {
    let backupId: string

    describe('POST /api/backups - 创建备份', () => {
      it('应该成功创建备份', async () => {
        const response = await request(app)
          .post('/api/backups')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            type: 'MANUAL',
            description: '测试备份'
          })

        expect(response.status).toBe(201)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('id')
        expect(response.body.data.type).toBe('MANUAL')
        expect(response.body.data.status).toBe('COMPLETED')

        backupId = response.body.data.id
      }, 30000) // 备份可能需要较长时间
    })

    describe('GET /api/backups - 查询备份列表', () => {
      it('应该返回分页的备份列表', async () => {
        const response = await request(app)
          .get('/api/backups')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ page: 1, pageSize: 10 })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data).toHaveProperty('items')
        expect(response.body.data).toHaveProperty('total')
        expect(Array.isArray(response.body.data.items)).toBe(true)
      })

      it('应该支持按状态过滤', async () => {
        const response = await request(app)
          .get('/api/backups')
          .set('Authorization', `Bearer ${adminToken}`)
          .query({ status: 'COMPLETED' })

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.items.every((b: any) => b.status === 'COMPLETED')).toBe(true)
      })
    })

    describe('GET /api/backups/:id - 获取备份详情', () => {
      it('应该返回备份详情', async () => {
        const response = await request(app)
          .get(`/api/backups/${backupId}`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.id).toBe(backupId)
        expect(response.body.data).toHaveProperty('filename')
        expect(response.body.data).toHaveProperty('size')
      })
    })

    describe('POST /api/backups/:id/verify - 验证备份', () => {
      it('应该成功验证备份', async () => {
        const response = await request(app)
          .post(`/api/backups/${backupId}/verify`)
          .set('Authorization', `Bearer ${adminToken}`)

        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.verified).toBe(true)
      })
    })
  })

  describe('权限控制测试', () => {
    let normalUserToken: string

    beforeAll(async () => {
      // 创建普通用户（无权限）
      const hashedPassword = await bcrypt.hash('User@123', 12)
      const normalUser = await prisma.user.create({
        data: {
          username: 'normaluser',
          passwordHash: hashedPassword,
          email: 'normal@test.com',
          fullName: '普通用户',
          status: 'ACTIVE'
        }
      })

      // 登录获取 token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'normaluser',
          password: 'User@123'
        })

      normalUserToken = loginResponse.body.data.accessToken
    })

    it('无权限用户访问用户管理 API 应该返回 403', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${normalUserToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('无权限用户访问角色管理 API 应该返回 403', async () => {
      const response = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${normalUserToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('无权限用户访问备份 API 应该返回 403', async () => {
      const response = await request(app)
        .get('/api/backups')
        .set('Authorization', `Bearer ${normalUserToken}`)

      expect(response.status).toBe(403)
      expect(response.body.success).toBe(false)
    })

    it('未认证用户访问 API 应该返回 401', async () => {
      const response = await request(app)
        .get('/api/users')

      expect(response.status).toBe(401)
      expect(response.body.success).toBe(false)
    })
  })

  describe('端点完整性验证', () => {
    it('所有用户管理端点都应该存在', async () => {
      const endpoints = [
        { method: 'post', path: '/api/users' },
        { method: 'get', path: '/api/users' },
        { method: 'get', path: `/api/users/${testUserId}` },
        { method: 'put', path: `/api/users/${testUserId}` }
      ]

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`)

        // 不应该返回 404
        expect(response.status).not.toBe(404)
      }
    })

    it('所有角色管理端点都应该存在', async () => {
      const endpoints = [
        { method: 'post', path: '/api/roles' },
        { method: 'get', path: '/api/roles' },
        { method: 'get', path: `/api/roles/${testRoleId}` },
        { method: 'put', path: `/api/roles/${testRoleId}` }
      ]

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`)

        // 不应该返回 404
        expect(response.status).not.toBe(404)
      }
    })

    it('所有备份管理端点都应该存在', async () => {
      const endpoints = [
        { method: 'post', path: '/api/backups' },
        { method: 'get', path: '/api/backups' }
      ]

      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`)

        // 不应该返回 404
        expect(response.status).not.toBe(404)
      }
    })
  })
})
