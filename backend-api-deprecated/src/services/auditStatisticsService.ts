import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import {
  AuditStatisticsFilters,
  WorkloadData,
  PassRateData,
  DurationData,
  IssueData,
  WorkloadByAuditor,
  WorkloadByTimePeriod,
  PassRateByLevel,
  PassRateBySampleType,
  PassRateTrend,
  DurationByAuditor,
  DurationDistribution,
  IssueByReason,
  IssueBySampleType
} from '../types/statistics';
import redisClient from '../config/redis';
import logger from '../config/logger';

const prisma = new PrismaClient();

/**
 * 审核统计服务
 */
export class AuditStatisticsService {
  private readonly CACHE_TTL = 300; // 5分钟缓存
  private readonly CACHE_PREFIX = 'audit:stats';

  /**
   * 获取工作量统计
   */
  async getWorkloadStatistics(filters: AuditStatisticsFilters): Promise<WorkloadData> {
    const cacheKey = this.getCacheKey('workload', filters);
    
    // 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // 查询数据库
    const { startDate, endDate, auditorId, level, sampleType, status } = filters;
    
    // 构建查询条件
    const where: any = {
      submittedAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (auditorId) where.auditorId = auditorId;
    if (level) where.level = level;
    if (status) {
      if (status === 'approved') where.decision = 'APPROVE';
      else if (status === 'rejected') where.decision = 'REJECT';
      else if (status === 'pending') where.decision = null;
    }
    if (sampleType) {
      where.sample = {
        sampleType: sampleType
      };
    }

    // 按审核人员统计
    const tasksByAuditor = await prisma.auditTask.groupBy({
      by: ['auditorId'],
      where,
      _count: {
        id: true
      }
    });

    const byAuditor: WorkloadByAuditor[] = await Promise.all(
      tasksByAuditor.map(async (item) => {
        const auditor = await prisma.user.findUnique({
          where: { id: item.auditorId },
          select: { fullName: true }
        });

        const completedCount = await prisma.auditTask.count({
          where: {
            ...where,
            auditorId: item.auditorId,
            completedAt: { not: null }
          }
        });

        const pendingCount = await prisma.auditTask.count({
          where: {
            ...where,
            auditorId: item.auditorId,
            completedAt: null
          }
        });

        return {
          auditorId: item.auditorId,
          auditorName: auditor?.fullName || '未知',
          totalTasks: item._count.id,
          completedTasks: completedCount,
          pendingTasks: pendingCount
        };
      })
    );

    // 按时间段统计
    const byTimePeriod = await this.getWorkloadByTimePeriod(where, filters.granularity || 'day');

    const result: WorkloadData = {
      byAuditor,
      byTimePeriod
    };

    // 存入缓存
    await this.setToCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * 获取通过率统计
   */
  async getPassRateStatistics(filters: AuditStatisticsFilters): Promise<PassRateData> {
    const cacheKey = this.getCacheKey('passRate', filters);
    
    // 尝试从缓存获取
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const { startDate, endDate, level, sampleType } = filters;
    
    const where: any = {
      submittedAt: {
        gte: startDate,
        lte: endDate
      },
      completedAt: { not: null }
    };

    if (level) where.level = level;
    if (sampleType) {
      where.sample = {
        sampleType: sampleType
      };
    }

    // 整体通过率
    const totalTasks = await prisma.auditTask.count({ where });
    const approvedTasks = await prisma.auditTask.count({
      where: { ...where, decision: 'APPROVE' }
    });
    const rejectedTasks = await prisma.auditTask.count({
      where: { ...where, decision: 'REJECT' }
    });

    const overall = {
      totalTasks,
      approvedTasks,
      rejectedTasks,
      passRate: totalTasks > 0 ? (approvedTasks / totalTasks) * 100 : 0
    };

    // 按审核级别统计
    const byLevel: PassRateByLevel[] = [];
    for (let lvl = 1; lvl <= 3; lvl++) {
      const levelWhere = { ...where, level: lvl };
      const levelTotal = await prisma.auditTask.count({ where: levelWhere });
      const levelApproved = await prisma.auditTask.count({
        where: { ...levelWhere, decision: 'APPROVE' }
      });

      if (levelTotal > 0) {
        byLevel.push({
          level: lvl,
          levelName: `${lvl}级审核`,
          totalTasks: levelTotal,
          approvedTasks: levelApproved,
          passRate: (levelApproved / levelTotal) * 100
        });
      }
    }

    // 按样品类型统计
    const sampleTypes = await prisma.auditTask.findMany({
      where,
      select: {
        sample: {
          select: { sampleType: true }
        }
      },
      distinct: ['sampleId']
    });

    const uniqueSampleTypes = [...new Set(sampleTypes.map(t => t.sample.sampleType))];
    const bySampleType: PassRateBySampleType[] = await Promise.all(
      uniqueSampleTypes.map(async (type) => {
        const typeWhere = {
          ...where,
          sample: { sampleType: type }
        };
        const typeTotal = await prisma.auditTask.count({ where: typeWhere });
        const typeApproved = await prisma.auditTask.count({
          where: { ...typeWhere, decision: 'APPROVE' }
        });

        return {
          sampleType: type,
          totalTasks: typeTotal,
          approvedTasks: typeApproved,
          passRate: typeTotal > 0 ? (typeApproved / typeTotal) * 100 : 0
        };
      })
    );

    // 通过率趋势（按月）
    const trend = await this.getPassRateTrend(where);

    const result: PassRateData = {
      overall,
      byLevel,
      bySampleType,
      trend
    };

    await this.setToCache(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * 获取时效性统计
   */
  async getDurationStatistics(filters: AuditStatisticsFilters): Promise<DurationData> {
    const cacheKey = this.getCacheKey('duration', filters);
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const { startDate, endDate, auditorId, level } = filters;
    
    const where: any = {
      submittedAt: {
        gte: startDate,
        lte: endDate
      },
      completedAt: { not: null }
    };

    if (auditorId) where.auditorId = auditorId;
    if (level) where.level = level;

    // 获取所有已完成的任务
    const tasks = await prisma.auditTask.findMany({
      where,
      select: {
        id: true,
        auditorId: true,
        submittedAt: true,
        completedAt: true
      }
    });

    // 计算时长（小时）
    const durations = tasks.map(task => {
      const duration = (task.completedAt!.getTime() - task.submittedAt.getTime()) / (1000 * 60 * 60);
      return { ...task, duration };
    });

    // 整体统计
    const sortedDurations = durations.map(d => d.duration).sort((a, b) => a - b);
    const averageDuration = sortedDurations.length > 0
      ? sortedDurations.reduce((sum, d) => sum + d, 0) / sortedDurations.length
      : 0;
    const medianDuration = sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : 0;
    const maxDuration = sortedDurations.length > 0 ? Math.max(...sortedDurations) : 0;
    const minDuration = sortedDurations.length > 0 ? Math.min(...sortedDurations) : 0;
    
    const overtimeThreshold = 8; // 8小时为超时阈值
    const overtimeTasks = durations.filter(d => d.duration > overtimeThreshold).length;
    const overtimeRate = tasks.length > 0 ? (overtimeTasks / tasks.length) * 100 : 0;

    const overall = {
      averageDuration,
      medianDuration,
      maxDuration,
      minDuration,
      overtimeTasks,
      overtimeRate
    };

    // 按审核人员统计
    const auditorIds = [...new Set(durations.map(d => d.auditorId))];
    const byAuditor: DurationByAuditor[] = await Promise.all(
      auditorIds.map(async (id) => {
        const auditor = await prisma.user.findUnique({
          where: { id },
          select: { fullName: true }
        });
        const auditorTasks = durations.filter(d => d.auditorId === id);
        const avgDuration = auditorTasks.reduce((sum, d) => sum + d.duration, 0) / auditorTasks.length;

        return {
          auditorId: id,
          auditorName: auditor?.fullName || '未知',
          averageDuration: avgDuration,
          taskCount: auditorTasks.length
        };
      })
    );

    // 时长分布
    const distribution: DurationDistribution[] = [
      { range: '0-2小时', count: durations.filter(d => d.duration <= 2).length },
      { range: '2-4小时', count: durations.filter(d => d.duration > 2 && d.duration <= 4).length },
      { range: '4-8小时', count: durations.filter(d => d.duration > 4 && d.duration <= 8).length },
      { range: '8-24小时', count: durations.filter(d => d.duration > 8 && d.duration <= 24).length },
      { range: '24小时以上', count: durations.filter(d => d.duration > 24).length }
    ];

    const result: DurationData = {
      overall,
      byAuditor,
      distribution
    };

    await this.setToCache(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * 获取问题分类统计
   */
  async getIssueStatistics(filters: AuditStatisticsFilters): Promise<IssueData> {
    const cacheKey = this.getCacheKey('issues', filters);
    
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const { startDate, endDate, sampleType } = filters;
    
    const where: any = {
      submittedAt: {
        gte: startDate,
        lte: endDate
      },
      decision: 'REJECT'
    };

    if (sampleType) {
      where.sample = {
        sampleType: sampleType
      };
    }

    // 获取所有退回任务
    const rejectedTasks = await prisma.auditTask.findMany({
      where,
      select: {
        comments: true,
        sample: {
          select: { sampleType: true }
        }
      }
    });

    // 统计退回原因
    const reasonCounts = new Map<string, number>();
    const predefinedReasons = [
      '数据录入错误',
      '检测方法不当',
      '样品处理不规范',
      '结果计算错误',
      '报告格式问题'
    ];

    rejectedTasks.forEach(task => {
      const comment = task.comments || '';
      let matched = false;
      
      for (const reason of predefinedReasons) {
        if (comment.includes(reason)) {
          reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
          matched = true;
          break;
        }
      }
      
      if (!matched && comment) {
        reasonCounts.set('其他', (reasonCounts.get('其他') || 0) + 1);
      }
    });

    // 转换为数组并排序
    const totalReasons = Array.from(reasonCounts.values()).reduce((sum, count) => sum + count, 0);
    const byReason: IssueByReason[] = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: totalReasons > 0 ? (count / totalReasons) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // 按样品类型统计
    const sampleTypeMap = new Map<string, { issueCount: number; totalTasks: number }>();
    
    for (const task of rejectedTasks) {
      const type = task.sample.sampleType;
      const current = sampleTypeMap.get(type) || { issueCount: 0, totalTasks: 0 };
      current.issueCount++;
      sampleTypeMap.set(type, current);
    }

    // 获取每种样品类型的总任务数
    const allTasks = await prisma.auditTask.findMany({
      where: {
        submittedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        sample: {
          select: { sampleType: true }
        }
      }
    });

    allTasks.forEach(task => {
      const type = task.sample.sampleType;
      const current = sampleTypeMap.get(type) || { issueCount: 0, totalTasks: 0 };
      current.totalTasks++;
      sampleTypeMap.set(type, current);
    });

    const bySampleType: IssueBySampleType[] = Array.from(sampleTypeMap.entries())
      .map(([sampleType, data]) => ({
        sampleType,
        issueCount: data.issueCount,
        totalTasks: data.totalTasks,
        issueRate: data.totalTasks > 0 ? (data.issueCount / data.totalTasks) * 100 : 0
      }));

    const result: IssueData = {
      byReason,
      bySampleType
    };

    await this.setToCache(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  /**
   * 清除统计缓存
   */
  async clearStatisticsCache(): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        logger.warn('Redis未连接，跳过缓存清除');
        return;
      }

      const pattern = `${this.CACHE_PREFIX}:*`;
      const keys = await redisClient.keys(pattern);
      
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`清除了 ${keys.length} 个统计缓存`);
      }
    } catch (error) {
      logger.error('清除统计缓存失败', error);
    }
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(type: string, filters: AuditStatisticsFilters): string {
    const filterString = JSON.stringify({
      ...filters,
      startDate: filters.startDate.toISOString(),
      endDate: filters.endDate.toISOString()
    });
    const hash = createHash('md5').update(filterString).digest('hex').substring(0, 8);
    return `${this.CACHE_PREFIX}:${type}:${hash}`;
  }

  /**
   * 从缓存获取数据
   */
  private async getFromCache(key: string): Promise<any | null> {
    try {
      if (!redisClient.isOpen) {
        return null;
      }

      const cached = await redisClient.get(key);
      if (cached) {
        return JSON.parse(cached);
      }
      return null;
    } catch (error) {
      logger.warn('从缓存读取失败，降级到数据库查询', error);
      return null;
    }
  }

  /**
   * 将数据存入缓存
   */
  private async setToCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      if (!redisClient.isOpen) {
        return;
      }

      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      logger.warn('存入缓存失败', error);
    }
  }

  /**
   * 按时间段统计工作量
   */
  private async getWorkloadByTimePeriod(
    where: any,
    granularity: string
  ): Promise<WorkloadByTimePeriod[]> {
    const tasks = await prisma.auditTask.findMany({
      where,
      select: {
        submittedAt: true,
        completedAt: true
      }
    });

    const periodMap = new Map<string, { total: number; completed: number; pending: number }>();

    tasks.forEach(task => {
      const period = this.formatPeriod(task.submittedAt, granularity);
      const current = periodMap.get(period) || { total: 0, completed: 0, pending: 0 };
      current.total++;
      if (task.completedAt) {
        current.completed++;
      } else {
        current.pending++;
      }
      periodMap.set(period, current);
    });

    return Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        totalTasks: data.total,
        completedTasks: data.completed,
        pendingTasks: data.pending
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 获取通过率趋势
   */
  private async getPassRateTrend(where: any): Promise<PassRateTrend[]> {
    const tasks = await prisma.auditTask.findMany({
      where,
      select: {
        submittedAt: true,
        decision: true
      }
    });

    const periodMap = new Map<string, { total: number; approved: number }>();

    tasks.forEach(task => {
      const period = this.formatPeriod(task.submittedAt, 'month');
      const current = periodMap.get(period) || { total: 0, approved: 0 };
      current.total++;
      if (task.decision === 'APPROVE') {
        current.approved++;
      }
      periodMap.set(period, current);
    });

    return Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        passRate: data.total > 0 ? (data.approved / data.total) * 100 : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 格式化时间段
   */
  private formatPeriod(date: Date, granularity: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (granularity) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week':
        const weekNum = this.getWeekNumber(date);
        return `${year}-W${String(weekNum).padStart(2, '0')}`;
      case 'month':
        return `${year}-${month}`;
      case 'quarter':
        const quarter = Math.floor((date.getMonth() + 3) / 3);
        return `${year}-Q${quarter}`;
      case 'year':
        return `${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  /**
   * 获取周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }
}

export const auditStatisticsService = new AuditStatisticsService();
