import { PrismaClient, InstrumentStatus } from '@prisma/client'
import { prisma } from '../config/database'
import logger from '../config/logger'

/**
 * 仪器状态统计
 */
export interface InstrumentStatusStatistics {
  status: InstrumentStatus
  count: number
  percentage: number
}

/**
 * 部门仪器统计
 */
export interface DepartmentStatistics {
  department: string
  count: number
  totalValue: number
}

/**
 * 使用年限分布
 */
export interface UsageYearsDistribution {
  range: string
  count: number
}

/**
 * 校准到期统计
 */
export interface CalibrationExpiryStatistics {
  expired: number
  expiringSoon: number // 30天内到期
  valid: number
}

/**
 * 维护频率统计
 */
export interface MaintenanceFrequencyStatistics {
  instrumentId: string
  instrumentCode: string
  instrumentName: string
  maintenanceCount: number
  lastMaintenanceDate: Date | null
  averageCost: number
}

/**
 * 仪器价值统计
 */
export interface InstrumentValueStatistics {
  totalValue: number
  totalCount: number
  averageValue: number
  byDepartment: DepartmentStatistics[]
}

/**
 * 综合统计数据
 */
export interface InstrumentOverallStatistics {
  statusStatistics: InstrumentStatusStatistics[]
  valueStatistics: InstrumentValueStatistics
  usageYearsDistribution: UsageYearsDistribution[]
  calibrationExpiry: CalibrationExpiryStatistics
  topMaintenanceInstruments: MaintenanceFrequencyStatistics[]
}

/**
 * 仪器统计服务
 * 提供各种仪器统计分析功能
 */
export class InstrumentStatisticsService {
  /**
   * 获取仪器状态统计
   */
  async getStatusStatistics(): Promise<InstrumentStatusStatistics[]> {
    try {
      logger.info('Getting instrument status statistics')

      // 获取总数
      const total = await prisma.instrument.count()

      // 按状态分组统计
      const statusGroups = await prisma.instrument.groupBy({
        by: ['status'],
        _count: {
          id: true
        }
      })

      const statistics: InstrumentStatusStatistics[] = statusGroups.map(group => ({
        status: group.status,
        count: group._count.id,
        percentage: total > 0 ? (group._count.id / total) * 100 : 0
      }))

      return statistics
    } catch (error) {
      logger.error('Failed to get status statistics', { error })
      throw error
    }
  }

  /**
   * 获取仪器价值统计
   */
  async getValueStatistics(): Promise<InstrumentValueStatistics> {
    try {
      logger.info('Getting instrument value statistics')

      // 获取总价值和总数
      const aggregation = await prisma.instrument.aggregate({
        _sum: {
          purchasePrice: true
        },
        _count: {
          id: true
        },
        _avg: {
          purchasePrice: true
        }
      })

      // 按部门统计
      const departmentGroups = await prisma.instrument.groupBy({
        by: ['currentDepartment'],
        _count: {
          id: true
        },
        _sum: {
          purchasePrice: true
        },
        where: {
          currentDepartment: {
            not: null
          }
        }
      })

      const byDepartment: DepartmentStatistics[] = departmentGroups.map(group => ({
        department: group.currentDepartment || '未分配',
        count: group._count.id,
        totalValue: group._sum.purchasePrice || 0
      }))

      return {
        totalValue: aggregation._sum.purchasePrice || 0,
        totalCount: aggregation._count.id,
        averageValue: aggregation._avg.purchasePrice || 0,
        byDepartment
      }
    } catch (error) {
      logger.error('Failed to get value statistics', { error })
      throw error
    }
  }

