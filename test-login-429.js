/**
 * 简单的登录429错误测试
 * 用于验证前端是否正确处理429错误
 */

const axios = require('axios')

async function testLogin429() {
  console.log('开始测试登录429错误处理...')
  
  const loginData = {
    username: 'testuser',
    password: 'wrongpassword'
  }
  
  try {
    // 发送21次登录请求以触发限流
    console.log('发送21次登录请求以触发限流...')
    
    for (let i = 0; i < 21; i++) {
      try {
        await axios.post('http://localhost:3000/api/auth/login', loginData)
      } catch (error) {
        if (i === 20) {
          // 第21次请求，应该是429错误
          console.log('第21次请求响应:')
          console.log('状态码:', error.response?.status)
          console.log('响应头:', error.response?.headers)
          console.log('响应体:', error.response?.data)
          
          if (error.response?.status === 429) {
            console.log('✅ 成功触发429限流')
            console.log('Retry-After头:', error.response.headers['retry-after'])
            console.log('错误信息:', error.response.data.error)
          } else {
            console.log('❌ 未触发429限流，状态码:', error.response?.status)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('测试失败:', error.message)
  }
}

// 运行测试
testLogin429()