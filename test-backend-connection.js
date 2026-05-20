/**
 * 后端连接测试脚本
 * 测试新后端 API 的基本连接和功能
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// 测试结果收集
const results = {
  passed: [],
  failed: [],
  total: 0
};

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

// HTTP 请求辅助函数
function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
      const postData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试用例
async function testHealthCheck() {
  log('\n📋 测试 1: 健康检查端点', 'cyan');
  try {
    const response = await makeRequest('/health');
    if (response.status === 200) {
      log('✓ 健康检查端点正常', 'green');
      log(`  响应: ${JSON.stringify(response.body)}`, 'blue');
      results.passed.push('健康检查');
      return true;
    } else {
      log(`✗ 健康检查失败: 状态码 ${response.status}`, 'red');
      results.failed.push('健康检查');
      return false;
    }
  } catch (error) {
    log(`✗ 健康检查失败: ${error.message}`, 'red');
    results.failed.push('健康检查');
    return false;
  }
}

async function testApiDocs() {
  log('\n📋 测试 2: API 文档端点', 'cyan');
  try {
    const response = await makeRequest('/api-docs/');
    if (response.status === 200 || response.status === 301) {
      log('✓ API 文档端点可访问', 'green');
      results.passed.push('API 文档');
      return true;
    } else {
      log(`✗ API 文档访问失败: 状态码 ${response.status}`, 'red');
      results.failed.push('API 文档');
      return false;
    }
  } catch (error) {
    log(`✗ API 文档访问失败: ${error.message}`, 'red');
    results.failed.push('API 文档');
    return false;
  }
}

async function testLogin() {
  log('\n📋 测试 3: 登录功能', 'cyan');
  try {
    const response = await makeRequest('/api/auth/login', 'POST', {
      username: 'admin',
      password: 'Admin@123456'
    });
    
    if (response.status === 200 && response.body.data && response.body.data.accessToken) {
      log('✓ 登录成功', 'green');
      log(`  Token: ${response.body.data.accessToken.substring(0, 20)}...`, 'blue');
      log(`  用户: ${response.body.data.user.fullName} (${response.body.data.user.username})`, 'blue');
      results.passed.push('登录功能');
      return response.body.data.accessToken;
    } else {
      log(`✗ 登录失败: 状态码 ${response.status}`, 'red');
      log(`  响应: ${JSON.stringify(response.body)}`, 'yellow');
      results.failed.push('登录功能');
      return null;
    }
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    results.failed.push('登录功能');
    return null;
  }
}

async function testSamplesList(token) {
  log('\n📋 测试 4: 样品列表查询', 'cyan');
  if (!token) {
    log('⊘ 跳过 (需要登录)', 'yellow');
    return false;
  }

  try {
    const response = await makeRequest('/api/samples?page=1&limit=10', 'GET', null, token);
    
    if (response.status === 200) {
      log('✓ 样品列表查询成功', 'green');
      log(`  返回数据: ${JSON.stringify(response.body).substring(0, 100)}...`, 'blue');
      results.passed.push('样品列表');
      return true;
    } else {
      log(`✗ 样品列表查询失败: 状态码 ${response.status}`, 'red');
      results.failed.push('样品列表');
      return false;
    }
  } catch (error) {
    log(`✗ 样品列表查询失败: ${error.message}`, 'red');
    results.failed.push('样品列表');
    return false;
  }
}

async function testWorkflowsList(token) {
  log('\n📋 测试 5: 工作流列表查询', 'cyan');
  if (!token) {
    log('⊘ 跳过 (需要登录)', 'yellow');
    return false;
  }

  try {
    const response = await makeRequest('/api/workflows', 'GET', null, token);
    
    if (response.status === 200) {
      log('✓ 工作流列表查询成功', 'green');
      log(`  返回数据: ${JSON.stringify(response.body).substring(0, 100)}...`, 'blue');
      results.passed.push('工作流列表');
      return true;
    } else {
      log(`✗ 工作流列表查询失败: 状态码 ${response.status}`, 'red');
      results.failed.push('工作流列表');
      return false;
    }
  } catch (error) {
    log(`✗ 工作流列表查询失败: ${error.message}`, 'red');
    results.failed.push('工作流列表');
    return false;
  }
}

async function testAuditTasksList(token) {
  log('\n📋 测试 6: 审核任务列表查询', 'cyan');
  if (!token) {
    log('⊘ 跳过 (需要登录)', 'yellow');
    return false;
  }

  try {
    const response = await makeRequest('/api/audits', 'GET', null, token);
    
    if (response.status === 200) {
      log('✓ 审核任务列表查询成功', 'green');
      log(`  返回数据: ${JSON.stringify(response.body).substring(0, 100)}...`, 'blue');
      results.passed.push('审核任务列表');
      return true;
    } else {
      log(`✗ 审核任务列表查询失败: 状态码 ${response.status}`, 'red');
      results.failed.push('审核任务列表');
      return false;
    }
  } catch (error) {
    log(`✗ 审核任务列表查询失败: ${error.message}`, 'red');
    results.failed.push('审核任务列表');
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('='.repeat(60), 'cyan');
  log('🚀 开始测试后端 API 连接', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`后端地址: ${BASE_URL}`, 'blue');

  // 等待后端启动
  log('\n⏳ 等待后端服务启动...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 执行测试
  await testHealthCheck();
  await testApiDocs();
  const token = await testLogin();
  await testSamplesList(token);
  await testWorkflowsList(token);
  await testAuditTasksList(token);

  // 输出测试结果
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 测试结果汇总', 'cyan');
  log('='.repeat(60), 'cyan');
  
  results.total = results.passed.length + results.failed.length;
  
  log(`\n总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed.length}`, 'green');
  log(`失败: ${results.failed.length}`, 'red');
  
  if (results.passed.length > 0) {
    log('\n✓ 通过的测试:', 'green');
    results.passed.forEach(test => log(`  - ${test}`, 'green'));
  }
  
  if (results.failed.length > 0) {
    log('\n✗ 失败的测试:', 'red');
    results.failed.forEach(test => log(`  - ${test}`, 'red'));
  }
  
  const successRate = ((results.passed.length / results.total) * 100).toFixed(1);
  log(`\n成功率: ${successRate}%`, successRate >= 80 ? 'green' : 'yellow');
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (results.failed.length === 0) {
    log('🎉 所有测试通过!后端连接正常!', 'green');
  } else {
    log('⚠️  部分测试失败,请检查后端服务', 'yellow');
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n❌ 测试执行出错: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
