/**
 * 数据导出服务
 * 支持 CSV 和 Excel 格式导出
 */

import { PrismaClient } from '@prisma/client'
import { logger } from '../config/logger'
import { ExportQuery, ExportResult, ExportFormat, StatisticsDataPoint } from '../types/statistics'
import { StatisticsService } from './statisticsService'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'
import crypto from 'crypto'

const prisma = new PrismaClient()

/**
 * 导出任务状态
 */
interface ExportTask {
  id: string
  query: ExportQuery
  status: 'pending' | 'processing' | 'completed' | 'failed'
  filePath?: string
  downloadUrl?: string
  expiresAt?: Date
  error?: string
  createdAt: Date
  completedAt?: Date
  userId: string
}

/**
 * 导出服务类
 */
export class ExportService {
  private static readonly EXPORT_DIR = path.join(process.cwd(), 'exports')
  private static readonly FILE_EXPIRY_HOURS = 24 // 文件过期时间（小时）
  private static exportTasks = new Map<string, ExportTask>()

  /**
   * 初始化导出目录
   */
  static async initialize(): Promise<void> {
    try {
      if (!fs.existsSync(this.EXPORT_DIR)) {
        fs.mkdirSync(this.EXPORT_DIR, { recursive: true })
        logger.info('Export directory created', { path: this.EXPORT_DIR })
      }
    } catch (error) {
      logger.error('Failed to initialize export directory', { error })
      throw error
    }
  }

  /**
   * 导出数据
   */
  static async exportData(query: ExportQuery, userId: string): Promise<ExportResult> {
    try {
      const taskId = crypto.randomUUID()
      
      const task: ExportTask = {
        id: taskId,
        query,
        status: 'pending',
        createdAt: new Date(),
        userId
      }

      this.exportTasks.set(taskId, task)

      // 异步处理导出任务
      this.processExportTask(taskId).catch(error => {
        logger.error('Export task failed', { taskId, error })
      })

      return {
        taskId,
        status: 'pending'
      }
    } catch (error) {
      logger.error('Failed to create export task', { error, query })
      throw error
    }
  }

  /**
   * 处理导出任务
   */
  private static async processExportTask(taskId: string): Promise<void> {
    const task = this.exportTasks.get(taskId)
    if (!task) return

    try {
      task.status = 'processing'
      logger.info('Processing export task', { taskId, format: task.query.format })

      // 获取统计数据
      const statisticsResult = await StatisticsService.getStatistics(
        task.query,
        task.userId
      )

      // 检查是否为异步任务结果
      if ('id' in statisticsResult) {
        task.status = 'failed'
        task.error = '数据量过大，请缩小查询范围'
        return
      }

      // 根据格式导出
      let filePath: string
      switch (task.query.format) {
        case ExportFormat.CSV:
          filePath = await this.exportToCSV(statisticsResult.data, task.query.filename)
          break
        case ExportFormat.EXCEL:
          filePath = await this.exportToExcel(statisticsResult.data, task.query.filename)
          break
        case ExportFormat.JSON:
          filePath = await this.exportToJSON(statisticsResult.data, task.query.filename)
          break
        default:
          throw new Error(`不支持的导出格式: ${task.query.format}`)
      }

      // 生成下载链接
      const filename = path.basename(filePath)
      const downloadUrl = `/api/statistics/export/download/${filename}`
      const expiresAt = new Date(Date.now() + this.FILE_EXPIRY_HOURS * 60 * 60 * 1000)

      task.status = 'completed'
      task.filePath = filePath
      task.downloadUrl = downloadUrl
      task.expiresAt = expiresAt
      task.completedAt = new Date()

      logger.info('Export task completed', { 
        taskId, 
        format: task.query.format,
        filePath,
        downloadUrl
      })

    } catch (error) {
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : '导出失败'
      logger.error('Export task processing failed', { taskId, error })
    }
  }

