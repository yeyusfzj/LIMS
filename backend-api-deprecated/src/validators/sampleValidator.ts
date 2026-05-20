// 样品数据验证器

import Joi from 'joi'
import { SampleStatus, Priority } from '@prisma/client'

// 创建样品验证规则
export const createSampleSchema = Joi.object({
  clientName: Joi.string().required().min(1).max(200).messages({
    'string.empty': '客户名称不能为空',
    'string.min': '客户名称至少1个字符',
    'string.max': '客户名称最大200个字符',
    'any.required': '客户名称是必填项'
  }),
  
  clientContact: Joi.string().optional().allow('').max(100),
  
  sampleName: Joi.string().required().min(1).max(200).messages({
    'string.empty': '样品名称不能为空',
    'string.min': '样品名称至少1个字符',
    'string.max': '样品名称最大200个字符',
    'any.required': '样品名称是必填项'
  }),
  
  sampleType: Joi.string().required().min(1).max(100).messages({
    'string.empty': '样品类型不能为空',
    'any.required': '样品类型是必填项'
  }),
  
  sampleCategory: Joi.string().required().min(1).max(100).messages({
    'string.empty': '样品类别不能为空',
    'any.required': '样品类别是必填项'
  }),
  
  quantity: Joi.number().required().positive().messages({
    'number.base': '数量必须是数字',
    'number.positive': '数量必须大于0',
    'any.required': '数量是必填项'
  }),
  
  unit: Joi.string().required().min(1).max(20).messages({
    'string.empty': '单位不能为空',
    'any.required': '单位是必填项'
  }),
  
  receivedDate: Joi.date().required().messages({
    'date.base': '接收日期格式不正确',
    'any.required': '接收日期是必填项'
  }),
  
  samplingDate: Joi.date().optional().allow(null),
  
  samplingLocation: Joi.string().optional().allow('').max(200),
  
  samplingPerson: Joi.string().optional().allow('').max(100),
  
  storageLocation: Joi.string().optional().allow('').max(200),
  
  storageCondition: Joi.string().optional().allow('').max(200),
  
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  
  description: Joi.string().optional().allow('').max(1000),
  
  remarks: Joi.string().optional().allow('').max(1000)
})

// 更新样品验证规则
export const updateSampleSchema = Joi.object({
  clientName: Joi.string().optional().min(1).max(200),
  
  clientContact: Joi.string().optional().allow('').max(100),
  
  sampleName: Joi.string().optional().min(1).max(200),
  
  sampleType: Joi.string().optional().min(1).max(100),
  
  sampleCategory: Joi.string().optional().min(1).max(100),
  
  quantity: Joi.number().optional().positive(),
  
  unit: Joi.string().optional().min(1).max(20),
  
  samplingDate: Joi.date().optional().allow(null),
  
  samplingLocation: Joi.string().optional().allow('').max(200),
  
  samplingPerson: Joi.string().optional().allow('').max(100),
  
  storageLocation: Joi.string().optional().allow('').max(200),
  
  storageCondition: Joi.string().optional().allow('').max(200),
  
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  
  description: Joi.string().optional().allow('').max(1000),
  
  remarks: Joi.string().optional().allow('').max(1000),
  
  status: Joi.string().valid(...Object.values(SampleStatus)).optional()
}).min(1).messages({
  'object.min': '至少需要提供一个要更新的字段'
})

// 查询样品验证规则
export const querySampleSchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  
  pageSize: Joi.number().integer().min(1).max(100).optional().default(20),
  
  barcode: Joi.string().optional(),
  
  sampleNumber: Joi.string().optional(),
  
  clientName: Joi.string().optional(),
  
  sampleType: Joi.string().optional(),
  
  status: Joi.string().valid(...Object.values(SampleStatus)).optional(),
  
  priority: Joi.string().valid(...Object.values(Priority)).optional(),
  
  startDate: Joi.date().optional(),
  
  endDate: Joi.date().optional().when('startDate', {
    is: Joi.exist(),
    then: Joi.date().min(Joi.ref('startDate')).messages({
      'date.min': '结束日期必须大于或等于开始日期'
    })
  })
})

// UUID 验证规则
export const uuidSchema = Joi.string().uuid().required().messages({
  'string.guid': 'ID格式不正确',
  'any.required': 'ID是必填项'
})

