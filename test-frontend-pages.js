/**
 * 前端页面可访问性测试
 * 检查主要页面是否可以正常访问
 */

const axios = require('axios');

// 配置
const FRONTEND_URL = 'http://localhost:5173';

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

// 测试页面可访问性
async function testPageAccessibility(pagePath, pageName) {
  const url = `${FRONTEND_URL}${pagePath}`;
  const response = await axios.get(url, { 
    timeout: 10000,
    validateStatus: function (status) {
      return status < 500; // 接受所有小于500的状态码
    }
  });
  
  if (response.status === 200) {
    log(`${pageName} 页面可正常访问 (${url})`, 'green');
  } else {
    throw new Error(`页面访问异常，状态码: ${response.status}`);
  }
}

// 主要页面列表
const pages = [
  { path: '/', name: '首页' },
  { path: '/login', name: '登录页' },
  { path: '/dashboard', name: '仪表板' },
  { path: '/sample/management', name: '样品管理' },
  { path: '/sample/registration', name: '样品登记' },
  { path: '/workflow/designer', name: '工作流设计器' },
  { path: '/workflow/templates', name: '工作流模板' },
  { path: '/workflow/tasks', name: '任务列表' },
  { path: '/result/entry', name: '结果录入' },
  { path: '/result/list', name: '结果列表' },
  { path: '/quality/judgment', name: '质量判定' },
  { path: '/audit/tasks', name: '审核任务' },
  { path: '/report/generator', name: '报告生成' },
  { path: '/report/templates', name: '报告模板' },
  { path: '/statistics/dashboard', name: '统计分析' },
  { path: '/system/users', name: '用户管理' },
  { path: '/system/roles', name: '角色管理' },
  { path: '/system/settings', name: '系统设置' }
];

// 主测试函数
async function runPageTests() {
  log('🚀 开始前端页面可访问性测试', 'blue');
  log('='.repeat(50), 'blue');
  
  // 首先测试前端服务是否启动
  await runTest('前端服务连接', async () => {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    if (response.status !== 200) {
      throw new Error(`前端服务异常，状态码: ${response.status}`);
    }
    log('前端服务正常运行', 'green');
  });
  
  // 测试各个页面
  for (const page of pages) {
    await runTest(`${page.name}页面`, () => testPageAccessibility(page.path, page.name));
  }
  
  // 输出测试结果
  log('\n' + '='.repeat(50), 'blue');
  log('📊 页面测试结果汇总', 'blue');
  log('='.repeat(50), 'blue');
  
  log(`总测试数: ${testResults.total}`, 'blue');
  log(`通过: ${testResults.passed}`, 'green');
  log(`失败: ${testResults.failed}`, 'red');
  log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`, 
      testResults.failed === 0 ? 'green' : 'yellow');
  
  if (testResults.failed > 0) {
    log('\n❌ 无法访问的页面:', 'red');
    testResults.details
      .filter(test => test.status === 'FAIL')
      .forEach(test => {
        log(`  - ${test.name}: ${test.error}`, 'red');
      });
  }
  
  log('\n✅ 可正常访问的页面:', 'green');
  testResults.details
    .filter(test => test.status === 'PASS')
    .forEach(test => {
      log(`  - ${test.name}`, 'green');
    });
  
  if (testResults.failed === 0) {
    log('\n🎉 所有页面都可以正常访问！', 'green');
  } else {
    log('\n⚠️  部分页面无法访问，可能是路由配置问题', 'yellow');
  }
  
  // 生成页面访问报告
  const accessiblePages = testResults.details.filter(test => test.status === 'PASS').length;
  const totalPages = testResults.total - 1; // 减去前端服务连接测试
  
  log('\n📋 页面功能覆盖情况:', 'blue');
  log(`- 样品管理模块: ${pages.filter(p => p.path.includes('/sample')).length} 个页面`);
  log(`- 工作流模块: ${pages.filter(p => p.path.includes('/workflow')).length} 个页面`);
  log(`- 结果管理模块: ${pages.filter(p => p.path.includes('/result')).length} 个页面`);
  log(`- 质量管理模块: ${pages.filter(p => p.path.includes('/quality')).length} 个页面`);
  log(`- 审核模块: ${pages.filter(p => p.path.includes('/audit')).length} 个页面`);
  log(`- 报告模块: ${pages.filter(p => p.path.includes('/report')).length} 个页面`);
  log(`- 统计模块: ${pages.filter(p => p.path.includes('/statistics')).length} 个页面`);
  log(`- 系统管理模块: ${pages.filter(p => p.path.includes('/system')).length} 个页面`);
}

// 运行测试
if (require.main === module) {
  runPageTests().catch(error => {
    log(`\n💥 页面测试执行出错: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = {
  runPageTests,
  testResults
};