  /**
   * 导出为 CSV 格式
   */
  private static async exportToCSV(
    data: StatisticsDataPoint[],
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `export_${timestamp}.csv`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      // 构建 CSV 内容
      const rows: string[] = []

      // 添加表头
      if (data.length > 0) {
        const dimensionKeys = Object.keys(data[0].dimensions)
        const metricKeys = Object.keys(data[0].metrics)
        const headers = [...dimensionKeys, ...metricKeys]
        rows.push(headers.join(','))

        // 添加数据行
        for (const point of data) {
          const values: string[] = []
          
          // 添加维度值
          for (const key of dimensionKeys) {
            values.push(this.escapeCSVValue(point.dimensions[key]))
          }
          
          // 添加指标值
          for (const key of metricKeys) {
            const value = (point.metrics as any)[key]
            values.push(value !== undefined ? String(value) : '')
          }
          
          rows.push(values.join(','))
        }
      }

      // 写入文件
      fs.writeFileSync(filePath, rows.join('\n'), 'utf-8')
      
      logger.info('CSV export completed', { filePath, rowCount: data.length })
      return filePath

    } catch (error) {
      logger.error('Failed to export CSV', { error })
      throw error
    }
  }

  /**
   * 导出为 Excel 格式
   */
  private static async exportToExcel(
    data: StatisticsDataPoint[],
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `export_${timestamp}.xlsx`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      // 转换数据为工作表格式
      const worksheetData: any[] = []

      if (data.length > 0) {
        // 添加表头
        const dimensionKeys = Object.keys(data[0].dimensions)
        const metricKeys = Object.keys(data[0].metrics)
        const headers = [...dimensionKeys, ...metricKeys]
        worksheetData.push(headers)

        // 添加数据行
        for (const point of data) {
          const row: any[] = []
          
          // 添加维度值
          for (const key of dimensionKeys) {
            row.push(point.dimensions[key])
          }
          
          // 添加指标值
          for (const key of metricKeys) {
            row.push((point.metrics as any)[key])
          }
          
          worksheetData.push(row)
        }
      }

      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // 设置列宽
      const columnWidths = worksheetData[0]?.map(() => ({ wch: 15 })) || []
      worksheet['!cols'] = columnWidths

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '统计数据')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Excel export completed', { filePath, rowCount: data.length })
      return filePath

    } catch (error) {
      logger.error('Failed to export Excel', { error })
      throw error
    }
  }

  /**
   * 导出为 JSON 格式
   */
  private static async exportToJSON(
    data: StatisticsDataPoint[],
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `export_${timestamp}.json`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      // 写入 JSON 文件
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

      logger.info('JSON export completed', { filePath, rowCount: data.length })
      return filePath

    } catch (error) {
      logger.error('Failed to export JSON', { error })
      throw error
    }
  }

  /**
   * 转义 CSV 值
   */
  private static escapeCSVValue(value: string): string {
    if (!value) return ''
    
    // 如果包含逗号、引号或换行符，需要用引号包裹
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // 引号需要转义为双引号
      return `"${value.replace(/"/g, '""')}"`
    }
    
    return value
  }

  /**
   * 获取导出任务状态
   */
  static async getExportTaskStatus(taskId: string): Promise<ExportTask | null> {
    return this.exportTasks.get(taskId) || null
  }

  /**
   * 获取导出文件
   */
  static async getExportFile(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.EXPORT_DIR, filename)
      
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return null
      }

      // 检查文件是否在导出目录内（安全检查）
      const resolvedPath = path.resolve(filePath)
      const resolvedExportDir = path.resolve(this.EXPORT_DIR)
      
      if (!resolvedPath.startsWith(resolvedExportDir)) {
        logger.warn('Attempted to access file outside export directory', { filename })
        return null
      }

      return filePath

    } catch (error) {
      logger.error('Failed to get export file', { error, filename })
      return null
    }
  }

  /**
   * 清理过期文件
   */
  static async cleanupExpiredFiles(): Promise<void> {
    try {
      const files = fs.readdirSync(this.EXPORT_DIR)
      const now = Date.now()
      let deletedCount = 0

      for (const file of files) {
        const filePath = path.join(this.EXPORT_DIR, file)
        const stats = fs.statSync(filePath)
        const fileAge = now - stats.mtimeMs
        const maxAge = this.FILE_EXPIRY_HOURS * 60 * 60 * 1000

        if (fileAge > maxAge) {
          fs.unlinkSync(filePath)
          deletedCount++
          logger.debug('Deleted expired export file', { file })
        }
      }

      if (deletedCount > 0) {
        logger.info('Cleaned up expired export files', { count: deletedCount })
      }

    } catch (error) {
      logger.error('Failed to cleanup expired files', { error })
    }
  }

  /**
   * 删除导出任务和文件
   */
  static async deleteExportTask(taskId: string): Promise<boolean> {
    try {
      const task = this.exportTasks.get(taskId)
      if (!task) return false

      // 删除文件
      if (task.filePath && fs.existsSync(task.filePath)) {
        fs.unlinkSync(task.filePath)
        logger.debug('Deleted export file', { filePath: task.filePath })
      }

      // 删除任务记录
      this.exportTasks.delete(taskId)
      
      return true

    } catch (error) {
      logger.error('Failed to delete export task', { error, taskId })
      return false
    }
  }

  /**
   * 导出样品数据
   */
  static async exportSamples(query: any, format: 'csv' | 'excel'): Promise<{ records: number; fileUrl?: string; fileName?: string }> {
    try {
      // 查询样品数据
      const samples = await prisma.sample.findMany({
        where: query.where || {},
        include: {
          testItems: true,
          results: true,
        },
      })

      // 转换为导出格式
      const data = samples.map(sample => ({
        样品编号: sample.sampleNumber,
        条码: sample.barcode,
        样品名称: sample.sampleName,
        客户名称: sample.clientName,
        样品类型: sample.sampleType,
        样品类别: sample.sampleCategory,
        数量: sample.quantity,
        单位: sample.unit,
        接收日期: sample.receivedDate.toISOString().split('T')[0],
        状态: sample.status,
        优先级: sample.priority,
      }))

      // 导出文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `samples_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`
      let filePath: string

      if (format === 'csv') {
        filePath = await this.exportArrayToCSV(data, fileName)
      } else {
        filePath = await this.exportArrayToExcel(data, fileName)
      }

      const downloadFileName = path.basename(filePath)
      const fileUrl = `/api/exports/download/${downloadFileName}`

      return {
        records: samples.length,
        fileUrl,
        fileName: downloadFileName,
      }
    } catch (error) {
      logger.error('Failed to export samples', { error })
      throw error
    }
  }

  /**
   * 导出检测结果数据
   */
  static async exportResults(query: any, format: 'csv' | 'excel'): Promise<{ records: number; fileUrl?: string; fileName?: string }> {
    try {
      // 查询结果数据
      const results = await prisma.result.findMany({
        where: query.where || {},
        include: {
          sample: {
            select: {
              sampleNumber: true,
              sampleName: true,
            },
          },
        },
      })

      // 转换为导出格式
      const data = results.map(result => ({
        样品编号: result.sample.sampleNumber,
        样品名称: result.sample.sampleName,
        检测参数: result.parameter,
        检测值: result.value || result.textValue || '',
        单位: result.unit || '',
        检测方法: result.method,
        数据来源: result.source,
        是否异常: result.isAbnormal ? '是' : '否',
        录入人: result.enteredBy,
        录入时间: result.enteredAt.toISOString(),
      }))

      // 导出文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `results_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`
      let filePath: string

      if (format === 'csv') {
        filePath = await this.exportArrayToCSV(data, fileName)
      } else {
        filePath = await this.exportArrayToExcel(data, fileName)
      }

      const downloadFileName = path.basename(filePath)
      const fileUrl = `/api/exports/download/${downloadFileName}`

      return {
        records: results.length,
        fileUrl,
        fileName: downloadFileName,
      }
    } catch (error) {
      logger.error('Failed to export results', { error })
      throw error
    }
  }

  /**
   * 导出报告数据
   */
  static async exportReports(query: any, format: 'csv' | 'excel'): Promise<{ records: number; fileUrl?: string; fileName?: string }> {
    try {
      // 查询报告数据
      const reports = await prisma.report.findMany({
        where: query.where || {},
        include: {
          sample: {
            select: {
              sampleNumber: true,
              sampleName: true,
              clientName: true,
            },
          },
          template: {
            select: {
              name: true,
            },
          },
        },
      })

      // 转换为导出格式
      const data = reports.map(report => ({
        报告编号: report.reportNumber,
        样品编号: report.sample.sampleNumber,
        样品名称: report.sample.sampleName,
        客户名称: report.sample.clientName,
        模板名称: report.template.name,
        状态: report.status,
        生成时间: report.generatedAt.toISOString(),
        生成人: report.generatedBy,
      }))

      // 导出文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `reports_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`
      let filePath: string

      if (format === 'csv') {
        filePath = await this.exportArrayToCSV(data, fileName)
      } else {
        filePath = await this.exportArrayToExcel(data, fileName)
      }

      const downloadFileName = path.basename(filePath)
      const fileUrl = `/api/exports/download/${downloadFileName}`

      return {
        records: reports.length,
        fileUrl,
        fileName: downloadFileName,
      }
    } catch (error) {
      logger.error('Failed to export reports', { error })
      throw error
    }
  }

  /**
   * 导出统计数据
   */
  static async exportStatistics(query: any, format: 'csv' | 'excel'): Promise<{ records: number; fileUrl?: string; fileName?: string }> {
    try {
      // 获取统计数据
      const statisticsResult = await StatisticsService.getStatistics(query, query.userId || 'system')

      // 检查是否为异步任务结果
      if ('id' in statisticsResult) {
        throw new Error('数据量过大，请缩小查询范围')
      }

      const data = statisticsResult.data

      // 转换为导出格式
      const exportData = data.map(point => {
        const row: any = {}
        
        // 添加维度
        Object.entries(point.dimensions).forEach(([key, value]) => {
          row[key] = value
        })
        
        // 添加指标
        Object.entries(point.metrics).forEach(([key, value]) => {
          row[key] = value
        })
        
        return row
      })

      // 导出文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `statistics_${timestamp}.${format === 'csv' ? 'csv' : 'xlsx'}`
      let filePath: string

      if (format === 'csv') {
        filePath = await this.exportArrayToCSV(exportData, fileName)
      } else {
        filePath = await this.exportArrayToExcel(exportData, fileName)
      }

      const downloadFileName = path.basename(filePath)
      const fileUrl = `/api/exports/download/${downloadFileName}`

      return {
        records: data.length,
        fileUrl,
        fileName: downloadFileName,
      }
    } catch (error) {
      logger.error('Failed to export statistics', { error })
      throw error
    }
  }

  /**
   * 导出数组数据为 CSV
   */
  private static async exportArrayToCSV(data: any[], fileName: string): Promise<string> {
    try {
      const filePath = path.join(this.EXPORT_DIR, fileName)

      if (data.length === 0) {
        fs.writeFileSync(filePath, '', 'utf-8')
        return filePath
      }

      // 构建 CSV 内容
      const rows: string[] = []
      const headers = Object.keys(data[0])
      rows.push(headers.join(','))

      // 添加数据行
      for (const item of data) {
        const values = headers.map(header => {
          const value = item[header]
          return this.escapeCSVValue(String(value !== undefined && value !== null ? value : ''))
        })
        rows.push(values.join(','))
      }

      // 写入文件
      fs.writeFileSync(filePath, rows.join('\n'), 'utf-8')
      
      logger.info('CSV export completed', { filePath, rowCount: data.length })
      return filePath
    } catch (error) {
      logger.error('Failed to export array to CSV', { error })
      throw error
    }
  }

  /**
   * 导出数组数据为 Excel
   */
  private static async exportArrayToExcel(data: any[], fileName: string): Promise<string> {
    try {
      const filePath = path.join(this.EXPORT_DIR, fileName)

      if (data.length === 0) {
        const workbook = XLSX.utils.book_new()
        const worksheet = XLSX.utils.aoa_to_sheet([[]])
        XLSX.utils.book_append_sheet(workbook, worksheet, '数据')
        XLSX.writeFile(workbook, filePath)
        return filePath
      }

      // 转换数据为工作表格式
      const worksheetData: any[] = []
      const headers = Object.keys(data[0])
      worksheetData.push(headers)

      // 添加数据行
      for (const item of data) {
        const row = headers.map(header => item[header])
        worksheetData.push(row)
      }

      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // 设置列宽
      const columnWidths = headers.map(() => ({ wch: 15 }))
      worksheet['!cols'] = columnWidths

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '数据')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Excel export completed', { filePath, rowCount: data.length })
      return filePath
    } catch (error) {
      logger.error('Failed to export array to Excel', { error })
      throw error
    }
  }

  /**
   * 导出工作量统计为 Excel
   */
  static async exportWorkloadToExcel(
    data: any[],
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `workload_statistics_${timestamp}.xlsx`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      // 转换数据为工作表格式
      const worksheetData: any[] = []

      // 添加表头
      worksheetData.push([
        '审核人员',
        '总任务数',
        '已完成',
        '待处理'
      ])

      // 添加数据行
      for (const item of data) {
        worksheetData.push([
          item.auditorName,
          item.totalTasks,
          item.completedTasks,
          item.pendingTasks
        ])
      }

      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 }
      ]

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '工作量统计')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Workload statistics export completed', { filePath, rowCount: data.length })
      return filePath

    } catch (error) {
      logger.error('Failed to export workload statistics', { error })
      throw error
    }
  }

  /**
   * 导出通过率统计为 Excel
   */
  static async exportPassRateToExcel(
    data: any,
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `pass_rate_statistics_${timestamp}.xlsx`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      const workbook = XLSX.utils.book_new()

      // 整体统计工作表
      const overallData = [
        ['指标', '数值'],
        ['总任务数', data.overall.total],
        ['通过数', data.overall.passed],
        ['退回数', data.overall.rejected],
        ['通过率(%)', data.overall.passRate.toFixed(2)]
      ]
      const overallSheet = XLSX.utils.aoa_to_sheet(overallData)
      overallSheet['!cols'] = [{ wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, overallSheet, '整体统计')

      // 按级别统计工作表
      const levelData = [
        ['审核级别', '总任务数', '通过数', '通过率(%)']
      ]
      for (const item of data.byLevel) {
        levelData.push([
          `第${item.level}级`,
          item.total,
          item.passed,
          item.passRate.toFixed(2)
        ])
      }
      const levelSheet = XLSX.utils.aoa_to_sheet(levelData)
      levelSheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, levelSheet, '按级别统计')

      // 按样品类型统计工作表
      const typeData = [
        ['样品类型', '总任务数', '通过数', '通过率(%)']
      ]
      for (const item of data.bySampleType) {
        typeData.push([
          item.sampleType,
          item.total,
          item.passed,
          item.passRate.toFixed(2)
        ])
      }
      const typeSheet = XLSX.utils.aoa_to_sheet(typeData)
      typeSheet['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, typeSheet, '按样品类型统计')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Pass rate statistics export completed', { filePath })
      return filePath

    } catch (error) {
      logger.error('Failed to export pass rate statistics', { error })
      throw error
    }
  }

  /**
   * 导出时效性统计为 Excel
   */
  static async exportDurationToExcel(
    data: any,
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `duration_statistics_${timestamp}.xlsx`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      const workbook = XLSX.utils.book_new()

      // 统计指标工作表
      const metricsData = [
        ['指标', '数值(小时)'],
        ['平均时长', data.overall.averageDuration.toFixed(2)],
        ['中位数', data.overall.medianDuration.toFixed(2)],
        ['最短时长', data.overall.minDuration.toFixed(2)],
        ['最长时长', data.overall.maxDuration.toFixed(2)],
        ['超时任务数', data.overall.overtimeTasks],
        ['超时率(%)', data.overall.overtimeRate.toFixed(2)]
      ]
      const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData)
      metricsSheet['!cols'] = [{ wch: 15 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(workbook, metricsSheet, '统计指标')

      // 时长分布工作表
      const distributionData = [
        ['时长范围', '任务数量']
      ]
      for (const item of data.distribution) {
        distributionData.push([
          item.range,
          item.count
        ])
      }
      const distributionSheet = XLSX.utils.aoa_to_sheet(distributionData)
      distributionSheet['!cols'] = [{ wch: 20 }, { wch: 12 }]
      XLSX.utils.book_append_sheet(workbook, distributionSheet, '时长分布')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Duration statistics export completed', { filePath })
      return filePath

    } catch (error) {
      logger.error('Failed to export duration statistics', { error })
      throw error
    }
  }

  /**
   * 导出问题分类统计为 Excel
   */
  static async exportIssuesToExcel(
    data: any,
    filename?: string
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = filename || `issues_statistics_${timestamp}.xlsx`
      const filePath = path.join(this.EXPORT_DIR, fileName)

      // 转换数据为工作表格式
      const worksheetData: any[] = []

      // 添加表头
      worksheetData.push([
        '排名',
        '退回原因',
        '出现次数',
        '占比(%)'
      ])

      // 添加数据行
      data.byReason.forEach((item: any, index: number) => {
        worksheetData.push([
          index + 1,
          item.reason,
          item.count,
          item.percentage.toFixed(2)
        ])
      })

      // 计算总数
      const total = data.byReason.reduce((sum: number, item: any) => sum + item.count, 0)

      // 添加总计行
      worksheetData.push([])
      worksheetData.push(['总计', '', total, '100.00'])

      // 创建工作簿和工作表
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

      // 设置列宽
      worksheet['!cols'] = [
        { wch: 8 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 }
      ]

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '问题分类统计')

      // 写入文件
      XLSX.writeFile(workbook, filePath)

      logger.info('Issues statistics export completed', { filePath, issueCount: data.byReason.length })
      return filePath

    } catch (error) {
      logger.error('Failed to export issues statistics', { error })
      throw error
    }
  }
}
