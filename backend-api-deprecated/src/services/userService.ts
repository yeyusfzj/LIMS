import { PrismaClient, UserStatus } from '@prisma/client'
import { AuthService } from './authService'
import {
  CreateUserDto,
  UpdateUserDto,
  UserQuery,
  ResetPasswordDto,
  UserResponse,
  PaginatedUserResult
} from '../types/user'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

export class UserService {
  /**
   * 创建用户
   * @param data 用户创建数据
   * @param createdBy 创建者ID
   * @returns 创建的用户信息
   */
  async createUser(data: CreateUserDto, createdBy: string): Promise<UserResponse> {
    try {
      // 检查用户名是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { username: data.username }
      })

      if (existingUser) {
        throw new Error('用户名已存在')
      }

      // 检查邮箱是否已存在
      const existingEmail = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (existingEmail) {
        throw new Error('邮箱已被使用')
      }

      // 验证角色是否存在
      if (data.roleIds && data.roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: { id: { in: data.roleIds } }
        })

        if (roles.length !== data.roleIds.length) {
          throw new Error('部分角色不存在')
        }
      }

      // 哈希密码
      const passwordHash = await AuthService.hashPassword(data.password)

      // 创建用户（使用事务）
      const user = await prisma.$transaction(async (tx) => {
        // 创建用户
        const newUser = await tx.user.create({
          data: {
            username: data.username,
            passwordHash,
            email: data.email,
            fullName: data.fullName,
            department: data.department,
            position: data.position,
            phone: data.phone,
            status: UserStatus.ACTIVE
          }
        })

        // 分配角色
        if (data.roleIds && data.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: data.roleIds.map(roleId => ({
              userId: newUser.id,
              roleId
            }))
          })
        }

        return newUser
      })

      logger.info('User created', { userId: user.id, username: user.username, createdBy })

      // 查询完整的用户信息（包含角色）
      return await this.getUserById(user.id)
    } catch (error) {
      logger.error('Create user failed', { error, data: { ...data, password: '[REDACTED]' } })
      throw error
    }
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param data 更新数据
   * @param updatedBy 更新者ID
   * @returns 更新后的用户信息
   */
  async updateUser(userId: string, data: UpdateUserDto, updatedBy: string): Promise<UserResponse> {
    try {
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        throw new Error('用户不存在')
      }

      // 如果更新邮箱，检查是否已被使用
      if (data.email && data.email !== existingUser.email) {
        const emailInUse = await prisma.user.findUnique({
          where: { email: data.email }
        })

        if (emailInUse) {
          throw new Error('邮箱已被使用')
        }
      }

      // 验证角色是否存在
      if (data.roleIds && data.roleIds.length > 0) {
        const roles = await prisma.role.findMany({
          where: { id: { in: data.roleIds } }
        })

        if (roles.length !== data.roleIds.length) {
          throw new Error('部分角色不存在')
        }
      }

      // 更新用户（使用事务）
      const user = await prisma.$transaction(async (tx) => {
        // 更新用户基本信息
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            email: data.email,
            fullName: data.fullName,
            department: data.department,
            position: data.position,
            phone: data.phone,
            status: data.status
          }
        })

        // 更新角色（如果提供了 roleIds）
        if (data.roleIds !== undefined) {
          // 删除现有角色关联
          await tx.userRole.deleteMany({
            where: { userId }
          })

          // 创建新的角色关联
          if (data.roleIds.length > 0) {
            await tx.userRole.createMany({
              data: data.roleIds.map(roleId => ({
                userId,
                roleId
              }))
            })
          }
        }

        return updatedUser
      })

      logger.info('User updated', { userId, updatedBy })

      // 查询完整的用户信息（包含角色）
      return await this.getUserById(user.id)
    } catch (error) {
      logger.error('Update user failed', { error, userId, data })
      throw error
    }
  }

  /**
   * 获取用户详情
   * @param userId 用户ID
   * @returns 用户信息
   */
  async getUserById(userId: string): Promise<UserResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    })

    if (!user) {
      throw new Error('用户不存在')
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      department: user.department || undefined,
      position: user.position || undefined,
      phone: user.phone || undefined,
      status: user.status,
      roles: user.roles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description || undefined
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || undefined
    }
  }

  /**
   * 查询用户列表
   * @param query 查询参数
   * @returns 分页的用户列表
   */
  async listUsers(query: UserQuery): Promise<PaginatedUserResult> {
    const {
      page = 1,
      pageSize = 20,
      username,
      email,
      fullName,
      department,
      status,
      roleId
    } = query

    // 构建查询条件
    const where: any = {}

    if (username) {
      where.username = { contains: username, mode: 'insensitive' }
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' }
    }

    if (fullName) {
      where.fullName = { contains: fullName, mode: 'insensitive' }
    }

    if (department) {
      where.department = { contains: department, mode: 'insensitive' }
    }

    if (status) {
      where.status = status
    }

    if (roleId) {
      where.roles = {
        some: {
          roleId
        }
      }
    }

    // 计算分页参数
    const skip = (page - 1) * pageSize
    const take = pageSize

    // 查询用户列表和总数
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          roles: {
            include: {
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.user.count({ where })
    ])

    // 转换为响应格式
    const items: UserResponse[] = users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      department: user.department || undefined,
      position: user.position || undefined,
      phone: user.phone || undefined,
      status: user.status,
      roles: user.roles.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        description: ur.role.description || undefined
      })),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt || undefined
    }))

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  /**
   * 更新用户状态
   * @param userId 用户ID
   * @param status 新状态
   * @param updatedBy 更新者ID
   * @returns 更新后的用户信息
   */
  async updateUserStatus(userId: string, status: UserStatus, updatedBy: string): Promise<UserResponse> {
    try {
      // 检查用户是否存在
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!existingUser) {
        throw new Error('用户不存在')
      }

      // 更新状态
      await prisma.user.update({
        where: { id: userId },
        data: { status }
      })

      logger.info('User status updated', { userId, status, updatedBy })

      // 返回更新后的用户信息
      return await this.getUserById(userId)
    } catch (error) {
      logger.error('Update user status failed', { error, userId, status })
      throw error
    }
  }

  /**
   * 重置用户密码（管理员操作）
   * @param userId 用户ID
   * @param data 密码重置数据
   * @param resetBy 重置者ID
   */
  async resetPassword(userId: string, data: ResetPasswordDto, resetBy: string): Promise<void> {
    try {
      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      // 哈希新密码
      const passwordHash = await AuthService.hashPassword(data.newPassword)

      // 更新密码
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      })

      logger.info('Password reset', { userId, resetBy })
    } catch (error) {
      logger.error('Reset password failed', { error, userId })
      throw error
    }
  }

  /**
   * 删除用户（软删除 - 设置为 INACTIVE）
   * @param userId 用户ID
   * @param deletedBy 删除者ID
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    try {
      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        throw new Error('用户不存在')
      }

      // 软删除：设置状态为 INACTIVE
      await prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.INACTIVE }
      })

      logger.info('User deleted (soft)', { userId, deletedBy })
    } catch (error) {
      logger.error('Delete user failed', { error, userId })
      throw error
    }
  }
}

export const userService = new UserService()
