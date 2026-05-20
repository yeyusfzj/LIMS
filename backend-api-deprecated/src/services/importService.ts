/**
 * 批量导入服务
 * 
 * 实现检测结果的批量导入功能
 * 验证需求：8.1, 8.2, 8.3, 8.4, 8.5
 */

import { PrismaClient, ResultSource } from '@prisma/client'
import { 
  ImportResult, 
  ImportError, 
  ImportDataRow, 
  FieldMapping,
  ResultResponse 
} from '../types/result'
import { fileParser } from '../utils/fileParser'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 批量导入服务类
 */
export class ImportService {
  /**
   * 导入检测结果
   * 
   * 需求 8.1: 解析文件并验证数据格式
   * 需求 8.2: 支持常见的仪器数据格式（CSV、Excel、XML）
   * 需求 8.3: 导入数据包含错误时返回详细的错误报告
   * 需求 8.4: 在事务中批量插入有效的结果数据
   * 需求 8.5: 记录导入操作的统计信息（成功数、失败数）
   * 
   * @param buffer 文件缓冲区
   * @param filename 文件名
   * @param mapping 字段映射配置
   * @param enteredBy 录入人员 ID
   * @returns 导入结果
   */
  async importResults(
    buffer: Buffer,
    filename: string,
    mapping: FieldMapping,
    enteredBy: string
  ): Promise<ImportResult> {
    const errors: ImportError[] = []
    let dataRows: ImportDataRow[] = []

    try {
      // 步骤 1: 解析文件（需求 8.1, 8.2）
      logger.info('Starting file import', { filename, enteredBy })
      
      dataRows = fileParser.parseFile(buffer, filename, mapping)
      
      if (dataRows.length === 0) {
        return {
          success: false,
          totalRecords: 0,
          successCount: 0,
          failureCount: 0,
          errors: [{
            row: 0,
            message: '文件中没有有效数据'
          }]
        }
      }

      logger.info('File parsed successfully', { 
        filename, 
        recordCount: dataRows.length 
      })

      // 步骤 2: 验证数据（需求 8.1, 8.3）
      const validationResult = await this.validateData(dataRows)
      errors.push(...validationResult.errors)

      const validRows = validationResult.validRows

      if (validRows.length === 0) {
        return {
          success: false,
          totalRecords: dataRows.length,
          successCount: 0,
          failureCount: dataRows.length,
          errors
        }
      }

      // 步骤 3: 批量插入（需求 8.4）
      const insertedResults = await this.batchInsert(validRows, enteredBy)

      // 步骤 4: 返回结果（需求 8.5）
      const result: ImportResult = {
        success: errors.length === 0,
        totalRecords: dataRows.length,
        successCount: insertedResults.length,
        failureCount: dataRows.length - insertedResults.length,
        errors,
        importedResults: insertedResults
      }

      logger.info('Import completed', {
        filename,
        totalRecords: result.totalRecords,
        successCount: result.successCount,
        failureCount: result.failureCount
      })

      return result
    } catch (error) {
      logger.error('Import failed', { error, filename })
      
      return {
        success: false,
        totalRecords: dataRows.length,
        successCount: 0,
        failureCount: dataRows.length,
        errors: [{
          row: 0,
          message: `导入失败: ${error.message}`
        }]
      }
    }
  }

