/**
 * 数据库CRUD功能测试脚本
 * 测试样品管理的创建、读取、更新、删除功能
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000/api'

// 测试用户凭据
const TEST_USER = {
  username: 'admin',
  password: 'admin123'
}

let authToken = ''
let testSampleId = ''

// 登录获取token
async function login() {
  try {
    console.log('\n=== 1. 登录测试 ===')
    const response = await axios.post(`${API_BASE_URL}/auth/login`, TEST_USER)
    
    if (response.data.success && response.data.data.accessToken) {
      authToken = response.data.data.accessToken
      console.log('✅ 登录成功')
      console.log('Token:', authToken.substring(0, 20) + '...')
      return true
    } else {
      console.log('❌ 登录失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 登录错误:', error.response?.data || error.message)
    return false
  }
}

// 创建样品
async function createSample() {
  try {
    console.log('\n=== 2. 创建样品测试 ===')
    const sampleData = {
      clientName: '测试客户',
      clientContact: '13800138000',
      sampleName: '测试样品',
      sampleType: '原料',
      sampleCategory: '化学品',
      quantity: 1,
      unit: '瓶',
      receivedDate: new Date().toISOString(),
      samplingDate: new Date().toISOString(),
      samplingLocation: '测试地点',
      samplingPerson: '测试人员',
      storageLocation: '仓库A',
      storageCondition: '常温',
      priority: 'NORMAL',
      description: '这是一个测试样品',
      remarks: '测试备注'
    }

    const response = await axios.post(`${API_BASE_URL}/samples`, sampleData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.data) {
      testSampleId = response.data.data.id
      console.log('✅ 样品创建成功')
      console.log('样品ID:', testSampleId)
      console.log('样品编码:', response.data.data.sampleNumber)
      console.log('样品名称:', response.data.data.sampleName)
      return true
    } else {
      console.log('❌ 样品创建失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 样品创建错误:', error.response?.data || error.message)
    return false
  }
}

// 读取样品
async function readSample() {
  try {
    console.log('\n=== 3. 读取样品测试 ===')
    const response = await axios.get(`${API_BASE_URL}/samples/${testSampleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data && response.data.data) {
      console.log('✅ 样品读取成功')
      console.log('样品信息:', {
        id: response.data.data.id,
        sampleNumber: response.data.data.sampleNumber,
        sampleName: response.data.data.sampleName,
        status: response.data.data.status
      })
      return true
    } else {
      console.log('❌ 样品读取失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 样品读取错误:', error.response?.data || error.message)
    return false
  }
}

// 更新样品
async function updateSample() {
  try {
    console.log('\n=== 4. 更新样品测试 ===')
    const updateData = {
      sampleName: '测试样品（已更新）',
      quantity: 2,
      remarks: '已更新的备注'
    }

    const response = await axios.put(`${API_BASE_URL}/samples/${testSampleId}`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.data && response.data.data) {
      console.log('✅ 样品更新成功')
      console.log('更新后的样品信息:', {
        id: response.data.data.id,
        sampleName: response.data.data.sampleName,
        quantity: response.data.data.quantity,
        remarks: response.data.data.remarks
      })
      return true
    } else {
      console.log('❌ 样品更新失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 样品更新错误:', error.response?.data || error.message)
    return false
  }
}

// 列表查询
async function listSamples() {
  try {
    console.log('\n=== 5. 样品列表查询测试 ===')
    const response = await axios.get(`${API_BASE_URL}/samples?page=1&pageSize=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data && response.data.data) {
      console.log('✅ 样品列表查询成功')
      console.log('总数:', response.data.data.total)
      console.log('当前页:', response.data.data.page)
      console.log('每页数量:', response.data.data.pageSize)
      console.log('样品数量:', response.data.data.items?.length || 0)
      return true
    } else {
      console.log('❌ 样品列表查询失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 样品列表查询错误:', error.response?.data || error.message)
    return false
  }
}

// 删除样品
async function deleteSample() {
  try {
    console.log('\n=== 6. 删除样品测试 ===')
    const response = await axios.delete(`${API_BASE_URL}/samples/${testSampleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    if (response.data) {
      console.log('✅ 样品删除成功')
      return true
    } else {
      console.log('❌ 样品删除失败:', response.data)
      return false
    }
  } catch (error) {
    console.log('❌ 样品删除错误:', error.response?.data || error.message)
    return false
  }
}

// 验证删除
async function verifyDeletion() {
  try {
    console.log('\n=== 7. 验证删除测试 ===')
    const response = await axios.get(`${API_BASE_URL}/samples/${testSampleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    })

    // 如果能读取到，说明删除失败
    console.log('❌ 删除验证失败: 样品仍然存在')
    return false
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('✅ 删除验证成功: 样品已不存在')
      return true
    } else {
      console.log('❌ 删除验证错误:', error.response?.data || error.message)
      return false
    }
  }
}

// 主测试流程
async function runTests() {
  console.log('========================================')
  console.log('   数据库CRUD功能测试')
  console.log('========================================')

  const results = {
    login: false,
    create: false,
    read: false,
    update: false,
    list: false,
    delete: false,
    verify: false
  }

  // 执行测试
  results.login = await login()
  if (!results.login) {
    console.log('\n❌ 登录失败，无法继续测试')
    return
  }

  results.create = await createSample()
  if (!results.create) {
    console.log('\n❌ 创建失败，无法继续测试')
    return
  }

  results.read = await readSample()
  results.update = await updateSample()
  results.list = await listSamples()
  results.delete = await deleteSample()
  results.verify = await verifyDeletion()

  // 输出测试结果
  console.log('\n========================================')
  console.log('   测试结果汇总')
  console.log('========================================')
  console.log('1. 登录测试:', results.login ? '✅ 通过' : '❌ 失败')
  console.log('2. 创建测试:', results.create ? '✅ 通过' : '❌ 失败')
  console.log('3. 读取测试:', results.read ? '✅ 通过' : '❌ 失败')
  console.log('4. 更新测试:', results.update ? '✅ 通过' : '❌ 失败')
  console.log('5. 列表测试:', results.list ? '✅ 通过' : '❌ 失败')
  console.log('6. 删除测试:', results.delete ? '✅ 通过' : '❌ 失败')
  console.log('7. 验证测试:', results.verify ? '✅ 通过' : '❌ 失败')
  console.log('========================================')

  const passedTests = Object.values(results).filter(r => r).length
  const totalTests = Object.keys(results).length
  console.log(`\n总计: ${passedTests}/${totalTests} 测试通过`)

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！数据库功能正常！')
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关功能')
  }
}

// 运行测试
runTests().catch(error => {
  console.error('\n❌ 测试执行出错:', error)
  process.exit(1)
})
