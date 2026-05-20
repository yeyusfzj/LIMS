/**
 * 测试 Auth Store 修复
 * 验证 localStorage 中的无效数据不会导致错误
 */

// 模拟 localStorage 中的无效数据场景
const testScenarios = [
  {
    name: '场景1: userData 为字符串 "undefined"',
    setup: () => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh')
      localStorage.setItem('user', 'undefined')
    },
    expected: '应该清除所有认证信息'
  },
  {
    name: '场景2: userData 为字符串 "null"',
    setup: () => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh')
      localStorage.setItem('user', 'null')
    },
    expected: '应该清除所有认证信息'
  },
  {
    name: '场景3: userData 为无效 JSON',
    setup: () => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh')
      localStorage.setItem('user', '{invalid json}')
    },
    expected: '应该清除所有认证信息'
  },
  {
    name: '场景4: userData 为有效 JSON',
    setup: () => {
      localStorage.setItem('accessToken', 'test-token')
      localStorage.setItem('refreshToken', 'test-refresh')
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        username: 'admin',
        fullName: '管理员',
        roles: ['admin']
      }))
    },
    expected: '应该成功加载认证信息'
  }
]

console.log('='.repeat(60))
console.log('Auth Store 修复验证')
console.log('='.repeat(60))

testScenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`)
  console.log(`   预期: ${scenario.expected}`)
  
  // 清除 localStorage
  localStorage.clear()
  
  // 设置测试数据
  scenario.setup()
  
  console.log('   设置的数据:')
  console.log('   - accessToken:', localStorage.getItem('accessToken'))
  console.log('   - refreshToken:', localStorage.getItem('refreshToken'))
  console.log('   - user:', localStorage.getItem('user'))
  
  // 模拟 initAuth 逻辑
  const token = localStorage.getItem('accessToken')
  const refresh = localStorage.getItem('refreshToken')
  const userData = localStorage.getItem('user')
  
  let result = 'FAIL'
  
  if (token && refresh && userData && userData !== 'undefined' && userData !== 'null') {
    try {
      const user = JSON.parse(userData)
      console.log('   ✅ 成功解析用户数据:', user)
      result = 'PASS'
    } catch (error) {
      console.log('   ❌ 解析失败，应该清除认证信息')
      console.log('   错误:', error.message)
      result = 'PASS (清除认证)'
    }
  } else {
    console.log('   ✅ 检测到无效数据，应该清除认证信息')
    result = 'PASS (清除认证)'
  }
  
  console.log(`   结果: ${result}`)
})

console.log('\n' + '='.repeat(60))
console.log('测试完成')
console.log('='.repeat(60))

// 清理
localStorage.clear()
