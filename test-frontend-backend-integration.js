/**
 * 前后端联动功能测试脚本
 * 测试各个功能模块的前后端交互
 */

const axios = require('axios');

// 配置
const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// 测试用户凭据
const testUser = {
  username: 'admin',
  password: 'Admin@123456'
};

let authToken = '';

// 颜色输出函数
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试结果统计
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// 通用测试函数
async function runTest(testName, testFunction) {
  testResults.total++;
  try {
    log(`\n🧪 测试: ${testName}`, 'blue');
    await testFunction();
    testResults.passed++;
    testResults.details.push({ name: testName, status: 'PASS', error: null });
    log(`✅ ${testName} - 通过`, 'green');
  } catch (error) {
    testResults.failed++;
    testResults.details.push({ name: testName, status: 'FAIL', error: error.message });
    log(`❌ ${testName} - 失败: ${error.message}`, 'red');
  }
}

// 1. 测试后端健康检查
async function testBackendHealth() {
  const response = await axios.get(`${BACKEND_URL}/health`);
  if (response.status !== 200) {
    throw new Error(`健康检查失败，状态码: ${response.status}`);
  }
  log(`后端健康状态: ${JSON.stringify(response.data)}`, 'green');
}

// 2. 测试用户登录
async function testUserLogin() {
  const response = await axios.post(`${BACKEND_URL}/api/auth/login`, testUser);
  
  // 检查响应格式：{success: true, data: {accessToken: ...}}
  if (!response.data || !response.data.success || !response.data.data || !response.data.data.accessToken) {
    console.log('登录响应格式:', JSON.stringify(response.data, null, 2));
    throw new Error('登录响应中缺少访问令牌');
  }
  
  authToken = response.data.data.accessToken;
  log(`登录成功，获得令牌: ${authToken.substring(0, 20)}...`, 'green');
}

// 3. 测试样品管理API
async function testSampleManagement() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取样品列表
  const listResponse = await axios.get(`${BACKEND_URL}/api/samples`, { headers });
  log(`样品列表获取成功，共 ${listResponse.data.length || 0} 个样品`, 'green');
  
  // 创建新样品 (使用正确的字段)
  const newSample = {
    clientName: '测试客户',
    sampleName: '测试样品',
    sampleType: '水样',
    sampleCategory: '环境水',
    quantity: 500,
    unit: 'mL',
    receivedDate: new Date().toISOString(),
    description: '前后端联动测试样品'
  };
  
  const createResponse = await axios.post(`${BACKEND_URL}/api/samples`, newSample, { headers });
  if (!createResponse.data || !createResponse.data.id) {
    throw new Error('样品创建失败');
  }
  
  log(`样品创建成功，ID: ${createResponse.data.id}`, 'green');
  return createResponse.data.id;
}

// 4. 测试工作流管理API
async function testWorkflowManagement() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取工作流列表 (修正路径)
  const workflowsResponse = await axios.get(`${BACKEND_URL}/api/workflows`, { headers });
  log(`工作流列表获取成功，共 ${workflowsResponse.data.length || 0} 个工作流`, 'green');
  
  // 获取任务列表
  const tasksResponse = await axios.get(`${BACKEND_URL}/api/tasks`, { headers });
  log(`任务列表获取成功，共 ${tasksResponse.data.length || 0} 个任务`, 'green');
}

// 5. 测试结果录入API
async function testResultEntry() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取结果列表
  const resultsResponse = await axios.get(`${BACKEND_URL}/api/results`, { headers });
  log(`结果列表获取成功，共 ${resultsResponse.data.length || 0} 个结果`, 'green');
  
  // 获取公式配置
  const formulasResponse = await axios.get(`${BACKEND_URL}/api/formulas`, { headers });
  log(`公式配置获取成功，共 ${formulasResponse.data.length || 0} 个公式`, 'green');
}

