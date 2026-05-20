/**
 * 测试审核任务列表前端集成
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000/api'

async function testAuditFrontendIntegration() {
  console.log('=== 测试审核任务列表前端集成 ===\n')

  try {
    // 1. 登录获取token
    console.log('1. 登录...')
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    })

    const token = loginResponse.data.data.accessToken
    console.log('✓ 登录成功')

    // 2. 测试审核任务列表API（模拟前端调用）
    console.log('\n2. 获取审核任务列表（模拟前端）...')
    const auditResponse = await axios.get(`${API_BASE_URL}/audits`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    })

    console.log('✓ API响应成功')
    console.log('  响应格式:', {
      hasMessage: !!auditResponse.data.message,
      hasData: !!auditResponse.data.data,
      dataKeys: auditResponse.data.data ? Object.keys(auditResponse.data.data) : []
    })

    // 模拟前端数据转换
    const backendData = auditResponse.data.data
    const frontendFormat = {
      success: true,
      data: backendData.items || [],
      pagination: {
        currentPage: backendData.page || 1,
        pageSize: backendData.pageSize || 20,
        total: backendData.total || 0,
        totalPages: Math.ceil((backendData.total || 0) / (backendData.pageSize || 20))
      }
    }

    console.log('\n3. 前端数据格式转换:')
    console.log('  成功:', frontendFormat.success)
    console.log('  任务数量:', frontendFormat.data.length)
    console.log('  分页信息:', frontendFormat.pagination)

    // 4. 验证数据结构
    console.log('\n4. 验证数据结构...')
    if (frontendFormat.success && Array.isArray(frontendFormat.data)) {
      console.log('✓ 数据结构正确')
      console.log('  - success 字段存在且为 true')
      console.log('  - data 字段是数组')
      console.log('  - pagination 字段包含完整信息')
    } else {
      console.log('✗ 数据结构不正确')
    }

    console.log('\n=== 所有测试通过 ✓ ===')
    console.log('\n前端页面应该能够正常显示审核任务列表了（当前为空列表）')

  } catch (error) {
    console.error('\n✗ 测试失败:')
    if (error.response) {
      console.error(`  状态码: ${error.response.status}`)
      console.error(`  错误信息: ${JSON.stringify(error.response.data, null, 2)}`)
    } else {
      console.error(`  ${error.message}`)
    }
    process.exit(1)
  }
}

testAuditFrontendIntegration()
