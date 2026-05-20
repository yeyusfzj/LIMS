/**
 * 审核统计API测试脚本
 * 测试新增的审核统计API端点
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

// 测试配置
const config = {
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
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

// 登录获取token
async function login() {
  try {
    log('\n=== 登录获取Token ===', 'blue');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    }, config);

    if (response.data.success && response.data.data.token) {
      log('✓ 登录成功', 'green');
      return response.data.data.token;
    } else {
      log('✗ 登录失败：未返回token', 'red');
      return null;
    }
  } catch (error) {
    log(`✗ 登录失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return null;
  }
}

// 测试工作量统计API
async function testWorkloadStatistics(token) {
  try {
    log('\n=== 测试工作量统计API ===', 'blue');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // 最近30天
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/workload`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        granularity: 'day'
      },
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    if (response.data.success) {
      log('✓ 工作量统计API调用成功', 'green');
      log(`  按审核人员统计: ${response.data.data.byAuditor.length} 条记录`, 'green');
      log(`  按时间段统计: ${response.data.data.byTimePeriod.length} 条记录`, 'green');
      return true;
    } else {
      log('✗ 工作量统计API返回失败', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 工作量统计API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 测试通过率统计API
async function testPassRateStatistics(token) {
  try {
    log('\n=== 测试通过率统计API ===', 'blue');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/pass-rate`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    if (response.data.success) {
      log('✓ 通过率统计API调用成功', 'green');
      log(`  整体通过率: ${response.data.data.overall.passRate.toFixed(2)}%`, 'green');
      log(`  按级别统计: ${response.data.data.byLevel.length} 条记录`, 'green');
      log(`  按样品类型统计: ${response.data.data.bySampleType.length} 条记录`, 'green');
      return true;
    } else {
      log('✗ 通过率统计API返回失败', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 通过率统计API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 测试时效性统计API
async function testDurationStatistics(token) {
  try {
    log('\n=== 测试时效性统计API ===', 'blue');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/duration`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    if (response.data.success) {
      log('✓ 时效性统计API调用成功', 'green');
      log(`  平均时长: ${response.data.data.overall.averageDuration.toFixed(2)} 小时`, 'green');
      log(`  超时率: ${response.data.data.overall.overtimeRate.toFixed(2)}%`, 'green');
      log(`  按审核人员统计: ${response.data.data.byAuditor.length} 条记录`, 'green');
      return true;
    } else {
      log('✗ 时效性统计API返回失败', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 时效性统计API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 测试问题分类统计API
async function testIssueStatistics(token) {
  try {
    log('\n=== 测试问题分类统计API ===', 'blue');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const response = await axios.get(`${BASE_URL}/statistics/audit/issues`, {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      headers: {
        ...config.headers,
        'Authorization': `Bearer ${token}`
      },
      timeout: config.timeout
    });

    if (response.data.success) {
      log('✓ 问题分类统计API调用成功', 'green');
      log(`  按退回原因统计: ${response.data.data.byReason.length} 条记录`, 'green');
      log(`  按样品类型统计: ${response.data.data.bySampleType.length} 条记录`, 'green');
      return true;
    } else {
      log('✗ 问题分类统计API返回失败', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ 问题分类统计API调用失败: ${error.message}`, 'red');
    if (error.response) {
      log(`  状态码: ${error.response.status}`, 'red');
      log(`  响应: ${JSON.stringify(error.response.data)}`, 'red');
    }
    return false;
  }
}

// 主测试函数
async function runTests() {
  log('========================================', 'blue');
  log('  审核统计API测试', 'blue');
  log('========================================', 'blue');

  // 登录
  const token = await login();
  if (!token) {
    log('\n✗ 无法获取认证token，测试终止', 'red');
    return;
  }

  // 运行所有测试
  const results = {
    workload: await testWorkloadStatistics(token),
    passRate: await testPassRateStatistics(token),
    duration: await testDurationStatistics(token),
    issues: await testIssueStatistics(token)
  };

  // 输出测试总结
  log('\n========================================', 'blue');
  log('  测试总结', 'blue');
  log('========================================', 'blue');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  const failed = total - passed;

  log(`总计: ${total} 个测试`, 'blue');
  log(`通过: ${passed} 个`, 'green');
  log(`失败: ${failed} 个`, failed > 0 ? 'red' : 'green');

  if (failed === 0) {
    log('\n✓ 所有测试通过！', 'green');
  } else {
    log('\n✗ 部分测试失败', 'red');
  }
}

// 运行测试
runTests().catch(error => {
  log(`\n✗ 测试执行出错: ${error.message}`, 'red');
  console.error(error);
});
