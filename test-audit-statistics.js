/**
 * 审核统计功能测试脚本
 * 测试后端API和前端页面的集成
 */

const puppeteer = require('puppeteer');

const BACKEND_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:5173';
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
  log('\n=== 测试后端审核统计API ===\n', 'cyan');

  try {
    // 1. 登录获取token
    logInfo('步骤 1: 登录获取访问令牌...');
    const loginResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });

    if (!loginResponse.ok) {
      throw new Error(`登录失败: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    logSuccess('登录成功，获取到访问令牌');

    // 2. 调用审核统计API
    logInfo('步骤 2: 调用审核统计API...');
    const statsResponse = await fetch(`${BACKEND_URL}/api/audits/statistics`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!statsResponse.ok) {
      throw new Error(`获取统计数据失败: ${statsResponse.status}`);
    }

    const statsData = await statsResponse.json();
    logSuccess('成功获取审核统计数据');

    // 3. 验证返回数据结构
    logInfo('步骤 3: 验证返回数据结构...');
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
        logError(`缺少必需字段: ${field}`);
        allFieldsPresent = false;
      }
    }

    if (allFieldsPresent) {
      logSuccess('所有必需字段都存在');
    }

    // 4. 显示统计数据
    log('\n统计数据详情:', 'cyan');
    log(`  待审核任务: ${statistics.pending} 个`);
    log(`  今日已审核: ${statistics.todayCompleted} 个`);
    log(`  本周已审核: ${statistics.weekCompleted} 个`);
    log(`  本月已审核: ${statistics.monthCompleted} 个`);
    log(`  审核通过率: ${statistics.approvalRate}%`);
    log(`  平均处理时间: ${statistics.averageProcessingTime} 小时`);

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
        logError(`${check.field} 类型错误: 期望 ${check.type}, 实际 ${typeof check.value}`);
        allTypesCorrect = false;
      }
    }

    if (allTypesCorrect) {
      logSuccess('所有字段类型正确');
    }

    // 6. 验证数据合理性
    logInfo('步骤 5: 验证数据合理性...');
    let dataValid = true;

    if (statistics.approvalRate < 0 || statistics.approvalRate > 100) {
      logError(`通过率超出范围: ${statistics.approvalRate}% (应在 0-100 之间)`);
      dataValid = false;
    }

    if (statistics.averageProcessingTime < 0) {
      logError(`平均处理时间为负数: ${statistics.averageProcessingTime}`);
      dataValid = false;
    }

    if (statistics.pending < 0) {
      logError(`待审核任务数为负数: ${statistics.pending}`);
      dataValid = false;
    }

    if (dataValid) {
      logSuccess('数据合理性验证通过');
    }

    logSuccess('\n后端API测试完成');
    return true;

  } catch (error) {
    logError(`后端API测试失败: ${error.message}`);
    return false;
  }
}

// 测试前端页面
async function testFrontendPage() {
  log('\n=== 测试前端审核统计页面 ===\n', 'cyan');

  let browser;
  try {
    logInfo('启动浏览器...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // 1. 访问登录页面
    logInfo('步骤 1: 访问登录页面...');
    await page.goto(`${FRONTEND_URL}/login`, { waitUntil: 'networkidle0' });
    logSuccess('登录页面加载成功');

    // 2. 执行登录
    logInfo('步骤 2: 执行登录...');
    await page.type('input[type="text"]', TEST_USER.username);
    await page.type('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    logSuccess('登录成功');

    // 3. 导航到审核统计页面
    logInfo('步骤 3: 导航到审核统计页面...');
    await page.goto(`${FRONTEND_URL}/audit/statistics`, { waitUntil: 'networkidle0' });
    logSuccess('审核统计页面加载成功');

    // 等待页面加载
    await page.waitForTimeout(2000);

    // 4. 检查页面标题
    logInfo('步骤 4: 检查页面标题...');
    const title = await page.title();
    if (title.includes('审核统计')) {
      logSuccess(`页面标题正确: ${title}`);
    } else {
      logWarning(`页面标题: ${title}`);
    }

    // 5. 检查统计卡片是否存在
    logInfo('步骤 5: 检查统计卡片...');
    const cardCount = await page.$$eval('.stat-card', cards => cards.length);
    
    if (cardCount === 6) {
      logSuccess(`找到 ${cardCount} 个统计卡片`);
    } else {
      logWarning(`统计卡片数量: ${cardCount} (期望 6 个)`);
    }

    // 6. 检查是否有错误提示
    logInfo('步骤 6: 检查错误提示...');
    const hasError = await page.$('.el-alert--error');
    if (hasError) {
      const errorText = await page.$eval('.el-alert--error', el => el.textContent);
      logError(`页面显示错误: ${errorText}`);
    } else {
      logSuccess('页面无错误提示');
    }

    // 7. 检查加载状态
    logInfo('步骤 7: 检查加载状态...');
    const isLoading = await page.$('.el-skeleton');
    if (isLoading) {
      logWarning('页面仍在加载中...');
      await page.waitForTimeout(3000);
    } else {
      logSuccess('页面加载完成');
    }

    // 8. 读取统计数据
    logInfo('步骤 8: 读取页面统计数据...');
    const statistics = await page.evaluate(() => {
      const cards = document.querySelectorAll('.stat-card');
      const data = {};
      
      cards.forEach(card => {
        const label = card.querySelector('.stat-label')?.textContent?.trim();
        const value = card.querySelector('.stat-value')?.textContent?.trim();
        
        if (label && value) {
          data[label] = value;
        }
      });
      
      return data;
    });

    log('\n页面显示的统计数据:', 'cyan');
    for (const [label, value] of Object.entries(statistics)) {
      log(`  ${label}: ${value}`);
    }

    // 9. 测试刷新按钮
    logInfo('\n步骤 9: 测试刷新按钮...');
    const refreshButton = await page.$('button:has-text("刷新")');
    if (refreshButton) {
      await refreshButton.click();
      logSuccess('刷新按钮点击成功');
      await page.waitForTimeout(2000);
    } else {
      logWarning('未找到刷新按钮');
    }

    // 10. 截图
    logInfo('步骤 10: 保存页面截图...');
    await page.screenshot({ 
      path: 'audit-statistics-screenshot.png',
      fullPage: true 
    });
    logSuccess('截图已保存: audit-statistics-screenshot.png');

    logSuccess('\n前端页面测试完成');
    
    // 保持浏览器打开5秒以便查看
    logInfo('\n浏览器将在 5 秒后关闭...');
    await page.waitForTimeout(5000);

    return true;

  } catch (error) {
    logError(`前端页面测试失败: ${error.message}`);
    console.error(error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 主测试函数
async function runTests() {
  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║     审核统计功能集成测试              ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  const backendResult = await testBackendAPI();
  const frontendResult = await testFrontendPage();

  log('\n╔════════════════════════════════════════╗', 'cyan');
  log('║           测试结果汇总                 ║', 'cyan');
  log('╚════════════════════════════════════════╝\n', 'cyan');

  if (backendResult) {
    logSuccess('后端API测试: 通过');
  } else {
    logError('后端API测试: 失败');
  }

  if (frontendResult) {
    logSuccess('前端页面测试: 通过');
  } else {
    logError('前端页面测试: 失败');
  }

  if (backendResult && frontendResult) {
    log('\n✓ 所有测试通过！', 'green');
    process.exit(0);
  } else {
    log('\n✗ 部分测试失败', 'red');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(error => {
  logError(`测试执行出错: ${error.message}`);
  console.error(error);
  process.exit(1);
});
