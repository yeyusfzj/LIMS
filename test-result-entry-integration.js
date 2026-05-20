/**
 * 结果录入功能集成测试脚本
 * 
 * 测试前后端联动功能：
 * 1. 用户登录
 * 2. 获取样品列表
 * 3. 选择样品
 * 4. 录入检测结果
 * 5. 查看历史结果
 */

const axios = require('axios')

// 配置
const API_BASE_URL = 'http://localhost:3000/api'
const FRONTEND_URL = 'http://localhost:5173'

// 测试用户信息
const TEST_USER = {
  username: 'testuser',
  password: 'User@123456'
}

// 全局变量
let authToken = null
let testSampleId = null

/**
 * 发送HTTP请求的辅助函数
 */
async function apiRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    }
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`
    }
    
    if (data) {
      config.data = data
    }
    
    console.log(`📤 ${method.toUpperCase()} ${url}`)
    if (data) console.log('   数据:', JSON.stringify(data, null, 2))
    
    const response = await axios(config)
    console.log(`✅ 响应状态: ${response.status}`)
    console.log('   响应数据:', JSON.stringify(response.data, null, 2))
    
    return response.data
  } catch (error) {
    console.error(`❌ 请求失败: ${method.toUpperCase()} ${url}`)
    if (error.response) {
      console.error('   状态码:', error.response.status)
      console.error('   错误信息:', JSON.stringify(error.response.data, null, 2))
    } else {
      console.error('   错误:', error.message)
    }
    throw error
  }
}

/**
 * 测试步骤1: 用户登录
 */
async function testLogin() {
  console.log('\n🔐 测试步骤1: 用户登录')
  console.log('=' .repeat(50))
  
  try {
    const response = await apiRequest('POST', '/auth/login', TEST_USER)
    
    if (response.success && response.data.accessToken) {
      authToken = response.data.accessToken
      console.log('✅ 登录成功!')
      console.log(`   用户: ${response.data.user.fullName}`)
      console.log(`   Token: ${authToken.substring(0, 20)}...`)
      return true
    } else {
      console.error('❌ 登录失败: 响应格式不正确')
      return false
    }
  } catch (error) {
    console.error('❌ 登录失败')
    return false
  }
}

/**
 * 测试步骤2: 获取样品列表
 */
async function testGetSamples() {
  console.log('\n📋 测试步骤2: 获取样品列表')
  console.log('=' .repeat(50))
  
  try {
    const response = await apiRequest('GET', '/samples?page=1&pageSize=10&status=IN_TESTING')
    
    if (response.data && response.data.items) {
      console.log(`✅ 获取样品列表成功! 共 ${response.data.items.length} 个样品`)
      
      if (response.data.items.length > 0) {
        testSampleId = response.data.items[0].id
        console.log(`   选择测试样品: ${response.data.items[0].sampleName} (${response.data.items[0].barcode})`)
        
        // 显示前3个样品的基本信息
        response.data.items.slice(0, 3).forEach((sample, index) => {
          console.log(`   样品${index + 1}: ${sample.sampleName} - ${sample.barcode} - ${sample.status}`)
        })
        
        return true
      } else {
        console.log('⚠️  没有找到检测中的样品，尝试创建测试样品...')
        return await createTestSample()
      }
    } else {
      console.error('❌ 获取样品列表失败: 响应格式不正确')
      return false
    }
  } catch (error) {
    console.error('❌ 获取样品列表失败')
    return false
  }
}

/**
 * 创建测试样品
 */
async function createTestSample() {
  console.log('\n🧪 创建测试样品')
  console.log('=' .repeat(30))
  
  const sampleData = {
    clientName: '测试客户',
    clientContact: '13800138000',
    sampleName: '测试水样',
    sampleType: '饮用水',
    sampleCategory: '水质检测',
    quantity: 500,
    unit: 'ml',
    receivedDate: new Date().toISOString(),
    samplingLocation: '测试地点',
    samplingPerson: '测试人员',
    storageLocation: '冷藏室A',
    storageCondition: '4°C冷藏',
    priority: 'NORMAL',
    description: '集成测试用样品',
    remarks: '自动化测试创建',
    createdBy: 'testuser'
  }
  
  try {
    const response = await apiRequest('POST', '/samples', sampleData)
    
    if (response.data && response.data.id) {
      testSampleId = response.data.id
      console.log(`✅ 测试样品创建成功! ID: ${testSampleId}`)
      console.log(`   样品名称: ${response.data.sampleName}`)
      console.log(`   样品条码: ${response.data.barcode}`)
      return true
    } else {
      console.error('❌ 创建测试样品失败')
      return false
    }
  } catch (error) {
    console.error('❌ 创建测试样品失败')
    return false
  }
}

/**
 * 测试步骤3: 录入检测结果
 */
async function testCreateResults() {
  console.log('\n📝 测试步骤3: 录入检测结果')
  console.log('=' .repeat(50))
  
  if (!testSampleId) {
    console.error('❌ 没有可用的测试样品ID')
    return false
  }
  
  // 准备测试结果数据
  const testResults = [
    {
      sampleId: testSampleId,
      testItemId: '550e8400-e29b-41d4-a716-446655440001', // 使用UUID格式
      parameter: 'pH值',
      value: 7.2,
      unit: 'pH',
      method: 'GB 6920-86',
      source: 'MANUAL'
    },
    {
      sampleId: testSampleId,
      testItemId: '550e8400-e29b-41d4-a716-446655440002',
      parameter: '总硬度',
      value: 320,
      unit: 'mg/L',
      method: 'GB 7477-87',
      source: 'MANUAL'
    },
    {
      sampleId: testSampleId,
      testItemId: '550e8400-e29b-41d4-a716-446655440003',
      parameter: '细菌总数',
      value: 85,
      unit: 'CFU/ml',
      method: 'GB 4789.2',
      source: 'MANUAL'
    },
    {
      sampleId: testSampleId,
      testItemId: '550e8400-e29b-41d4-a716-446655440004',
      parameter: '外观',
      textValue: '无色透明',
      unit: '目测',
      method: '目测',
      source: 'MANUAL'
    }
  ]
  
  let successCount = 0
  
  for (let i = 0; i < testResults.length; i++) {
    const result = testResults[i]
    console.log(`\n   录入结果 ${i + 1}/${testResults.length}: ${result.parameter}`)
    
    try {
      const response = await apiRequest('POST', '/results', result)
      
      if (response.data && response.data.id) {
        console.log(`   ✅ ${result.parameter} 录入成功! ID: ${response.data.id}`)
        successCount++
      } else {
        console.log(`   ❌ ${result.parameter} 录入失败`)
      }
    } catch (error) {
      console.log(`   ❌ ${result.parameter} 录入失败`)
    }
  }
  
  console.log(`\n📊 结果录入完成: ${successCount}/${testResults.length} 成功`)
  return successCount > 0
}

/**
 * 测试步骤4: 查看历史结果
 */
async function testGetHistoryResults() {
  console.log('\n📈 测试步骤4: 查看历史结果')
  console.log('=' .repeat(50))
  
  if (!testSampleId) {
    console.error('❌ 没有可用的测试样品ID')
    return false
  }
  
  try {
    const response = await apiRequest('GET', `/samples/${testSampleId}/results`)
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ 获取历史结果成功! 共 ${response.data.length} 条记录`)
      
      response.data.forEach((result, index) => {
        console.log(`   结果${index + 1}: ${result.parameter} = ${result.value || result.textValue} ${result.unit || ''}`)
        console.log(`           方法: ${result.method}, 来源: ${result.source}`)
        console.log(`           录入人: ${result.enteredBy}, 时间: ${new Date(result.enteredAt).toLocaleString('zh-CN')}`)
      })
      
      return true
    } else {
      console.error('❌ 获取历史结果失败: 响应格式不正确')
      return false
    }
  } catch (error) {
    console.error('❌ 获取历史结果失败')
    return false
  }
}

