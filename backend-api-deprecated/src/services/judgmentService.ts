/**
 * 质量判定服务
 * 实现自动质量判定、人工复核和判定历史管理
 */

import { PrismaClient, JudgmentResult, SampleStatus } from '@prisma/client'
import {
  CreateJudgmentRuleDto,
  UpdateJudgmentRuleDto,
  JudgmentRuleQuery,
  JudgmentRuleConfig,
  PerformJudgmentDto,
  JudgmentResponse,
  ReviewJudgmentDto,
  JudgmentHistory,
  JudgmentHistoryQuery,
  BatchJudgmentDto,
  BatchJudgmentResult,
  JudgmentRuleType,
  JudgmentBasisDetail,
  JudgmentRuleCondition
} from '../types/judgment'
import { logger } from '../config/logger'
import { evaluate } from 'mathjs'

const prisma = new PrismaClient()

export class JudgmentService {
  /**
   * 创建判定规则
   */
  async createJudgmentRule(dto: CreateJudgmentRuleDto, createdBy: string): Promise<JudgmentRuleConfig> {
    try {
      // 验证判定条件
      this.validateJudgmentConditions(dto.conditions)

      const rule = await prisma.judgmentRule.create({
        data: {
          name: dto.name,
          description: dto.description,
          testItemType: dto.testItemType,
          conditions: dto.conditions as any,
          priority: dto.priority || 0,
          createdBy
        }
      })

      logger.info('创建判定规则成功', { ruleId: rule.id, name: rule.name })
      return this.formatJudgmentRule(rule)
    } catch (error) {
      logger.error('创建判定规则失败', { error, dto })
      throw error
    }
  }

  /**
   * 更新判定规则
   */
  async updateJudgmentRule(ruleId: string, dto: UpdateJudgmentRuleDto): Promise<JudgmentRuleConfig> {
    try {
      // 如果更新条件，需要验证
      if (dto.conditions) {
        this.validateJudgmentConditions(dto.conditions)
      }

      const rule = await prisma.judgmentRule.update({
        where: { id: ruleId },
        data: {
          name: dto.name,
          description: dto.description,
          conditions: dto.conditions as any,
          priority: dto.priority,
          isActive: dto.isActive
        }
      })

      logger.info('更新判定规则成功', { ruleId: rule.id })
      return this.formatJudgmentRule(rule)
    } catch (error) {
      logger.error('更新判定规则失败', { error, ruleId })
      throw error
    }
  }

  /**
   * 查询判定规则列表
   */
  async listJudgmentRules(query: JudgmentRuleQuery): Promise<{
    items: JudgmentRuleConfig[]
    total: number
    page: number
    pageSize: number
  }> {
    const {
      testItemType,
      isActive,
      page = 1,
      pageSize = 20
    } = query

    const where: any = {}
    if (testItemType) where.testItemType = testItemType
    if (isActive !== undefined) where.isActive = isActive

    const [rules, total] = await Promise.all([
      prisma.judgmentRule.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.judgmentRule.count({ where })
    ])

    return {
      items: rules.map(rule => this.formatJudgmentRule(rule)),
      total,
      page,
      pageSize
    }
  }

  /**
   * 获取判定规则详情
   */
  async getJudgmentRule(ruleId: string): Promise<JudgmentRuleConfig> {
    const rule = await prisma.judgmentRule.findUnique({
      where: { id: ruleId }
    })

    if (!rule) {
      throw new Error('判定规则不存在')
    }

    return this.formatJudgmentRule(rule)
  }

  /**
   * 删除判定规则
   */
  async deleteJudgmentRule(ruleId: string): Promise<void> {
    try {
      await prisma.judgmentRule.delete({
        where: { id: ruleId }
      })

      logger.info('删除判定规则成功', { ruleId })
    } catch (error) {
      logger.error('删除判定规则失败', { error, ruleId })
      throw error
    }
  }

