/**
 * 异常检测服务
 * 
 * 实现异常检测规则配置、自动异常检测和复测管理
 * 验证需求：9.1, 9.2, 9.3, 9.4, 9.5
 */

import { PrismaClient, Priority } from '@prisma/client'
import {
  AnomalyDetectionRule,
  CreateAnomalyRuleDto,
  UpdateAnomalyRuleDto,
  AnomalyDetectionResult,
  AnomalyRuleType,
  RangeRuleConfig,
  DeviationRuleConfig,
  TrendRuleConfig,
  CustomRuleConfig,
  RetestRequestDto,
  RetestResponse
} from '../types/anomaly'
import { ResultResponse } from '../types/result'
import { logger } from '../config/logger'

const prisma = new PrismaClient()

/**
 * 异常检测服务类
 */
export class AnomalyDetectionService {
  // 内存中存储异常检测规则（实际应用中应该存储在数据库）
  private rules: Map<string, AnomalyDetectionRule> = new Map()

  /**
   * 创建异常检测规则
   * 
   * 需求 9.2: 支持配置异常检测规则（范围、偏差、趋势等）
   * 
   * @param data 规则创建数据
   * @returns 创建的规则
   */
  async createRule(data: CreateAnomalyRuleDto): Promise<AnomalyDetectionRule> {
    try {
      const rule: AnomalyDetectionRule = {
        id: this.generateId(),
        name: data.name,
        description: data.description,
        testMethod: data.testMethod,
        parameter: data.parameter,
        ruleType: data.ruleType,
        config: data.config,
        isActive: data.isActive !== undefined ? data.isActive : true,
        priority: data.priority || 0,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.rules.set(rule.id, rule)

      logger.info('Anomaly detection rule created', {
        ruleId: rule.id,
        name: rule.name,
        ruleType: rule.ruleType
      })

      return rule
    } catch (error) {
      logger.error('Failed to create anomaly detection rule', { error, data })
      throw error
    }
  }

  /**
   * 获取规则
   * 
   * @param id 规则 ID
   * @returns 规则详情
   */
  async getRule(id: string): Promise<AnomalyDetectionRule | null> {
    return this.rules.get(id) || null
  }

  /**
   * 获取所有规则
   * 
   * @returns 规则列表
   */
  async listRules(): Promise<AnomalyDetectionRule[]> {
    return Array.from(this.rules.values())
  }

  /**
   * 获取适用于特定检测方法和参数的规则
   * 
   * @param testMethod 检测方法
   * @param parameter 检测参数
   * @returns 适用的规则列表
   */
  async getRulesForTest(
    testMethod: string,
    parameter: string
  ): Promise<AnomalyDetectionRule[]> {
    const allRules = Array.from(this.rules.values())
    
    return allRules
      .filter(rule => 
        rule.isActive &&
        rule.testMethod === testMethod &&
        rule.parameter === parameter
      )
      .sort((a, b) => b.priority - a.priority) // 按优先级降序排序
  }

  /**
   * 更新规则
   * 
   * @param id 规则 ID
   * @param data 更新数据
   * @returns 更新后的规则
   */
  async updateRule(
    id: string,
    data: UpdateAnomalyRuleDto
  ): Promise<AnomalyDetectionRule> {
    const rule = this.rules.get(id)
    
    if (!rule) {
      throw new Error('异常检测规则不存在')
    }

    const updatedRule: AnomalyDetectionRule = {
      ...rule,
      ...data,
      updatedAt: new Date()
    }

    this.rules.set(id, updatedRule)

    logger.info('Anomaly detection rule updated', {
      ruleId: id,
      updates: Object.keys(data)
    })

    return updatedRule
  }

  /**
   * 删除规则
   * 
   * @param id 规则 ID
   */
  async deleteRule(id: string): Promise<void> {
    if (!this.rules.has(id)) {
      throw new Error('异常检测规则不存在')
    }

    this.rules.delete(id)

    logger.info('Anomaly detection rule deleted', { ruleId: id })
  }

  /**
   * 检测结果是否异常
   * 
   * 需求 9.1: 根据检测方法的范围规则自动检测异常
   * 
   * @param result 检测结果
   * @returns 异常检测结果
   */
  async detectAnomaly(result: ResultResponse): Promise<AnomalyDetectionResult> {
    try {
      // 获取适用的规则
      const rules = await this.getRulesForTest(result.method, result.parameter)

      if (rules.length === 0) {
        // 没有配置规则，不检测异常
        return { isAbnormal: false }
      }

      // 按优先级检查每个规则
      for (const rule of rules) {
        const detectionResult = await this.checkRule(result, rule)
        
        if (detectionResult.isAbnormal) {
          // 找到第一个异常，立即返回
          return detectionResult
        }
      }

      // 所有规则都通过
      return { isAbnormal: false }
    } catch (error) {
      logger.error('Failed to detect anomaly', { error, resultId: result.id })
      throw error
    }
  }

  /**
   * 检查单个规则
   * 
   * @param result 检测结果
   * @param rule 检测规则
   * @returns 检测结果
   */
  private async checkRule(
    result: ResultResponse,
    rule: AnomalyDetectionRule
  ): Promise<AnomalyDetectionResult> {
    switch (rule.ruleType) {
      case AnomalyRuleType.RANGE:
        return this.checkRangeRule(result, rule)
      
      case AnomalyRuleType.DEVIATION:
        return this.checkDeviationRule(result, rule)
      
      case AnomalyRuleType.TREND:
        return this.checkTrendRule(result, rule)
      
      case AnomalyRuleType.CUSTOM:
        return this.checkCustomRule(result, rule)
      
      default:
        return { isAbnormal: false }
    }
  }

  /**
   * 检查范围规则
   * 
   * @param result 检测结果
   * @param rule 规则
   * @returns 检测结果
   */
  private checkRangeRule(
    result: ResultResponse,
    rule: AnomalyDetectionRule
  ): AnomalyDetectionResult {
    const config = rule.config as RangeRuleConfig
    const value = result.value

    if (value === undefined || value === null) {
      return { isAbnormal: false }
    }

    let isAbnormal = false
    let reason = ''

    if (config.min !== undefined && value < config.min) {
      isAbnormal = true
      reason = `检测值 ${value} 低于最小值 ${config.min}`
    } else if (config.max !== undefined && value > config.max) {
      isAbnormal = true
      reason = `检测值 ${value} 高于最大值 ${config.max}`
    }

    return {
      isAbnormal,
      reason: isAbnormal ? reason : undefined,
      ruleId: rule.id,
      ruleName: rule.name,
      detectedValue: value,
      expectedRange: {
        min: config.min,
        max: config.max
      }
    }
  }

  /**
   * 检查偏差规则
   * 
   * @param result 检测结果
   * @param rule 规则
   * @returns 检测结果
   */
  private checkDeviationRule(
    result: ResultResponse,
    rule: AnomalyDetectionRule
  ): AnomalyDetectionResult {
    const config = rule.config as DeviationRuleConfig
    const value = result.value

    if (value === undefined || value === null) {
      return { isAbnormal: false }
    }

    let deviation: number
    let isAbnormal = false
    let reason = ''

    if (config.deviationType === 'absolute') {
      deviation = Math.abs(value - config.referenceValue)
      isAbnormal = deviation > config.maxDeviation
      
      if (isAbnormal) {
        reason = `检测值 ${value} 与参考值 ${config.referenceValue} 的偏差 ${deviation} 超过最大偏差 ${config.maxDeviation}`
      }
    } else {
      // percentage
      deviation = Math.abs((value - config.referenceValue) / config.referenceValue * 100)
      isAbnormal = deviation > config.maxDeviation
      
      if (isAbnormal) {
        reason = `检测值 ${value} 与参考值 ${config.referenceValue} 的偏差 ${deviation.toFixed(2)}% 超过最大偏差 ${config.maxDeviation}%`
      }
    }

    return {
      isAbnormal,
      reason: isAbnormal ? reason : undefined,
      ruleId: rule.id,
      ruleName: rule.name,
      detectedValue: value
    }
  }

  /**
   * 检查趋势规则
   * 
   * @param result 检测结果
   * @param rule 规则
   * @returns 检测结果
   */
  private async checkTrendRule(
    result: ResultResponse,
    rule: AnomalyDetectionRule
  ): Promise<AnomalyDetectionResult> {
    const config = rule.config as TrendRuleConfig
    const value = result.value

    if (value === undefined || value === null) {
      return { isAbnormal: false }
    }

    // 获取历史数据
    const historicalResults = await prisma.result.findMany({
      where: {
        sampleId: result.sampleId,
        parameter: result.parameter,
        method: result.method,
        id: { not: result.id }
      },
      orderBy: { enteredAt: 'desc' },
      take: config.windowSize
    })

    if (historicalResults.length === 0) {
      // 没有历史数据，无法判断趋势
      return { isAbnormal: false }
    }

    // 计算平均值
    const historicalValues = historicalResults
      .map(r => r.value)
      .filter((v): v is number => v !== null && v !== undefined)

    if (historicalValues.length === 0) {
      return { isAbnormal: false }
    }

    const avgValue = historicalValues.reduce((sum, v) => sum + v, 0) / historicalValues.length

    let change: number
    let isAbnormal = false
    let reason = ''

    if (config.changeType === 'absolute') {
      change = Math.abs(value - avgValue)
      isAbnormal = change > config.maxChange
      
      if (isAbnormal) {
        reason = `检测值 ${value} 与历史平均值 ${avgValue.toFixed(2)} 的变化 ${change.toFixed(2)} 超过最大变化 ${config.maxChange}`
      }
    } else {
      // percentage
      change = Math.abs((value - avgValue) / avgValue * 100)
      isAbnormal = change > config.maxChange
      
      if (isAbnormal) {
        reason = `检测值 ${value} 与历史平均值 ${avgValue.toFixed(2)} 的变化 ${change.toFixed(2)}% 超过最大变化 ${config.maxChange}%`
      }
    }

    return {
      isAbnormal,
      reason: isAbnormal ? reason : undefined,
      ruleId: rule.id,
      ruleName: rule.name,
      detectedValue: value
    }
  }

  /**
   * 检查自定义规则
   * 
   * @param result 检测结果
   * @param rule 规则
   * @returns 检测结果
   */
  private checkCustomRule(
    result: ResultResponse,
    rule: AnomalyDetectionRule
  ): AnomalyDetectionResult {
    const config = rule.config as CustomRuleConfig
    
    // 简化实现：这里应该使用安全的表达式求值器
    // 实际应用中应该使用 vm2 或类似的沙箱环境
    try {
      // 创建上下文
      const context = {
        value: result.value,
        textValue: result.textValue,
        unit: result.unit
      }

      // 这里只是示例，实际应该使用安全的求值方式
      // const isAbnormal = evaluateExpression(config.expression, context)
      
      // 暂时返回 false
      return { isAbnormal: false }
    } catch (error) {
      logger.error('Failed to evaluate custom rule', { error, ruleId: rule.id })
      return { isAbnormal: false }
    }
  }

  /**
   * 标记结果为异常
   * 
   * 需求 9.3: 存储异常信息并关联到结果
   * 
   * @param resultId 结果 ID
   * @param reason 异常原因
   * @returns 更新后的结果
   */
  async markAsAbnormal(
    resultId: string,
    reason: string
  ): Promise<ResultResponse> {
    try {
      const result = await prisma.result.update({
        where: { id: resultId },
        data: {
          isAbnormal: true,
          abnormalReason: reason
        }
      })

      logger.info('Result marked as abnormal', {
        resultId,
        reason
      })

      return this.mapToResponse(result)
    } catch (error) {
      logger.error('Failed to mark result as abnormal', { error, resultId })
      throw error
    }
  }

  /**
   * 申请复测
   * 
   * 需求 9.4: 创建新的检测任务并关联到原样品
   * 需求 9.5: 在样品历史中记录所有异常和复测信息
   * 
   * @param data 复测申请数据
   * @returns 复测响应
   */
  async requestRetest(data: RetestRequestDto): Promise<RetestResponse> {
    try {
      // 获取原始结果
      const originalResult = await prisma.result.findUnique({
        where: { id: data.resultId },
        include: {
          sample: true
        }
      })

      if (!originalResult) {
        throw new Error('原始结果不存在')
      }

      // 在事务中创建复测任务
      const result = await prisma.$transaction(async (tx) => {
        // 1. 创建复测任务
        const task = await tx.task.create({
          data: {
            instanceId: originalResult.sample.workflowInstanceId || '',
            nodeId: 'retest',
            nodeName: '复测',
            nodeType: 'retest',
            priority: this.mapPriority(data.priority),
            status: 'PENDING'
          }
        })

        // 2. 更新原始结果，标记为需要复测
        await tx.result.update({
          where: { id: data.resultId },
          data: {
            isRetest: false, // 原始结果不是复测
            retestReason: data.reason
          }
        })

        return {
          task,
          sample: originalResult.sample
        }
      })

      logger.info('Retest requested', {
        taskId: result.task.id,
        originalResultId: data.resultId,
        sampleId: result.sample.id,
        reason: data.reason
      })

      return {
        taskId: result.task.id,
        sampleId: result.sample.id,
        originalResultId: data.resultId,
        reason: data.reason,
        status: result.task.status,
        createdAt: result.task.createdAt
      }
    } catch (error) {
      logger.error('Failed to request retest', { error, data })
      throw error
    }
  }

  /**
   * 映射优先级
   */
  private mapPriority(priority?: string): Priority {
    switch (priority) {
      case 'LOW':
        return Priority.LOW
      case 'HIGH':
        return Priority.HIGH
      case 'URGENT':
        return Priority.URGENT
      default:
        return Priority.NORMAL
    }
  }

  /**
   * 生成 ID
   */
  private generateId(): string {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 将数据库模型映射为响应 DTO
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

export const anomalyDetectionService = new AnomalyDetectionService()