/**
 * 测试步骤5: 前端页面访问测试
 */
async function testFrontendAccess() {
  console.log('\n🌐 测试步骤5: 前端页面访问测试')
  console.log('=' .repeat(50))
  
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 })
    
    if (response.status === 200) {
      console.log('✅ 前端页面访问成功!')
      console.log(`   状态码: ${response.status}`)
      console.log(`   页面大小: ${response.data.length} 字符`)
      return true
    } else {
      console.error(`❌ 前端页面访问失败: 状态码 ${response.status}`)
      return false
    }
  } catch (error) {
    console.error('❌ 前端页面访问失败:', error.message)
    return false
  }
}

/**
 * 主测试函数
 */
async function runIntegrationTest() {
  console.log('🚀 开始结果录入功能集成测试')
  console.log('=' .repeat(60))
  console.log(`后端API地址: ${API_BASE_URL}`)
  console.log(`前端页面地址: ${FRONTEND_URL}`)
  console.log(`测试用户: ${TEST_USER.username}`)
  
  const results = {
    login: false,
    getSamples: false,
    createResults: false,
    getHistoryResults: false,
    frontendAccess: false
  }
  
  // 执行测试步骤
  results.login = await testLogin()
  
  if (results.login) {
    results.getSamples = await testGetSamples()
    
    if (results.getSamples) {
      results.createResults = await testCreateResults()
      results.getHistoryResults = await testGetHistoryResults()
    }
  }
  
  results.frontendAccess = await testFrontendAccess()
  
  // 输出测试总结
  console.log('\n📊 测试结果总结')
  console.log('=' .repeat(60))
  
  const testItems = [
    { name: '用户登录', key: 'login' },
    { name: '获取样品列表', key: 'getSamples' },
    { name: '录入检测结果', key: 'createResults' },
    { name: '查看历史结果', key: 'getHistoryResults' },
    { name: '前端页面访问', key: 'frontendAccess' }
  ]
  
  let passedCount = 0
  testItems.forEach(item => {
    const status = results[item.key] ? '✅ 通过' : '❌ 失败'
    console.log(`${status} ${item.name}`)
    if (results[item.key]) passedCount++
  })
  
  console.log('\n' + '=' .repeat(60))
  console.log(`总体结果: ${passedCount}/${testItems.length} 项测试通过`)
  
  if (passedCount === testItems.length) {
    console.log('🎉 所有测试通过! 结果录入功能前后端联动正常')
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能')
  }
  
  // 提供访问建议
  console.log('\n💡 测试完成后，您可以:')
  console.log(`1. 访问前端页面: ${FRONTEND_URL}`)
  console.log(`2. 使用测试账号登录: ${TEST_USER.username} / ${TEST_USER.password}`)
  console.log('3. 在结果录入页面测试功能')
  if (testSampleId) {
    console.log(`4. 查看测试样品的结果 (样品ID: ${testSampleId})`)
  }
}

// 运行测试
if (require.main === module) {
  runIntegrationTest().catch(error => {
    console.error('💥 测试执行出错:', error.message)
    process.exit(1)
  })
}

module.exports = {
  runIntegrationTest,
  testLogin,
  testGetSamples,
  testCreateResults,
  testGetHistoryResults,
  testFrontendAccess
}