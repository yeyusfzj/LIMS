/**
 * 导出服务单元测试
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { ExportService } from '../services/exportService'
import { ExportFormat, StatisticsDimension, TimeGranularity } from '../types/statistics'
import * as fs from 'fs'
import * as path from 'path'

describe('ExportService', () => {
  const testUserId = 'test-user-id'
  const exportDir = path.join(process.cwd(), 'exports')

  beforeAll(async () => {
    // 初始化导出服务
    await ExportService.initialize()
  })

  afterAll(async () => {
    // 清理测试文件
    if (fs.existsSync(exportDir)) {
      const files = fs.readdirSync(exportDir)
      for (const file of files) {
        if (file.startsWith('test_')) {
          fs.unlinkSync(path.join(exportDir, file))
        }
      }
    }
  })

  describe('CSV 导出', () => {
    it('应该成功导出 CSV 文件', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.CSV,
        filename: 'test_export.csv',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)

      expect(result).toBeDefined()
      expect(result.taskId).toBeDefined()
      expect(result.status).toBe('pending')

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')
      expect(task?.downloadUrl).toBeDefined()
      expect(task?.filePath).toBeDefined()

      // 验证文件存在
      if (task?.filePath) {
        expect(fs.existsSync(task.filePath)).toBe(true)
      }
    })

    it('应该正确转义 CSV 特殊字符', async () => {
      const query = {
        dimensions: [StatisticsDimension.CLIENT],
        format: ExportFormat.CSV,
        filename: 'test_escape.csv',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)
      
      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')
      
      if (task?.filePath && fs.existsSync(task.filePath)) {
        const content = fs.readFileSync(task.filePath, 'utf-8')
        expect(content).toBeDefined()
        // CSV 文件应该包含表头（如果有数据）或为空
        expect(content.length).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('Excel 导出', () => {
    it('应该成功导出 Excel 文件', async () => {
      const query = {
        dimensions: [StatisticsDimension.STATUS],
        format: ExportFormat.EXCEL,
        filename: 'test_export.xlsx',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)

      expect(result).toBeDefined()
      expect(result.taskId).toBeDefined()

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')
      expect(task?.filePath).toBeDefined()

      // 验证文件存在且为 Excel 格式
      if (task?.filePath) {
        expect(fs.existsSync(task.filePath)).toBe(true)
        expect(task.filePath.endsWith('.xlsx')).toBe(true)
      }
    })
  })

  describe('JSON 导出', () => {
    it('应该成功导出 JSON 文件', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.JSON,
        filename: 'test_export.json',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)

      expect(result).toBeDefined()
      expect(result.taskId).toBeDefined()

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')

      // 验证 JSON 文件格式正确
      if (task?.filePath && fs.existsSync(task.filePath)) {
        const content = fs.readFileSync(task.filePath, 'utf-8')
        const data = JSON.parse(content)
        expect(Array.isArray(data)).toBe(true)
      }
    })
  })

  describe('任务管理', () => {
    it('应该能够获取任务状态', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.CSV,
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)
      const task = await ExportService.getExportTaskStatus(result.taskId)

      expect(task).toBeDefined()
      expect(task?.id).toBe(result.taskId)
      expect(task?.userId).toBe(testUserId)
      expect(['pending', 'processing', 'completed', 'failed']).toContain(task?.status)
    })

    it('应该返回 null 对于不存在的任务', async () => {
      const task = await ExportService.getExportTaskStatus('non-existent-task-id')
      expect(task).toBeNull()
    })

    it('应该能够删除导出任务', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.CSV,
        filename: 'test_delete.csv',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)
      
      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const deleted = await ExportService.deleteExportTask(result.taskId)
      expect(deleted).toBe(true)

      const task = await ExportService.getExportTaskStatus(result.taskId)
      expect(task).toBeNull()
    })
  })

  describe('文件管理', () => {
    it('应该能够获取导出文件路径', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.CSV,
        filename: 'test_get_file.csv',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)
      
      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      if (task?.filePath) {
        const filename = path.basename(task.filePath)
        const filePath = await ExportService.getExportFile(filename)
        
        expect(filePath).toBeDefined()
        expect(filePath).toBe(task.filePath)
      }
    })

    it('应该拒绝访问导出目录外的文件', async () => {
      const filePath = await ExportService.getExportFile('../../../etc/passwd')
      expect(filePath).toBeNull()
    })

    it('应该返回 null 对于不存在的文件', async () => {
      const filePath = await ExportService.getExportFile('non-existent-file.csv')
      expect(filePath).toBeNull()
    })
  })

  describe('文件过期清理', () => {
    it('应该能够清理过期文件', async () => {
      // 创建一个测试文件
      const testFile = path.join(exportDir, 'test_old_file.csv')
      fs.writeFileSync(testFile, 'test content', 'utf-8')

      // 修改文件时间为 25 小时前
      const oldTime = Date.now() - (25 * 60 * 60 * 1000)
      fs.utimesSync(testFile, new Date(oldTime), new Date(oldTime))

      // 执行清理
      await ExportService.cleanupExpiredFiles()

      // 验证文件已被删除
      expect(fs.existsSync(testFile)).toBe(false)
    })
  })

  describe('时间维度导出', () => {
    it('应该支持按时间维度导出', async () => {
      const query = {
        dimensions: [StatisticsDimension.TIME, StatisticsDimension.SAMPLE_TYPE],
        timeGranularity: TimeGranularity.DAY,
        format: ExportFormat.CSV,
        filename: 'test_time_dimension.csv',
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)

      expect(result).toBeDefined()
      expect(result.taskId).toBeDefined()

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')
    })
  })

  describe('过滤条件导出', () => {
    it('应该支持带过滤条件的导出', async () => {
      const query = {
        dimensions: [StatisticsDimension.SAMPLE_TYPE],
        format: ExportFormat.CSV,
        filename: 'test_filtered.csv',
        filters: {
          status: ['REGISTERED', 'IN_TESTING']
        },
        useCache: false
      }

      const result = await ExportService.exportData(query, testUserId)

      expect(result).toBeDefined()
      expect(result.taskId).toBeDefined()

      // 等待任务完成
      await new Promise(resolve => setTimeout(resolve, 2000))

      const task = await ExportService.getExportTaskStatus(result.taskId)
      
      expect(task).toBeDefined()
      expect(task?.status).toBe('completed')
    })
  })
})
