// 用户服务单元测试

import { PrismaClient, UserStatus } from '@prisma/client'
import { UserService } from '../services/userService'
import { AuthService } from '../services/authService'
import { CreateUserDto, UpdateUserDto } from '../types/user'

const prisma = new PrismaClient()
const userService = new UserService()

describe('UserService', () => {
  let testUserId: string
  let testRoleId: string

  // 创建测试角色
  beforeAll(async () => {
    const role = await prisma.role.create({
      data: {
        name: 'TEST_ROLE',
        description: '测试角色'
      }
    })
    testRoleId = role.id
  })

  // 清理测试数据
  afterEach(async () => {
    if (testUserId) {
      await prisma.userRole.deleteMany({ where: { userId: testUserId } })
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {})
      testUserId = ''
    }
  })

  afterAll(async () => {
    await prisma.role.delete({ where: { id: testRoleId } }).catch(() => {})
    await prisma.$disconnect()
  })

  describe('createUser', () => {
    it('应该成功创建用户', async () => {
      const createUserDto: CreateUserDto = {
        username: 'testuser_' + Date.now(),
        password: 'Test@1234',
        email: `test${Date.now()}@example.com`,
        fullName: '测试用户',
        department: '技术部',
        roleIds: [testRoleId]
      }

      const user = await userService.createUser(createUserDto, 'admin-id')

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.username).toBe(createUserDto.username)
      expect(user.email).toBe(createUserDto.email)
      expect(user.fullName).toBe(createUserDto.fullName)
      expect(user.status).toBe(UserStatus.ACTIVE)
      expect(user.roles).toHaveLength(1)
      expect(user.roles[0].id).toBe(testRoleId)

      testUserId = user.id
    })

    it('应该在用户名已存在时抛出错误', async () => {
      const username = 'duplicate_user_' + Date.now()
      
      const createUserDto1: CreateUserDto = {
        username,
        password: 'Test@1234',
        email: `test1${Date.now()}@example.com`,
        fullName: '用户1'
      }

      const user1 = await userService.createUser(createUserDto1, 'admin-id')
      testUserId = user1.id

      const createUserDto2: CreateUserDto = {
        username, // 重复的用户名
        password: 'Test@1234',
        email: `test2${Date.now()}@example.com`,
        fullName: '用户2'
      }

      await expect(userService.createUser(createUserDto2, 'admin-id'))
        .rejects.toThrow('用户名已存在')
    })

    it('应该在邮箱已存在时抛出错误', async () => {
      const email = `duplicate${Date.now()}@example.com`
      
      const createUserDto1: CreateUserDto = {
        username: 'user1_' + Date.now(),
        password: 'Test@1234',
        email,
        fullName: '用户1'
      }

      const user1 = await userService.createUser(createUserDto1, 'admin-id')
      testUserId = user1.id

      const createUserDto2: CreateUserDto = {
        username: 'user2_' + Date.now(),
        password: 'Test@1234',
        email, // 重复的邮箱
        fullName: '用户2'
      }

      await expect(userService.createUser(createUserDto2, 'admin-id'))
        .rejects.toThrow('邮箱已被使用')
    })
  })

  describe('updateUser', () => {
    it('应该成功更新用户信息', async () => {
      // 先创建用户
      const createUserDto: CreateUserDto = {
        username: 'updatetest_' + Date.now(),
        password: 'Test@1234',
        email: `update${Date.now()}@example.com`,
        fullName: '原姓名',
        department: '技术部'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      // 更新用户
      const updateUserDto: UpdateUserDto = {
        fullName: '更新后的姓名',
        department: '研发部',
        position: '高级工程师'
      }

      const updatedUser = await userService.updateUser(user.id, updateUserDto, 'admin-id')

      expect(updatedUser.fullName).toBe('更新后的姓名')
      expect(updatedUser.department).toBe('研发部')
      expect(updatedUser.position).toBe('高级工程师')
    })

    it('应该在用户不存在时抛出错误', async () => {
      const updateUserDto: UpdateUserDto = {
        fullName: '更新后的姓名'
      }

      await expect(userService.updateUser('non-existent-id', updateUserDto, 'admin-id'))
        .rejects.toThrow('用户不存在')
    })
  })

  describe('getUserById', () => {
    it('应该成功获取用户详情', async () => {
      // 先创建用户
      const createUserDto: CreateUserDto = {
        username: 'gettest_' + Date.now(),
        password: 'Test@1234',
        email: `get${Date.now()}@example.com`,
        fullName: '测试用户',
        roleIds: [testRoleId]
      }

      const createdUser = await userService.createUser(createUserDto, 'admin-id')
      testUserId = createdUser.id

      // 获取用户详情
      const user = await userService.getUserById(createdUser.id)

      expect(user.id).toBe(createdUser.id)
      expect(user.username).toBe(createUserDto.username)
      expect(user.email).toBe(createUserDto.email)
      expect(user.roles).toHaveLength(1)
    })

    it('应该在用户不存在时抛出错误', async () => {
      await expect(userService.getUserById('non-existent-id'))
        .rejects.toThrow('用户不存在')
    })
  })

  describe('listUsers', () => {
    it('应该成功获取用户列表', async () => {
      // 创建测试用户
      const createUserDto: CreateUserDto = {
        username: 'listtest_' + Date.now(),
        password: 'Test@1234',
        email: `list${Date.now()}@example.com`,
        fullName: '列表测试用户'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      const result = await userService.listUsers({ page: 1, pageSize: 20 })

      expect(result.items).toBeDefined()
      expect(Array.isArray(result.items)).toBe(true)
      expect(result.total).toBeGreaterThan(0)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('应该支持按用户名过滤', async () => {
      const username = 'filtertest_' + Date.now()
      
      const createUserDto: CreateUserDto = {
        username,
        password: 'Test@1234',
        email: `filter${Date.now()}@example.com`,
        fullName: '过滤测试用户'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      const result = await userService.listUsers({ username })

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.items.some(u => u.username === username)).toBe(true)
    })
  })

  describe('updateUserStatus', () => {
    it('应该成功更新用户状态', async () => {
      // 先创建用户
      const createUserDto: CreateUserDto = {
        username: 'statustest_' + Date.now(),
        password: 'Test@1234',
        email: `status${Date.now()}@example.com`,
        fullName: '状态测试用户'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      // 更新状态
      const updatedUser = await userService.updateUserStatus(user.id, UserStatus.INACTIVE, 'admin-id')

      expect(updatedUser.status).toBe(UserStatus.INACTIVE)
    })
  })

  describe('resetPassword', () => {
    it('应该成功重置用户密码', async () => {
      // 先创建用户
      const createUserDto: CreateUserDto = {
        username: 'pwdtest_' + Date.now(),
        password: 'Test@1234',
        email: `pwd${Date.now()}@example.com`,
        fullName: '密码测试用户'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      // 重置密码
      await expect(
        userService.resetPassword(user.id, { newPassword: 'NewPass@1234' }, 'admin-id')
      ).resolves.not.toThrow()
    })

    it('应该在用户不存在时抛出错误', async () => {
      await expect(
        userService.resetPassword('non-existent-id', { newPassword: 'NewPass@1234' }, 'admin-id')
      ).rejects.toThrow('用户不存在')
    })
  })

  describe('deleteUser', () => {
    it('应该成功软删除用户', async () => {
      // 先创建用户
      const createUserDto: CreateUserDto = {
        username: 'deletetest_' + Date.now(),
        password: 'Test@1234',
        email: `delete${Date.now()}@example.com`,
        fullName: '删除测试用户'
      }

      const user = await userService.createUser(createUserDto, 'admin-id')
      testUserId = user.id

      // 删除用户
      await userService.deleteUser(user.id, 'admin-id')

      // 验证用户状态已更新为 INACTIVE
      const deletedUser = await userService.getUserById(user.id)
      expect(deletedUser.status).toBe(UserStatus.INACTIVE)
    })

    it('应该在用户不存在时抛出错误', async () => {
      await expect(userService.deleteUser('non-existent-id', 'admin-id'))
        .rejects.toThrow('用户不存在')
    })
  })
})