// 6. 测试审核管理API
async function testAuditManagement() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取审核列表 (修正路径)
  const auditsResponse = await axios.get(`${BACKEND_URL}/api/audits`, { headers });
  log(`审核列表获取成功，共 ${auditsResponse.data.length || 0} 个审核`, 'green');
  
  // 获取审核日志
  const auditLogsResponse = await axios.get(`${BACKEND_URL}/api/audit-logs`, { headers });
  log(`审核日志获取成功，共 ${auditLogsResponse.data.length || 0} 条日志`, 'green');
}

// 7. 测试报告管理API
async function testReportManagement() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取报告模板列表
  const templatesResponse = await axios.get(`${BACKEND_URL}/api/report-templates`, { headers });
  log(`报告模板获取成功，共 ${templatesResponse.data.length || 0} 个模板`, 'green');
  
  // 获取报告列表
  const reportsResponse = await axios.get(`${BACKEND_URL}/api/reports`, { headers });
  log(`报告列表获取成功，共 ${reportsResponse.data.length || 0} 个报告`, 'green');
}

// 8. 测试系统管理API
async function testSystemManagement() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取用户列表
  const usersResponse = await axios.get(`${BACKEND_URL}/api/users`, { headers });
  log(`用户列表获取成功，共 ${usersResponse.data.length || 0} 个用户`, 'green');
  
  // 获取角色列表
  const rolesResponse = await axios.get(`${BACKEND_URL}/api/roles`, { headers });
  log(`角色列表获取成功，共 ${rolesResponse.data.length || 0} 个角色`, 'green');
}

// 9. 测试统计分析API
async function testStatistics() {
  const headers = { Authorization: `Bearer ${authToken}` };
  
  // 获取统计数据
  const statsResponse = await axios.get(`${BACKEND_URL}/api/statistics/dashboard`, { headers });
  log(`统计数据获取成功`, 'green');
}

// 10. 测试前端页面可访问性
async function testFrontendAccessibility() {
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    if (response.status === 200) {
      log('前端页面可正常访问', 'green');
    } else {
      throw new Error(`前端页面访问异常，状态码: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('前端服务未启动或无法连接');
    }
    throw error;
  }
}

// 主测试函数
async function runAllTests() {
  log('🚀 开始前后端联动功能测试', 'blue');
  log('='.repeat(50), 'blue');
  
  // 基础连接测试
  await runTest('后端健康检查', testBackendHealth);
  await runTest('前端页面可访问性', testFrontendAccessibility);
  
  // 认证测试
  await runTest('用户登录', testUserLogin);
  
  // 功能模块测试
  await runTest('样品管理API', testSampleManagement);
  await runTest('工作流管理API', testWorkflowManagement);
  await runTest('结果录入API', testResultEntry);
  await runTest('审核管理API', testAuditManagement);
  await runTest('报告管理API', testReportManagement);
  await runTest('系统管理API', testSystemManagement);
  await runTest('统计分析API', testStatistics);
  
  // 输出测试结果
  log('\n' + '='.repeat(50), 'blue');
  log('📊 测试结果汇总', 'blue');
  log('='.repeat(50), 'blue');
  
  log(`总测试数: ${testResults.total}`, 'blue');
  log(`通过: ${testResults.passed}`, 'green');
  log(`失败: ${testResults.failed}`, 'red');
  log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
      testResults.failed === 0 ? 'green' : 'yellow');
  
  if (testResults.failed > 0) {
    log('\n❌ 失败的测试:', 'red');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`  - ${test.name}: ${test.error}`, 'red');
      });
  }
  
  log('\n✅ 通过的测试:', 'green');
  testResults.details
    .filter(test => test.status === 'PASS')
    .forEach(test => {
      log(`  - ${test.name}`, 'green');
    });
  
  if (testResults.failed === 0) {
    log('\n🎉 所有测试通过！前后端联动功能正常！', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查相关功能', 'yellow');
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    log(`\n💥 测试执行出错: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
};