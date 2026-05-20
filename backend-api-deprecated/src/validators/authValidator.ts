import Joi from 'joi'

// 登录验证规则
export const loginSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.empty': '用户名不能为空',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多50个字符',
      'any.required': '用户名是必填项'
    }),
  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': '密码不能为空',
      'string.min': '密码至少8个字符',
      'any.required': '密码是必填项'
    })
})

// 刷新令牌验证规则
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': '刷新令牌不能为空',
      'any.required': '刷新令牌是必填项'
    })
})