  /**
   * 验证导入数据
   * 
   * @param dataRows 数据行数组
   * @returns 验证结果
   */
  private async validateData(
    dataRows: ImportDataRow[]
  ): Promise<{ validRows: ImportDataRow[], errors: ImportError[] }> {
    const validRows: ImportDataRow[] = []
    const errors: ImportError[] = []

    // 批量查询样品和检测项，提高性能
    const sampleIds = [...new Set(dataRows.map(row => row.sampleId))]
    const testItemIds = [...new Set(dataRows.map(row => row.testItemId))]

    const [samples, testItems] = await Promise.all([
      prisma.sample.findMany({
        where: { id: { in: sampleIds } },
        select: { id: true }
      }),
      prisma.testItem.findMany({
        where: { id: { in: testItemIds } },
        select: { id: true, sampleId: true }
      })
    ])

    const sampleIdSet = new Set(samples.map(s => s.id))
    const testItemMap = new Map(testItems.map(t => [t.id, t.sampleId]))

    // 验证每一行数据
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const rowNumber = i + 2 // Excel/CSV 行号从 2 开始（第 1 行是表头）
      const rowErrors: ImportError[] = []

      // 验证必填字段
      if (!row.sampleId) {
        rowErrors.push({
          row: rowNumber,
          field: 'sampleId',
          message: '样品 ID 不能为空'
        })
      }

      if (!row.testItemId) {
        rowErrors.push({
          row: rowNumber,
          field: 'testItemId',
          message: '检测项 ID 不能为空'
        })
      }

      if (!row.parameter) {
        rowErrors.push({
          row: rowNumber,
          field: 'parameter',
          message: '检测参数不能为空'
        })
      }

      if (!row.method) {
        rowErrors.push({
          row: rowNumber,
          field: 'method',
          message: '检测方法不能为空'
        })
      }

      // 验证数值和文本值至少有一个
      if (row.value === undefined && !row.textValue) {
        rowErrors.push({
          row: rowNumber,
          field: 'value',
          message: '数值结果或文本结果至少需要提供一个'
        })
      }

      // 验证样品是否存在
      if (row.sampleId && !sampleIdSet.has(row.sampleId)) {
        rowErrors.push({
          row: rowNumber,
          field: 'sampleId',
          value: row.sampleId,
          message: '样品不存在'
        })
      }

      // 验证检测项是否存在
      if (row.testItemId && !testItemMap.has(row.testItemId)) {
        rowErrors.push({
          row: rowNumber,
          field: 'testItemId',
          value: row.testItemId,
          message: '检测项不存在'
        })
      }

      // 验证检测项是否属于该样品
      if (row.sampleId && row.testItemId) {
        const testItemSampleId = testItemMap.get(row.testItemId)
        if (testItemSampleId && testItemSampleId !== row.sampleId) {
          rowErrors.push({
            row: rowNumber,
            field: 'testItemId',
            value: row.testItemId,
            message: '检测项不属于该样品'
          })
        }
      }

      // 如果有错误，记录错误；否则添加到有效行
      if (rowErrors.length > 0) {
        errors.push(...rowErrors)
      } else {
        validRows.push(row)
      }
    }

    return { validRows, errors }
  }

  /**
   * 批量插入结果
   * 
   * 需求 8.4: 在事务中批量插入有效的结果数据
   * 
   * @param validRows 有效的数据行
   * @param enteredBy 录入人员 ID
   * @returns 插入的结果数组
   */
  private async batchInsert(
    validRows: ImportDataRow[],
    enteredBy: string
  ): Promise<ResultResponse[]> {
    try {
      // 使用事务批量插入，确保原子性
      const results = await prisma.$transaction(
        validRows.map(row =>
          prisma.result.create({
            data: {
              sampleId: row.sampleId,
              testItemId: row.testItemId,
              parameter: row.parameter,
              value: row.value,
              textValue: row.textValue,
              unit: row.unit,
              method: row.method,
              source: ResultSource.INSTRUMENT, // 批量导入默认为仪器来源
              instrumentId: row.instrumentId,
              enteredBy
            }
          })
        )
      )

      logger.info('Batch insert completed', { 
        insertedCount: results.length 
      })

      // 转换为响应格式
      return results.map(r => this.mapToResponse(r))
    } catch (error) {
      logger.error('Batch insert failed', { error })
      throw new Error(`批量插入失败: ${error.message}`)
    }
  }

  /**
   * 将数据库模型映射为响应 DTO
   * 
   * @param result 数据库结果模型
   * @returns 结果响应 DTO
   */
  private mapToResponse(result: any): ResultResponse {
    return {
      id: result.id,
      sampleId: result.sampleId,
      testItemId: result.testItemId,
      parameter: result.parameter,
      value: result.value,
      textValue: result.textValue,
      unit: result.unit,
      method: result.method,
      source: result.source,
      instrumentId: result.instrumentId,
      formulaId: result.formulaId,
      isCalculated: result.isCalculated,
      isAbnormal: result.isAbnormal,
      abnormalReason: result.abnormalReason,
      isRetest: result.isRetest,
      originalResultId: result.originalResultId,
      retestReason: result.retestReason,
      enteredBy: result.enteredBy,
      enteredAt: result.enteredAt,
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAt
    }
  }
}

export const importService = new ImportService()
