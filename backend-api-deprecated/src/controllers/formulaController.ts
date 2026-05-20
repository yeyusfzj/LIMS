/**
 * 公式控制器
 * 
 * 处理公式相关的 HTTP 请求
 */

import { Request, Response, NextFunction } from 'express'
import { formulaService } from '../services/formulaService'
import {
  CreateFormulaDto,
  UpdateFormulaDto,
  FormulaQuery,
  FormulaCalculationInput
} from '../types/formula'
import { logger } from '../config/logger'

/**
 * 创建公式
 * POST /api/formulas
 */
export async function createFormula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data: CreateFormulaDto = req.body

    // 从认证中间件获取当前用户 ID
    const userId = (req as any).user?.id

    // 如果请求体中没有提供 createdBy，使用当前用户 ID
    if (!data.createdBy && userId) {
      data.createdBy = userId
    }

    const formula = await formulaService.createFormula(data)

    res.status(201).json({
      success: true,
      data: formula,
      message: '公式创建成功'
    })
  } catch (error: any) {
    logger.error('Create formula failed', { error, body: req.body })
    next(error)
  }
}

/**
 * 获取公式详情
 * GET /api/formulas/:id
 */
export async function getFormula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    const formula = await formulaService.getFormulaById(id)

    if (!formula) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FORMULA_NOT_FOUND',
          message: '公式不存在'
        }
      })
      return
    }

    res.json({
      success: true,
      data: formula
    })
  } catch (error: any) {
    logger.error('Get formula failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 查询公式列表
 * GET /api/formulas
 */
export async function listFormulas(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query: FormulaQuery = {
      name: req.query.name as string,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      createdBy: req.query.createdBy as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined
    }

    const formulas = await formulaService.listFormulas(query)

    res.json({
      success: true,
      data: formulas
    })
  } catch (error: any) {
    logger.error('List formulas failed', { error, query: req.query })
    next(error)
  }
}

/**
 * 更新公式
 * PUT /api/formulas/:id
 */
export async function updateFormula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const data: UpdateFormulaDto = req.body

    const formula = await formulaService.updateFormula(id, data)

    res.json({
      success: true,
      data: formula,
      message: '公式更新成功'
    })
  } catch (error: any) {
    logger.error('Update formula failed', { error, id: req.params.id, body: req.body })
    next(error)
  }
}

/**
 * 删除公式
 * DELETE /api/formulas/:id
 */
export async function deleteFormula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params

    await formulaService.deleteFormula(id)

    res.json({
      success: true,
      message: '公式删除成功'
    })
  } catch (error: any) {
    logger.error('Delete formula failed', { error, id: req.params.id })
    next(error)
  }
}

/**
 * 执行公式计算
 * POST /api/formulas/:id/calculate
 */
export async function calculateFormula(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params
    const { parameters } = req.body

    if (!parameters || typeof parameters !== 'object') {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PARAMETERS',
          message: '参数格式错误'
        }
      })
      return
    }

    const input: FormulaCalculationInput = {
      formulaId: id,
      parameters
    }

    const result = await formulaService.calculateFormula(input)

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'CALCULATION_FAILED',
          message: result.error
        }
      })
      return
    }

    res.json({
      success: true,
      data: result
    })
  } catch (error: any) {
    logger.error('Calculate formula failed', { error, id: req.params.id, body: req.body })
    next(error)
  }
}
