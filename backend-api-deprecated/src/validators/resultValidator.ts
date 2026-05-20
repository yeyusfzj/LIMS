/**
 * 检测结果验证器
 */

import Joi from 'joi'
import { ResultSource } from '@prisma/client'

/**
 * 创建结果验证 schema
 */
export const createResultSchema = Joi.object({
  sampleId: Joi.string().uuid().required().messages({
    'string.guid': '样品 ID 格式不正确',
    'any.required': '样品 ID 是必填项'
  }),
  testItemId: Joi.string().uuid().required().messages({
    'string.guid': '检测项 ID 格式不正确',
    'any.required': '检测项 ID 是必填项'
  }),
  parameter: Joi.string().min(1).max(200).required().messages({
    'string.empty': '检测参数名称不能为空',
    'string.max': '检测参数名称不能超过 200 个字符',
    'any.required': '检测参数名称是必填项'
  }),
  value: Joi.number().optional().messages({
    'number.base': '数值结果必须是数字'
  }),
  textValue: Joi.string().max(1000).optional().messages({
    'string.max': '文本结果不能超过 1000 个字符'
  }),
  unit: Joi.string().max(50).optional().messages({
    'string.max': '单位不能超过 50 个字符'
  }),
  method: Joi.string().min(1).max(200).required().messages({
    'string.empty': '检测方法不能为空',
    'string.max': '检测方法不能超过 200 个字符',
    'any.required': '检测方法是必填项'
  }),
  source: Joi.string()
    .valid(...Object.values(ResultSource))
    .default(ResultSource.MANUAL)
    .messages({
      'any.only': '结果来源必须是 MANUAL、INSTRUMENT 或 CALCULATED 之一'
    }),
  instrumentId: Joi.string().uuid().optional().messages({
    'string.guid': '仪器 ID 格式不正确'
  }),
  enteredBy: Joi.string().uuid().optional().messages({
    'string.guid': '录入人 ID 格式不正确'
  })
}).custom((value, helpers) => {
  // 至少需要提供 value 或 textValue 之一
  if (!value.value && !value.textValue) {
    return helpers.error('any.custom', {
      message: '必须提供数值结果或文本结果'
    })
  }
  return value
})

/**
 * 更新结果验证 schema
 */
export const updateResultSchema = Joi.object({
  value: Joi.number().optional().messages({
    'number.base': '数值结果必须是数字'
  }),
  textValue: Joi.string().max(1000).optional().messages({
    'string.max': '文本结果不能超过 1000 个字符'
  }),
  unit: Joi.string().max(50).optional().messages({
    'string.max': '单位不能超过 50 个字符'
  }),
  method: Joi.string().min(1).max(200).optional().messages({
    'string.empty': '检测方法不能为空',
    'string.max': '检测方法不能超过 200 个字符'
  }),
  source: Joi.string()
    .valid(...Object.values(ResultSource))
    .optional()
    .messages({
      'any.only': '结果来源必须是 MANUAL、INSTRUMENT 或 CALCULATED 之一'
    }),
  instrumentId: Joi.string().uuid().optional().messages({
    'string.guid': '仪器 ID 格式不正确'
  }),
  isAbnormal: Joi.boolean().optional(),
  abnormalReason: Joi.string().max(500).optional().messages({
    'string.max': '异常原因不能超过 500 个字符'
  }),
  reviewedBy: Joi.string().uuid().optional().messages({
    'string.guid': '审核人 ID 格式不正确'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个更新字段'
})

/**
 * 结果查询验证 schema
 */
export const resultQuerySchema = Joi.object({
  sampleId: Joi.string().uuid().optional(),
  testItemId: Joi.string().uuid().optional(),
  parameter: Joi.string().optional(),
  source: Joi.string()
    .valid(...Object.values(ResultSource))
    .optional(),
  isAbnormal: Joi.boolean().optional(),
  isRetest: Joi.boolean().optional(),
  enteredBy: Joi.string().uuid().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
    'date.min': '结束日期必须大于或等于开始日期'
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': '页码必须大于 0'
  }),
  pageSize: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.min': '每页数量必须大于 0',
    'number.max': '每页数量不能超过 100'
  })
})
