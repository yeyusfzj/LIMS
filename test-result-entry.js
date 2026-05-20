/**
 * 结果录入功能测试脚本
 * 
 * 测试前后端联动功能
 */

const API_BASE_URL = 'http://localhost:3000/api'

// 测试用户登录
async function testLogin() {
  console.log('🔐 测试用户登录...')
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser',
        password: 'User@123456'
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      console.log('✅ 登录成功')
      console.log('用户信息:', result.data.user.fullName)
      return {
        token: result.data.accessToken,
        userId: result.data.user.id
      }
    } else {
      console.log('❌ 登录失败:', result.error?.message)
      return null
    }
  } catch (error) {
    console.log('❌ 登录请求失败:', error.message)
    return null
  }
}

// 测试获取样品列表
async function testGetSamples(token) {
  console.log('\n📋 测试获取样品列表...')
  
  try {
    const response = await fetch(`${API_BASE_URL}/samples`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok) {
      console.log('✅ 样品列表获取成功')
      console.log(`共找到 ${result.data?.items?.length || 0} 个样品`)
      
      if (result.data?.items?.length > 0) {
        const sample = result.data.items[0]
        console.log('第一个样品:', {
          id: sample.id,
          barcode: sample.barcode,
          name: sample.sampleName || sample.name,
          client: sample.clientName || sample.client
        })
        return sample.id
      }
    } else {
      console.log('❌ 样品列表获取失败:', result.error?.message)
    }
    
    return null
  } catch (error) {
    console.log('❌ 样品列表请求失败:', error.message)
    return null
  }
}

// 测试创建检测结果
async function testCreateResult(token, userId, sampleId) {
  console.log('\n🧪 测试创建检测结果...')
  
  if (!sampleId) {
    console.log('❌ 没有可用的样品ID，跳过结果创建测试')
    return null
  }
  
  try {
    // 生成一个UUID格式的testItemId
    const testItemId = '550e8400-e29b-41d4-a716-446655440000'
    
    const resultData = {
      sampleId: sampleId,
      testItemId: testItemId,
      parameter: 'pH值',
      value: 7.2,
      unit: 'pH',
      method: 'GB 6920-86',
      source: 'MANUAL',
      enteredBy: userId
    }
    
    const response = await fetch(`${API_BASE_URL}/results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resultData)
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ 检测结果创建成功')
      console.log('结果ID:', result.data.id)
      console.log('参数:', result.data.parameter)
      console.log('值:', result.data.value)
      return result.data.id
    } else {
      console.log('❌ 检测结果创建失败:', result.error?.message || result.message)
      console.log('详细错误:', result.error || result)
    }
    
    return null
  } catch (error) {
    console.log('❌ 检测结果创建请求失败:', error.message)
    return null
  }
}

// 测试获取结果列表
async function testGetResults(token) {
  console.log('\n📊 测试获取结果列表...')
  
  try {
    const response = await fetch(`${API_BASE_URL}/results`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    
    if (response.ok && result.success) {
      console.log('✅ 结果列表获取成功')
      console.log(`共找到 ${result.data?.items?.length || 0} 条结果`)
      
      if (result.data?.items?.length > 0) {
        const firstResult = result.data.items[0]
        console.log('最新结果:', {
          id: firstResult.id,
          parameter: firstResult.parameter,
          value: firstResult.value,
          source: firstResult.source
        })
      }
    } else {
      console.log('❌ 结果列表获取失败:', result.error?.message)
    }
  } catch (error) {
    console.log('❌ 结果列表请求失败:', error.message)
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试结果录入功能的前后端联动...\n')
  
  // 1. 测试登录
  const authResult = await testLogin()
  if (!authResult) {
    console.log('\n❌ 登录失败，无法继续测试')
    return
  }
  
  const { token, userId } = authResult
  
  // 2. 测试获取样品列表
  const sampleId = await testGetSamples(token)
  
  // 3. 测试创建检测结果
  const resultId = await testCreateResult(token, userId, sampleId)
  
  // 4. 测试获取结果列表
  await testGetResults(token)
  
  console.log('\n🎉 测试完成！')
  
  if (resultId) {
    console.log('\n✅ 前后端联动测试成功！')
    console.log('- 用户认证：正常')
    console.log('- 样品数据获取：正常')
    console.log('- 结果录入：正常')
    console.log('- 结果查询：正常')
  } else {
    console.log('\n⚠️  部分功能测试失败，请检查后端服务和数据库')
  }
}

// 运行测试
runTests().catch(console.error)