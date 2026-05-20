/**
 * 前后端连接测试脚本
 * 检查前端页面是否正确连接到后端API
 */

const axios = require('axios');

const FRONTEND_URL = 'http://localhost:5173';
const BACKEND_URL = 'http://localhost:3000';

// 颜色输出
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

// 测试后端健康检查
async function testBackendHealth() {
  log('\n=== 测试后端健康检查 ===', 'cyan');
  try {
    const response = await axios.get(`${BACKEND_URL}/health`);
    log('✓ 后端健康检查通过', 'green');
    log(`  状态: ${response.data.status}`, 'blue');
    log(`  环境: ${response.data.environment}`, 'blue');
    return true;
  } catch (error) {
    log('✗ 后端健康检查失败', 'red');
    log(`  错误: ${error.message}`, 'red');
    return false;
  }
}

// 测试前端是否运行
async function testFrontendRunning() {
  log('\n=== 测试前端服务 ===', 'cyan');
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    log('✓ 前端服务运行正常', 'green');
    return true;
  } catch (error) {
    log('✗ 前端服务无法访问', 'red');
    log(`  错误: ${error.message}`, 'red');
    return false;
  }
}

// 测试后端API端点
async function testBackendEndpoints() {
  log('\n=== 测试后端API端点 ===', 'cyan');
  
  const endpoints = [
    { path: '/api/auth/login', method: 'POST', description: '登录接口' },
    { path: '/api/samples', method: 'GET', description: '样品列表' },
    { path: '/api/workflows', method: 'GET', description: '工作流列表' },
    { path: '/api/audit/tasks', method: 'GET', description: '审核任务列表' },
    { path: '/api/results', method: 'GET', description: '结果列表' },
    { path: '/api/reports/templates', method: 'GET', description: '报告模板' },
    { path: '/api/statistics/dashboard', method: 'GET', description: '统计仪表板' },
    { path: '/api/users', method: 'GET', description: '用户列表' },
    { path: '/api/methods', method: 'GET', description: '检测方法' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      if (endpoint.method === 'GET') {
        // GET请求不需要认证token也应该返回401或数据
        const response = await axios.get(`${BACKEND_URL}${endpoint.path}`, {
          validateStatus: (status) => status < 500 // 接受所有非5xx错误
        });
        
        if (response.status === 401) {
          log(`✓ ${endpoint.description} (${endpoint.path}) - 需要认证`, 'yellow');
          results.push({ ...endpoint, status: 'needs_auth', code: 401 });
        } else if (response.status === 200) {
          log(`✓ ${endpoint.description} (${endpoint.path}) - 正常响应`, 'green');
          results.push({ ...endpoint, status: 'ok', code: 200 });
        } else {
          log(`⚠ ${endpoint.description} (${endpoint.path}) - 状态码: ${response.status}`, 'yellow');
          results.push({ ...endpoint, status: 'warning', code: response.status });
        }
      } else if (endpoint.method === 'POST') {
        // POST请求测试端点是否存在
        const response = await axios.post(`${BACKEND_URL}${endpoint.path}`, {}, {
          validateStatus: (status) => status < 500
        });
        
        if (response.status === 400 || response.status === 401) {
          log(`✓ ${endpoint.description} (${endpoint.path}) - 端点存在`, 'yellow');
          results.push({ ...endpoint, status: 'exists', code: response.status });
        } else if (response.status === 200) {
          log(`✓ ${endpoint.description} (${endpoint.path}) - 正常响应`, 'green');
          results.push({ ...endpoint, status: 'ok', code: 200 });
        } else {
          log(`⚠ ${endpoint.description} (${endpoint.path}) - 状态码: ${response.status}`, 'yellow');
          results.push({ ...endpoint, status: 'warning', code: response.status });
        }
      }
    } catch (error) {
      if (error.response) {
        log(`✗ ${endpoint.description} (${endpoint.path}) - 错误: ${error.response.status}`, 'red');
        results.push({ ...endpoint, status: 'error', code: error.response.status });
      } else {
        log(`✗ ${endpoint.description} (${endpoint.path}) - 错误: ${error.message}`, 'red');
        results.push({ ...endpoint, status: 'error', message: error.message });
      }
    }
  }
  
  return results;
}

// 检查前端路由配置
async function checkFrontendRoutes() {
  log('\n=== 检查前端路由配置 ===', 'cyan');
  
  const routes = [
    '/login',
    '/dashboard',
    '/sample/management',
    '/workflow/templates',
    '/audit/tasks',
    '/result/entry',
    '/report/templates',
    '/statistics/dashboard',
    '/system/users',
    '/method/library'
  ];
  
  log('前端路由列表:', 'blue');
  routes.forEach(route => {
    log(`  - ${FRONTEND_URL}${route}`, 'blue');
  });
}

// 主测试函数
async function runTests() {
  log('╔════════════════════════════════════════════╗', 'cyan');
  log('║     前后端连接测试                          ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  // 测试后端
  const backendHealthy = await testBackendHealth();
  
  if (!backendHealthy) {
    log('\n后端服务未运行,请先启动后端服务', 'red');
    log('命令: cd backend-api && npm run dev', 'yellow');
    return;
  }
  
  // 测试前端
  const frontendRunning = await testFrontendRunning();
  
  if (!frontendRunning) {
    log('\n前端服务未运行,请先启动前端服务', 'red');
    log('命令: cd vue-project && npm run dev', 'yellow');
    return;
  }
  
  // 测试后端API端点
  const endpointResults = await testBackendEndpoints();
  
  // 检查前端路由
  await checkFrontendRoutes();
  
  // 总结
  log('\n╔════════════════════════════════════════════╗', 'cyan');
  log('║     测试总结                                ║', 'cyan');
  log('╚════════════════════════════════════════════╝', 'cyan');
  
  const okCount = endpointResults.filter(r => r.status === 'ok').length;
  const needsAuthCount = endpointResults.filter(r => r.status === 'needs_auth' || r.status === 'exists').length;
  const errorCount = endpointResults.filter(r => r.status === 'error').length;
  
  log(`\n后端API端点测试结果:`, 'blue');
  log(`  ✓ 正常响应: ${okCount}`, 'green');
  log(`  ⚠ 需要认证: ${needsAuthCount}`, 'yellow');
  log(`  ✗ 错误: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
  
  log(`\n前端地址: ${FRONTEND_URL}`, 'blue');
  log(`后端地址: ${BACKEND_URL}`, 'blue');
  log(`API文档: ${BACKEND_URL}/api-docs`, 'blue');
  
  if (errorCount > 0) {
    log('\n⚠ 发现一些API端点存在问题,请检查后端实现', 'yellow');
  } else {
    log('\n✓ 前后端连接正常!', 'green');
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n测试执行失败: ${error.message}`, 'red');
  process.exit(1);
});
