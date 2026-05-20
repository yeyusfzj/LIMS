import Joi from 'joi'
import { UserStatus } from '@prisma/client'

/**
 * 创建用户验证规则
 */
export const createUserSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .required()
    .messages({
      'string.min': '用户名至少需要3个字符',
      'string.max': '用户名最多50个字符',
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'any.required': '用户名为必填项'
    }),
  password: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': '密码至少需要8个字符',
      'string.max': '密码最多100个字符',
      'string.pattern.base': '密码必须包含大小写字母、数字和特殊字符',
      'any.required': '密码为必填项'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'any.required': '邮箱为必填项'
    }),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': '姓名至少需要2个字符',
      'string.max': '姓名最多100个字符',
      'any.required': '姓名为必填项'
    }),
  department: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '部门名称最多100个字符'
    }),
  position: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '职位名称最多100个字符'
    }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': '手机号码格式不正确'
    }),
  roleIds: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': '角色ID必须是数组',
      'string.uuid': '角色ID格式不正确'
    })
})

/**
 * 更新用户验证规则
 */
export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': '邮箱格式不正确'
    }),
  fullName: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': '姓名至少需要2个字符',
      'string.max': '姓名最多100个字符'
    }),
  department: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '部门名称最多100个字符'
    }),
  position: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': '职位名称最多100个字符'
    }),
  phone: Joi.string()
    .pattern(/^1[3-9]\d{9}$/)
    .optional()
    .allow('')
    .messages({
      'string.pattern.base': '手机号码格式不正确'
    }),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': '用户状态值无效'
    }),
  roleIds: Joi.array()
    .items(Joi.string().uuid())
    .optional()
    .messages({
      'array.base': '角色ID必须是数组',
      'string.uuid': '角色ID格式不正确'
    })
})

/**
 * 重置密码验证规则
 */
export const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': '密码至少需要8个字符',
      'string.max': '密码最多100个字符',
      'string.pattern.base': '密码必须包含大小写字母、数字和特殊字符',
      'any.required': '新密码为必填项'
    })
})

/**
 * 用户查询验证规则
 */
export const userQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .messages({
      'number.min': '页码必须大于0'
    }),
  pageSize: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'number.min': '每页数量必须大于0',
      'number.max': '每页数量不能超过100'
    }),
  username: Joi.string()
    .optional(),
  email: Joi.string()
    .optional(),
  fullName: Joi.string()
    .optional(),
  department: Joi.string()
    .optional(),
  status: Joi.string()
    .valid(...Object.values(UserStatus))
    .optional()
    .messages({
      'any.only': '用户状态值无效'
    }),
  roleId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': '角色ID格式不正确'
    })
})
