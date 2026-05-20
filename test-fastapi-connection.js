/**
 * FastAPI 后端连接测试脚本
 * 
 * 测试内容：
 * 1. 健康检查端点
 * 2. 登录接口
 * 3. 样品列表接口
 */

const axios = require('axios');

const FASTAPI_BASE_URL = 'http://localhost:8000';

// 测试配置
const testConfig = {
  username: 'admin',
  password: 'admin123'
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试 1: 健康检查
async function testHealthCheck() {
  log('\n=== 测试 1: 健康检查 ===', 'blue');
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/health`);
    log('✓ 健康检查成功', 'green');
    log(`  状态: ${response.data.status}`);
    log(`  服务: ${response.data.service}`);
    log(`  数据库: ${response.data.database}`);
    return true;
  } catch (error) {
    log('✗ 健康检查失败', 'red');
    log(`  错误: ${error.message}`, 'red');
    return false;
  }
}

// 测试 2: 登录接口
async function testLogin() {
  log('\n=== 测试 2: 登录接口 ===', 'blue');
  try {
    const response = await axios.post(`${FASTAPI_BASE_URL}/api/v1/auth/login`, {
      username: testConfig.username,
      password: testConfig.password
    });
    
    log('✓ 登录成功', 'green');
    
    // FastAPI 返回的数据结构: { success: true, data: { accessToken, ... }, message: "..." }
    const data = response.data.data || response.data;
    const accessToken = data.accessToken;
    
    log(`  访问令牌: ${accessToken.substring(0, 20)}...`);
    
    return accessToken;
  } catch (error) {
    log('✗ 登录失败', 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`  错误: ${error.message}`, 'red');
    }
    return null;
  }
}

// 测试 3: 样品列表接口
async function testSamplesList(token) {
  log('\n=== 测试 3: 样品列表接口 ===', 'blue');
  try {
    const response = await axios.get(`${FASTAPI_BASE_URL}/api/v1/samples`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        page: 1,
        page_size: 10
      }
    });
    
    log('✓ 获取样品列表成功', 'green');
    log(`  总数: ${response.data.data.pagination.total}`);
    log(`  当前页: ${response.data.data.pagination.page}`);
    log(`  样品数量: ${response.data.data.items.length}`);
    
    if (response.data.data.items.length > 0) {
      const sample = response.data.data.items[0];
      log(`  第一个样品: ${sample.name} (${sample.barcode})`);
    }
    
    return true;
  } catch (error) {
    log('✗ 获取样品列表失败', 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  错误信息: ${JSON.stringify(error.response.data)}`, 'red');
    } else {
      log(`  错误: ${error.message}`, 'red');
    }
    return false;
  }
}

// 测试 4: CORS 预检请求
async function testCORS() {
  log('\n=== 测试 4: CORS 配置 ===', 'blue');
  try {
    const response = await axios.options(`${FASTAPI_BASE_URL}/api/v1/samples`, {
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization'
      }
    });
    
    log('✓ CORS 预检请求成功', 'green');
    log(`  允许的源: ${response.headers['access-control-allow-origin']}`);
    log(`  允许的方法: ${response.headers['access-control-allow-methods']}`);
    return true;
  } catch (error) {
    log('✗ CORS 预检请求失败', 'red');
    log(`  错误: ${error.message}`, 'red');
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('========================================', 'blue');
  log('   FastAPI 后端连接测试', 'blue');
  log('========================================', 'blue');
  log(`\n测试目标: ${FASTAPI_BASE_URL}`);
  
  const results = {
    health: false,
    login: false,
    samples: false,
    cors: false
  };
  
  // 测试 1: 健康检查
  results.health = await testHealthCheck();
  
  // 测试 2: 登录
  const token = await testLogin();
  results.login = !!token;
  
  // 测试 3: 样品列表（需要登录令牌）
  if (token) {
    results.samples = await testSamplesList(token);
  } else {
    log('\n⚠ 跳过样品列表测试（未获取到令牌）', 'yellow');
  }
  
  // 测试 4: CORS
  results.cors = await testCORS();
  
  // 总结
  log('\n========================================', 'blue');
  log('   测试总结', 'blue');
  log('========================================', 'blue');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  log(`\n总测试数: ${total}`);
  log(`通过: ${passed}`, passed === total ? 'green' : 'yellow');
  log(`失败: ${total - passed}`, total - passed === 0 ? 'green' : 'red');
  
  if (passed === total) {
    log('\n✓ 所有测试通过！前后端连接正常。', 'green');
  } else {
    log('\n✗ 部分测试失败，请检查错误信息。', 'red');
  }
  
  process.exit(passed === total ? 0 : 1);
}

// 运行测试
runTests().catch(error => {
  log(`\n✗ 测试执行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
