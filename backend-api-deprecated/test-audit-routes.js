/**
 * 测试审核管理路由注册
 * 验证所有新增的路由端点是否正确注册
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试用的认证 token（需要先登录获取）
let authToken = '';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 登录获取 token
async function login() {
  try {
    log('\n=== 登录获取认证 Token ===', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    authToken = response.data.data.token;
    log('✓ 登录成功', 'green');
    return true;
  } catch (error) {
    log(`✗ 登录失败: ${error.response?.data?.error?.message || error.message}`, 'red');
    if (error.response?.status === 401) {
      log('提示: 请确保数据库中存在 admin 用户，密码为 Admin@123456', 'yellow');
    }
    return false;
  }
}

// 测试路由是否存在（不关心业务逻辑，只验证路由注册）
async function testRoute(method, path, description) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${path}`,
      headers: authToken ? {
        'Authorization': `Bearer ${authToken}`
      } : {},
      validateStatus: () => true // 接受所有状态码
    };

    // 对于 POST/PUT 请求，添加测试数据
    if (method === 'post' || method === 'put') {
      config.data = {};
    }

    const response = await axios(config);
    
    // 404 表示路由未注册，其他状态码表示路由已注册
    if (response.status === 404) {
      log(`✗ ${description}: 路由未注册 (404)`, 'red');
      return false;
    } else {
      log(`✓ ${description}: 路由已注册 (${response.status})`, 'green');
      return true;
    }
  } catch (error) {
    log(`✗ ${description}: ${error.message}`, 'red');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('\n========================================', 'blue');
  log('审核管理路由注册测试', 'blue');
  log('========================================\n', 'blue');

  // 先登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n登录失败，无法继续测试', 'red');
    return;
  }

  const tests = [
    // 审核意见模板路由
    { method: 'get', path: '/audits/templates', desc: 'GET /api/audits/templates - 获取模板列表' },
    { method: 'get', path: '/audits/templates/test-id', desc: 'GET /api/audits/templates/:id - 获取单个模板' },
    { method: 'post', path: '/audits/templates', desc: 'POST /api/audits/templates - 创建模板' },
    { method: 'put', path: '/audits/templates/test-id', desc: 'PUT /api/audits/templates/:id - 更新模板' },
    { method: 'delete', path: '/audits/templates/test-id', desc: 'DELETE /api/audits/templates/:id - 删除模板' },
    
    // 审核流程配置路由
    { method: 'get', path: '/audits/workflow-configs', desc: 'GET /api/audits/workflow-configs - 获取配置列表' },
    { method: 'get', path: '/audits/workflow-configs/test-id', desc: 'GET /api/audits/workflow-configs/:id - 获取单个配置' },
    { method: 'post', path: '/audits/workflow-configs', desc: 'POST /api/audits/workflow-configs - 创建配置' },
    { method: 'put', path: '/audits/workflow-configs/test-id', desc: 'PUT /api/audits/workflow-configs/:id - 更新配置' },
    { method: 'delete', path: '/audits/workflow-configs/test-id', desc: 'DELETE /api/audits/workflow-configs/:id - 删除配置' },
    
    // 审核历史记录路由
    { method: 'get', path: '/audits/tasks/test-id/history', desc: 'GET /api/audits/tasks/:id/history - 获取历史记录' },
    
    // 验证现有路由未受影响
    { method: 'get', path: '/audits', desc: 'GET /api/audits - 获取审核任务列表（现有路由）' },
    { method: 'get', path: '/audits/statistics', desc: 'GET /api/audits/statistics - 获取统计信息（现有路由）' }
  ];

  log('\n=== 测试新增路由 ===', 'blue');
  let passCount = 0;
  let failCount = 0;

  for (const test of tests) {
    const result = await testRoute(test.method, test.path, test.desc);
    if (result) {
      passCount++;
    } else {
      failCount++;
    }
  }

  // 输出测试结果
  log('\n========================================', 'blue');
  log('测试结果汇总', 'blue');
  log('========================================', 'blue');
  log(`总测试数: ${tests.length}`, 'yellow');
  log(`通过: ${passCount}`, 'green');
  log(`失败: ${failCount}`, failCount > 0 ? 'red' : 'green');
  log('========================================\n', 'blue');

  if (failCount === 0) {
    log('✓ 所有路由注册测试通过！', 'green');
  } else {
    log('✗ 部分路由注册测试失败，请检查路由配置', 'red');
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n测试执行出错: ${error.message}`, 'red');
  process.exit(1);
});
