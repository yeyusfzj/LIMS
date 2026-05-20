import Joi from 'joi'

/**
 * 创建角色验证规则
 */
export const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': '角色名称不能为空',
      'string.min': '角色名称至少需要2个字符',
      'string.max': '角色名称不能超过50个字符',
      'any.required': '角色名称是必填项'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': '角色描述不能超过500个字符'
    }),
  permissionIds: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': '权限ID列表必须是数组',
      'string.guid': '权限ID格式不正确'
    })
})

/**
 * 更新角色验证规则
 */
export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': '角色名称至少需要2个字符',
      'string.max': '角色名称不能超过50个字符'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': '角色描述不能超过500个字符'
    }),
  permissionIds: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': '权限ID列表必须是数组',
      'string.guid': '权限ID格式不正确'
    })
})

/**
 * 分配权限验证规则
 */
export const assignPermissionsSchema = Joi.object({
  permissionIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.base': '权限ID列表必须是数组',
      'array.min': '至少需要分配一个权限',
      'string.guid': '权限ID格式不正确',
      'any.required': '权限ID列表是必填项'
    })
})

/**
 * 创建权限验证规则
 */
export const createPermissionSchema = Joi.object({
  resource: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': '资源类型不能为空',
      'string.min': '资源类型至少需要2个字符',
      'string.max': '资源类型不能超过50个字符',
      'any.required': '资源类型是必填项'
    }),
  action: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': '操作类型不能为空',
      'string.min': '操作类型至少需要2个字符',
      'string.max': '操作类型不能超过50个字符',
      'any.required': '操作类型是必填项'
    })
})

/**
 * 验证中间件工厂函数
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body, { abortEarly: false })

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '请求参数验证失败',
          details: { fields: errors }
        }
      })
    }

    next()
  }
}
