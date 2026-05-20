/**
 * 安全配置
 * 集中管理 Helmet、CORS、速率限制等安全相关配置
 */

import { HelmetOptions } from 'helmet'
import { CorsOptions } from 'cors'
import { config } from './env'

/**
 * Helmet 安全头配置
 * 设置各种 HTTP 安全头以防止常见的 Web 漏洞
 */
export const helmetConfig: HelmetOptions = {
  // Content Security Policy - 防止 XSS 攻击
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },

  // DNS Prefetch Control - 控制浏览器的 DNS 预取
  dnsPrefetchControl: {
    allow: false
  },

  // Frame Guard - 防止点击劫持
  frameguard: {
    action: 'deny'
  },

  // Hide Powered By - 隐藏 X-Powered-By 头
  hidePoweredBy: true,

  // HSTS - 强制使用 HTTPS
  hsts: {
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true
  },

  // IE No Open - 防止 IE 在网站上下文中执行下载
  ieNoOpen: true,

  // No Sniff - 防止 MIME 类型嗅探
  noSniff: true,

  // Permitted Cross Domain Policies - 限制跨域策略
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },

  // Referrer Policy - 控制 Referer 头
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // XSS Filter - 启用 XSS 过滤器
  xssFilter: true
}

/**
 * CORS 配置
 * 控制跨域资源共享
 */
export const corsConfig: CorsOptions = {
  // 允许的源
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（如移动应用、Postman）
    if (!origin) {
      return callback(null, true)
    }

    // 检查是否在允许列表中
    if (config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')) {
      callback(null, true)
    } else {
      callback(new Error('不允许的跨域请求'))
    }
  },

  // 允许携带凭证（cookies）
  credentials: true,

  // 允许的 HTTP 方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

  // 允许的请求头
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin'
  ],

  // 暴露的响应头
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Page-Size',
    'X-Request-Id',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset'
  ],

  // 预检请求缓存时间（秒）
  maxAge: 86400, // 24 小时

  // 预检请求成功状态码
  optionsSuccessStatus: 204
}

/**
 * 速率限制配置
 */
export const rateLimitConfig = {
  // 全局速率限制
  global: {
    windowMs: config.rateLimitWindowMs, // 时间窗口
    max: config.rateLimitMaxRequests, // 最大请求数
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  },

  // 登录接口速率限制
  login: {
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 最多 5 次尝试
    message: '登录尝试次数过多，请 15 分钟后再试',
    standardHeaders: true,
    legacyHeaders: false
  },

  // 敏感操作速率限制
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 10, // 最多 10 次
    message: '敏感操作过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  },

  // 数据导出速率限制
  export: {
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 20, // 最多 20 次
    message: '数据导出过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  },

  // 文件上传速率限制
  upload: {
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 50, // 最多 50 次
    message: '文件上传过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
  }
}

/**
 * 请求体大小限制配置
 */
export const bodySizeConfig = {
  // JSON 请求体大小限制
  json: '10mb',

  // URL 编码请求体大小限制
  urlencoded: '10mb',

  // 文件上传大小限制
  fileUpload: 50 * 1024 * 1024 // 50MB
}

/**
 * 安全相关的常量
 */
export const securityConstants = {
  // 密码最小长度
  PASSWORD_MIN_LENGTH: 8,

  // 密码最大长度
  PASSWORD_MAX_LENGTH: 128,

  // 密码复杂度要求
  PASSWORD_REQUIREMENTS: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },

  // 登录失败锁定配置
  LOGIN_LOCK: {
    maxAttempts: 5, // 最大失败次数
    lockDuration: 30 * 60 * 1000 // 锁定时长（30 分钟）
  },

  // 会话配置
  SESSION: {
    accessTokenExpiry: '15m', // 访问令牌有效期
    refreshTokenExpiry: '7d', // 刷新令牌有效期
    maxRefreshTokens: 5 // 每个用户最多保留的刷新令牌数
  },

  // 允许的文件类型
  ALLOWED_FILE_TYPES: [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/xml',
    'text/xml',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif'
  ],

  // 允许的文件扩展名
  ALLOWED_FILE_EXTENSIONS: [
    '.csv',
    '.xls',
    '.xlsx',
    '.doc',
    '.docx',
    '.xml',
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.gif'
  ]
}

/**
 * 验证密码复杂度
 * @param password 密码
 * @returns 是否符合要求
 */
export function validatePasswordComplexity(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { PASSWORD_REQUIREMENTS } = securityConstants

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`密码长度至少 ${PASSWORD_REQUIREMENTS.minLength} 个字符`)
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母')
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母')
  }

  if (PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
    errors.push('密码必须包含至少一个数字')
  }

  if (PASSWORD_REQUIREMENTS.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 验证文件类型
 * @param mimetype MIME 类型
 * @param filename 文件名
 * @returns 是否允许
 */
export function validateFileType(mimetype: string, filename: string): boolean {
  // 检查 MIME 类型
  if (!securityConstants.ALLOWED_FILE_TYPES.includes(mimetype)) {
    return false
  }

  // 检查文件扩展名
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  if (!securityConstants.ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return false
  }

  // 验证 MIME 类型和扩展名的匹配
  const mimeExtMap: Record<string, string[]> = {
    'text/csv': ['.csv'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/xml': ['.xml'],
    'text/xml': ['.xml'],
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif']
  }

  const allowedExts = mimeExtMap[mimetype]
  if (allowedExts && !allowedExts.includes(ext)) {
    return false
  }

  return true
}
