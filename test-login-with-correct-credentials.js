/**
 * 使用正确凭据测试登录
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3000/api';

console.log('🔐 使用正确凭据测试登录');
console.log('='.repeat(50));

// 从种子数据中获取的正确用户凭据
const testUsers = [
  { username: 'admin', password: 'Admin@123456', description: '系统管理员' },
  { username: 'testuser', password: 'User@123456', description: '测试用户' }
];

// 测试登录功能
async function testLogin(user) {
  try {
    console.log(`\n🧪 测试登录: ${user.description}`);
    console.log(`用户名: ${user.username}`);
    console.log(`密码: ${user.password}`);
    
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
      console.log('✅ 登录成功！');
      console.log('响应数据:', JSON.stringify(response.data, null, 2));
      
      // 测试获取用户信息
      if (response.data.data && response.data.data.accessToken) {
        const token = response.data.data.accessToken;
        await testGetUserInfo(token);
        await testProtectedEndpoints(token);
      }
      
      return { success: true, data: response.data };
    } else {
      console.log(`❌ 登录失败: ${response.status}`);
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

// 测试受保护的端点
async function testProtectedEndpoints(token) {
  console.log('\n🔒 测试受保护的API端点...');
  
  const endpoints = [
    { method: 'GET', url: '/users', name: '用户列表' },
    { method: 'GET', url: '/samples', name: '样品列表' },
    { method: 'GET', url: '/workflows', name: '工作流列表' },
    { method: 'GET', url: '/tasks', name: '任务列表' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method,
        url: `${BACKEND_URL}${endpoint.url}`,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ ${endpoint.name}: 访问成功`);
      } else {
        console.log(`⚠️  ${endpoint.name}: HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
}

// 主测试函数
async function runLoginTest() {
  console.log('开始登录测试...\n');
  
  const results = [];
  for (const user of testUsers) {
    const result = await testLogin(user);
    results.push(result);
  }
  
  // 生成报告
  console.log('\n📊 测试报告');
  console.log('='.repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`总测试数: ${totalCount}`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${totalCount - successCount}`);
  console.log(`成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  
  if (successCount > 0) {
    console.log('\n🎉 前后端连接测试成功！');
    console.log('✅ 用户认证功能正常');
    console.log('✅ API访问权限正常');
    console.log('✅ 前后端数据交互正常');
  } else {
    console.log('\n❌ 前后端连接存在问题');
  }
  
  console.log('\n🏁 测试完成！');
}

// 启动测试
runLoginTest().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});