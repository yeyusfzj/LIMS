// 仪器数据验证器

import Joi from 'joi'
import { InstrumentStatus } from '@prisma/client'

// 创建仪器验证规则
export const createInstrumentSchema = Joi.object({
  code: Joi.string().required().min(1).max(100).messages({
    'string.empty': '仪器编码不能为空',
    'string.min': '仪器编码至少1个字符',
    'string.max': '仪器编码最大100个字符',
    'any.required': '仪器编码是必填项'
  }),
  
  name: Joi.string().required().min(1).max(200).messages({
    'string.empty': '仪器名称不能为空',
    'string.min': '仪器名称至少1个字符',
    'string.max': '仪器名称最大200个字符',
    'any.required': '仪器名称是必填项'
  }),
  
  model: Joi.string().optional().allow('').max(100).messages({
    'string.max': '型号最大100个字符'
  }),
  
  manufacturer: Joi.string().optional().allow('').max(100).messages({
    'string.max': '制造商最大100个字符'
  }),
  
  serialNumber: Joi.string().optional().allow('').max(100).messages({
    'string.max': '序列号最大100个字符'
  }),
  
  purchaseDate: Joi.date().optional().allow(null).messages({
    'date.base': '购置日期格式不正确'
  }),
  
  purchasePrice: Joi.number().optional().allow(null).positive().messages({
    'number.base': '购置价格必须是数字',
    'number.positive': '购置价格必须大于0'
  }),
  
  technicalParams: Joi.object().optional().allow(null),
  
  status: Joi.string().valid(...Object.values(InstrumentStatus)).optional().messages({
    'any.only': '状态必须是有效的仪器状态'
  }),
  
  currentLocation: Joi.string().optional().allow('').max(200).messages({
    'string.max': '当前位置最大200个字符'
  }),
  
  currentDepartment: Joi.string().optional().allow('').max(100).messages({
    'string.max': '当前部门最大100个字符'
  }),
  
  currentResponsible: Joi.string().optional().allow('').max(100).messages({
    'string.max': '当前负责人最大100个字符'
  }),
  
  usageYears: Joi.number().optional().allow(null).integer().min(0).messages({
    'number.base': '使用年限必须是数字',
    'number.integer': '使用年限必须是整数',
    'number.min': '使用年限不能为负数'
  }),
  
  warrantyExpiry: Joi.date().optional().allow(null).messages({
    'date.base': '保修到期日期格式不正确'
  }),
  
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.max': '描述最大1000个字符'
  }),
  
  remarks: Joi.string().optional().allow('').max(1000).messages({
    'string.max': '备注最大1000个字符'
  })
})

// 更新仪器验证规则
export const updateInstrumentSchema = Joi.object({
  name: Joi.string().optional().min(1).max(200).messages({
    'string.empty': '仪器名称不能为空',
    'string.min': '仪器名称至少1个字符',
    'string.max': '仪器名称最大200个字符'
  }),
  
  model: Joi.string().optional().allow('').max(100).messages({
    'string.max': '型号最大100个字符'
  }),
  
  manufacturer: Joi.string().optional().allow('').max(100).messages({
    'string.max': '制造商最大100个字符'
  }),
  
  serialNumber: Joi.string().optional().allow('').max(100).messages({
    'string.max': '序列号最大100个字符'
  }),
  
  purchaseDate: Joi.date().optional().allow(null).messages({
    'date.base': '购置日期格式不正确'
  }),
  
  purchasePrice: Joi.number().optional().allow(null).positive().messages({
    'number.base': '购置价格必须是数字',
    'number.positive': '购置价格必须大于0'
  }),
  
  technicalParams: Joi.object().optional().allow(null),
  
  status: Joi.string().valid(...Object.values(InstrumentStatus)).optional().messages({
    'any.only': '状态必须是有效的仪器状态'
  }),
  
  currentLocation: Joi.string().optional().allow('').max(200).messages({
    'string.max': '当前位置最大200个字符'
  }),
  
  currentDepartment: Joi.string().optional().allow('').max(100).messages({
    'string.max': '当前部门最大100个字符'
  }),
  
  currentResponsible: Joi.string().optional().allow('').max(100).messages({
    'string.max': '当前负责人最大100个字符'
  }),
  
  usageYears: Joi.number().optional().allow(null).integer().min(0).messages({
    'number.base': '使用年限必须是数字',
    'number.integer': '使用年限必须是整数',
    'number.min': '使用年限不能为负数'
  }),
  
  warrantyExpiry: Joi.date().optional().allow(null).messages({
    'date.base': '保修到期日期格式不正确'
  }),
  
  description: Joi.string().optional().allow('').max(1000).messages({
    'string.max': '描述最大1000个字符'
  }),
  
  remarks: Joi.string().optional().allow('').max(1000).messages({
    'string.max': '备注最大1000个字符'
  })
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
})

// 查询仪器验证规则
export const queryInstrumentSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1).messages({
    'number.base': '页码必须是数字',
    'number.integer': '页码必须是整数',
    'number.min': '页码必须大于0'
  }),
  
  pageSize: Joi.number().integer().min(1).max(100).optional().default(20).messages({
    'number.base': '每页大小必须是数字',
    'number.integer': '每页大小必须是整数',
    'number.min': '每页大小必须大于0',
    'number.max': '每页大小不能超过100'
  }),
  
  code: Joi.string().optional().max(100).messages({
    'string.max': '仪器编码最大100个字符'
  }),
  
  name: Joi.string().optional().max(200).messages({
    'string.max': '仪器名称最大200个字符'
  }),
  
  status: Joi.string().valid(...Object.values(InstrumentStatus)).optional().messages({
    'any.only': '状态必须是有效的仪器状态'
  }),
  
  department: Joi.string().optional().max(100).messages({
    'string.max': '部门最大100个字符'
  }),
  
  location: Joi.string().optional().max(200).messages({
    'string.max': '位置最大200个字符'
  }),
  
  manufacturer: Joi.string().optional().max(100).messages({
    'string.max': '制造商最大100个字符'
  }),
  
  search: Joi.string().optional().max(200).messages({
    'string.max': '搜索关键词最大200个字符'
  }),
  
  startDate: Joi.date().iso().optional().messages({
    'date.base': '开始日期格式不正确',
    'date.format': '开始日期必须是ISO格式（YYYY-MM-DD）'
  }),
  
  endDate: Joi.date().iso().optional().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('startDate')).messages({
      'date.min': '结束日期必须大于或等于开始日期'
    })
  }).messages({
    'date.base': '结束日期格式不正确',
    'date.format': '结束日期必须是ISO格式（YYYY-MM-DD）'
  })
})

// UUID 验证规则
export const uuidSchema = Joi.string().uuid().required().messages({
  'string.guid': 'ID格式不正确',
  'any.required': 'ID是必填项'
})
