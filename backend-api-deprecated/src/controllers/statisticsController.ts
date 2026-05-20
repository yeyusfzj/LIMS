/**
 * 统计数据控制器
 */

import { Request, Response } from 'express'
import { StatisticsService } from '../services/statisticsService'
import { ExportService } from '../services/exportService'
import { logger } from '../config/logger'
import { 
  StatisticsQuery, 
  StatisticsDimension, 
  TimeGranularity, 
  ExportQuery, 
  ExportFormat,
  StatisticsResult 
} from '../types/statistics'

/**
 * 获取统计数据
 */
export async function getStatistics(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权访问'
        }
      })
      return
    }

    // 解析查询参数
    const query: StatisticsQuery = {
      dimensions: parseDimensions(req.query.dimensions as string),
      timeGranularity: req.query.timeGranularity as TimeGranularity,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      filters: parseFilters(req.query),
      useCache: req.query.useCache !== 'false',
      async: req.query.async === 'true'
    }

    // 验证必需参数
    if (!query.dimensions || query.dimensions.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '必须指定至少一个统计维度'
        }
      })
      return
    }

    // 如果包含时间维度，验证时间粒度
    if (query.dimensions.includes(StatisticsDimension.TIME) && !query.timeGranularity) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '时间维度需要指定时间粒度'
        }
      })
      return
    }

    const result = await StatisticsService.getStatistics(query, userId)

    res.json(result)
  } catch (error) {
    logger.error('Failed to get statistics', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取统计数据失败'
      }
    })
  }
}

/**
 * 获取异步任务状态
 */
export async function getAsyncTaskStatus(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params

    const task = await StatisticsService.getAsyncTaskStatus(taskId)

    if (!task) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '任务不存在'
        }
      })
      return
    }

    // 验证任务所有者
    if (task.userId !== req.user?.userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '无权访问此任务'
        }
      })
      return
    }

    res.json(task)
  } catch (error) {
    logger.error('Failed to get async task status', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取任务状态失败'
      }
    })
  }
}

/**
 * 清除统计缓存
 */
export async function clearCache(req: Request, res: Response): Promise<void> {
  try {
    const pattern = req.query.pattern as string | undefined

    await StatisticsService.clearCache(pattern)

    res.json({
      message: '缓存已清除'
    })
  } catch (error) {
    logger.error('Failed to clear cache', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '清除缓存失败'
      }
    })
  }
}

/**
 * 解析维度参数
 */
function parseDimensions(dimensionsParam: string | undefined): StatisticsDimension[] {
  if (!dimensionsParam) return []

  const dimensions = dimensionsParam.split(',').map(d => d.trim())
  const validDimensions = Object.values(StatisticsDimension)

  return dimensions.filter(d => validDimensions.includes(d as StatisticsDimension)) as StatisticsDimension[]
}

/**
 * 解析过滤条件
 */
function parseFilters(query: any): any {
  const filters: any = {}

  if (query.sampleType) {
    filters.sampleType = Array.isArray(query.sampleType) 
      ? query.sampleType 
      : query.sampleType.split(',')
  }

  if (query.status) {
    filters.status = Array.isArray(query.status)
      ? query.status
      : query.status.split(',')
  }

  if (query.clientName) {
    filters.clientName = Array.isArray(query.clientName)
      ? query.clientName
      : query.clientName.split(',')
  }

  if (query.department) {
    filters.department = Array.isArray(query.department)
      ? query.department
      : query.department.split(',')
  }

  return Object.keys(filters).length > 0 ? filters : undefined
}

/**
 * 导出统计数据
 */
export async function exportData(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权访问'
        }
      })
      return
    }

    // 解析查询参数
    const query: ExportQuery = {
      dimensions: parseDimensions(req.query.dimensions as string),
      timeGranularity: req.query.timeGranularity as TimeGranularity,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      filters: parseFilters(req.query),
      format: (req.query.format as ExportFormat) || ExportFormat.CSV,
      filename: req.query.filename as string | undefined,
      useCache: req.query.useCache !== 'false'
    }

    // 验证必需参数
    if (!query.dimensions || query.dimensions.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '必须指定至少一个统计维度'
        }
      })
      return
    }

    // 验证导出格式
    const validFormats = Object.values(ExportFormat)
    if (!validFormats.includes(query.format)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `不支持的导出格式，支持的格式: ${validFormats.join(', ')}`
        }
      })
      return
    }

    // 如果包含时间维度，验证时间粒度
    if (query.dimensions.includes(StatisticsDimension.TIME) && !query.timeGranularity) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '时间维度需要指定时间粒度'
        }
      })
      return
    }

    const result = await ExportService.exportData(query, userId)

    res.json(result)
  } catch (error) {
    logger.error('Failed to export data', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '导出数据失败'
      }
    })
  }
}

/**
 * 获取导出任务状态
 */
export async function getExportTaskStatus(req: Request, res: Response): Promise<void> {
  try {
    const { taskId } = req.params

    const task = await ExportService.getExportTaskStatus(taskId)

    if (!task) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '任务不存在'
        }
      })
      return
    }

    // 验证任务所有者
    if (task.userId !== req.user?.userId) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: '无权访问此任务'
        }
      })
      return
    }

    res.json(task)
  } catch (error) {
    logger.error('Failed to get export task status', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取任务状态失败'
      }
    })
  }
}

/**
 * 下载导出文件
 */
