import { Request, Response } from 'express';
import { auditStatisticsService } from '../services/auditStatisticsService';
import { AuditStatisticsFilters } from '../types/statistics';
import logger from '../config/logger';

/**
 * 审核统计控制器
 */
export class AuditStatisticsController {
  /**
   * 获取工作量统计
   * GET /api/statistics/audit/workload
   */
  async getWorkload(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseFilters(req);
      
      // 验证输入
      const validation = this.validateFilters(filters);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.message,
            field: validation.field
          }
        });
        return;
      }

      const data = await auditStatisticsService.getWorkloadStatistics(filters);
      
      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('获取工作量统计失败', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '统计数据查询失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 获取通过率统计
   * GET /api/statistics/audit/pass-rate
   */
  async getPassRate(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseFilters(req);
      
      const validation = this.validateFilters(filters);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.message,
            field: validation.field
          }
        });
        return;
      }

      const data = await auditStatisticsService.getPassRateStatistics(filters);
      
      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('获取通过率统计失败', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '统计数据查询失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 获取时效性统计
   * GET /api/statistics/audit/duration
   */
  async getDuration(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseFilters(req);
      
      const validation = this.validateFilters(filters);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.message,
            field: validation.field
          }
        });
        return;
      }

      const data = await auditStatisticsService.getDurationStatistics(filters);
      
      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('获取时效性统计失败', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '统计数据查询失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 获取问题分类统计
   * GET /api/statistics/audit/issues
   */
  async getIssues(req: Request, res: Response): Promise<void> {
    try {
      const filters = this.parseFilters(req);
      
      const validation = this.validateFilters(filters);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.message,
            field: validation.field
          }
        });
        return;
      }

      const data = await auditStatisticsService.getIssueStatistics(filters);
      
      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      logger.error('获取问题分类统计失败', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'DATABASE_ERROR',
          message: '统计数据查询失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 解析筛选条件
   */
  private parseFilters(req: Request): AuditStatisticsFilters {
    const {
      startDate,
      endDate,
      auditorId,
      level,
      sampleType,
      status,
      granularity
    } = req.query;

    return {
      startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate as string) : new Date(),
      auditorId: auditorId as string | undefined,
      level: level ? parseInt(level as string) : undefined,
      sampleType: sampleType as string | undefined,
      status: status as 'approved' | 'rejected' | 'pending' | undefined,
      granularity: (granularity as any) || 'day'
    };
  }

  /**
   * 验证筛选条件
   */
  private validateFilters(filters: AuditStatisticsFilters): {
    valid: boolean;
    message?: string;
    field?: string;
  } {
    // 验证时间范围
    if (filters.startDate > filters.endDate) {
      return {
        valid: false,
        message: '时间范围无效：开始时间不能晚于结束时间',
        field: 'dateRange'
      };
    }

    // 验证审核级别
    if (filters.level && (filters.level < 1 || filters.level > 3)) {
      return {
        valid: false,
        message: '审核级别无效：必须在1-3之间',
        field: 'level'
      };
    }

    // 验证时间粒度
    const validGranularities = ['day', 'week', 'month', 'quarter', 'year'];
    if (filters.granularity && !validGranularities.includes(filters.granularity)) {
      return {
        valid: false,
        message: '时间粒度无效：必须是day、week、month、quarter或year',
        field: 'granularity'
      };
    }

    // 验证状态
    const validStatuses = ['approved', 'rejected', 'pending'];
    if (filters.status && !validStatuses.includes(filters.status)) {
      return {
        valid: false,
        message: '审核状态无效：必须是approved、rejected或pending',
        field: 'status'
      };
    }

    return { valid: true };
  }

  /**
   * 导出统计数据
   * POST /api/statistics/audit/export
   */
  async exportStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { type, filters } = req.body;
      
      if (!type) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '缺少导出类型参数',
            field: 'type'
          }
        });
        return;
      }

      const parsedFilters = this.parseFiltersFromBody(filters);
      const validation = this.validateFilters(parsedFilters);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: validation.message,
            field: validation.field
          }
        });
        return;
      }

      let filePath: string;
      let fileName: string;

      // 根据类型获取数据并导出
      switch (type) {
        case 'workload': {
          const data = await auditStatisticsService.getWorkloadStatistics(parsedFilters);
          const { ExportService } = await import('../services/exportService');
          filePath = await ExportService.exportWorkloadToExcel(data.byAuditor);
          fileName = '工作量统计.xlsx';
          break;
        }
        case 'passRate': {
          const data = await auditStatisticsService.getPassRateStatistics(parsedFilters);
          const { ExportService } = await import('../services/exportService');
          filePath = await ExportService.exportPassRateToExcel(data);
          fileName = '通过率统计.xlsx';
          break;
        }
        case 'duration': {
          const data = await auditStatisticsService.getDurationStatistics(parsedFilters);
          const { ExportService } = await import('../services/exportService');
          filePath = await ExportService.exportDurationToExcel(data);
          fileName = '时效性统计.xlsx';
          break;
        }
        case 'issues': {
          const data = await auditStatisticsService.getIssueStatistics(parsedFilters);
          const { ExportService } = await import('../services/exportService');
          filePath = await ExportService.exportIssuesToExcel(data);
          fileName = '问题分类统计.xlsx';
          break;
        }
        default:
          res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: '不支持的导出类型',
              field: 'type'
            }
          });
          return;
      }

      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

      // 发送文件
      res.sendFile(filePath, (err) => {
        if (err) {
          logger.error('导出文件发送失败', { error: err.message, filePath });
        }
      });

    } catch (error: any) {
      logger.error('导出统计数据失败', {
        error: error.message,
        stack: error.stack,
        userId: (req as any).user?.id
      });
      
      res.status(500).json({
        success: false,
        error: {
          code: 'EXPORT_ERROR',
          message: '导出失败，请稍后重试'
        }
      });
    }
  }

  /**
   * 从请求体解析筛选条件
   */
  private parseFiltersFromBody(filters: any): AuditStatisticsFilters {
    if (!filters) {
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        granularity: 'day'
      };
    }

    return {
      startDate: filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: filters.endDate ? new Date(filters.endDate) : new Date(),
      auditorId: filters.auditorId,
      level: filters.level ? parseInt(filters.level) : undefined,
      sampleType: filters.sampleType,
      status: filters.status,
      granularity: filters.granularity || 'day'
    };
  }
}

export const auditStatisticsController = new AuditStatisticsController();
