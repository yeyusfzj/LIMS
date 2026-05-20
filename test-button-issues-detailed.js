/**
 * 详细测试有问题的按钮功能
 * 
 * 重点检查：
 * 1. 报告管理功能
 * 2. 用户管理功能  
 * 3. 角色管理功能
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:8000/api/v1';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
};

let adminToken = '';

async function login() {
  const response = await axios.post(`${API_BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
  adminToken = response.data.data.accessToken;
  console.log('✅ 登录成功\n');
}

async function testReportTemplates() {
  console.log('📋 测试报告模板功能');
  console.log('='.repeat(80));
  
  const endpoints = [
    { method: 'GET', url: '/report-templates', desc: '获取报告模板列表' },
    { method: 'GET', url: '/reports', desc: '获取报告列表' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n测试: ${endpoint.desc}`);
      console.log(`   方法: ${endpoint.method}`);
      console.log(`   路径: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        params: endpoint.method === 'GET' ? { page: 1, limit: 5 } : undefined
      });
      
      console.log(`   ✅ 成功 (状态码: ${response.status})`);
      console.log(`   数据: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ 失败`);
      console.log(`   状态码: ${error.response?.status || 'N/A'}`);
      console.log(`   错误: ${error.response?.data?.error?.message || error.message}`);
      console.log(`   详情: ${JSON.stringify(error.response?.data || {}).substring(0, 200)}`);
    }
  }
}

async function testUserManagement() {
  console.log('\n\n📋 测试用户管理功能');
  console.log('='.repeat(80));
  
  const endpoints = [
    { method: 'GET', url: '/users', desc: '获取用户列表' },
    { method: 'GET', url: '/users/me', desc: '获取当前用户信息' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n测试: ${endpoint.desc}`);
      console.log(`   方法: ${endpoint.method}`);
      console.log(`   路径: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        params: endpoint.method === 'GET' && endpoint.url === '/users' ? { page: 1, limit: 5 } : undefined
      });
      
      console.log(`   ✅ 成功 (状态码: ${response.status})`);
      console.log(`   数据: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ 失败`);
      console.log(`   状态码: ${error.response?.status || 'N/A'}`);
      console.log(`   错误: ${error.response?.data?.error?.message || error.message}`);
      console.log(`   详情: ${JSON.stringify(error.response?.data || {}).substring(0, 200)}`);
    }
  }
}

async function testRoleManagement() {
  console.log('\n\n📋 测试角色管理功能');
  console.log('='.repeat(80));
  
  const endpoints = [
    { method: 'GET', url: '/roles', desc: '获取角色列表' },
    { method: 'GET', url: '/permissions', desc: '获取权限列表' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n测试: ${endpoint.desc}`);
      console.log(`   方法: ${endpoint.method}`);
      console.log(`   路径: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      console.log(`   ✅ 成功 (状态码: ${response.status})`);
      console.log(`   数据: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ 失败`);
      console.log(`   状态码: ${error.response?.status || 'N/A'}`);
      console.log(`   错误: ${error.response?.data?.error?.message || error.message}`);
      console.log(`   详情: ${JSON.stringify(error.response?.data || {}).substring(0, 200)}`);
    }
  }
}

async function testWorkflowFunctions() {
  console.log('\n\n📋 测试工作流功能');
  console.log('='.repeat(80));
  
  const endpoints = [
    { method: 'GET', url: '/workflows', desc: '获取工作流列表' },
    { method: 'GET', url: '/workflow-templates', desc: '获取工作流模板列表' },
    { method: 'GET', url: '/tasks', desc: '获取任务列表' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n测试: ${endpoint.desc}`);
      console.log(`   方法: ${endpoint.method}`);
      console.log(`   路径: ${endpoint.url}`);
      
      const response = await axios({
        method: endpoint.method,
        url: `${API_BASE_URL}${endpoint.url}`,
        headers: { Authorization: `Bearer ${adminToken}` },
        params: { page: 1, limit: 5 }
      });
      
      console.log(`   ✅ 成功 (状态码: ${response.status})`);
      console.log(`   数据: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ 失败`);
      console.log(`   状态码: ${error.response?.status || 'N/A'}`);
      console.log(`   错误: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

async function runTests() {
  console.log('🔍 详细测试有问题的功能\n');
  console.log('测试时间:', new Date().toLocaleString());
  console.log('\n');
  
  try {
    await login();
    await testReportTemplates();
    await testUserManagement();
    await testRoleManagement();
    await testWorkflowFunctions();
    
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ 详细测试完成');
    console.log('='.repeat(80));
    
    console.log('\n📊 问题总结:');
    console.log('   请查看上述标记为 ❌ 的功能');
    console.log('   这些功能可能存在以下问题:');
    console.log('   1. API 路由未实现或路径错误');
    console.log('   2. 权限配置问题');
    console.log('   3. 后端服务异常');
    console.log('   4. 前后端接口不匹配');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

runTests().then(() => {
  console.log('\n✅ 测试完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 测试失败:', error);
  process.exit(1);
});
