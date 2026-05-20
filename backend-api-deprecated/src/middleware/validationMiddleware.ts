/**
 * 请求验证中间件
 * 用于验证请求参数、查询字符串和请求体
 */

import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'

/**
 * 验证位置类型
 */
export type ValidateLocation = 'body' | 'query' | 'params'

/**
 * 创建验证中间件
 * @param schema Joi 验证模式
 * @param location 验证位置（body, query, params）
 * @returns Express 中间件函数
 */
export function validate(schema: Joi.Schema, location: ValidateLocation = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    // 获取要验证的数据
    const data = req[location]

    // 执行验证
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有错误，而不是第一个错误
      stripUnknown: true, // 移除未知字段
      convert: true // 自动类型转换
    })

    // 如果验证失败
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: { fields: errors },
          timestamp: new Date().toISOString(),
          path: req.path
        }
      })
    }

    // 验证成功，将清洗后的数据替换原数据
    req[location] = value

    next()
  }
}

/**
 * 验证多个位置的数据
 * @param schemas 验证模式映射
 * @returns Express 中间件函数
 */
export function validateMultiple(schemas: Partial<Record<ValidateLocation, Joi.Schema>>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const allErrors: Array<{ field: string; message: string }> = []

    // 验证每个位置的数据
    for (const [location, schema] of Object.entries(schemas)) {
      const data = req[location as ValidateLocation]
      const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      })

      if (error) {
        const errors = error.details.map(detail => ({
          field: `${location}.${detail.path.join('.')}`,
          message: detail.message
        }))
        allErrors.push(...errors)
      } else {
        // 验证成功，更新数据
        req[location as ValidateLocation] = value
      }
    }

    // 如果有任何验证错误
    if (allErrors.length > 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: { fields: allErrors },
          timestamp: new Date().toISOString(),
          path: req.path
        }
      })
    }

    next()
  }
}

/**
 * 通用验证规则
 */
export const commonSchemas = {
  // UUID 验证
  uuid: Joi.string().uuid().required().messages({
    'string.guid': 'ID格式不正确',
    'any.required': 'ID是必填项'
  }),

  // 分页参数验证
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional().default(1),
    pageSize: Joi.number().integer().min(1).max(100).optional().default(20)
  }),

  // 日期范围验证
  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional().when('startDate', {
      is: Joi.exist(),
      then: Joi.date().min(Joi.ref('startDate')).messages({
        'date.min': '结束日期必须大于或等于开始日期'
      })
    })
  }),

  // ID 参数验证
  idParam: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.guid': 'ID格式不正确',
      'any.required': 'ID是必填项'
    })
  })
}

/**
 * 输入清洗函数
 * 防止 XSS 攻击
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    // 移除潜在的 HTML 标签和脚本
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim()
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}

/**
 * 输入清洗中间件
 * 自动清洗请求体、查询参数和路径参数
 */
export function sanitizeMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeInput(req.body)
  }

  if (req.query) {
    req.query = sanitizeInput(req.query)
  }

  if (req.params) {
    req.params = sanitizeInput(req.params)
  }

  next()
}
