/**
 * 公式验证器
 * 
 * 验证公式相关的请求数据
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { logger } from '../config/logger'

/**
 * 公式参数定义 Schema
 */
const FormulaParameterSchema = z.object({
  name: z.string().min(1, '参数名称不能为空').regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, '参数名称只能包含字母、数字和下划线，且不能以数字开头'),
  type: z.enum(['number', 'string', 'boolean'], {
    errorMap: () => ({ message: '参数类型必须是 number、string 或 boolean' })
  }),
  description: z.string().optional(),
  required: z.boolean().optional(),
  defaultValue: z.any().optional()
})

/**
 * 创建公式 Schema
 */
const CreateFormulaSchema = z.object({
  name: z.string().min(1, '公式名称不能为空').max(100, '公式名称不能超过100个字符'),
  description: z.string().max(500, '公式描述不能超过500个字符').optional(),
  expression: z.string().min(1, '公式表达式不能为空'),
  parameters: z.array(FormulaParameterSchema).min(1, '至少需要定义一个参数'),
  isActive: z.boolean().optional(),
  createdBy: z.string().optional()
})

/**
 * 更新公式 Schema
 */
const UpdateFormulaSchema = z.object({
  name: z.string().min(1, '公式名称不能为空').max(100, '公式名称不能超过100个字符').optional(),
  description: z.string().max(500, '公式描述不能超过500个字符').optional(),
  expression: z.string().min(1, '公式表达式不能为空').optional(),
  parameters: z.array(FormulaParameterSchema).min(1, '至少需要定义一个参数').optional(),
  isActive: z.boolean().optional()
})

/**
 * 公式计算参数 Schema
 */
const CalculateFormulaSchema = z.object({
  parameters: z.record(z.any()).refine(
    (params) => Object.keys(params).length > 0,
    { message: '参数不能为空' }
  )
})

/**
 * 验证创建公式请求
 */
export function validateCreateFormula(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    CreateFormulaSchema.parse(req.body)
    next()
  } catch (error: any) {
    logger.warn('Create formula validation failed', { error, body: req.body })
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      })
      return
    }
    
    next(error)
  }
}

/**
 * 验证更新公式请求
 */
export function validateUpdateFormula(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    UpdateFormulaSchema.parse(req.body)
    next()
  } catch (error: any) {
    logger.warn('Update formula validation failed', { error, body: req.body })
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      })
      return
    }
    
    next(error)
  }
}

/**
 * 验证公式计算请求
 */
export function validateCalculateFormula(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    CalculateFormulaSchema.parse(req.body)
    next()
  } catch (error: any) {
    logger.warn('Calculate formula validation failed', { error, body: req.body })
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }
      })
      return
    }
    
    next(error)
  }
}
