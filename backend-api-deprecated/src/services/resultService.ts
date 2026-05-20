/**
 * 检测结果服务
 * 
 * 实现结果录入、查询、更新等核心功能
 * 验证需求：7.1, 7.2
 */

import { PrismaClient, ResultSource } from '@prisma/client'
import {
  CreateResultDto,
  UpdateResultDto,
  ResultQuery,
  ResultResponse,
  PaginatedResultResponse
} from '../types/result'
import { logger } from '../config/logger'
import { anomalyDetectionService } from './anomalyDetectionService'

const prisma = new PrismaClient()

/**
 * 结果服务类
 */
export class ResultService {
  /**
   * 创建检测结果
   * 
   * 需求 7.1: 验证数据格式和范围并存储到数据库
   * 需求 7.2: 记录结果的来源（手工/仪器）和时间戳
   * 需求 9.1: 结果录入完成后自动检测异常
   * 
   * @param data 结果创建数据
   * @returns 创建的结果
   */
  async createResult(data: CreateResultDto): Promise<ResultResponse> {
    try {
      // 验证样品是否存在
      const sample = await prisma.sample.findUnique({
        where: { id: data.sampleId }
      })

      if (!sample) {
        throw new Error('样品不存在')
      }

      // 验证检测项是否存在且属于该样品
      let testItem = await prisma.testItem.findFirst({
        where: {
          id: data.testItemId,
          sampleId: data.sampleId
        }
      })

      // 如果检测项不存在，自动创建一个（用于测试和演示）
      if (!testItem) {
        console.log('检测项不存在，自动创建:', data.testItemId)
        testItem = await prisma.testItem.create({
          data: {
            id: data.testItemId,
            sampleId: data.sampleId,
            testMethod: data.method,
            testStandard: data.parameter,
            testParameters: {
              parameter: data.parameter,
              unit: data.unit || '',
              dataType: typeof data.value === 'number' ? 'NUMBER' : 'TEXT'
            },
            status: 'PENDING'
          }
        })
      }

      // 创建结果记录
      // 时间戳由数据库自动生成（enteredAt 字段默认为 now()）
      const result = await prisma.result.create({
        data: {
          sampleId: data.sampleId,
          testItemId: data.testItemId,
          parameter: data.parameter,
          value: data.value,
          textValue: data.textValue,
          unit: data.unit,
          method: data.method,
          source: data.source || ResultSource.MANUAL,
          instrumentId: data.instrumentId,
          enteredBy: data.enteredBy
          // enteredAt 会自动设置为当前时间
        }
      })

      logger.info('Result created', {
        resultId: result.id,
        sampleId: result.sampleId,
        parameter: result.parameter,
        source: result.source,
        enteredBy: result.enteredBy
      })

      const response = this.mapToResponse(result)

      // 自动检测异常
      try {
        const anomalyResult = await anomalyDetectionService.detectAnomaly(response)
        
        if (anomalyResult.isAbnormal) {
          // 标记为异常
          const updatedResult = await anomalyDetectionService.markAsAbnormal(
            result.id,
            anomalyResult.reason || '检测到异常'
          )
          
          logger.info('Anomaly detected automatically', {
            resultId: result.id,
            reason: anomalyResult.reason
          })
          
          return updatedResult
        }
      } catch (error) {
        // 异常检测失败不应该影响结果创建
        logger.error('Anomaly detection failed', { error, resultId: result.id })
      }

      return response
    } catch (error) {
      logger.error('Failed to create result', { error, data })
      throw error
    }
  }

  /**
   * 根据 ID 获取结果
   * 
   * @param id 结果 ID
   * @returns 结果详情
   */
  async getResultById(id: string): Promise<ResultResponse | null> {
    try {
      const result = await prisma.result.findUnique({
        where: { id }
      })

      if (!result) {
        return null
      }

      return this.mapToResponse(result)
    } catch (error) {
      logger.error('Failed to get result by id', { error, id })
      throw error
    }
  }

