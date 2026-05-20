// 请求验证中间件

import { Request, Response, NextFunction } from 'express'
import Joi from 'joi'
import logger from '../config/logger'

/**
 * 验证请求数据的中间件
 * @param schema Joi 验证模式
 * @param source 数据来源：'body' | 'query' | 'params'
 * @param field 如果是 params，指定要验证的字段名
 */
export function validateRequest(
  schema: Joi.Schema,
  source: 'body' | 'query' | 'params' = 'body',
  field?: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    let dataToValidate: any
    
    if (source === 'params' && field) {
      // 验证单个参数
      dataToValidate = req.params[field]
    } else {
      // 验证整个对象
      dataToValidate = req[source]
    }
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true
    })
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
      
      logger.warn('请求验证失败', {
        source,
        field,
        errors,
        path: req.path
      })
      
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: errors
        }
      })
      return
    }
    
    // 将验证后的值替换原始值
    if (source === 'params' && field) {
      req.params[field] = value
    } else {
      req[source] = value
    }
    
    next()
  }
}
