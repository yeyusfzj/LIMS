/**
 * 验证统计 API 端点是否正确注册
 */

import request from 'supertest'
import app from '../app'

describe('Verify Statistics API Endpoints', () => {
  describe('端点可访问性测试', () => {
    it('GET /api/statistics 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .get('/api/statistics')
        .query({ dimensions: 'sampleType' })

      // 应该返回 401（未认证）而不是 404（端点不存在）
      expect(response.status).toBe(401)
    })

    it('POST /api/statistics/export 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .post('/api/statistics/export')
        .query({ dimensions: 'sampleType', format: 'csv' })

      expect(response.status).toBe(401)
    })

    it('POST /api/statistics/custom-report 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .post('/api/statistics/custom-report')
        .send({
          name: '测试报表',
          config: { dimensions: ['sampleType'] }
        })

      expect(response.status).toBe(401)
    })

    it('DELETE /api/statistics/cache 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .delete('/api/statistics/cache')

      expect(response.status).toBe(401)
    })

    it('GET /api/statistics/tasks/:taskId 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .get('/api/statistics/tasks/test-task-id')

      expect(response.status).toBe(401)
    })

    it('GET /api/statistics/export/tasks/:taskId 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .get('/api/statistics/export/tasks/test-task-id')

      expect(response.status).toBe(401)
    })

    it('GET /api/statistics/export/download/:filename 端点应该存在（未认证返回 401）', async () => {
      const response = await request(app)
        .get('/api/statistics/export/download/test.csv')

      expect(response.status).toBe(401)
    })
  })

  describe('路由集成测试', () => {
    it('统计路由应该已注册到 /api/statistics', async () => {
      const response = await request(app)
        .get('/api/statistics')

      // 不应该返回 404
      expect(response.status).not.toBe(404)
    })

    it('所有统计端点都应该正确注册', async () => {
      // 测试所有端点都返回 401（认证失败）而不是 404（端点不存在）
      const endpoints = [
        { method: 'get', path: '/api/statistics' },
        { method: 'post', path: '/api/statistics/export' },
        { method: 'post', path: '/api/statistics/custom-report' },
        { method: 'delete', path: '/api/statistics/cache' }
      ]

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path)
        expect(response.status).toBe(401)
      }
    })
  })
})
