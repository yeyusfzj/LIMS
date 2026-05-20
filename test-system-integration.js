/**
 * 系统集成测试脚本
 * 测试前后端的核心功能是否正常工作
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';
const FRONTEND_URL = 'http://localhost:5173';

// 测试结果统计
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// 辅助函数：记录测试结果
function logTest(name, passed, message = '') {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${name}${message ? ': ' + message : ''}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

// 测试1: 后端健康检查
async function testBackendHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    logTest('后端健康检查', response.status === 200 && response.data.status === 'healthy');
  } catch (error) {
    logTest('后端健康检查', false, error.message);
  }
}

// 测试2: 登录功能
async function testLogin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    const success = response.data.success && response.data.data.accessToken;
    logTest('登录功能', success);
    
    if (success) {
      return response.data.data.accessToken;
    }
  } catch (error) {
    logTest('登录功能', false, error.message);
  }
  return null;
}

// 测试3: 样品列表查询
async function testSampleList(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/samples`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const success = response.data.data && Array.isArray(response.data.data.items);
    logTest('样品列表查询', success, `共 ${response.data.data.total} 个样品`);
  } catch (error) {
    logTest('样品列表查询', false, error.message);
  }
}

// 测试4: 工作流列表查询
async function testWorkflowList(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/workflows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const success = response.data.success && Array.isArray(response.data.data.items);
    logTest('工作流列表查询', success, `共 ${response.data.data.total} 个工作流`);
  } catch (error) {
    logTest('工作流列表查询', false, error.message);
  }
}

// 测试5: 检测方法列表查询
async function testMethodList(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/methods`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const success = response.data.success && Array.isArray(response.data.data.items);
    logTest('检测方法列表查询', success, `共 ${response.data.data.total} 个方法`);
  } catch (error) {
    logTest('检测方法列表查询', false, error.message);
  }
}

// 测试6: 用户信息查询
async function testUserInfo(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const success = response.data.success && Array.isArray(response.data.data.items);
    logTest('用户信息查询', success, `共 ${response.data.data.total} 个用户`);
  } catch (error) {
    logTest('用户信息查询', false, error.message);
  }
}

// 测试7: 前端页面可访问性
async function testFrontendAccess() {
  try {
    const response = await axios.get(FRONTEND_URL);
    logTest('前端页面可访问', response.status === 200);
  } catch (error) {
    logTest('前端页面可访问', false, error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('\n========================================');
  console.log('  实验室管理系统集成测试');
  console.log('========================================\n');
  
  console.log('📋 测试配置:');
  console.log(`   后端地址: ${API_BASE_URL}`);
  console.log(`   前端地址: ${FRONTEND_URL}`);
  console.log('\n🔍 开始测试...\n');
  
  // 执行测试
  await testBackendHealth();
  await testFrontendAccess();
  
  const token = await testLogin();
  
  if (token) {
    await testSampleList(token);
    await testWorkflowList(token);
    await testMethodList(token);
    await testUserInfo(token);
  } else {
    console.log('\n⚠️  登录失败，跳过需要认证的测试');
  }
  
  // 输出测试结果
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================\n');
  console.log(`✓ 通过: ${testResults.passed}`);
  console.log(`✗ 失败: ${testResults.failed}`);
  console.log(`总计: ${testResults.passed + testResults.failed}`);
  
  const successRate = ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2);
  console.log(`\n成功率: ${successRate}%\n`);
  
  if (testResults.failed === 0) {
    console.log('🎉 所有测试通过！系统运行正常。\n');
  } else {
    console.log('⚠️  部分测试失败，请检查以下问题:\n');
    testResults.tests.filter(t => !t.passed).forEach(t => {
      console.log(`   - ${t.name}: ${t.message}`);
    });
    console.log('');
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
