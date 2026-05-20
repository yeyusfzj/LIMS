/**
 * 测试登录流程
 * 验证前后端认证机制是否正常工作
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试登录
async function testLogin() {
  log('\n=== 测试登录功能 ===', 'cyan');
  
  const credentials = {
    username: 'admin',
    password: 'Admin@123456'
  };
  
  try {
    log(`\n尝试登录: ${credentials.username}`, 'blue');
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials, {
      validateStatus: () => true // 接受所有状态码
    });
    
    log(`响应状态码: ${response.status}`, 'blue');
    log(`响应数据:`, 'blue');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data.success) {
      log('\n✓ 登录成功!', 'green');
      
      const { accessToken, refreshToken, user } = response.data.data;
      
      log(`\n用户信息:`, 'blue');
      log(`  ID: ${user.id}`, 'blue');
      log(`  用户名: ${user.username}`, 'blue');
      log(`  姓名: ${user.name}`, 'blue');
      log(`  角色: ${user.role}`, 'blue');
      
      log(`\nToken信息:`, 'blue');
      log(`  Access Token: ${accessToken.substring(0, 50)}...`, 'blue');
      log(`  Refresh Token: ${refreshToken ? refreshToken.substring(0, 50) + '...' : 'N/A'}`, 'blue');
      
      return { accessToken, refreshToken, user };
    } else {
      log(`\n✗ 登录失败`, 'red');
      log(`  错误信息: ${response.data.error?.message || '未知错误'}`, 'red');
      return null;
    }
  } catch (error) {
    log(`\n✗ 登录请求失败`, 'red');
    log(`  错误: ${error.message}`, 'red');
    if (error.response) {
      log(`  响应状态: ${error.response.status}`, 'red');
      log(`  响应数据:`, 'red');
      console.log(JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// 测试使用token访问受保护的API
async function testProtectedApi(token) {
  log('\n=== 测试受保护的API ===', 'cyan');
  
  const endpoints = [
    { path: '/api/samples', description: '样品列表' },
    { path: '/api/workflows', description: '工作流列表' },
    { path: '/api/users', description: '用户列表' },
    { path: '/api/methods', description: '检测方法列表' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      log(`\n测试: ${endpoint.description} (${endpoint.path})`, 'blue');
      
      const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        validateStatus: () => true
      });
      
      if (response.status === 200) {
        log(`  ✓ 成功访问`, 'green');
        log(`  返回数据类型: ${Array.isArray(response.data) ? 'Array' : typeof response.data}`, 'blue');
        if (Array.isArray(response.data)) {
          log(`  数据条数: ${response.data.length}`, 'blue');
        }
      } else {
        log(`  ✗ 访问失败 (状态码: ${response.status})`, 'red');
        log(`  错误信息: ${response.data.error?.message || response.data.message || '未知错误'}`, 'red');
      }
    } catch (error) {
      log(`  ✗ 请求失败: ${error.message}`, 'red');
    }
  }
}

// 测试无token访问受保护的API
async function testUnauthorizedAccess() {
  log('\n=== 测试未授权访问 ===', 'cyan');
  
  try {
    log(`\n尝试不带token访问 /api/samples`, 'blue');
    
    const response = await axios.get(`${BACKEND_URL}/api/samples`, {
      validateStatus: () => true
    });
    
    if (response.status === 401) {
      log(`  ✓ 正确返回401未授权`, 'green');
      log(`  错误信息: ${response.data.error?.message || response.data.message}`, 'blue');
    } else {
      log(`  ⚠ 未返回401,而是返回了 ${response.status}`, 'yellow');
    }
  } catch (error) {
    log(`  ✗ 请求失败: ${error.message}`, 'red');
  }
}

// 测试token刷新
async function testTokenRefresh(refreshToken) {
  log('\n=== 测试Token刷新 ===', 'cyan');
  
  if (!refreshToken) {
    log('  ⚠ 没有refresh token,跳过测试', 'yellow');
    return;
  }
  
  try {
    log(`\n尝试刷新token`, 'blue');
    
    const response = await axios.post(`${BACKEND_URL}/api/auth/refresh`, {
      refreshToken
    }, {
      validateStatus: () => true
    });
    
    if (response.status === 200 && response.data.success) {
      log(`  ✓ Token刷新成功`, 'green');
      log(`  新Access Token: ${response.data.data.accessToken.substring(0, 50)}...`, 'blue');
    } else {
      log(`  ✗ Token刷新失败 (状态码: ${response.status})`, 'red');
      log(`  错误信息: ${response.data.error?.message || '未知错误'}`, 'red');
    }
  } catch (error) {
    log(`  ✗ 请求失败: ${error.message}`, 'red');
  }
}

// 主测试函数
async function runTests() {
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║     登录流程测试                            ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  // 1. 测试未授权访问
  await testUnauthorizedAccess();
  
  // 2. 测试登录
  const loginResult = await testLogin();
  
  if (!loginResult) {
    log('\n登录失败,无法继续测试', 'red');
    return;
  }
  
  // 3. 测试使用token访问受保护的API
  await testProtectedApi(loginResult.accessToken);
  
  // 4. 测试token刷新
  await testTokenRefresh(loginResult.refreshToken);
  
  // 总结
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     测试总结                                ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  log('\n✓ 登录流程测试完成', 'green');
  log('\n建议:', 'cyan');
  log('  1. 在浏览器中访问 http://localhost:5173', 'yellow');
  log('  2. 使用以下凭据登录:', 'yellow');
  log('     用户名: admin', 'yellow');
  log('     密码: Admin@123456', 'yellow');
  log('  3. 检查浏览器控制台是否有错误', 'yellow');
  log('  4. 测试各个功能模块', 'yellow');
}

// 运行测试
runTests().catch(error => {
  log(`\n测试执行失败: ${error.message}`, 'red');
  process.exit(1);
});
