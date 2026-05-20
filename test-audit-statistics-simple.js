/**
 * 审核统计功能简单测试脚本
 * 仅测试后端API
 */

const BACKEND_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'admin',
  password: 'Admin@123456'
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

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// 测试后端API
async function testBackendAPI() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║     审核统计API测试                    ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  try {
    // 1. 登录获取token
    logInfo('步骤 1: 登录获取访问令牌...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      throw new Error(`登录失败 (${loginResponse.status}): ${errorText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    logSuccess('登录成功，获取到访问令牌');

    // 2. 调用审核统计API
    logInfo('\n步骤 2: 调用审核统计API...');
    const statsResponse = await fetch(`${BACKEND_URL}/api/audits/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      const errorText = await statsResponse.text();
      throw new Error(`获取统计数据失败 (${statsResponse.status}): ${errorText}`);
    }

    const statsData = await statsResponse.json();
    logSuccess('成功获取审核统计数据');

    // 3. 验证返回数据结构
    logInfo('\n步骤 3: 验证返回数据结构...');
    const requiredFields = [
      'pending',
      'todayCompleted',
      'weekCompleted',
      'monthCompleted',
      'approvalRate',
      'averageProcessingTime'
    ];

    const statistics = statsData.data;
    let allFieldsPresent = true;

    for (const field of requiredFields) {
      if (!(field in statistics)) {
        logError(`  缺少必需字段: ${field}`);
        allFieldsPresent = false;
      } else {
        logSuccess(`  字段存在: ${field}`);
      }
    }

    if (!allFieldsPresent) {
      throw new Error('数据结构验证失败');
    }

    // 4. 显示统计数据
    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║         统计数据详情                   ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');
    
    log(`  📊 待审核任务: ${colors.yellow}${statistics.pending}${colors.reset} 个`);
    log(`  ✅ 今日已审核: ${colors.green}${statistics.todayCompleted}${colors.reset} 个`);
    log(`  📈 本周已审核: ${colors.blue}${statistics.weekCompleted}${colors.reset} 个`);
    log(`  📅 本月已审核: ${colors.cyan}${statistics.monthCompleted}${colors.reset} 个`);
    log(`  🎯 审核通过率: ${colors.green}${statistics.approvalRate}%${colors.reset}`);
    log(`  ⏱️  平均处理时间: ${colors.blue}${statistics.averageProcessingTime}${colors.reset} 小时`);

    // 5. 验证数据类型
    logInfo('\n步骤 4: 验证数据类型...');
    const typeChecks = [
      { field: 'pending', type: 'number', value: statistics.pending },
      { field: 'todayCompleted', type: 'number', value: statistics.todayCompleted },
      { field: 'weekCompleted', type: 'number', value: statistics.weekCompleted },
      { field: 'monthCompleted', type: 'number', value: statistics.monthCompleted },
      { field: 'approvalRate', type: 'number', value: statistics.approvalRate },
      { field: 'averageProcessingTime', type: 'number', value: statistics.averageProcessingTime }
    ];

    let allTypesCorrect = true;
    for (const check of typeChecks) {
      if (typeof check.value !== check.type) {
        logError(`  ${check.field} 类型错误: 期望 ${check.type}, 实际 ${typeof check.value}`);
        allTypesCorrect = false;
      } else {
        logSuccess(`  ${check.field}: ${check.type} ✓`);
      }
    }

    if (!allTypesCorrect) {
      throw new Error('数据类型验证失败');
    }

    // 6. 验证数据合理性
    logInfo('\n步骤 5: 验证数据合理性...');
    let dataValid = true;

    // 检查通过率范围
    if (statistics.approvalRate < 0 || statistics.approvalRate > 100) {
      logError(`  通过率超出范围: ${statistics.approvalRate}% (应在 0-100 之间)`);
      dataValid = false;
    } else {
      logSuccess(`  通过率在合理范围内: ${statistics.approvalRate}%`);
    }

    // 检查平均处理时间
    if (statistics.averageProcessingTime < 0) {
      logError(`  平均处理时间为负数: ${statistics.averageProcessingTime}`);
      dataValid = false;
    } else {
      logSuccess(`  平均处理时间合理: ${statistics.averageProcessingTime} 小时`);
    }

    // 检查待审核任务数
    if (statistics.pending < 0) {
      logError(`  待审核任务数为负数: ${statistics.pending}`);
      dataValid = false;
    } else {
      logSuccess(`  待审核任务数合理: ${statistics.pending} 个`);
    }

    // 检查完成任务数的逻辑关系
    if (statistics.weekCompleted < statistics.todayCompleted) {
      logWarning(`  本周完成数 (${statistics.weekCompleted}) 小于今日完成数 (${statistics.todayCompleted})`);
    } else {
      logSuccess(`  完成任务数逻辑正确`);
    }

    if (!dataValid) {
      throw new Error('数据合理性验证失败');
    }

    // 7. 测试响应时间
    logInfo('\n步骤 6: 测试API响应时间...');
    const startTime = Date.now();
    await fetch(`${BACKEND_URL}/api/audits/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 1000) {
      logSuccess(`  响应时间: ${responseTime}ms (优秀)`);
    } else if (responseTime < 3000) {
      logWarning(`  响应时间: ${responseTime}ms (可接受)`);
    } else {
      logError(`  响应时间: ${responseTime}ms (较慢)`);
    }

    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║           测试结果                     ║', 'cyan');
    log('╚════════════════════════════════════════╝\n', 'cyan');
    
    logSuccess('✓ 所有测试通过！');
    
    log('\n提示:', 'cyan');
    log('  1. 后端API工作正常');
    log('  2. 数据结构完整');
    log('  3. 数据类型正确');
    log('  4. 数据合理性验证通过');
    log(`  5. 前端页面地址: ${colors.blue}http://localhost:5173/audit/statistics${colors.reset}`);
    log('  6. 请在浏览器中访问前端页面查看效果\n');

    return true;

  } catch (error) {
    log('\n╔════════════════════════════════════════╗', 'red');
    log('║           测试失败                     ║', 'red');
    log('╚════════════════════════════════════════╝\n', 'red');
    
    logError(`错误: ${error.message}`);
    
    log('\n故障排查建议:', 'yellow');
    log('  1. 确认后端服务已启动 (http://localhost:3000)');
    log('  2. 确认数据库连接正常');
    log('  3. 确认有审核任务数据');
    log('  4. 检查用户权限配置\n');
    
    return false;
  }
}

// 运行测试
testBackendAPI().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  logError(`测试执行出错: ${error.message}`);
  console.error(error);
  process.exit(1);
});
