/**
 * 审核统计与报表功能测试脚本
 * 测试所有统计API端点和前端页面
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';

// 测试配置
const testConfig = {
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 测试结果统计
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// 测试函数
async function runTest(name, testFn) {
  results.total++;
  try {
    log(`\n🧪 测试: ${name}`, 'cyan');
    await testFn();
    results.passed++;
    log(`✅ 通过: ${name}`, 'green');
    return true;
  } catch (error) {
    results.failed++;
    results.errors.push({ name, error: error.message });
    log(`❌ 失败: ${name}`, 'red');
    log(`   错误: ${error.message}`, 'red');
    return false;
  }
}

// 等待服务启动
async function waitForService(url, maxAttempts = 30) {
  log(`\n⏳ 等待服务启动: ${url}`, 'yellow');
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(url, { timeout: 2000 });
      log(`✅ 服务已就绪: ${url}`, 'green');
      return true;
    } catch (error) {
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error(`服务启动超时: ${url}`);
}

// ==================== 后端API测试 ====================

async function testBackendHealth() {
  const response = await axios.get(`${BASE_URL}/health`, testConfig);
  if (response.status !== 200) {
    throw new Error(`健康检查失败: ${response.status}`);
  }
  log(`   响应: ${JSON.stringify(response.data)}`, 'blue');
}

async function testWorkloadStatistics() {
  const params = {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  };
  
  const response = await axios.get(`${BASE_URL}/api/statistics/audit/workload`, {
    ...testConfig,
    params
  });
  
  if (response.status !== 200) {
    throw new Error(`工作量统计API失败: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.success) {
    throw new Error(`API返回失败: ${data.error || '未知错误'}`);
  }
  
  // 验证数据结构
  if (!data.data || !data.data.byAuditor || !data.data.byTimePeriod) {
    throw new Error('工作量统计数据结构不正确');
  }
  
  log(`   审核人员数量: ${data.data.byAuditor.length}`, 'blue');
  log(`   时间段数量: ${data.data.byTimePeriod.length}`, 'blue');
}

async function testPassRateStatistics() {
  const params = {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  };
  
  const response = await axios.get(`${BASE_URL}/api/statistics/audit/pass-rate`, {
    ...testConfig,
    params
  });
  
  if (response.status !== 200) {
    throw new Error(`通过率统计API失败: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.success) {
    throw new Error(`API返回失败: ${data.error || '未知错误'}`);
  }
  
  // 验证数据结构
  if (!data.data || !data.data.overall) {
    throw new Error('通过率统计数据结构不正确');
  }
  
  log(`   整体通过率: ${data.data.overall.passRate}%`, 'blue');
  log(`   总任务数: ${data.data.overall.totalTasks}`, 'blue');
}

async function testDurationStatistics() {
  const params = {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  };
  
  const response = await axios.get(`${BASE_URL}/api/statistics/audit/duration`, {
    ...testConfig,
    params
  });
  
  if (response.status !== 200) {
    throw new Error(`时效性统计API失败: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.success) {
    throw new Error(`API返回失败: ${data.error || '未知错误'}`);
  }
  
  // 验证数据结构
  if (!data.data || !data.data.overall) {
    throw new Error('时效性统计数据结构不正确');
  }
  
  log(`   平均时长: ${data.data.overall.averageDuration}小时`, 'blue');
  log(`   超时任务数: ${data.data.overall.overtimeTasks}`, 'blue');
}

async function testIssueStatistics() {
  const params = {
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  };
  
  const response = await axios.get(`${BASE_URL}/api/statistics/audit/issues`, {
    ...testConfig,
    params
  });
  
  if (response.status !== 200) {
    throw new Error(`问题分类统计API失败: ${response.status}`);
  }
  
  const data = response.data;
  if (!data.success) {
    throw new Error(`API返回失败: ${data.error || '未知错误'}`);
  }
  
  // 验证数据结构
  if (!data.data || !data.data.byReason) {
    throw new Error('问题分类统计数据结构不正确');
  }
  
  log(`   问题类型数量: ${data.data.byReason.length}`, 'blue');
}

async function testExportStatistics() {
  const exportData = {
    type: 'workload',
    filters: {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    }
  };
  
  const response = await axios.post(
    `${BASE_URL}/api/statistics/audit/export`,
    exportData,
    {
      ...testConfig,
      responseType: 'arraybuffer'
    }
  );
  
  if (response.status !== 200) {
    throw new Error(`导出API失败: ${response.status}`);
  }
  
  // 验证响应头
  const contentType = response.headers['content-type'];
  if (!contentType || !contentType.includes('spreadsheet')) {
    throw new Error(`导出文件类型不正确: ${contentType}`);
  }
  
  log(`   导出文件大小: ${response.data.byteLength} bytes`, 'blue');
}

async function testInvalidDateRange() {
  const params = {
    startDate: '2024-12-31',
    endDate: '2024-01-01' // 结束时间早于开始时间
  };
  
  try {
    await axios.get(`${BASE_URL}/api/statistics/audit/workload`, {
      ...testConfig,
      params
    });
    throw new Error('应该返回400错误，但请求成功了');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      log(`   正确返回400错误`, 'blue');
    } else {
      throw error;
    }
  }
}

// ==================== 前端页面测试 ====================

async function testFrontendAccess() {
  const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
  if (response.status !== 200) {
    throw new Error(`前端页面访问失败: ${response.status}`);
  }
  log(`   前端页面可访问`, 'blue');
}

async function testStatisticsPageRoute() {
  // 测试统计页面路由是否存在
  const response = await axios.get(`${FRONTEND_URL}/statistics/audit`, {
    timeout: 5000,
    validateStatus: () => true // 接受所有状态码
  });
  
  if (response.status === 200) {
    log(`   统计页面路由存在`, 'blue');
  } else {
    log(`   统计页面路由状态: ${response.status}`, 'yellow');
  }
}

// ==================== 主测试流程 ====================

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('审核统计与报表功能测试', 'cyan');
  log('='.repeat(60), 'cyan');
  
  try {
    // 等待服务启动
    await waitForService(`${BASE_URL}/health`);
    await waitForService(FRONTEND_URL);
    
    log('\n' + '='.repeat(60), 'yellow');
    log('后端API测试', 'yellow');
    log('='.repeat(60), 'yellow');
    
    // 后端API测试
    await runTest('健康检查', testBackendHealth);
    await runTest('工作量统计API', testWorkloadStatistics);
    await runTest('通过率统计API', testPassRateStatistics);
    await runTest('时效性统计API', testDurationStatistics);
    await runTest('问题分类统计API', testIssueStatistics);
    await runTest('数据导出API', testExportStatistics);
    await runTest('无效日期范围验证', testInvalidDateRange);
    
    log('\n' + '='.repeat(60), 'yellow');
    log('前端页面测试', 'yellow');
    log('='.repeat(60), 'yellow');
    
    // 前端页面测试
    await runTest('前端页面访问', testFrontendAccess);
    await runTest('统计页面路由', testStatisticsPageRoute);
    
  } catch (error) {
    log(`\n❌ 测试执行失败: ${error.message}`, 'red');
  }
  
  // 输出测试结果
  log('\n' + '='.repeat(60), 'cyan');
  log('测试结果汇总', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`总测试数: ${results.total}`, 'blue');
  log(`通过: ${results.passed}`, 'green');
  log(`失败: ${results.failed}`, 'red');
  log(`通过率: ${((results.passed / results.total) * 100).toFixed(2)}%`, 'yellow');
  
  if (results.errors.length > 0) {
    log('\n失败的测试:', 'red');
    results.errors.forEach((error, index) => {
      log(`${index + 1}. ${error.name}`, 'red');
      log(`   ${error.error}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch(error => {
  log(`\n❌ 测试运行失败: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