  /**
   * 执行质量判定
   */
  async performQualityJudgment(dto: PerformJudgmentDto): Promise<JudgmentResponse> {
    const { sampleId, ruleIds, performedBy } = dto

    try {
      // 获取样品信息和检测结果
      const sample = await prisma.sample.findUnique({
        where: { id: sampleId },
        include: {
          testItems: true,
          results: true
        }
      })

      if (!sample) {
        throw new Error('样品不存在')
      }

      // 检查样品状态
      if (sample.status !== SampleStatus.AUDIT_COMPLETE) {
        throw new Error('只有审核完成的样品才能进行质量判定')
      }

      // 检查是否已有判定结果
      const existingJudgment = await prisma.qualityJudgment.findUnique({
        where: { sampleId }
      })

      if (existingJudgment) {
        throw new Error('该样品已有判定结果，请使用复核功能修改')
      }

      // 获取适用的判定规则
      let rules: any[]
      if (ruleIds && ruleIds.length > 0) {
        // 使用指定的规则
        rules = await prisma.judgmentRule.findMany({
          where: {
            id: { in: ruleIds },
            isActive: true
          },
          orderBy: { priority: 'desc' }
        })
      } else {
        // 自动匹配规则（根据检测项类型）
        const testItemTypes = [...new Set(sample.testItems.map(item => item.testMethod))]
        rules = await prisma.judgmentRule.findMany({
          where: {
            testItemType: { in: testItemTypes },
            isActive: true
          },
          orderBy: { priority: 'desc' }
        })
      }

      if (rules.length === 0) {
        throw new Error('没有找到适用的判定规则')
      }

      // 执行判定逻辑
      const { result, basisDetails } = await this.evaluateJudgment(sample, rules)

      // 保存判定结果
      const judgment = await prisma.qualityJudgment.create({
        data: {
          sampleId,
          result,
          basis: JSON.stringify(basisDetails),
          isAutomatic: true,
          judgedBy: performedBy
        }
      })

      logger.info('质量判定完成', {
        sampleId,
        result,
        rulesApplied: rules.length
      })

      return this.formatJudgmentResponse(judgment, basisDetails)
    } catch (error) {
      logger.error('执行质量判定失败', { error, sampleId })
      throw error
    }
  }

  /**
   * 人工复核判定结果
   */
  async reviewJudgment(dto: ReviewJudgmentDto): Promise<JudgmentResponse> {
    const { judgmentId, newResult, reason, reviewedBy } = dto

    try {
      // 获取原判定结果
      const judgment = await prisma.qualityJudgment.findUnique({
        where: { id: judgmentId }
      })

      if (!judgment) {
        throw new Error('判定结果不存在')
      }

      // 在事务中更新判定结果并记录历史
      const result = await prisma.$transaction(async (tx) => {
        // 记录判定历史
        await tx.judgmentHistory.create({
          data: {
            judgmentId,
            sampleId: judgment.sampleId,
            previousResult: judgment.result,
            newResult,
            changeReason: reason,
            changedBy: reviewedBy
          }
        })

        // 更新判定结果
        const updatedJudgment = await tx.qualityJudgment.update({
          where: { id: judgmentId },
          data: {
            result: newResult,
            reviewedBy,
            reviewedAt: new Date()
          }
        })

        return updatedJudgment
      })

      logger.info('判定结果复核完成', {
        judgmentId,
        previousResult: judgment.result,
        newResult,
        reviewedBy
      })

      const basisDetails = JSON.parse(result.basis)
      return this.formatJudgmentResponse(result, basisDetails)
    } catch (error) {
      logger.error('复核判定结果失败', { error, judgmentId })
      throw error
    }
  }

  /**
   * 获取判定结果
   */
  async getJudgment(sampleId: string): Promise<JudgmentResponse | null> {
    const judgment = await prisma.qualityJudgment.findUnique({
      where: { sampleId }
    })

    if (!judgment) {
      return null
    }

    const basisDetails = JSON.parse(judgment.basis)
    return this.formatJudgmentResponse(judgment, basisDetails)
  }

