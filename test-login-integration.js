/**
 * 登录集成测试
 * 测试前端登录功能与后端的实际连接
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

console.log('🔐 登录集成测试');
console.log('='.repeat(50));

// 测试用户数据
const testUsers = [
  { username: 'admin', password: 'Admin@123456', description: '管理员账户' },
  { username: 'testuser', password: 'User@123456', description: '测试用户' }
];

// 测试登录功能
async function testLogin(user) {
  try {
    console.log(`\n🧪 测试登录: ${user.description}`);
    console.log(`用户名: ${user.username}`);
    
    const response = await axios.post(`${BACKEND_URL}/auth/login`, {
      username: user.username,
      password: user.password
    }, {
      timeout: 10000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    console.log(`状态码: ${response.status}`);
    
    if (response.status === 200) {
      console.log('✅ 登录成功');
      console.log('响应数据:', JSON.stringify(response.data, null, 2));
      
      // 测试获取用户信息
      if (response.data.token || response.data.accessToken) {
        const token = response.data.token || response.data.accessToken;
        await testGetUserInfo(token);
      }
      
      return { success: true, data: response.data };
    } else if (response.status === 401) {
      console.log('❌ 登录失败: 用户名或密码错误');
      console.log('响应:', response.data);
      return { success: false, error: '认证失败' };
    } else if (response.status === 400) {
      console.log('⚠️  请求格式错误');
      console.log('响应:', response.data);
      return { success: false, error: '请求格式错误' };
    } else {
      console.log(`⚠️  未预期的状态码: ${response.status}`);
      console.log('响应:', response.data);
      return { success: false, error: `HTTP ${response.status}` };
    }
    
  } catch (error) {
    console.log('❌ 登录请求失败');
    console.log('错误:', error.message);
    
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

// 测试获取用户信息
async function testGetUserInfo(token) {
  try {
    console.log('\n👤 测试获取用户信息...');
    
    const response = await axios.get(`${BACKEND_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      timeout: 5000
    });
    
    console.log('✅ 获取用户信息成功');
    console.log('用户信息:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ 获取用户信息失败');
    console.log('错误:', error.message);
    
    if (error.response) {
      console.log('响应状态:', error.response.status);
      console.log('响应数据:', error.response.data);
    }
  }
}

// 测试前端页面访问
async function testFrontendAccess() {
  try {
    console.log('\n🌐 测试前端页面访问...');
    
    const response = await axios.get(FRONTEND_URL, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ 前端页面访问正常');
      
      // 检查是否包含登录相关内容
      const content = response.data;
      if (content.includes('login') || content.includes('登录')) {
        console.log('✅ 页面包含登录相关内容');
      } else {
        console.log('⚠️  页面可能不包含登录功能');
      }
    }
    
  } catch (error) {
    console.log('❌ 前端页面访问失败');
    console.log('错误:', error.message);
  }
}

// 测试CORS配置
async function testCorsConfiguration() {
  try {
    console.log('\n🔗 测试CORS配置...');
    
    // 模拟前端发起的预检请求
    const response = await axios.options(`${BACKEND_URL}/auth/login`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      },
      timeout: 5000,
      validateStatus: function (status) {
        return status >= 200 && status < 500;
      }
    });
    
    console.log(`CORS预检状态: ${response.status}`);
    
    if (response.headers['access-control-allow-origin']) {
      console.log('✅ CORS配置正常');
      console.log('允许的源:', response.headers['access-control-allow-origin']);
    } else {
      console.log('⚠️  CORS配置可能有问题');
    }
    
  } catch (error) {
    console.log('⚠️  CORS测试失败（可能正常）');
    console.log('错误:', error.message);
  }
}

// 生成测试报告
function generateTestReport(results) {
  console.log('\n📊 测试报告');
  console.log('='.repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`总测试数: ${totalCount}`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${totalCount - successCount}`);
  console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  
  console.log('\n📋 详细结果:');
  results.forEach((result, index) => {
    const user = testUsers[index];
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${user.description}: ${result.success ? '成功' : result.error}`);
  });
  
  console.log('\n💡 建议:');
  if (successCount === 0) {
    console.log('- 检查后端服务是否正常运行');
    console.log('- 确认数据库中是否有测试用户数据');
    console.log('- 检查用户密码验证逻辑');
  } else if (successCount < totalCount) {
    console.log('- 部分用户登录失败，检查用户数据和权限');
    console.log('- 确认密码加密和验证逻辑');
  } else {
    console.log('- 🎉 所有登录测试通过！');
    console.log('- 可以进行更深入的功能测试');
  }
}

// 主测试函数
async function runIntegrationTest() {
  console.log('开始登录集成测试...\n');
  
  // 测试前端访问
  await testFrontendAccess();
  
  // 测试CORS配置
  await testCorsConfiguration();
  
  // 测试登录功能
  const results = [];
  for (const user of testUsers) {
    const result = await testLogin(user);
    results.push(result);
  }
  
  // 生成报告
  generateTestReport(results);
  
  console.log('\n🏁 集成测试完成！');
}

// 启动测试
runIntegrationTest().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});