// 样品流转验证规则
export const transferSampleSchema = Joi.object({
  fromLocation: Joi.string().required().min(1).max(200).messages({
    'string.empty': '起始位置不能为空',
    'string.max': '起始位置最大200个字符',
    'any.required': '起始位置是必填项'
  }),
  
  toLocation: Joi.string().required().min(1).max(200).messages({
    'string.empty': '目标位置不能为空',
    'string.max': '目标位置最大200个字符',
    'any.required': '目标位置是必填项'
  }),
  
  fromPerson: Joi.string().required().min(1).max(100).messages({
    'string.empty': '发送人不能为空',
    'string.max': '发送人最大100个字符',
    'any.required': '发送人是必填项'
  }),
  
  toPerson: Joi.string().required().min(1).max(100).messages({
    'string.empty': '接收人不能为空',
    'string.max': '接收人最大100个字符',
    'any.required': '接收人是必填项'
  }),
  
  remarks: Joi.string().optional().allow('').max(500).messages({
    'string.max': '备注最大500个字符'
  })
})

// 流转确认验证规则
export const confirmTransferSchema = Joi.object({
  confirmationType: Joi.string().valid('sender', 'receiver').required().messages({
    'any.only': '确认类型必须是 sender 或 receiver',
    'any.required': '确认类型是必填项'
  })
})

// 分样验证规则
export const splitSampleSchema = Joi.object({
  childSamples: Joi.array().items(
    Joi.object({
      sampleName: Joi.string().required().min(1).max(200).messages({
        'string.empty': '子样品名称不能为空',
        'string.max': '子样品名称最大200个字符',
        'any.required': '子样品名称是必填项'
      }),
      
      quantity: Joi.number().required().positive().messages({
        'number.base': '数量必须是数字',
        'number.positive': '数量必须大于0',
        'any.required': '数量是必填项'
      }),
      
      unit: Joi.string().required().min(1).max(20).messages({
        'string.empty': '单位不能为空',
        'any.required': '单位是必填项'
      }),
      
      storageLocation: Joi.string().optional().allow('').max(200),
      storageCondition: Joi.string().optional().allow('').max(200),
      description: Joi.string().optional().allow('').max(1000),
      remarks: Joi.string().optional().allow('').max(1000)
    })
  ).min(1).required().messages({
    'array.min': '至少需要创建一个子样品',
    'any.required': '子样品信息是必填项'
  })
})

// 合样验证规则
export const mergeSamplesSchema = Joi.object({
  sourceSampleIds: Joi.array().items(
    Joi.string().uuid().messages({
      'string.guid': '样品ID格式不正确'
    })
  ).min(2).required().messages({
    'array.min': '至少需要两个来源样品',
    'any.required': '来源样品ID是必填项'
  }),
  
  mergedSample: Joi.object({
    sampleName: Joi.string().required().min(1).max(200).messages({
      'string.empty': '合并样品名称不能为空',
      'string.max': '合并样品名称最大200个字符',
      'any.required': '合并样品名称是必填项'
    }),
    
    sampleType: Joi.string().required().min(1).max(100).messages({
      'string.empty': '样品类型不能为空',
      'any.required': '样品类型是必填项'
    }),
    
    sampleCategory: Joi.string().required().min(1).max(100).messages({
      'string.empty': '样品类别不能为空',
      'any.required': '样品类别是必填项'
    }),
    
    quantity: Joi.number().required().positive().messages({
      'number.base': '数量必须是数字',
      'number.positive': '数量必须大于0',
      'any.required': '数量是必填项'
    }),
    
    unit: Joi.string().required().min(1).max(20).messages({
      'string.empty': '单位不能为空',
      'any.required': '单位是必填项'
    }),
    
    storageLocation: Joi.string().optional().allow('').max(200),
    storageCondition: Joi.string().optional().allow('').max(200),
    description: Joi.string().optional().allow('').max(1000),
    remarks: Joi.string().optional().allow('').max(1000)
  }).required().messages({
    'any.required': '合并样品信息是必填项'
  })
})

// 流转查询验证规则
export const queryTransferSchema = Joi.object({
  // 分页参数
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
  
  // 搜索参数
  sampleNumber: Joi.string().optional().max(50).messages({
    'string.max': '样品编号最大50个字符'
  }),
  
  status: Joi.string().optional().valid('PENDING', 'IN_TRANSIT', 'RECEIVED', 'REJECTED').messages({
    'any.only': '状态必须是 PENDING、IN_TRANSIT、RECEIVED 或 REJECTED 之一'
  }),
  
  // 日期参数
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
  }),
  
  // 流转相关参数
  fromLocation: Joi.string().optional().max(200).messages({
    'string.max': '起始位置最大200个字符'
  }),
  
  toLocation: Joi.string().optional().max(200).messages({
    'string.max': '目标位置最大200个字符'
  }),
  
  fromPerson: Joi.string().optional().max(100).messages({
    'string.max': '交接人最大100个字符'
  }),
  
  toPerson: Joi.string().optional().max(100).messages({
    'string.max': '接收人最大100个字符'
  })
})
