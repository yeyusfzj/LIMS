import { PrismaClient } from '@prisma/client'
import {
  CreateRoleDto,
  UpdateRoleDto,
  RoleQuery,
  RoleResponse,
  PaginatedRoleResult,
  CreatePermissionDto,
  PermissionQuery,
  PermissionInfo,
  PaginatedPermissionResult
} from '../types/role'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

export class RoleService {
  /**
   * 创建角色
   * @param data 角色创建数据
   * @param createdBy 创建者ID
   * @returns 创建的角色信息
   */
  async createRole(data: CreateRoleDto, createdBy: string): Promise<RoleResponse> {
    try {
      // 检查角色名是否已存在
      const existingRole = await prisma.role.findUnique({
        where: { name: data.name }
      })

      if (existingRole) {
        throw new Error('角色名称已存在')
      }

      // 验证权限是否存在
      if (data.permissionIds && data.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: { id: { in: data.permissionIds } }
        })

        if (permissions.length !== data.permissionIds.length) {
          throw new Error('部分权限不存在')
        }
      }

      // 创建角色（使用事务）
      const role = await prisma.$transaction(async (tx) => {
        // 创建角色
        const newRole = await tx.role.create({
          data: {
            name: data.name,
            description: data.description
          }
        })

        // 分配权限
        if (data.permissionIds && data.permissionIds.length > 0) {
          await tx.role.update({
            where: { id: newRole.id },
            data: {
              permissions: {
                connect: data.permissionIds.map(id => ({ id }))
              }
            }
          })
        }

        return newRole
      })

      logger.info('Role created', { roleId: role.id, roleName: role.name, createdBy })

