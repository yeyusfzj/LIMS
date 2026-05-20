/**
 * 异常检测控制器
 * 
 * 处理异常检测规则配置和复测申请相关的 HTTP 请求
 */

import { Request, Response, NextFunction } from 'express'
import { anomalyDetectionService } from '../services/anomalyDetectionService'
import { CreateAnomalyRuleDto, UpdateAnomalyRuleDto, RetestRequestDto } from '../types/anomaly'
import { logger } from '../config/logger'

/**
 * 创建异常检测规则
 * POST /api/anomaly-rules
 */
export async function createAnomalyRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: CreateAnomalyRuleDto = req.body

    // 从认证中间件获取当前用户 ID
    const userId = (req as any).user?.id

    if (!data.createdBy && userId) {
      data.createdBy = userId
    }

    const rule = await anomalyDetectionService.createRule(data)

    res.status(201).json({
      success: true,
      data: rule,
      message: '异常检测规则创建成功'
    })
  } catch (error: any) {
    logger.error('Create anomaly rule failed', { error, body: req.body })
    next(error)
  }
}

/**
 * 获取异常检测规则详情
 * GET /api/anomaly-rules/:id
 */
export async function getAnomalyRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    const rule = await anomalyDetectionService.getRule(id)

    if (!rule) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RULE_NOT_FOUND',
          message: '异常检测规则不存在'
        }
      })
      return
    }

    res.json({
      success: true,
      data: rule
    })
  } catch (error: any) {
    logger.error('Get anomaly rule failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 查询异常检测规则列表
 * GET /api/anomaly-rules
 */
export async function listAnomalyRules(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rules = await anomalyDetectionService.listRules()

    res.json({
      success: true,
      data: rules
    })
  } catch (error: any) {
    logger.error('List anomaly rules failed', { error })
    next(error)
  }
}

/**
 * 更新异常检测规则
 * PUT /api/anomaly-rules/:id
 */
export async function updateAnomalyRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const data: UpdateAnomalyRuleDto = req.body

    const rule = await anomalyDetectionService.updateRule(id, data)

    res.json({
      success: true,
      data: rule,
      message: '异常检测规则更新成功'
    })
  } catch (error: any) {
    logger.error('Update anomaly rule failed', { error, id: req.params.id, body: req.body })
    next(error)
  }
}

/**
 * 删除异常检测规则
 * DELETE /api/anomaly-rules/:id
 */
export async function deleteAnomalyRule(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    await anomalyDetectionService.deleteRule(id)

    res.json({
      success: true,
      message: '异常检测规则删除成功'
    })
  } catch (error: any) {
    logger.error('Delete anomaly rule failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 手动标记结果为异常
 * POST /api/results/:id/mark-abnormal
 */
export async function markResultAbnormal(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body

    if (!reason) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: '请提供异常原因'
        }
      })
      return
    }

    const result = await anomalyDetectionService.markAsAbnormal(id, reason)

    res.json({
      success: true,
      data: result,
      message: '结果已标记为异常'
    })
  } catch (error: any) {
    logger.error('Mark result abnormal failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 申请复测
 * POST /api/results/:id/retest
 */
export async function requestRetest(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { reason, priority } = req.body

    if (!reason) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REASON_REQUIRED',
          message: '请提供复测原因'
        }
      })
      return
    }

    // 从认证中间件获取当前用户 ID
    const userId = (req as any).user?.id

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '未授权'
        }
      })
      return
    }

    const data: RetestRequestDto = {
      resultId: id,
      reason,
      requestedBy: userId,
      priority
    }

    const retestResponse = await anomalyDetectionService.requestRetest(data)

    res.status(201).json({
      success: true,
      data: retestResponse,
      message: '复测申请已创建'
    })
  } catch (error: any) {
    logger.error('Request retest failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 检测结果异常
 * POST /api/results/:id/detect-anomaly
 */
export async function detectResultAnomaly(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    // 获取结果
    const { resultService } = require('../services/resultService')
    const result = await resultService.getResultById(id)

    if (!result) {
      res.status(404).json({
        success: false,
        error: {
          code: 'RESULT_NOT_FOUND',
          message: '结果不存在'
        }
      })
      return
    }

    // 执行异常检测
    const anomalyResult = await anomalyDetectionService.detectAnomaly(result)

    res.json({
      success: true,
      data: anomalyResult,
      message: anomalyResult.isAbnormal ? '检测到异常' : '未检测到异常'
    })
  } catch (error: any) {
    logger.error('Detect result anomaly failed', { error, id: req.params.id })
    next(error)
  }
}