  /**
   * 查询判定历史
   */
  async listJudgmentHistory(query: JudgmentHistoryQuery): Promise<{
    items: JudgmentHistory[]
    total: number
    page: number
    pageSize: number
  }> {
    const {
      sampleId,
      judgmentId,
      page = 1,
      pageSize = 20
    } = query

    const where: any = {}
    if (sampleId) where.sampleId = sampleId
    if (judgmentId) where.judgmentId = judgmentId

    const [history, total] = await Promise.all([
      prisma.judgmentHistory.findMany({
        where,
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.judgmentHistory.count({ where })
    ])

    return {
      items: history as JudgmentHistory[],
      total,
      page,
      pageSize
    }
  }

  /**
   * 批量判定
   */
  async batchJudgment(dto: BatchJudgmentDto): Promise<BatchJudgmentResult> {
    const { sampleIds, performedBy } = dto
    const results: BatchJudgmentResult['results'] = []

    for (const sampleId of sampleIds) {
      try {
        const judgment = await this.performQualityJudgment({
          sampleId,
          performedBy
        })
        results.push({
          sampleId,
          success: true,
          judgment
        })
      } catch (error: any) {
        results.push({
          sampleId,
          success: false,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    logger.info('批量判定完成', {
      total: sampleIds.length,
      successful,
      failed
    })

    return {
      total: sampleIds.length,
      successful,
      failed,
      results
    }
  }

  /**
   * 评估判定结果
   */
  private async evaluateJudgment(sample: any, rules: any[]): Promise<{
    result: JudgmentResult
    basisDetails: JudgmentBasisDetail[]
  }> {
    const basisDetails: JudgmentBasisDetail[] = []
    let allConditionsPassed = true

    // 遍历所有规则
    for (const rule of rules) {
      const conditions = rule.conditions as JudgmentRuleCondition[]

      // 评估规则的所有条件（AND 关系）
      for (const condition of conditions) {
        const evaluationResult = await this.evaluateCondition(condition, sample)
        basisDetails.push(evaluationResult)

        if (!evaluationResult.evaluationResult) {
          allConditionsPassed = false
        }
      }
    }

    // 根据评估结果确定判定结果
    const result = allConditionsPassed ? JudgmentResult.QUALIFIED : JudgmentResult.UNQUALIFIED

    return { result, basisDetails }
  }

  /**
   * 评估单个判定条件
   */
  private async evaluateCondition(
    condition: JudgmentRuleCondition,
    sample: any
  ): Promise<JudgmentBasisDetail> {
    const { type, parameter, minValue, maxValue, formula, logicExpression } = condition

    switch (type) {
      case JudgmentRuleType.RANGE:
        return this.evaluateRangeCondition(condition, sample)

      case JudgmentRuleType.FORMULA:
        return this.evaluateFormulaCondition(condition, sample)

      case JudgmentRuleType.LOGIC:
        return this.evaluateLogicCondition(condition, sample)

      default:
        throw new Error(`不支持的判定条件类型: ${type}`)
    }
  }

  /**
   * 评估范围条件
   */
  private evaluateRangeCondition(
    condition: JudgmentRuleCondition,
    sample: any
  ): JudgmentBasisDetail {
    const { parameter, minValue, maxValue } = condition

    // 查找对应参数的检测结果
    const result = sample.results.find((r: any) => r.parameter === parameter)

    if (!result) {
      return {
        ruleId: 'range',
        ruleName: '范围判定',
        conditionType: JudgmentRuleType.RANGE,
        parameter,
        evaluationResult: false,
        message: `未找到参数 ${parameter} 的检测结果`
      }
    }

    const actualValue = result.value
    let passed = true
    let message = `参数 ${parameter} 的值为 ${actualValue}`

    if (minValue !== undefined && actualValue < minValue) {
      passed = false
      message += `，低于最小值 ${minValue}`
    }

    if (maxValue !== undefined && actualValue > maxValue) {
      passed = false
      message += `，超过最大值 ${maxValue}`
    }

    if (passed) {
      message += `，在合格范围内 [${minValue ?? '-∞'}, ${maxValue ?? '+∞'}]`
    }

    return {
      ruleId: 'range',
      ruleName: '范围判定',
      conditionType: JudgmentRuleType.RANGE,
      parameter,
      actualValue,
      expectedRange: { min: minValue, max: maxValue },
      evaluationResult: passed,
      message
    }
  }

  /**
   * 评估公式条件
   */
  private evaluateFormulaCondition(
    condition: JudgmentRuleCondition,
    sample: any
  ): JudgmentBasisDetail {
    const { formula, expectedResult } = condition

    if (!formula) {
      throw new Error('公式条件缺少公式表达式')
    }

    try {
      // 构建变量映射
      const variables: Record<string, number> = {}
      for (const result of sample.results) {
        variables[result.parameter] = result.value
      }

      // 计算公式
      const calculatedValue = evaluate(formula, variables)
      const passed = calculatedValue > 0 // 公式结果 > 0 表示合格

      return {
        ruleId: 'formula',
        ruleName: '公式判定',
        conditionType: JudgmentRuleType.FORMULA,
        formula,
        calculatedValue,
        evaluationResult: passed,
        message: `公式 ${formula} 计算结果为 ${calculatedValue}，${passed ? '合格' : '不合格'}`
      }
    } catch (error: any) {
      return {
        ruleId: 'formula',
        ruleName: '公式判定',
        conditionType: JudgmentRuleType.FORMULA,
        formula,
        evaluationResult: false,
        message: `公式计算失败: ${error.message}`
      }
    }
  }

  /**
   * 评估逻辑表达式条件
   */
  private evaluateLogicCondition(
    condition: JudgmentRuleCondition,
    sample: any
  ): JudgmentBasisDetail {
    const { logicExpression } = condition

    if (!logicExpression) {
      throw new Error('逻辑条件缺少逻辑表达式')
    }

    try {
      // 构建变量映射
      const variables: Record<string, any> = {}
      for (const result of sample.results) {
        variables[result.parameter] = result.value
      }

      // 评估逻辑表达式
      const passed = evaluate(logicExpression, variables)

      return {
        ruleId: 'logic',
        ruleName: '逻辑判定',
        conditionType: JudgmentRuleType.LOGIC,
        logicExpression,
        evaluationResult: Boolean(passed),
        message: `逻辑表达式 ${logicExpression} 评估结果为 ${passed ? '真' : '假'}`
      }
    } catch (error: any) {
      return {
        ruleId: 'logic',
        ruleName: '逻辑判定',
        conditionType: JudgmentRuleType.LOGIC,
        logicExpression,
        evaluationResult: false,
        message: `逻辑表达式评估失败: ${error.message}`
      }
    }
  }

  /**
   * 验证判定条件
   */
  private validateJudgmentConditions(conditions: JudgmentRuleCondition[]): void {
    if (!conditions || conditions.length === 0) {
      throw new Error('判定条件不能为空')
    }

    for (const condition of conditions) {
      switch (condition.type) {
        case JudgmentRuleType.RANGE:
          if (!condition.parameter) {
            throw new Error('范围判定条件必须指定参数名称')
          }
          if (condition.minValue === undefined && condition.maxValue === undefined) {
            throw new Error('范围判定条件必须指定最小值或最大值')
          }
          break

        case JudgmentRuleType.FORMULA:
          if (!condition.formula) {
            throw new Error('公式判定条件必须指定公式表达式')
          }
          break

        case JudgmentRuleType.LOGIC:
          if (!condition.logicExpression) {
            throw new Error('逻辑判定条件必须指定逻辑表达式')
          }
          break

        default:
          throw new Error(`不支持的判定条件类型: ${condition.type}`)
      }
    }
  }

  /**
   * 格式化判定规则
   */
  private formatJudgmentRule(rule: any): JudgmentRuleConfig {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      testItemType: rule.testItemType,
      conditions: rule.conditions,
      priority: rule.priority,
      isActive: rule.isActive,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt
    }
  }

  /**
   * 格式化判定响应
   */
  private formatJudgmentResponse(
    judgment: any,
    basisDetails: JudgmentBasisDetail[]
  ): JudgmentResponse {
    return {
      id: judgment.id,
      sampleId: judgment.sampleId,
      result: judgment.result,
      basis: judgment.basis,
      basisDetails,
      isAutomatic: judgment.isAutomatic,
      judgedBy: judgment.judgedBy,
      judgedAt: judgment.judgedAt,
      reviewedBy: judgment.reviewedBy,
      reviewedAt: judgment.reviewedAt
    }
  }
}

export const judgmentService = new JudgmentService()
