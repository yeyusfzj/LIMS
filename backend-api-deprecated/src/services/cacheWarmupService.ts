import cacheService from './cacheService'
import prisma from '../config/database'
import logger from '../config/logger'

/**
 * 缓存预热服务
 * 在系统启动时预加载常用数据到缓存
 */
class CacheWarmupService {
  /**
   * 执行缓存预热
   */
  async warmup(): Promise<void> {
    logger.info('Starting cache warmup...')

    try {
      await Promise.all([
        this.warmupActiveWorkflows(),
        this.warmupActiveRoles(),
        this.warmupSystemConfig(),
        this.warmupTestMethods()
      ])

      logger.info('Cache warmup completed successfully')
    } catch (error) {
      logger.error('Cache warmup failed', { error })
      // 预热失败不应该阻止系统启动
    }
  }

  /**
   * 预热活跃的工作流配置
   */
  private async warmupActiveWorkflows(): Promise<void> {
    try {
      const workflows = await prisma.workflow.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          config: true,
          version: true
        }
      })

      const items = workflows.map(workflow => ({
        key: `workflow:${workflow.id}`,
        value: workflow
      }))

      await cacheService.mset(items, 3600) // 1 小时
      logger.info(`Warmed up ${workflows.length} active workflows`)
    } catch (error) {
      logger.error('Failed to warmup workflows', { error })
    }
  }

  /**
   * 预热角色和权限数据
   */
  private async warmupActiveRoles(): Promise<void> {
    try {
      const roles = await prisma.role.findMany({
        include: {
          permissions: true
        }
      })

      const items = roles.map(role => ({
        key: `role:${role.id}`,
        value: role
      }))

      await cacheService.mset(items, 600) // 10 分钟
      logger.info(`Warmed up ${roles.length} roles`)
    } catch (error) {
      logger.error('Failed to warmup roles', { error })
    }
  }

  /**
   * 预热系统配置
   */
  private async warmupSystemConfig(): Promise<void> {
    try {
      // 预热常用的系统配置
      const configs = [
        { key: 'system:max_upload_size', value: 10 * 1024 * 1024 }, // 10MB
        { key: 'system:session_timeout', value: 900 }, // 15 分钟
        { key: 'system:max_login_attempts', value: 5 }
      ]

      await cacheService.mset(configs, 7200) // 2 小时
      logger.info(`Warmed up ${configs.length} system configs`)
    } catch (error) {
      logger.error('Failed to warmup system config', { error })
    }
  }

  /**
   * 预热检测方法数据
   */
  private async warmupTestMethods(): Promise<void> {
    try {
      // 预热常用的检测方法（如果有相关表）
      // 这里是示例，实际需要根据数据模型调整
      logger.info('Test methods warmup skipped (no data model)')
    } catch (error) {
      logger.error('Failed to warmup test methods', { error })
    }
  }

  /**
   * 清除所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      await cacheService.delPattern('*')
      logger.info('All cache cleared')
    } catch (error) {
      logger.error('Failed to clear cache', { error })
    }
  }

  /**
   * 清除特定模块的缓存
   */
  async clearModule(module: string): Promise<void> {
    try {
      await cacheService.delPattern(`${module}:*`)
      logger.info(`Cache cleared for module: ${module}`)
    } catch (error) {
      logger.error(`Failed to clear cache for module: ${module}`, { error })
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
  }> {
    try {
      // 这里返回模拟数据，实际需要从 Redis INFO 命令获取
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        hitRate: 0
      }
    } catch (error) {
      logger.error('Failed to get cache stats', { error })
      return {
        totalKeys: 0,
        memoryUsage: '0 MB',
        hitRate: 0
      }
    }
  }
}

export default new CacheWarmupService()
