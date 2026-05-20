/**
 * 验证报告管理 API 端点注册
 * 任务 13.9: 实现报告管理 API 端点
 */

import express from 'express'
import routes from '../routes'

describe('报告管理 API 端点验证', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use('/api', routes)
  })

  it('应该验证所有必需的报告模板端点已注册', () => {
    const router = routes as any
    const stack = router.stack || []
    
    // 检查报告模板路由是否已注册
    const reportTemplateRoute = stack.find((layer: any) => 
      layer.regexp && layer.regexp.test('/report-templates')
    )
    
    expect(reportTemplateRoute).toBeDefined()
  })

  it('应该验证所有必需的报告端点已注册', () => {
    const router = routes as any
    const stack = router.stack || []
    
    // 检查报告路由是否已注册
    const reportRoute = stack.find((layer: any) => 
      layer.regexp && layer.regexp.test('/reports')
    )
    
    expect(reportRoute).toBeDefined()
  })

  it('应该列出所有已注册的路由', () => {
    const router = routes as any
    const stack = router.stack || []
    
    const registeredRoutes = stack
      .filter((layer: any) => layer.route || layer.name === 'router')
      .map((layer: any) => {
        if (layer.route) {
          return {
            path: layer.route.path,
            methods: Object.keys(layer.route.methods)
          }
        } else if (layer.name === 'router' && layer.regexp) {
          return {
            path: layer.regexp.toString(),
            type: 'router'
          }
        }
        return null
      })
      .filter(Boolean)

    console.log('已注册的路由:', JSON.stringify(registeredRoutes, null, 2))
    
    // 验证至少有一些路由被注册
    expect(registeredRoutes.length).toBeGreaterThan(0)
  })
})
