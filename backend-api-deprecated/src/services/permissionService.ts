import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 权限服务
 * 实现基于角色的访问控制(RBAC)
 */
export class PermissionService {
  /**
   * 检查用户是否具有指定权限
   * @param userId 用户ID
   * @param resource 资源类型
   * @param action 操作类型
   * @returns 是否有权限
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // 查询用户的所有角色及其权限
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          }
        }
      })

      if (!user) {
        return false
      }

      // 检查用户状态
      if (user.status !== 'ACTIVE') {
        return false
      }

      // 遍历用户的所有角色,检查是否有匹配的权限
      for (const userRole of user.roles) {
        const permissions = userRole.role.permissions
        
        // 检查是否有匹配的权限
        const hasPermission = permissions.some(
          p => p.resource === resource && p.action === action
        )

        if (hasPermission) {
          return true
        }

        // 检查是否有通配符权限 (resource:* 或 *:action)
        const hasWildcardResource = permissions.some(
          p => p.resource === '*' && p.action === action
        )
        const hasWildcardAction = permissions.some(
          p => p.resource === resource && p.action === '*'
        )
        const hasFullWildcard = permissions.some(
          p => p.resource === '*' && p.action === '*'
        )

        if (hasWildcardResource || hasWildcardAction || hasFullWildcard) {
          return true
        }
      }

      return false
    } catch (error) {
      logger.error('Permission check error:', error)
      return false
    }
  }

  /**
   * 获取用户的所有权限
   * @param userId 用户ID
   * @returns 权限列表（包含通配符权限）
   */
  async getUserPermissions(userId: string): Promise<Array<{ resource: string; action: string }>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: true
                }
              }
            }
          }
        }
      })

      if (!user) {
        return []
      }

      // 收集所有权限(去重)
      const permissionsSet = new Set<string>()
      const permissions: Array<{ resource: string; action: string }> = []

      for (const userRole of user.roles) {
        for (const permission of userRole.role.permissions) {
          const key = `${permission.resource}:${permission.action}`
          if (!permissionsSet.has(key)) {
            permissionsSet.add(key)
            permissions.push({
              resource: permission.resource,
              action: permission.action
            })
          }
        }
      }

      return permissions
    } catch (error) {
      logger.error('Get user permissions error:', error)
      return []
    }
  }

  /**
   * 检查用户是否具有指定权限（考虑通配符）
   * 这个方法用于验证权限检查的一致性
   * @param userId 用户ID
   * @param resource 资源类型
   * @param action 操作类型
   * @returns 是否有权限
   */
  async hasPermissionInList(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId)
    
    // 检查精确匹配
    const exactMatch = permissions.some(
      p => p.resource === resource && p.action === action
    )
    if (exactMatch) {
      return true
    }

    // 检查通配符匹配
    const wildcardMatch = permissions.some(
      p => (p.resource === '*' && p.action === action) ||
           (p.resource === resource && p.action === '*') ||
           (p.resource === '*' && p.action === '*')
    )
    
    return wildcardMatch
  }

  /**
   * 获取用户的所有角色
   * @param userId 用户ID
   * @returns 角色名称列表
   */
  async getUserRoles(userId: string): Promise<string[]> {
    try {
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
        return []
      }

      return user.roles.map(ur => ur.role.name)
    } catch (error) {
      logger.error('Get user roles error:', error)
      return []
    }
  }

  /**
   * 为角色分配权限
   * @param roleId 角色ID
   * @param permissionId 权限ID
   */
  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    try {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            connect: { id: permissionId }
          }
        }
      })

      logger.info('Permission assigned to role', { roleId, permissionId })
    } catch (error) {
      logger.error('Assign permission error:', error)
      throw new Error('分配权限失败')
    }
  }

  /**
   * 从角色移除权限
   * @param roleId 角色ID
   * @param permissionId 权限ID
   */
  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    try {
      await prisma.role.update({
        where: { id: roleId },
        data: {
          permissions: {
            disconnect: { id: permissionId }
          }
        }
      })

      logger.info('Permission removed from role', { roleId, permissionId })
    } catch (error) {
      logger.error('Remove permission error:', error)
      throw new Error('移除权限失败')
    }
  }

  /**
   * 为用户分配角色
   * @param userId 用户ID
   * @param roleId 角色ID
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<void> {
    try {
      await prisma.userRole.create({
        data: {
          userId,
          roleId
        }
      })

      logger.info('Role assigned to user', { userId, roleId })
    } catch (error) {
      logger.error('Assign role error:', error)
      throw new Error('分配角色失败')
    }
  }

  /**
   * 从用户移除角色
   * @param userId 用户ID
   * @param roleId 角色ID
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await prisma.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId
          }
        }
      })

      logger.info('Role removed from user', { userId, roleId })
    } catch (error) {
      logger.error('Remove role error:', error)
      throw new Error('移除角色失败')
    }
  }

  /**
   * 创建权限
   * @param resource 资源类型
   * @param action 操作类型
   * @returns 创建的权限
   */
  async createPermission(resource: string, action: string) {
    try {
      const permission = await prisma.permission.create({
        data: {
          resource,
          action
        }
      })

      logger.info('Permission created', { resource, action })
      return permission
    } catch (error) {
      logger.error('Create permission error:', error)
      throw new Error('创建权限失败')
    }
  }

  /**
   * 创建角色
   * @param name 角色名称
   * @param description 角色描述
   * @returns 创建的角色
   */
  async createRole(name: string, description?: string) {
    try {
      const role = await prisma.role.create({
        data: {
          name,
          description
        }
      })

      logger.info('Role created', { name })
      return role
    } catch (error) {
      logger.error('Create role error:', error)
      throw new Error('创建角色失败')
    }
  }
}

export const permissionService = new PermissionService()
