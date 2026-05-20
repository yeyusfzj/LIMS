/**
 * 检测结果控制器
 * 
 * 处理结果相关的 HTTP 请求
 */

import { Request, Response, NextFunction } from 'express'
import { resultService } from '../services/resultService'
import { importService } from '../services/importService'
import { anomalyDetectionService } from '../services/anomalyDetectionService'
import { CreateResultDto, UpdateResultDto, ResultQuery, FieldMapping } from '../types/result'
import { RetestRequestDto } from '../types/anomaly'
import { logger } from '../config/logger'

/**
 * 创建检测结果
 * POST /api/results
 */
export async function createResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: CreateResultDto = req.body

    // 从认证中间件获取当前用户 ID
    const userId = (req as any).user?.userId

    // 如果请求体中没有提供 enteredBy，使用当前用户 ID
    if (!data.enteredBy && userId) {
      data.enteredBy = userId
    }

    const result = await resultService.createResult(data)

    res.status(201).json({
      success: true,
      data: result,
      message: '结果创建成功'
    })
  } catch (error: any) {
    logger.error('Create result failed', { error, body: req.body })
    next(error)
  }
}

/**
 * 获取结果详情
 * GET /api/results/:id
 */
export async function getResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

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

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Get result failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 查询结果列表
 * GET /api/results
 */
export async function listResults(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query: ResultQuery = {
      sampleId: req.query.sampleId as string,
      testItemId: req.query.testItemId as string,
      parameter: req.query.parameter as string,
      source: req.query.source as any,
      isAbnormal: req.query.isAbnormal === 'true' ? true : req.query.isAbnormal === 'false' ? false : undefined,
      isRetest: req.query.isRetest === 'true' ? true : req.query.isRetest === 'false' ? false : undefined,
      enteredBy: req.query.enteredBy as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined
    }

    const results = await resultService.listResults(query)

    res.json({
      success: true,
      data: results
    })
  } catch (error: any) {
    logger.error('List results failed', { error, query: req.query })
    next(error)
  }
}

/**
 * 更新结果
 * PUT /api/results/:id
 */
export async function updateResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const data: UpdateResultDto = req.body

    const result = await resultService.updateResult(id, data)

    res.json({
      success: true,
      data: result,
      message: '结果更新成功'
    })
  } catch (error: any) {
    logger.error('Update result failed', { error, id: req.params.id, body: req.body })
    next(error)
  }
}

/**
 * 删除结果
 * DELETE /api/results/:id
 */
export async function deleteResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    await resultService.deleteResult(id)

    res.json({
      success: true,
      message: '结果删除成功'
    })
  } catch (error: any) {
    logger.error('Delete result failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 根据样品 ID 获取所有结果
 * GET /api/samples/:sampleId/results
 */
export async function getResultsBySample(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { sampleId } = req.params

    const results = await resultService.getResultsBySampleId(sampleId)

    res.json({
      success: true,
      data: results
    })
  } catch (error: any) {
    logger.error('Get results by sample failed', { error, sampleId: req.params.sampleId })
    next(error)
  }
}

/**
 * 批量导入结果
 * POST /api/results/import
 */
export async function importResults(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 检查是否有上传的文件
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_REQUIRED',
          message: '请上传文件'
        }
      })
      return
    }

    // 获取字段映射配置
    let mapping: FieldMapping
    try {
      mapping = req.body.mapping ? JSON.parse(req.body.mapping) : {}
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MAPPING',
          message: '字段映射配置格式错误'
        }
      })
      return
    }

    // 验证必填的映射字段
    if (!mapping.parameter || !mapping.method) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MAPPING',
          message: '字段映射必须包含 parameter 和 method'
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

    // 执行导入
    const result = await importService.importResults(
      req.file.buffer,
      req.file.originalname,
      mapping,
      userId
    )

    // 根据导入结果返回不同的状态码
    const statusCode = result.success ? 200 : 207 // 207 Multi-Status

    res.status(statusCode).json({
      success: result.success,
      data: result,
      message: result.success 
        ? '导入成功' 
        : `导入完成，但有 ${result.failureCount} 条记录失败`
    })
  } catch (error: any) {
    logger.error('Import results failed', { error })
    next(error)
  }
}

/**
 * 执行公式计算
 * POST /api/results/:id/calculate
 */
export async function calculateResult(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { formulaId } = req.body

    if (!formulaId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FORMULA_ID_REQUIRED',
          message: '请提供公式 ID'
        }
      })
      return
    }

    // 获取结果详情
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

    // 准备计算参数
    const parameters: Record<string, any> = {
      value: result.value,
      ...req.body.parameters
    }

    // 执行公式计算
    const { formulaService } = await import('../services/formulaService')
    const calculationResult = await formulaService.calculateFormula({
      formulaId,
      parameters
    })

    if (!calculationResult.success) {
      res.status(422).json({
        success: false,
        error: {
          code: 'CALCULATION_FAILED',
          message: calculationResult.error || '计算失败'
        }
      })
      return
    }

    // 创建计算结果记录
    const userId = (req as any).user?.id
    const calculatedResult = await resultService.createResult({
      sampleId: result.sampleId,
      testItemId: result.testItemId,
      parameter: req.body.targetParameter || `${result.parameter}_calculated`,
      value: calculationResult.value,
      unit: req.body.targetUnit || result.unit,
      method: result.method,
      source: 'CALCULATED' as any,
      formulaId,
      isCalculated: true,
      enteredBy: userId
    })

    res.status(201).json({
      success: true,
      data: {
        result: calculatedResult,
        calculation: {
          formulaId,
          expression: calculationResult.expression,
          parameters: calculationResult.parameters,
          value: calculationResult.value
        }
      },
      message: '计算完成'
    })
  } catch (error: any) {
    logger.error('Calculate result failed', { error, id: req.params.id })
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
