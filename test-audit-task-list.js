/**
 * 测试审核任务列表功能
 */

const axios = require('axios')

const API_BASE_URL = 'http://localhost:3000/api'

async function testAuditTaskList() {
  console.log('=== 测试审核任务列表功能 ===\n')

  try {
    // 1. 登录获取token
    console.log('1. 登录...')
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    })

    if (!loginResponse.data.success) {
      throw new Error('登录失败')
    }

    const token = loginResponse.data.data.accessToken
    console.log('✓ 登录成功')
    console.log(`  用户: ${loginResponse.data.data.user.fullName}`)
    console.log(`  角色: ${loginResponse.data.data.user.roles.join(', ')}`)

    // 2. 测试审核任务列表API
    console.log('\n2. 获取审核任务列表...')
    const auditResponse = await axios.get(`${API_BASE_URL}/audits`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        pageSize: 20
      }
    })

    console.log('✓ 审核任务列表获取成功')
    console.log(`  总数: ${auditResponse.data.data.total}`)
    console.log(`  当前页: ${auditResponse.data.data.page}`)
    console.log(`  每页数量: ${auditResponse.data.data.pageSize}`)
    console.log(`  任务数量: ${auditResponse.data.data.items.length}`)

    if (auditResponse.data.data.items.length > 0) {
      console.log('\n  任务列表:')
      auditResponse.data.data.items.forEach((item, index) => {
        console.log(`    ${index + 1}. ${item.sampleCode} - ${item.status}`)
      })
    } else {
      console.log('  (当前没有审核任务)')
    }

    // 3. 测试审核统计API
    console.log('\n3. 获取审核统计信息...')
    const statsResponse = await axios.get(`${API_BASE_URL}/audits/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log('✓ 审核统计信息获取成功')
    console.log(`  待审核: ${statsResponse.data.data.pending || 0}`)
    console.log(`  审核中: ${statsResponse.data.data.inProgress || 0}`)
    console.log(`  已通过: ${statsResponse.data.data.approved || 0}`)
    console.log(`  已拒绝: ${statsResponse.data.data.rejected || 0}`)

    console.log('\n=== 所有测试通过 ✓ ===')

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

testAuditTaskList()