      // 查询完整的角色信息（包含权限）
      return await this.getRoleById(role.id)
    } catch (error) {
      logger.error('Create role failed', { error, data })
      throw error
    }
  }

  /**
   * 更新角色信息
   * @param roleId 角色ID
   * @param data 更新数据
   * @param updatedBy 更新者ID
   * @returns 更新后的角色信息
   */
  async updateRole(roleId: string, data: UpdateRoleDto, updatedBy: string): Promise<RoleResponse> {
    try {
      // 检查角色是否存在
      const existingRole = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!existingRole) {
        throw new Error('角色不存在')
      }

      // 如果更新角色名，检查是否已被使用
      if (data.name && data.name !== existingRole.name) {
        const nameInUse = await prisma.role.findUnique({
          where: { name: data.name }
        })

        if (nameInUse) {
          throw new Error('角色名称已被使用')
        }
      }

      // 验证权限是否存在
      if (data.permissionIds && data.permissionIds.length > 0) {
        const permissions = await prisma.permission.findMany({
          where: { id: { in: data.permissionIds } }
        })

        if (permissions.length !== data.permissionIds.length) {
          throw new Error('部分权限不存在')
        }
      }

      // 更新角色（使用事务）
      const role = await prisma.$transaction(async (tx) => {
        // 更新角色基本信息
        const updatedRole = await tx.role.update({
          where: { id: roleId },
          data: {
            name: data.name,
            description: data.description
          }
        })

        // 更新权限（如果提供了 permissionIds）
        if (data.permissionIds !== undefined) {
          // 获取当前权限
          const currentRole = await tx.role.findUnique({
            where: { id: roleId },
            include: { permissions: true }
          })

          if (currentRole) {
            // 断开所有现有权限
            await tx.role.update({
              where: { id: roleId },
              data: {
                permissions: {
                  disconnect: currentRole.permissions.map(p => ({ id: p.id }))
                }
              }
            })

            // 连接新的权限
            if (data.permissionIds.length > 0) {
              await tx.role.update({
                where: { id: roleId },
                data: {
                  permissions: {
                    connect: data.permissionIds.map(id => ({ id }))
                  }
                }
              })
            }
          }
        }

        return updatedRole
      })

      logger.info('Role updated', { roleId, updatedBy })

      // 查询完整的角色信息（包含权限）
      return await this.getRoleById(role.id)
    } catch (error) {
      logger.error('Update role failed', { error, roleId, data })
      throw error
    }
  }

  /**
   * 获取角色详情
   * @param roleId 角色ID
   * @returns 角色信息
   */
  async getRoleById(roleId: string): Promise<RoleResponse> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: {
        permissions: true,
        users: true
      }
    })

    if (!role) {
      throw new Error('角色不存在')
    }

    return {
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions.map(p => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        createdAt: p.createdAt
      })),
      userCount: role.users.length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
    }
  }

  /**
   * 查询角色列表
   * @param query 查询参数
   * @returns 分页的角色列表
   */
  async listRoles(query: RoleQuery): Promise<PaginatedRoleResult> {
    const {
      page = 1,
      pageSize = 20,
      name,
      hasPermission
    } = query

    // 构建查询条件
    const where: any = {}

    if (name) {
      where.name = { contains: name, mode: 'insensitive' }
    }

    if (hasPermission) {
      where.permissions = {
        some: {
          id: hasPermission
        }
      }
    }

    // 计算分页参数
    const skip = (page - 1) * pageSize
    const take = pageSize

    // 查询角色列表和总数
    const [roles, total] = await Promise.all([
      prisma.role.findMany({
        where,
        skip,
        take,
        include: {
          permissions: true,
          users: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.role.count({ where })
    ])

    // 转换为响应格式
    const items: RoleResponse[] = roles.map(role => ({
      id: role.id,
      name: role.name,
      description: role.description || undefined,
      permissions: role.permissions.map(p => ({
        id: p.id,
        resource: p.resource,
        action: p.action,
        createdAt: p.createdAt
      })),
      userCount: role.users.length,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt
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
   * 删除角色
   * @param roleId 角色ID
   * @param deletedBy 删除者ID
   */
  async deleteRole(roleId: string, deletedBy: string): Promise<void> {
    try {
      // 检查角色是否存在
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        include: { users: true }
      })

      if (!role) {
        throw new Error('角色不存在')
      }

      // 检查是否有用户使用该角色
      if (role.users.length > 0) {
        throw new Error('该角色正在被使用，无法删除')
      }

      // 删除角色
      await prisma.role.delete({
        where: { id: roleId }
      })

      logger.info('Role deleted', { roleId, deletedBy })
    } catch (error) {
      logger.error('Delete role failed', { error, roleId })
      throw error
    }
  }

  /**
   * 为角色分配权限
   * @param roleId 角色ID
   * @param permissionIds 权限ID列表
   * @param assignedBy 分配者ID
   */
  async assignPermissions(roleId: string, permissionIds: string[], assignedBy: string): Promise<RoleResponse> {
    try {
      // 检查角色是否存在
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        throw new Error('角色不存在')
      }

      // 验证权限是否存在
      const permissions = await prisma.permission.findMany({
        where: { id: { in: permissionIds } }
      })

      if (permissions.length !== permissionIds.length) {
        throw new Error('部分权限不存在')
      }

      // 分配权限
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            connect: permissionIds.map(id => ({ id }))
          }
        }
      })

      logger.info('Permissions assigned to role', { roleId, permissionIds, assignedBy })

      return await this.getRoleById(roleId)
    } catch (error) {
      logger.error('Assign permissions failed', { error, roleId, permissionIds })
      throw error
    }
  }

  /**
   * 从角色移除权限
   * @param roleId 角色ID
   * @param permissionIds 权限ID列表
   * @param removedBy 移除者ID
   */
  async removePermissions(roleId: string, permissionIds: string[], removedBy: string): Promise<RoleResponse> {
    try {
      // 检查角色是否存在
      const role = await prisma.role.findUnique({
        where: { id: roleId }
      })

      if (!role) {
        throw new Error('角色不存在')
      }

      // 移除权限
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            disconnect: permissionIds.map(id => ({ id }))
          }
        }
      })

      logger.info('Permissions removed from role', { roleId, permissionIds, removedBy })

      return await this.getRoleById(roleId)
    } catch (error) {
      logger.error('Remove permissions failed', { error, roleId, permissionIds })
      throw error
    }
  }

  /**
   * 创建权限
   * @param data 权限创建数据
   * @param createdBy 创建者ID
   * @returns 创建的权限信息
   */
  async createPermission(data: CreatePermissionDto, createdBy: string): Promise<PermissionInfo> {
    try {
      // 检查权限是否已存在
      const existingPermission = await prisma.permission.findUnique({
        where: {
          resource_action: {
            resource: data.resource,
            action: data.action
          }
        }
      })

      if (existingPermission) {
        throw new Error('权限已存在')
      }

      // 创建权限
      const permission = await prisma.permission.create({
        data: {
          resource: data.resource,
          action: data.action
        }
      })

      logger.info('Permission created', { permissionId: permission.id, resource: data.resource, action: data.action, createdBy })

      return {
        id: permission.id,
        resource: permission.resource,
        action: permission.action,
        createdAt: permission.createdAt
      }
    } catch (error) {
      logger.error('Create permission failed', { error, data })
      throw error
    }
  }

  /**
   * 查询权限列表
   * @param query 查询参数
   * @returns 分页的权限列表
   */
  async listPermissions(query: PermissionQuery): Promise<PaginatedPermissionResult> {
    const {
      page = 1,
      pageSize = 20,
      resource,
      action
    } = query

    // 构建查询条件
    const where: any = {}

    if (resource) {
      where.resource = { contains: resource, mode: 'insensitive' }
    }

    if (action) {
      where.action = { contains: action, mode: 'insensitive' }
    }

    // 计算分页参数
    const skip = (page - 1) * pageSize
    const take = pageSize

    // 查询权限列表和总数
    const [permissions, total] = await Promise.all([
      prisma.permission.findMany({
        where,
        skip,
        take,
        orderBy: [
          { resource: 'asc' },
          { action: 'asc' }
        ]
      }),
      prisma.permission.count({ where })
    ])

    // 转换为响应格式
    const items: PermissionInfo[] = permissions.map(p => ({
      id: p.id,
      resource: p.resource,
      action: p.action,
      createdAt: p.createdAt
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
   * 删除权限
   * @param permissionId 权限ID
   * @param deletedBy 删除者ID
   */
  async deletePermission(permissionId: string, deletedBy: string): Promise<void> {
    try {
      // 检查权限是否存在
      const permission = await prisma.permission.findUnique({
        where: { id: permissionId },
        include: { roles: true }
      })

      if (!permission) {
        throw new Error('权限不存在')
      }

      // 检查是否有角色使用该权限
      if (permission.roles.length > 0) {
        throw new Error('该权限正在被使用，无法删除')
      }

      // 删除权限
      await prisma.permission.delete({
        where: { id: permissionId }
      })

      logger.info('Permission deleted', { permissionId, deletedBy })
    } catch (error) {
      logger.error('Delete permission failed', { error, permissionId })
      throw error
    }
  }
}

export const roleService = new RoleService()
