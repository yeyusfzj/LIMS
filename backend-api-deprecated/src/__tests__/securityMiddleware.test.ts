/**
 * 安全中间件测试
 * 测试 Helmet、CORS、速率限制、请求验证等安全功能
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express, { Application, Request, Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { helmetConfig, corsConfig, validatePasswordComplexity, validateFileType } from '../config/security'
import { validate, sanitizeMiddleware, commonSchemas } from '../middleware/validationMiddleware'
import { globalRateLimiter } from '../middleware/rateLimitMiddleware'
import Joi from 'joi'

describe('安全中间件测试', () => {
  let app: Application

  beforeAll(() => {
    app = express()
    
    // 应用安全中间件
    app.use(helmet(helmetConfig))
    app.use(cors(corsConfig))
    app.use(express.json())
    app.use(sanitizeMiddleware)

    // 测试路由
    app.get('/test/headers', (_req: Request, res: Response) => {
      res.json({ message: 'success' })
    })

    app.post('/test/validation', 
      validate(Joi.object({
        name: Joi.string().required().min(2).max(50),
        email: Joi.string().email().required(),
        age: Joi.number().integer().min(0).max(150).optional()
      })),
      (_req: Request, res: Response) => {
        res.json({ message: 'validation passed' })
      }
    )

    app.post('/test/sanitize', (_req: Request, res: Response) => {
      res.json({ body: _req.body })
    })

    app.get('/test/rate-limit', globalRateLimiter, (_req: Request, res: Response) => {
      res.json({ message: 'success' })
    })
  })

  describe('Helmet 安全头测试', () => {
    it('应该设置 X-Content-Type-Options 头', async () => {
      const response = await request(app).get('/test/headers')
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('应该设置 X-Frame-Options 头', async () => {
      const response = await request(app).get('/test/headers')
      expect(response.headers['x-frame-options']).toBe('DENY')
    })

    it('应该设置 Strict-Transport-Security 头', async () => {
      const response = await request(app).get('/test/headers')
      expect(response.headers['strict-transport-security']).toBeDefined()
    })

    it('应该隐藏 X-Powered-By 头', async () => {
      const response = await request(app).get('/test/headers')
      expect(response.headers['x-powered-by']).toBeUndefined()
    })

    it('应该设置 Content-Security-Policy 头', async () => {
      const response = await request(app).get('/test/headers')
      expect(response.headers['content-security-policy']).toBeDefined()
    })
  })

  describe('CORS 配置测试', () => {
    it('应该允许配置的源访问', async () => {
      const response = await request(app)
        .get('/test/headers')
        .set('Origin', 'http://localhost:5173')
      
      expect(response.status).toBe(200)
    })

    it('应该在响应中包含 CORS 头', async () => {
      const response = await request(app)
        .options('/test/headers')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET')
      
      expect(response.headers['access-control-allow-origin']).toBeDefined()
      expect(response.headers['access-control-allow-methods']).toBeDefined()
    })
  })

  describe('请求验证测试', () => {
    it('应该通过有效的请求数据', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          age: 30
        })
      
      expect(response.status).toBe(200)
      expect(response.body.message).toBe('validation passed')
    })

    it('应该拒绝缺少必填字段的请求', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({
          name: 'John Doe'
          // 缺少 email
        })
      
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.details.fields).toBeDefined()
    })

    it('应该拒绝格式错误的数据', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({
          name: 'J', // 太短
          email: 'invalid-email', // 格式错误
          age: 200 // 超出范围
        })
      
      expect(response.status).toBe(400)
      expect(response.body.error.code).toBe('VALIDATION_ERROR')
      expect(response.body.error.details.fields.length).toBeGreaterThan(0)
    })

    it('应该移除未知字段', async () => {
      const response = await request(app)
        .post('/test/validation')
        .send({
          name: 'John Doe',
          email: 'john@example.com',
          unknownField: 'should be removed'
        })
      
      expect(response.status).toBe(200)
    })
  })

  describe('输入清洗测试', () => {
    it('应该清洗包含 HTML 标签的输入', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          name: '<script>alert("xss")</script>John',
          description: '<b>Bold text</b>'
        })
      
      expect(response.status).toBe(200)
      expect(response.body.body.name).not.toContain('<script>')
      expect(response.body.body.description).not.toContain('<b>')
    })

    it('应该保留正常的文本内容', async () => {
      const response = await request(app)
        .post('/test/sanitize')
        .send({
          name: 'John Doe',
          description: 'Normal text content'
        })
      
      expect(response.status).toBe(200)
      expect(response.body.body.name).toBe('John Doe')
      expect(response.body.body.description).toBe('Normal text content')
    })
  })

  describe('通用验证规则测试', () => {
    it('应该验证有效的 UUID', () => {
      const { error } = commonSchemas.uuid.validate('550e8400-e29b-41d4-a716-446655440000')
      expect(error).toBeUndefined()
    })

    it('应该拒绝无效的 UUID', () => {
      const { error } = commonSchemas.uuid.validate('invalid-uuid')
      expect(error).toBeDefined()
    })

    it('应该验证分页参数', () => {
      const { error, value } = commonSchemas.pagination.validate({
        page: 2,
        pageSize: 50
      })
      expect(error).toBeUndefined()
      expect(value.page).toBe(2)
      expect(value.pageSize).toBe(50)
    })

    it('应该使用默认的分页参数', () => {
      const { error, value } = commonSchemas.pagination.validate({})
      expect(error).toBeUndefined()
      expect(value.page).toBe(1)
      expect(value.pageSize).toBe(20)
    })

    it('应该验证日期范围', () => {
      const { error } = commonSchemas.dateRange.validate({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      })
      expect(error).toBeUndefined()
    })

    it('应该拒绝无效的日期范围', () => {
      const { error } = commonSchemas.dateRange.validate({
        startDate: '2024-12-31',
        endDate: '2024-01-01'
      })
      expect(error).toBeDefined()
    })
  })

  describe('密码复杂度验证测试', () => {
    it('应该接受符合要求的密码', () => {
      const result = validatePasswordComplexity('SecurePass123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('应该拒绝太短的密码', () => {
      const result = validatePasswordComplexity('Short1!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('长度'))).toBe(true)
    })

    it('应该拒绝缺少大写字母的密码', () => {
      const result = validatePasswordComplexity('securepass123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('大写字母'))).toBe(true)
    })

    it('应该拒绝缺少小写字母的密码', () => {
      const result = validatePasswordComplexity('SECUREPASS123!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('小写字母'))).toBe(true)
    })

    it('应该拒绝缺少数字的密码', () => {
      const result = validatePasswordComplexity('SecurePass!')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('数字'))).toBe(true)
    })

    it('应该拒绝缺少特殊字符的密码', () => {
      const result = validatePasswordComplexity('SecurePass123')
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('特殊字符'))).toBe(true)
    })
  })

  describe('文件类型验证测试', () => {
    it('应该接受允许的文件类型', () => {
      expect(validateFileType('text/csv', 'data.csv')).toBe(true)
      expect(validateFileType('application/pdf', 'document.pdf')).toBe(true)
      expect(validateFileType('image/jpeg', 'photo.jpg')).toBe(true)
    })

    it('应该拒绝不允许的文件类型', () => {
      expect(validateFileType('application/x-executable', 'malware.exe')).toBe(false)
      expect(validateFileType('text/html', 'page.html')).toBe(false)
    })

    it('应该验证文件扩展名', () => {
      expect(validateFileType('text/csv', 'data.txt')).toBe(false)
      expect(validateFileType('image/jpeg', 'photo.png')).toBe(false)
    })
  })
})