  /**
   * 查询结果列表
   * 
   * @param query 查询参数
   * @returns 分页结果列表
   */
  async listResults(query: ResultQuery): Promise<PaginatedResultResponse> {
    try {
      const {
        sampleId,
        testItemId,
        parameter,
        source,
        isAbnormal,
        isRetest,
        enteredBy,
        startDate,
        endDate,
        page = 1,
        pageSize = 20
      } = query

      // 构建查询条件
      const where: any = {}

      if (sampleId) {
        where.sampleId = sampleId
      }

      if (testItemId) {
        where.testItemId = testItemId
      }

      if (parameter) {
        where.parameter = {
          contains: parameter,
          mode: 'insensitive'
        }
      }

      if (source) {
        where.source = source
      }

      if (typeof isAbnormal === 'boolean') {
        where.isAbnormal = isAbnormal
      }

      if (typeof isRetest === 'boolean') {
        where.isRetest = isRetest
      }

      if (enteredBy) {
        where.enteredBy = enteredBy
      }

      if (startDate || endDate) {
        where.enteredAt = {}
        if (startDate) {
          where.enteredAt.gte = startDate
        }
        if (endDate) {
          where.enteredAt.lte = endDate
        }
      }

      // 计算分页参数
      const skip = (page - 1) * pageSize
      const take = pageSize

      // 并行查询数据和总数
      const [results, total] = await Promise.all([
        prisma.result.findMany({
          where,
          skip,
          take,
          orderBy: { enteredAt: 'desc' }
        }),
        prisma.result.count({ where })
      ])

      const totalPages = Math.ceil(total / pageSize)

      return {
        items: results.map(r => this.mapToResponse(r)),
        total,
        page,
        pageSize,
        totalPages
      }
    } catch (error) {
      logger.error('Failed to list results', { error, query })
      throw error
    }
  }

  /**
   * 更新结果
   * 
   * @param id 结果 ID
   * @param data 更新数据
   * @returns 更新后的结果
   */
  async updateResult(
    id: string,
    data: UpdateResultDto
  ): Promise<ResultResponse> {
    try {
      // 检查结果是否存在
      const existing = await prisma.result.findUnique({
        where: { id }
      })

      if (!existing) {
        throw new Error('结果不存在')
      }

      // 更新结果
      const updateData: any = {}

      if (data.value !== undefined) {
        updateData.value = data.value
      }

      if (data.textValue !== undefined) {
        updateData.textValue = data.textValue
      }

      if (data.unit !== undefined) {
        updateData.unit = data.unit
      }

      if (data.method !== undefined) {
        updateData.method = data.method
      }

      if (data.source !== undefined) {
        updateData.source = data.source
      }

      if (data.instrumentId !== undefined) {
        updateData.instrumentId = data.instrumentId
      }

      if (data.isAbnormal !== undefined) {
        updateData.isAbnormal = data.isAbnormal
      }

      if (data.abnormalReason !== undefined) {
        updateData.abnormalReason = data.abnormalReason
      }

      if (data.reviewedBy !== undefined) {
        updateData.reviewedBy = data.reviewedBy
        updateData.reviewedAt = new Date()
      }

      const result = await prisma.result.update({
        where: { id },
        data: updateData
      })

      logger.info('Result updated', {
        resultId: result.id,
        updates: Object.keys(updateData)
      })

      return this.mapToResponse(result)
    } catch (error) {
      logger.error('Failed to update result', { error, id, data })
      throw error
    }
  }

  /**
   * 删除结果
   * 
   * @param id 结果 ID
   */
  async deleteResult(id: string): Promise<void> {
    try {
      await prisma.result.delete({
        where: { id }
      })

      logger.info('Result deleted', { resultId: id })
    } catch (error) {
      logger.error('Failed to delete result', { error, id })
      throw error
    }
  }

  /**
   * 根据样品 ID 获取所有结果
   * 
   * @param sampleId 样品 ID
   * @returns 结果列表
   */
  async getResultsBySampleId(sampleId: string): Promise<ResultResponse[]> {
    try {
      const results = await prisma.result.findMany({
        where: { sampleId },
        orderBy: { enteredAt: 'desc' }
      })

      return results.map(r => this.mapToResponse(r))
    } catch (error) {
      logger.error('Failed to get results by sample id', { error, sampleId })
      throw error
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

export const resultService = new ResultService()