export async function downloadExportFile(req: Request, res: Response): Promise<void> {
  try {
    const { filename } = req.params

    const filePath = await ExportService.getExportFile(filename)

    if (!filePath) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '文件不存在或已过期'
        }
      })
      return
    }

    // 设置响应头
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    
    // 根据文件扩展名设置 Content-Type
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'csv':
        res.setHeader('Content-Type', 'text/csv')
        break
      case 'xlsx':
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        break
      case 'json':
        res.setHeader('Content-Type', 'application/json')
        break
      default:
        res.setHeader('Content-Type', 'application/octet-stream')
    }

    // 发送文件
    res.sendFile(filePath)

  } catch (error) {
    logger.error('Failed to download export file', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '下载文件失败'
      }
    })
  }
}

/**
 * 生成自定义报表
 */
export async function generateCustomReport(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId

    if (!userId) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权访问'
        }
      })
      return
    }

    const { name, description, config, format, saveTemplate } = req.body

    // 验证必需参数
    if (!name) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '报表名称不能为空'
        }
      })
      return
    }

    if (!config || !config.dimensions || config.dimensions.length === 0) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '必须指定至少一个统计维度'
        }
      })
      return
    }

    // 验证输出格式
    const validFormats = ['json', 'csv', 'excel']
    const outputFormat = format || 'json'
    if (!validFormats.includes(outputFormat)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `不支持的输出格式，支持的格式: ${validFormats.join(', ')}`
        }
      })
      return
    }

    // 如果包含时间维度，验证时间粒度
    if (config.dimensions.includes(StatisticsDimension.TIME) && !config.timeGranularity) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '时间维度需要指定时间粒度'
        }
      })
      return
    }

    // 构建统计查询
    const query: StatisticsQuery = {
      dimensions: config.dimensions,
      timeGranularity: config.timeGranularity,
      startDate: config.startDate ? new Date(config.startDate) : undefined,
      endDate: config.endDate ? new Date(config.endDate) : undefined,
      filters: config.filters,
      useCache: true,
      async: false
    }

    // 获取统计数据
    const statisticsResult = await StatisticsService.getStatistics(query, userId)

    // 检查是否为异步任务
    if ('id' in statisticsResult && 'status' in statisticsResult) {
      // 异步任务，返回任务信息
      res.json({
        name,
        description,
        config,
        asyncTask: statisticsResult
      })
      return
    }

    // 同步结果，应用额外的配置（分组、排序、限制）
    let data: any[] = (statisticsResult as StatisticsResult).data

    // 分组处理
    if (config.groupBy) {
      data = groupData(data, config.groupBy)
    }

    // 排序处理
    if (config.orderBy) {
      data = sortData(data, config.orderBy)
    }

    // 限制数量
    if (config.limit && Array.isArray(data)) {
      data = data.slice(0, config.limit)
    }

    // 构建报表结果
    const report = {
      name,
      description,
      generatedAt: new Date().toISOString(),
      generatedBy: userId,
      config,
      data,
      metadata: {
        totalRecords: Array.isArray(data) ? data.length : 1,
        dimensions: config.dimensions,
        filters: config.filters
      }
    }

    // 如果需要保存为模板
    if (saveTemplate) {
      // 这里可以扩展保存模板的逻辑
      logger.info('Custom report template saved', { name, userId })
    }

    // 根据格式返回数据
    if (outputFormat === 'json') {
      res.json(report)
    } else {
      // 对于 CSV 和 Excel 格式，使用导出服务
      const exportQuery: ExportQuery = {
        ...query,
        format: outputFormat === 'csv' ? ExportFormat.CSV : ExportFormat.EXCEL,
        filename: `${name.replace(/\s+/g, '_')}_${Date.now()}`
      }

      const exportResult = await ExportService.exportData(exportQuery, userId)
      res.json({
        ...report,
        exportTask: exportResult
      })
    }

  } catch (error) {
    logger.error('Failed to generate custom report', { error })
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '生成自定义报表失败'
      }
    })
  }
}

/**
 * 分组数据
 */
function groupData(data: any[], groupBy: string | string[]): any[] {
  const groupFields = Array.isArray(groupBy) ? groupBy : [groupBy]
  
  const grouped = data.reduce((acc, item) => {
    const key = groupFields.map(field => item[field]).join('|')
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(item)
    return acc
  }, {} as Record<string, any[]>)

  return (Object.entries(grouped) as Array<[string, any[]]>).map(([key, items]) => {
    const groupKeys = key.split('|')
    const groupObj: any = {}
    groupFields.forEach((field, index) => {
      groupObj[field] = groupKeys[index]
    })
    return {
      ...groupObj,
      items,
      count: items.length
    }
  })
}

/**
 * 排序数据
 */
function sortData(data: any[], orderBy: string | Array<{ field: string; order: 'asc' | 'desc' }>): any[] {
  if (typeof orderBy === 'string') {
    // 简单排序：字段名或 "-字段名"（降序）
    const desc = orderBy.startsWith('-')
    const field = desc ? orderBy.substring(1) : orderBy
    return [...data].sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      return desc ? -comparison : comparison
    })
  } else {
    // 多字段排序
    return [...data].sort((a, b) => {
      for (const { field, order } of orderBy) {
        const aVal = a[field]
        const bVal = b[field]
        const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
        if (comparison !== 0) {
          return order === 'desc' ? -comparison : comparison
        }
      }
      return 0
    })
  }
}

