/**
 * 测试检测方法API
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000/api'

async function testMethodAPI() {
  try {
    console.log('开始测试检测方法API...\n')

    // 1. 登录获取token
    console.log('1. 登录获取token...')
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    })

    const token = loginResponse.data.data.accessToken
    console.log('✓ 登录成功，获取到token\n')

    // 2. 获取检测方法列表
    console.log('2. 获取检测方法列表...')
    const listResponse = await axios.get(`${API_BASE_URL}/methods`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 10
      }
    })

    console.log('✓ 获取列表成功')
    console.log('响应数据:', JSON.stringify(listResponse.data, null, 2))
    console.log(`共 ${listResponse.data.data.total} 条记录\n`)

    // 3. 如果有数据，获取第一个方法的详情
    if (listResponse.data.data.data.length > 0) {
      const firstMethod = listResponse.data.data.data[0]
      console.log('3. 获取方法详情...')
      console.log('方法ID:', firstMethod.id)
      
      const detailResponse = await axios.get(`${API_BASE_URL}/methods/${firstMethod.id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      console.log('✓ 获取详情成功')
      console.log('方法详情:', JSON.stringify(detailResponse.data.data, null, 2))
    }

    console.log('\n✓ 所有测试通过！')

  } catch (error) {
    console.error('✗ 测试失败:', error.response?.data || error.message)
    if (error.response) {
      console.error('状态码:', error.response.status)
      console.error('响应数据:', error.response.data)
    }
  }
}

testMethodAPI()
