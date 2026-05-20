/**
 * 检测方法验证器
 */

import Joi from 'joi'

// 设备验证规则
const equipmentSchema = Joi.object({
  name: Joi.string().required().min(1).max(100).messages({
    'string.empty': '设备名称不能为空',
    'any.required': '设备名称是必填项'
  }),
  model: Joi.string().required().min(1).max(100).messages({
    'string.empty': '设备型号不能为空',
    'any.required': '设备型号是必填项'
  }),
  accuracy: Joi.string().optional().allow('').max(100),
  calibration: Joi.string().optional().allow('').max(200)
})

// 步骤验证规则
const stepSchema = Joi.object({
  title: Joi.string().required().min(1).max(200).messages({
    'string.empty': '步骤标题不能为空',
    'any.required': '步骤标题是必填项'
  }),
  description: Joi.string().required().min(1).max(1000).messages({
    'string.empty': '步骤描述不能为空',
    'any.required': '步骤描述是必填项'
  })
})

// 创建检测方法验证规则
export const createMethodSchema = Joi.object({
  code: Joi.string().required().min(1).max(100).messages({
    'string.empty': '方法编号不能为空',
    'any.required': '方法编号是必填项'
  }),
  
  name: Joi.string().required().min(1).max(200).messages({
    'string.empty': '方法名称不能为空',
    'any.required': '方法名称是必填项'
  }),
  
  category: Joi.string().required().min(1).max(100).messages({
    'string.empty': '检测类别不能为空',
    'any.required': '检测类别是必填项'
  }),
  
  version: Joi.string().required().min(1).max(50).messages({
    'string.empty': '版本号不能为空',
    'any.required': '版本号是必填项'
  }),
  
  status: Joi.string().valid('draft', 'active', 'archived').required().messages({
    'any.only': '状态必须是 draft、active 或 archived',
    'any.required': '状态是必填项'
  }),
  
  scope: Joi.string().optional().allow('').max(500),
  description: Joi.string().optional().allow('').max(2000),
  
  equipment: Joi.array().items(equipmentSchema).required().messages({
    'any.required': '设备列表是必填项'
  }),
  
  steps: Joi.array().items(stepSchema).required().messages({
    'any.required': '步骤列表是必填项'
  }),
  
  precision: Joi.string().optional().allow('').max(200),
  accuracy: Joi.string().optional().allow('').max(200),
  detectionLimit: Joi.string().optional().allow('').max(200),
  measurementRange: Joi.string().optional().allow('').max(200),
  qualityControl: Joi.string().optional().allow('').max(1000),
  safetyNotes: Joi.string().optional().allow('').max(1000),
  operationNotes: Joi.string().optional().allow('').max(1000)
})

// 更新检测方法验证规则
export const updateMethodSchema = Joi.object({
  code: Joi.string().optional().min(1).max(100),
  name: Joi.string().optional().min(1).max(200),
  category: Joi.string().optional().min(1).max(100),
  version: Joi.string().optional().min(1).max(50),
  status: Joi.string().valid('draft', 'active', 'archived').optional(),
  scope: Joi.string().optional().allow('').max(500),
  description: Joi.string().optional().allow('').max(2000),
  equipment: Joi.array().items(equipmentSchema).optional(),
  steps: Joi.array().items(stepSchema).optional(),
  precision: Joi.string().optional().allow('').max(200),
  accuracy: Joi.string().optional().allow('').max(200),
  detectionLimit: Joi.string().optional().allow('').max(200),
  measurementRange: Joi.string().optional().allow('').max(200),
  qualityControl: Joi.string().optional().allow('').max(1000),
  safetyNotes: Joi.string().optional().allow('').max(1000),
  operationNotes: Joi.string().optional().allow('').max(1000)
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
})

// 查询检测方法验证规则
export const queryMethodSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  pageSize: Joi.number().integer().min(1).max(100).optional().default(10),
  keyword: Joi.string().optional().max(200),
  category: Joi.string().optional().max(100),
  status: Joi.string().optional().max(50)
})

// UUID验证规则
export const methodIdSchema = Joi.string().uuid().required().messages({
  'string.guid': '方法ID格式不正确',
  'any.required': '方法ID是必填项'
})

// 复制方法验证规则
export const copyMethodSchema = Joi.object({
  version: Joi.string().required().min(1).max(50).messages({
    'string.empty': '版本号不能为空',
    'any.required': '版本号是必填项'
  })
})

