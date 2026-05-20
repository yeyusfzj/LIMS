/**
 * 检查前端连接到哪个后端
 */

const axios = require('axios')

async function checkBackendConnection() {
  console.log('=== 检查前端后端连接 ===\n')
  
  // 检查 Node.js 后端
  console.log('1. 检查 Node.js 后端 (http://localhost:3000)')
  try {
    const nodeResponse = await axios.get('http://localhost:3000/api/health', {
      timeout: 3000
    })
    console.log('   ✅ Node.js 后端运行正常')
    console.log('   响应:', nodeResponse.data)
  } catch (error) {
    console.log('   ❌ Node.js 后端无法访问')
    console.log('   错误:', error.message)
  }
  
  console.log()
  
  // 检查 FastAPI 后端
  console.log('2. 检查 FastAPI 后端 (http://localhost:8000)')
  try {
    const fastApiResponse = await axios.get('http://localhost:8000/api/v1/health', {
      timeout: 3000
    })
    console.log('   ✅ FastAPI 后端运行正常')
    console.log('   响应:', fastApiResponse.data)
  } catch (error) {
    console.log('   ❌ FastAPI 后端无法访问')
    console.log('   错误:', error.message)
  }
  
  console.log()
  
  // 检查前端环境变量配置
  console.log('3. 检查前端环境变量配置')
  console.log('   请检查 vue-project/.env 或 vue-project/.env.local 文件')
  console.log('   应该包含: VITE_API_BASE_URL=http://localhost:3000/api')
  console.log('   当前前端正在使用: http://localhost:8000/api/v1 (FastAPI)')
  
  console.log()
  
  // 检查 Node.js 后端的审核任务数据
  console.log('4. 检查 Node.js 后端的审核任务数据')
  try {
    // 先登录获取token
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    })
    
    const token = loginResponse.data.accessToken
    
    // 获取审核任务
    const auditsResponse = await axios.get('http://localhost:3000/api/audits', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log(`   ✅ Node.js 后端有 ${auditsResponse.data.items?.length || 0} 条审核任务`)
  } catch (error) {
    console.log('   ❌ 无法获取 Node.js 后端的审核任务')
    console.log('   错误:', error.message)
  }
  
  console.log()
  
  // 检查 FastAPI 后端的审核任务数据
  console.log('5. 检查 FastAPI 后端的审核任务数据')
  try {
    // 先登录获取token
    const loginResponse = await axios.post('http://localhost:8000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    })
    
    const token = loginResponse.data.access_token
    
    // 获取审核任务
    const auditsResponse = await axios.get('http://localhost:8000/api/v1/audits', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    console.log(`   ✅ FastAPI 后端有 ${auditsResponse.data.items?.length || auditsResponse.data.length || 0} 条审核任务`)
  } catch (error) {
    console.log('   ❌ 无法获取 FastAPI 后端的审核任务')
    console.log('   错误:', error.response?.data?.detail || error.message)
  }
  
  console.log()
  console.log('=== 诊断结论 ===')
  console.log('前端当前连接到 FastAPI 后端 (http://localhost:8000/api/v1)')
  console.log('但测试数据在 Node.js 后端 (http://localhost:3000/api)')
  console.log()
  console.log('解决方案：')
  console.log('1. 修改前端环境变量，连接到 Node.js 后端')
  console.log('2. 或者在 FastAPI 后端也生成测试数据')
}

checkBackendConnection().catch(console.error)