  /**
   * 获取使用年限分布
   */
  async getUsageYearsDistribution(): Promise<UsageYearsDistribution[]> {
    try {
      logger.info('Getting usage years distribution')

      // 获取所有仪器的购置日期
      const instruments = await prisma.instrument.findMany({
        where: {
          purchaseDate: {
            not: null
          }
        },
        select: {
          purchaseDate: true
        }
      })

      // 计算使用年限并分组
      const now = new Date()
      const distribution: { [key: string]: number } = {
        '0-1年': 0,
        '1-3年': 0,
        '3-5年': 0,
        '5-10年': 0,
        '10年以上': 0
      }

      instruments.forEach(instrument => {
        if (instrument.purchaseDate) {
          const years = (now.getTime() - instrument.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
          
          if (years < 1) {
            distribution['0-1年']++
          } else if (years < 3) {
            distribution['1-3年']++
          } else if (years < 5) {
            distribution['3-5年']++
          } else if (years < 10) {
            distribution['5-10年']++
          } else {
            distribution['10年以上']++
          }
        }
      })

      return Object.entries(distribution).map(([range, count]) => ({
        range,
        count
      }))
    } catch (error) {
      logger.error('Failed to get usage years distribution', { error })
      throw error
    }
  }

  /**
   * 获取校准到期统计
   */
  async getCalibrationExpiryStatistics(): Promise<CalibrationExpiryStatistics> {
    try {
      logger.info('Getting calibration expiry statistics')

      const now = new Date()
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      // 获取所有仪器的最新校准记录
      const instruments = await prisma.instrument.findMany({
        include: {
          calibrationRecords: {
            orderBy: {
              calibrationDate: 'desc'
            },
            take: 1
          }
        }
      })

      let expired = 0
      let expiringSoon = 0
      let valid = 0

      instruments.forEach(instrument => {
        const latestCalibration = instrument.calibrationRecords[0]
        
        if (!latestCalibration || !latestCalibration.nextCalibrationDate) {
          // 没有校准记录或没有设置下次校准日期,视为需要校准
          expired++
        } else {
          const nextDate = latestCalibration.nextCalibrationDate
          
          if (nextDate < now) {
            expired++
          } else if (nextDate < thirtyDaysLater) {
            expiringSoon++
          } else {
            valid++
          }
        }
      })

      return {
        expired,
        expiringSoon,
        valid
      }
    } catch (error) {
      logger.error('Failed to get calibration expiry statistics', { error })
      throw error
    }
  }

  /**
   * 获取维护频率统计(维护次数最多的前10台仪器)
   */
  async getMaintenanceFrequencyStatistics(limit: number = 10): Promise<MaintenanceFrequencyStatistics[]> {
    try {
      logger.info('Getting maintenance frequency statistics', { limit })

      // 获取维护记录分组统计
      const maintenanceGroups = await prisma.maintenanceRecord.groupBy({
        by: ['instrumentId'],
        _count: {
          id: true
        },
        _avg: {
          maintenanceCost: true
        },
        _max: {
          maintenanceDate: true
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        },
        take: limit
      })

      // 获取仪器详细信息
      const instrumentIds = maintenanceGroups.map(g => g.instrumentId)
      const instruments = await prisma.instrument.findMany({
        where: {
          id: {
            in: instrumentIds
          }
        },
        select: {
          id: true,
          code: true,
          name: true
        }
      })

      const instrumentMap = new Map(instruments.map(i => [i.id, i]))

      const statistics: MaintenanceFrequencyStatistics[] = maintenanceGroups.map(group => {
        const instrument = instrumentMap.get(group.instrumentId)
        return {
          instrumentId: group.instrumentId,
          instrumentCode: instrument?.code || '',
          instrumentName: instrument?.name || '',
          maintenanceCount: group._count.id,
          lastMaintenanceDate: group._max.maintenanceDate,
          averageCost: group._avg.maintenanceCost || 0
        }
      })

      return statistics
    } catch (error) {
      logger.error('Failed to get maintenance frequency statistics', { error })
      throw error
    }
  }

  /**
   * 获取综合统计数据
   */
  async getOverallStatistics(): Promise<InstrumentOverallStatistics> {
    try {
      logger.info('Getting overall instrument statistics')

      const [
        statusStatistics,
        valueStatistics,
        usageYearsDistribution,
        calibrationExpiry,
        topMaintenanceInstruments
      ] = await Promise.all([
        this.getStatusStatistics(),
        this.getValueStatistics(),
        this.getUsageYearsDistribution(),
        this.getCalibrationExpiryStatistics(),
        this.getMaintenanceFrequencyStatistics(10)
      ])

      return {
        statusStatistics,
        valueStatistics,
        usageYearsDistribution,
        calibrationExpiry,
        topMaintenanceInstruments
      }
    } catch (error) {
      logger.error('Failed to get overall statistics', { error })
      throw error
    }
  }

  /**
   * 获取部门仪器统计
   */
  async getDepartmentStatistics(): Promise<DepartmentStatistics[]> {
    try {
      logger.info('Getting department statistics')

      const departmentGroups = await prisma.instrument.groupBy({
        by: ['currentDepartment'],
        _count: {
          id: true
        },
        _sum: {
          purchasePrice: true
        },
        where: {
          currentDepartment: {
            not: null
          }
        },
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      })

      return departmentGroups.map(group => ({
        department: group.currentDepartment || '未分配',
        count: group._count.id,
        totalValue: group._sum.purchasePrice || 0
      }))
    } catch (error) {
      logger.error('Failed to get department statistics', { error })
      throw error
    }
  }

  /**
   * 获取即将到期的校准列表
   */
  async getExpiringCalibrations(days: number = 30): Promise<any[]> {
    try {
      logger.info('Getting expiring calibrations', { days })

      const now = new Date()
      const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

      // 获取所有仪器及其最新校准记录
      const instruments = await prisma.instrument.findMany({
        include: {
          calibrationRecords: {
            orderBy: {
              calibrationDate: 'desc'
            },
            take: 1
          }
        }
      })

      // 筛选即将到期的
      const expiring = instruments
        .filter(instrument => {
          const latestCalibration = instrument.calibrationRecords[0]
          if (!latestCalibration || !latestCalibration.nextCalibrationDate) {
            return false
          }
          const nextDate = latestCalibration.nextCalibrationDate
          return nextDate >= now && nextDate <= futureDate
        })
        .map(instrument => ({
          instrumentId: instrument.id,
          instrumentCode: instrument.code,
          instrumentName: instrument.name,
          currentDepartment: instrument.currentDepartment,
          lastCalibrationDate: instrument.calibrationRecords[0].calibrationDate,
          nextCalibrationDate: instrument.calibrationRecords[0].nextCalibrationDate,
          daysUntilExpiry: Math.ceil(
            (instrument.calibrationRecords[0].nextCalibrationDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        }))
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

      return expiring
    } catch (error) {
      logger.error('Failed to get expiring calibrations', { error })
      throw error
    }
  }
}

export const instrumentStatisticsService = new InstrumentStatisticsService()
