/**
 * 报告模板验证器
 */

import Joi from 'joi'

// 模板变量验证 schema
const templateVariableSchema = Joi.object({
  name: Joi.string().required().pattern(/^[a-zA-Z_][a-zA-Z0-9_.]*$/).messages({
    'string.pattern.base': '变量名必须以字母或下划线开头，只能包含字母、数字、下划线和点号'
  }),
  type: Joi.string().valid('string', 'number', 'date', 'boolean', 'array', 'object').required(),
  description: Joi.string().optional(),
  required: Joi.boolean().optional(),
  defaultValue: Joi.any().optional(),
  format: Joi.string().optional()
})

// 创建模板验证 schema
export const createTemplateSchema = Joi.object({
  name: Joi.string().required().min(1).max(200).messages({
    'string.empty': '模板名称不能为空',
    'string.min': '模板名称至少需要1个字符',
    'string.max': '模板名称不能超过200个字符'
  }),
  description: Joi.string().optional().max(1000),
  category: Joi.string().required().min(1).max(100).messages({
    'string.empty': '模板分类不能为空'
  }),
  content: Joi.string().required().min(1).messages({
    'string.empty': '模板内容不能为空'
  }),
  variables: Joi.array().items(templateVariableSchema).required().messages({
    'array.base': '变量定义必须是数组'
  })
})

// 更新模板验证 schema
export const updateTemplateSchema = Joi.object({
  name: Joi.string().optional().min(1).max(200),
  description: Joi.string().optional().max(1000).allow(''),
  category: Joi.string().optional().min(1).max(100),
  content: Joi.string().optional().min(1),
  variables: Joi.array().items(templateVariableSchema).optional(),
  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
})

// 查询模板验证 schema
export const queryTemplateSchema = Joi.object({
  category: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  search: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  pageSize: Joi.number().integer().min(1).max(100).optional().default(20)
})
