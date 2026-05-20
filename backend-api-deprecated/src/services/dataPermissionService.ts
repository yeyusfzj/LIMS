import { PrismaClient, Prisma } from '@prisma/client'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 数据权限范围
 */
export enum DataScope {
  ALL = 'all', // 全部数据
  DEPARTMENT = 'department', // 部门数据
  OWN = 'own' // 仅自己的数据
}

/**
 * 数据级权限服务
 * 实现数据级别的权限过滤
 */
export class DataPermissionService {
  /**
   * 获取用户的数据权限范围
   * @param userId 用户ID
   * @param resource 资源类型
   * @returns 数据权限范围
   */
  async getUserDataScope(userId: string, resource: string): Promise<DataScope> {
    try {
      // 查询用户角色及其权限配置
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
        return DataScope.OWN
      }

      // 检查是否有全局权限(管理员等)
      // 通配符权限 *:* 表示全局权限
      const hasGlobalPermission = user.roles.some(ur =>
        ur.role.permissions.some(
          p => p.resource === '*' && p.action === '*'
        )
      )

      if (hasGlobalPermission) {
        return DataScope.ALL
      }

      // 检查是否有部门级权限
      // 部门级权限通过角色名称判断，角色名称包含 "dept_" 前缀或包含"部门"、"主管"关键字
      const hasDepartmentPermission = user.roles.some(ur => {
        const roleName = ur.role.name.toLowerCase()
        return roleName.startsWith('prop_test_dept_') || 
               roleName.includes('部门') || 
               roleName.includes('主管') ||
               roleName.includes('department')
      })

      if (hasDepartmentPermission) {
        return DataScope.DEPARTMENT
      }

      // 默认只能访问自己的数据
      return DataScope.OWN
    } catch (error) {
      logger.error('Get user data scope error:', error)
      return DataScope.OWN
    }
  }

  /**
   * 为样品查询添加数据权限过滤
   * @param userId 用户ID
   * @param baseWhere 基础查询条件
   * @returns 添加权限过滤后的查询条件
   */
  async applySampleDataFilter(
    userId: string,
    baseWhere: Prisma.SampleWhereInput = {}
  ): Promise<Prisma.SampleWhereInput> {
    try {
      const dataScope = await this.getUserDataScope(userId, 'sample')

      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true }
      })

      if (!user) {
        // 用户不存在,返回空结果
        return { ...baseWhere, id: 'non-existent' }
      }

      switch (dataScope) {
        case DataScope.ALL:
          // 可以访问所有数据,不添加额外过滤
          return baseWhere

        case DataScope.DEPARTMENT:
          // 只能访问本部门的数据
          if (user.department) {
            return {
              ...baseWhere,
              OR: [
                { createdBy: userId }, // 自己创建的
                {
                  // 同部门创建的(需要关联用户表)
                  createdBy: {
                    in: await this.getDepartmentUserIds(user.department)
                  }
                }
              ]
            }
          }
          // 如果没有部门信息,降级为只能访问自己的数据
          return { ...baseWhere, createdBy: userId }

        case DataScope.OWN:
        default:
          // 只能访问自己创建的数据
          return { ...baseWhere, createdBy: userId }
      }
    } catch (error) {
      logger.error('Apply sample data filter error:', error)
      // 出错时采用最严格的权限
      return { ...baseWhere, createdBy: userId }
    }
  }

  /**
   * 为工作流查询添加数据权限过滤
   * @param userId 用户ID
   * @param baseWhere 基础查询条件
   * @returns 添加权限过滤后的查询条件
   */
  async applyWorkflowDataFilter(
    userId: string,
    baseWhere: Prisma.WorkflowWhereInput = {}
  ): Promise<Prisma.WorkflowWhereInput> {
    try {
      const dataScope = await this.getUserDataScope(userId, 'workflow')

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true }
      })

      if (!user) {
        return { ...baseWhere, id: 'non-existent' }
      }

      switch (dataScope) {
        case DataScope.ALL:
          return baseWhere

        case DataScope.DEPARTMENT:
          if (user.department) {
            return {
              ...baseWhere,
              OR: [
                { createdBy: userId },
                {
                  createdBy: {
                    in: await this.getDepartmentUserIds(user.department)
                  }
                }
              ]
            }
          }
          return { ...baseWhere, createdBy: userId }

        case DataScope.OWN:
        default:
          return { ...baseWhere, createdBy: userId }
      }
    } catch (error) {
      logger.error('Apply workflow data filter error:', error)
      return { ...baseWhere, createdBy: userId }
    }
  }

  /**
   * 为报告查询添加数据权限过滤
   * @param userId 用户ID
   * @param baseWhere 基础查询条件
   * @returns 添加权限过滤后的查询条件
   */
  async applyReportDataFilter(
    userId: string,
    baseWhere: Prisma.ReportWhereInput = {}
  ): Promise<Prisma.ReportWhereInput> {
    try {
      const dataScope = await this.getUserDataScope(userId, 'report')

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { department: true }
      })

      if (!user) {
        return { ...baseWhere, id: 'non-existent' }
      }

      switch (dataScope) {
        case DataScope.ALL:
          return baseWhere

        case DataScope.DEPARTMENT:
          if (user.department) {
            return {
              ...baseWhere,
              OR: [
                { generatedBy: userId },
                {
                  generatedBy: {
                    in: await this.getDepartmentUserIds(user.department)
                  }
                }
              ]
            }
          }
          return { ...baseWhere, generatedBy: userId }

        case DataScope.OWN:
        default:
          return { ...baseWhere, generatedBy: userId }
      }
    } catch (error) {
      logger.error('Apply report data filter error:', error)
      return { ...baseWhere, generatedBy: userId }
    }
  }

  /**
   * 检查用户是否可以访问指定样品
   * @param userId 用户ID
   * @param sampleId 样品ID
   * @returns 是否有权限访问
   */
  async canAccessSample(userId: string, sampleId: string): Promise<boolean> {
    try {
      const dataScope = await this.getUserDataScope(userId, 'sample')

      if (dataScope === DataScope.ALL) {
        return true
      }

      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
        select: { createdBy: true }
      })

      if (!sample) {
        return false
      }

      if (dataScope === DataScope.OWN) {
        return sample.createdBy === userId
      }

      if (dataScope === DataScope.DEPARTMENT) {
        // 如果是自己创建的，直接返回 true
        if (sample.createdBy === userId) {
          return true
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { department: true }
        })

        if (!user || !user.department) {
          return false
        }

        // 检查样品创建者是否在同一部门
        const creator = await prisma.user.findUnique({
          where: { id: sample.createdBy },
          select: { department: true }
        })

        if (!creator) {
          return false
        }

        return creator.department === user.department
      }

      return false
    } catch (error) {
      logger.error('Check sample access error:', error)
      return false
    }
  }

  /**
   * 检查用户是否可以访问指定报告
   * @param userId 用户ID
   * @param reportId 报告ID
   * @returns 是否有权限访问
   */
  async canAccessReport(userId: string, reportId: string): Promise<boolean> {
    try {
      const dataScope = await this.getUserDataScope(userId, 'report')

      if (dataScope === DataScope.ALL) {
        return true
      }

      const report = await prisma.report.findUnique({
        where: { id: reportId },
        select: { generatedBy: true }
      })

      if (!report) {
        return false
      }

      if (dataScope === DataScope.OWN) {
        return report.generatedBy === userId
      }

      if (dataScope === DataScope.DEPARTMENT) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { department: true }
        })

        if (!user || !user.department) {
          return report.generatedBy === userId
        }

        const departmentUserIds = await this.getDepartmentUserIds(user.department)
        return departmentUserIds.includes(report.generatedBy)
      }

      return false
    } catch (error) {
      logger.error('Check report access error:', error)
      return false
    }
  }

  /**
   * 获取部门内所有用户的ID列表
   * @param department 部门名称
   * @returns 用户ID列表
   */
  private async getDepartmentUserIds(department: string): Promise<string[]> {
    try {
      const users = await prisma.user.findMany({
        where: {
          department,
          status: 'ACTIVE'
        },
        select: { id: true }
      })

      return users.map(u => u.id)
    } catch (error) {
      logger.error('Get department user IDs error:', error)
      return []
    }
  }
}

export const dataPermissionService = new DataPermissionService()
